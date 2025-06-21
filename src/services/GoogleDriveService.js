/**
 * SAKAI - Google Drive Service
 * Gestisce le interazioni con Google Drive API per sync e storage
 */

import { API_ENDPOINTS } from '../utils/constants.js';
import { showToast, generateId } from '../utils/helpers.js';

/**
 * Servizio per interazioni con Google Drive API
 */
export default class GoogleDriveService {
  constructor() {
    this.baseUrl = API_ENDPOINTS.GOOGLE.DRIVE;
    this.authUrl = API_ENDPOINTS.GOOGLE.AUTH;
    this.tokenUrl = API_ENDPOINTS.GOOGLE.TOKEN;
    
    this.clientId = null;
    this.clientSecret = null;
    this.redirectUri = window.location.origin + '/auth/google';
    
    this.authenticated = false;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userInfo = null;
    
    // Scopes necessari per SAKAI
    this.scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    // Cache per ridurre chiamate API
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minuti

    // Cartella SAKAI su Drive
    this.sakaiFolder = null;
  }

  /**
   * Configura credenziali OAuth2
   * @param {string} clientId - Google Client ID
   * @param {string} clientSecret - Google Client Secret (opzionale per PKCE)
   */
  configure(clientId, clientSecret = null) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Inizia il processo di autenticazione OAuth2
   * @param {boolean} usePopup - Usa popup invece di redirect
   * @returns {Promise<Object>} Risultato autenticazione
   */
  async authenticate(usePopup = true) {
    try {
      if (!this.clientId) {
        throw new Error('Client ID Google non configurato');
      }

      // Genera code verifier per PKCE
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Salva code verifier per dopo
      sessionStorage.setItem('google_code_verifier', codeVerifier);

      const authParams = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        scope: this.scopes.join(' '),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: generateId('auth')
      });

      const authUrl = `${this.authUrl}?${authParams.toString()}`;

      if (usePopup) {
        return await this.authenticateWithPopup(authUrl);
      } else {
        // Redirect diretto
        window.location.href = authUrl;
        return { pending: true };
      }

    } catch (error) {
      console.error('Errore autenticazione Google:', error);
      throw error;
    }
  }

  /**
   * Autenticazione tramite popup
   * @param {string} authUrl - URL di autenticazione
   * @returns {Promise<Object>} Risultato autenticazione
   */
  async authenticateWithPopup(authUrl) {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject(new Error('Popup bloccato dal browser'));
        return;
      }

      // Polling per verificare completamento auth
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('Autenticazione annullata'));
        }
      }, 1000);

      // Listener per messaggi dal popup
      const messageHandler = async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageHandler);

          try {
            const result = await this.handleAuthCallback(event.data.code, event.data.state);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  /**
   * Gestisce il callback di autenticazione
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @returns {Promise<Object>} Token e user info
   */
  async handleAuthCallback(code, state) {
    try {
      const codeVerifier = sessionStorage.getItem('google_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier non trovato');
      }

      // Scambia authorization code con access token
      const tokenData = await this.exchangeCodeForToken(code, codeVerifier);
      
      // Salva token
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
      this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));
      this.authenticated = true;

      // Ottieni info utente
      this.userInfo = await this.getUserInfo();

      // Salva credenziali
      await this.saveCredentials();

      // Inizializza cartella SAKAI
      await this.initializeSakaiFolder();

      console.log('✅ Google Drive autenticato:', this.userInfo.name);
      
      // Pulisce storage temporaneo
      sessionStorage.removeItem('google_code_verifier');

      return {
        success: true,
        user: this.userInfo,
        tokens: {
          access_token: this.accessToken,
          expires_at: this.tokenExpiry
        }
      };

    } catch (error) {
      console.error('Errore callback auth:', error);
      throw error;
    }
  }

  /**
   * Scambia authorization code con token
   * @param {string} code - Authorization code
   * @param {string} codeVerifier - PKCE code verifier
   * @returns {Promise<Object>} Token data
   */
  async exchangeCodeForToken(code, codeVerifier) {
    const tokenParams = {
      client_id: this.clientId,
      code: code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri
    };

    // Aggiungi client secret se disponibile
    if (this.clientSecret) {
      tokenParams.client_secret = this.clientSecret;
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(tokenParams)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return await response.json();
  }

  /**
   * Refresh access token usando refresh token
   * @returns {Promise<Object>} Nuovo access token
   */
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('Refresh token non disponibile');
      }

      const tokenParams = {
        client_id: this.clientId,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      };

      if (this.clientSecret) {
        tokenParams.client_secret = this.clientSecret;
      }

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(tokenParams)
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json();
      
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      // Aggiorna refresh token se fornito
      if (tokenData.refresh_token) {
        this.refreshToken = tokenData.refresh_token;
      }

      await this.saveCredentials();
      
      return tokenData;

    } catch (error) {
      console.error('Errore refresh token:', error);
      this.authenticated = false;
      throw error;
    }
  }

  /**
   * Verifica e assicura che il token sia valido
   * @returns {Promise<boolean>} Token valido
   */
  async ensureValidToken() {
    if (!this.accessToken) {
      return false;
    }

    // Controlla se il token è scaduto (con margine di 5 minuti)
    if (this.tokenExpiry && Date.now() >= (this.tokenExpiry.getTime() - 300000)) {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  /**
   * Ottiene informazioni sull'utente autenticato
   * @returns {Promise<Object>} Info utente
   */
  async getUserInfo() {
    try {
      const response = await this.makeRequest(
        'https://www.googleapis.com/oauth2/v2/userinfo'
      );

      if (!response.ok) {
        throw new Error('Errore recupero info utente');
      }

      return await response.json();

    } catch (error) {
      console.error('Errore info utente:', error);
      throw error;
    }
  }

  /**
   * Verifica se l'utente è autenticato
   * @returns {Promise<boolean>} Stato autenticazione
   */
  async isAuthenticated() {
    if (this.authenticated && await this.ensureValidToken()) {
      return true;
    }

    try {
      // Prova a caricare credenziali salvate
      const loaded = await this.loadCredentials();
      if (loaded && await this.ensureValidToken()) {
        this.authenticated = true;
        return true;
      }
    } catch (error) {
      console.error('Errore verifica autenticazione:', error);
    }

    return false;
  }

  /**
   * Effettua logout
   */
  async logout() {
    this.authenticated = false;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userInfo = null;
    this.sakaiFolder = null;
    
    await this.clearCredentials();
    this.cache.clear();
  }

  /**
   * DRIVE FILE OPERATIONS
   */

  /**
   * Inizializza cartella SAKAI su Drive
   * @returns {Promise<Object>} Info cartella
   */
  async initializeSakaiFolder() {
    try {
      // Cerca cartella SAKAI esistente
      const existing = await this.findSakaiFolder();
      if (existing) {
        this.sakaiFolder = existing;
        return existing;
      }

      // Crea nuova cartella SAKAI
      const folder = await this.createFolder('SAKAI', null, {
        description: 'SAKAI App Data - Swiss Army Knife by AI'
      });

      this.sakaiFolder = folder;
      return folder;

    } catch (error) {
      console.error('Errore inizializzazione cartella SAKAI:', error);
      throw error;
    }
  }

  /**
   * Cerca cartella SAKAI esistente
   * @returns {Promise<Object|null>} Cartella se trovata
   */
  async findSakaiFolder() {
    try {
      const query = "name='SAKAI' and mimeType='application/vnd.google-apps.folder' and trashed=false";
      const response = await this.makeRequest(`/files?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error('Errore ricerca cartella SAKAI');
      }

      const data = await response.json();
      return data.files.length > 0 ? data.files[0] : null;

    } catch (error) {
      console.error('Errore ricerca cartella:', error);
      return null;
    }
  }

  /**
   * Crea una cartella su Drive
   * @param {string} name - Nome cartella
   * @param {string} parentId - ID cartella parent (null per root)
   * @param {Object} metadata - Metadati aggiuntivi
   * @returns {Promise<Object>} Cartella creata
   */
  async createFolder(name, parentId = null, metadata = {}) {
    try {
      const folderMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...metadata
      };

      if (parentId) {
        folderMetadata.parents = [parentId];
      }

      const response = await this.makeRequest('/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderMetadata)
      });

      if (!response.ok) {
        throw new Error('Errore creazione cartella');
      }

      const folder = await response.json();
      console.log('✅ Cartella creata:', folder.name);
      return folder;

    } catch (error) {
      console.error('Errore creazione cartella:', error);
      throw error;
    }
  }

  /**
   * Carica un file su Drive
   * @param {string} filename - Nome file
   * @param {string|Blob} content - Contenuto file
   * @param {string} mimeType - MIME type
   * @param {string} parentId - ID cartella parent
   * @param {Object} metadata - Metadati aggiuntivi
   * @returns {Promise<Object>} File caricato
   */
  async uploadFile(filename, content, mimeType, parentId = null, metadata = {}) {
    try {
      const fileMetadata = {
        name: filename,
        ...metadata
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      // Prepare multipart upload
      const delimiter = '-------314159265358979323846';
      const close_delim = `\r\n--${delimiter}--`;

      let body = `--${delimiter}\r\n`;
      body += 'Content-Type: application/json\r\n\r\n';
      body += JSON.stringify(fileMetadata) + '\r\n';
      body += `--${delimiter}\r\n`;
      body += `Content-Type: ${mimeType}\r\n\r\n`;

      if (typeof content === 'string') {
        body += content;
      } else {
        // Per Blob, usa FormData approach diverso
        return await this.uploadFileBlob(filename, content, mimeType, parentId, metadata);
      }

      body += close_delim;

      const response = await this.makeRequest('/upload/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary="${delimiter}"`
        },
        body: body
      });

      if (!response.ok) {
        throw new Error('Errore upload file');
      }

      const file = await response.json();
      console.log('✅ File caricato:', file.name);
      return file;

    } catch (error) {
      console.error('Errore upload file:', error);
      throw error;
    }
  }

  /**
   * Carica un file Blob su Drive
   * @param {string} filename - Nome file
   * @param {Blob} blob - Contenuto blob
   * @param {string} mimeType - MIME type
   * @param {string} parentId - ID cartella parent
   * @param {Object} metadata - Metadati aggiuntivi
   * @returns {Promise<Object>} File caricato
   */
  async uploadFileBlob(filename, blob, mimeType, parentId = null, metadata = {}) {
    try {
      const fileMetadata = {
        name: filename,
        ...metadata
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      // Prima crea il file con metadati
      const metadataResponse = await this.makeRequest('/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileMetadata)
      });

      if (!metadataResponse.ok) {
        throw new Error('Errore creazione metadati file');
      }

      const file = await metadataResponse.json();

      // Poi carica il contenuto
      const uploadResponse = await this.makeRequest(`/upload/files/${file.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Content-Type': mimeType
        },
        body: blob
      });

      if (!uploadResponse.ok) {
        throw new Error('Errore upload contenuto file');
      }

      const updatedFile = await uploadResponse.json();
      console.log('✅ File blob caricato:', updatedFile.name);
      return updatedFile;

    } catch (error) {
      console.error('Errore upload blob:', error);
      throw error;
    }
  }

  /**
   * Scarica un file da Drive
   * @param {string} fileId - ID del file
   * @returns {Promise<Blob>} Contenuto file
   */
  async downloadFile(fileId) {
    try {
      const response = await this.makeRequest(`/files/${fileId}?alt=media`);

      if (!response.ok) {
        throw new Error('Errore download file');
      }

      return await response.blob();

    } catch (error) {
      console.error('Errore download file:', error);
      throw error;
    }
  }

  /**
   * Ottiene metadati di un file
   * @param {string} fileId - ID del file
   * @param {string} fields - Campi da includere
   * @returns {Promise<Object>} Metadati file
   */
  async getFileMetadata(fileId, fields = 'id,name,mimeType,size,modifiedTime,parents') {
    try {
      const response = await this.makeRequest(`/files/${fileId}?fields=${fields}`);

      if (!response.ok) {
        throw new Error('Errore recupero metadati file');
      }

      return await response.json();

    } catch (error) {
      console.error('Errore metadati file:', error);
      throw error;
    }
  }

  /**
   * Lista file in una cartella
   * @param {string} folderId - ID cartella (null per root)
   * @param {Object} options - Opzioni di ricerca
   * @returns {Promise<Array>} Lista file
   */
  async listFiles(folderId = null, options = {}) {
    try {
      let query = 'trashed=false';
      
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      if (options.mimeType) {
        query += ` and mimeType='${options.mimeType}'`;
      }

      if (options.nameContains) {
        query += ` and name contains '${options.nameContains}'`;
      }

      const params = new URLSearchParams({
        q: query,
        fields: options.fields || 'files(id,name,mimeType,size,modifiedTime)',
        pageSize: options.pageSize || 100
      });

      if (options.orderBy) {
        params.set('orderBy', options.orderBy);
      }

      const response = await this.makeRequest(`/files?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Errore lista file');
      }

      const data = await response.json();
      return data.files || [];

    } catch (error) {
      console.error('Errore lista file:', error);
      throw error;
    }
  }

  /**
   * Elimina un file
   * @param {string} fileId - ID del file
   * @returns {Promise<boolean>} Successo operazione
   */
  async deleteFile(fileId) {
    try {
      const response = await this.makeRequest(`/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Errore eliminazione file');
      }

      console.log('✅ File eliminato:', fileId);
      return true;

    } catch (error) {
      console.error('Errore eliminazione file:', error);
      throw error;
    }
  }

  /**
   * SYNC INTEGRATION
   */

  /**
   * Upload dati di sync su Google Drive
   * @param {Object} syncData - Dati da sincronizzare
   * @returns {Promise<Object>} Risultato operazione
   */
  async uploadSyncData(syncData) {
    try {
      if (!this.sakaiFolder) {
        await this.initializeSakaiFolder();
      }

      const syncContent = JSON.stringify(syncData, null, 2);
      const metadata = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        device: navigator.userAgent,
        checksum: await this.generateChecksum(syncData)
      };

      // Upload file sync principale
      const syncFile = await this.uploadFile(
        'sakai-sync.json',
        syncContent,
        'application/json',
        this.sakaiFolder.id,
        {
          description: 'SAKAI Sync Data - Apps and Settings'
        }
      );

      // Upload metadati
      const metaFile = await this.uploadFile(
        'sakai-meta.json',
        JSON.stringify(metadata, null, 2),
        'application/json',
        this.sakaiFolder.id,
        {
          description: 'SAKAI Sync Metadata'
        }
      );

      return {
        success: true,
        syncFile: {
          id: syncFile.id,
          name: syncFile.name,
          size: syncContent.length
        },
        metaFile: {
          id: metaFile.id,
          name: metaFile.name
        },
        metadata
      };

    } catch (error) {
      console.error('Errore upload sync data:', error);
      throw error;
    }
  }

  /**
   * Download dati di sync da Google Drive
   * @returns {Promise<Object>} Dati scaricati
   */
  async downloadSyncData() {
    try {
      if (!this.sakaiFolder) {
        await this.initializeSakaiFolder();
      }

      // Cerca file sync
      const syncFiles = await this.listFiles(this.sakaiFolder.id, {
        nameContains: 'sakai-sync.json'
      });

      if (syncFiles.length === 0) {
        throw new Error('File sync non trovato');
      }

      const syncFile = syncFiles[0];
      
      // Scarica contenuto sync
      const syncBlob = await this.downloadFile(syncFile.id);
      const syncContent = await syncBlob.text();
      const syncData = JSON.parse(syncContent);

      // Prova a scaricare metadati
      let metadata = null;
      try {
        const metaFiles = await this.listFiles(this.sakaiFolder.id, {
          nameContains: 'sakai-meta.json'
        });

        if (metaFiles.length > 0) {
          const metaBlob = await this.downloadFile(metaFiles[0].id);
          const metaContent = await metaBlob.text();
          metadata = JSON.parse(metaContent);

          // Verifica checksum
          const currentChecksum = await this.generateChecksum(syncData);
          if (metadata.checksum && metadata.checksum !== currentChecksum) {
            console.warn('⚠️ Checksum sync data non corrisponde');
          }
        }
      } catch (metaError) {
        console.warn('Warning: impossibile caricare metadati sync');
      }

      return {
        success: true,
        data: syncData,
        metadata,
        fileInfo: {
          id: syncFile.id,
          name: syncFile.name,
          size: syncFile.size,
          modifiedTime: syncFile.modifiedTime
        }
      };

    } catch (error) {
      console.error('Errore download sync data:', error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Effettua richiesta HTTP con gestione token
   * @param {string} endpoint - Endpoint API
   * @param {Object} options - Opzioni fetch
   * @returns {Promise<Response>} Response
   */
  async makeRequest(endpoint, options = {}) {
    if (!await this.ensureValidToken()) {
      throw new Error('Token non valido, riautenticarsi');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers
      }
    });

    return response;
  }

  /**
   * Genera code verifier per PKCE
   * @returns {string} Code verifier
   */
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  /**
   * Genera code challenge da verifier
   * @param {string} codeVerifier - Code verifier
   * @returns {Promise<string>} Code challenge
   */
  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  }

  /**
   * Encode base64 URL-safe
   * @param {Uint8Array} buffer - Buffer da encodare
   * @returns {string} String base64 URL-safe
   */
  base64URLEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Genera checksum per validazione dati
   * @param {Object} data - Dati da verificare
   * @returns {Promise<string>} Checksum
   */
  async generateChecksum(data) {
    const text = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Salva credenziali in modo sicuro
   */
  async saveCredentials() {
    const credentials = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiry: this.tokenExpiry?.toISOString(),
      userInfo: this.userInfo
    };

    // In produzione, usa crittografia più robusta
    const encrypted = btoa(JSON.stringify(credentials));
    localStorage.setItem('sakai_googledrive_creds', encrypted);
  }

  /**
   * Carica credenziali salvate
   * @returns {Promise<boolean>} Successo caricamento
   */
  async loadCredentials() {
    try {
      const encrypted = localStorage.getItem('sakai_googledrive_creds');
      if (!encrypted) return false;

      const credentials = JSON.parse(atob(encrypted));
      
      this.accessToken = credentials.accessToken;
      this.refreshToken = credentials.refreshToken;
      this.tokenExpiry = credentials.tokenExpiry ? new Date(credentials.tokenExpiry) : null;
      this.userInfo = credentials.userInfo;

      return true;

    } catch (error) {
      console.error('Errore caricamento credenziali:', error);
      return false;
    }
  }

  /**
   * Rimuove credenziali salvate
   */
  async clearCredentials() {
    localStorage.removeItem('sakai_googledrive_creds');
  }

  /**
   * Testa connessione e autenticazione
   * @returns {Promise<Object>} Risultato test
   */
  async testConnection() {
    try {
      if (!await this.isAuthenticated()) {
        return {
          success: false,
          error: 'Non autenticato'
        };
      }

      const userInfo = await this.getUserInfo();
      
      return {
        success: true,
        user: userInfo,
        quotaInfo: await this.getStorageQuota()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ottiene informazioni quota storage
   * @returns {Promise<Object>} Info quota
   */
  async getStorageQuota() {
    try {
      const response = await this.makeRequest('/about?fields=storageQuota');
      
      if (!response.ok) {
        throw new Error('Errore recupero quota');
      }

      return await response.json();

    } catch (error) {
      console.error('Errore quota storage:', error);
      return null;
    }
  }

  /**
   * CACHE MANAGEMENT
   */

  /**
   * Ottiene valore dalla cache
   * @param {string} key - Chiave cache
   * @returns {*} Valore cached o null
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Salva valore in cache
   * @param {string} key - Chiave cache
   * @param {*} data - Dati da cachare
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Pulisce cache
   */
  clearCache() {
    this.cache.clear();
  }
}