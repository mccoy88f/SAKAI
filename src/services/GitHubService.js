/**
 * SAKAI - GitHub Service
 * Gestisce le interazioni con l'API GitHub per sync e import
 */

import { API_ENDPOINTS, REGEX_PATTERNS } from '../utils/constants.js';
import { showToast } from '../utils/helpers.js';

/**
 * Servizio per interazioni con GitHub API
 */
export default class GitHubService {
  constructor() {
    this.baseUrl = API_ENDPOINTS.GITHUB.BASE;
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = null;
    this.authenticated = false;
    this.userInfo = null;
    
    // Cache per ridurre chiamate API
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
  }

  /**
   * Autentica con GitHub usando Personal Access Token
   * @param {string} token - GitHub Personal Access Token
   * @returns {Promise<Object>} User info se successo
   */
  async authenticate(token) {
    try {
      if (!token || !token.startsWith('ghp_')) {
        throw new Error('Token GitHub non valido');
      }

      const response = await this.makeRequest('/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Autenticazione fallita: ${response.statusText}`);
      }

      this.userInfo = await response.json();
      this.authenticated = true;
      
      // Salva token in modo sicuro
      await this.saveToken(token);
      
      console.log('✅ GitHub autenticato:', this.userInfo.login);
      return this.userInfo;

    } catch (error) {
      console.error('❌ Errore autenticazione GitHub:', error);
      this.authenticated = false;
      throw error;
    }
  }

  /**
   * Verifica se l'utente è autenticato
   * @returns {Promise<boolean>} Stato autenticazione
   */
  async isAuthenticated() {
    if (this.authenticated && this.userInfo) {
      return true;
    }

    try {
      const token = await this.getToken();
      if (token) {
        await this.authenticate(token);
        return this.authenticated;
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
    this.userInfo = null;
    await this.clearToken();
    this.cache.clear();
  }

  /**
   * Ottiene informazioni su un repository
   * @param {string} owner - Proprietario del repo
   * @param {string} repo - Nome del repository
   * @returns {Promise<Object>} Info repository
   */
  async getRepository(owner, repo) {
    try {
      const cacheKey = `repo:${owner}/${repo}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const endpoint = `/repos/${owner}/${repo}`;
      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository non trovato');
        }
        throw new Error(`Errore API GitHub: ${response.statusText}`);
      }

      const repoData = await response.json();
      this.setCache(cacheKey, repoData);
      
      return repoData;

    } catch (error) {
      console.error('Errore recupero repository:', error);
      throw error;
    }
  }

  /**
   * Ottiene il contenuto di un file dal repository
   * @param {string} owner - Proprietario del repo
   * @param {string} repo - Nome del repository
   * @param {string} path - Percorso del file
   * @param {string} ref - Branch/commit ref (default: main)
   * @returns {Promise<Object>} Contenuto del file
   */
  async getFileContent(owner, repo, path, ref = 'main') {
    try {
      const cacheKey = `file:${owner}/${repo}/${path}@${ref}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const endpoint = `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File ${path} non trovato`);
        }
        throw new Error(`Errore recupero file: ${response.statusText}`);
      }

      const fileData = await response.json();
      
      // Decodifica contenuto se è base64
      if (fileData.encoding === 'base64') {
        fileData.decodedContent = atob(fileData.content.replace(/\n/g, ''));
      }

      this.setCache(cacheKey, fileData);
      return fileData;

    } catch (error) {
      console.error('Errore recupero file:', error);
      throw error;
    }
  }

  /**
   * Ottiene la lista dei file del repository
   * @param {string} owner - Proprietario del repo
   * @param {string} repo - Nome del repository
   * @param {string} path - Percorso directory (default: root)
   * @param {string} ref - Branch/commit ref
   * @returns {Promise<Array>} Lista file e directory
   */
  async getDirectoryContents(owner, repo, path = '', ref = 'main') {
    try {
      const cacheKey = `dir:${owner}/${repo}/${path}@${ref}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const endpoint = `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        throw new Error(`Errore recupero directory: ${response.statusText}`);
      }

      const contents = await response.json();
      this.setCache(cacheKey, contents);
      
      return contents;

    } catch (error) {
      console.error('Errore recupero directory:', error);
      throw error;
    }
  }

  /**
   * Scarica tutto il repository come ZIP
   * @param {string} owner - Proprietario del repo
   * @param {string} repo - Nome del repository
   * @param {string} ref - Branch/commit ref
   * @returns {Promise<Blob>} ZIP del repository
   */
  async downloadRepositoryZip(owner, repo, ref = 'main') {
    try {
      const endpoint = `/repos/${owner}/${repo}/zipball/${ref}`;
      const response = await this.makeRequest(endpoint, {
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Errore download repository: ${response.statusText}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('Errore download repository:', error);
      throw error;
    }
  }

  /**
   * Cerca repository pubblici
   * @param {string} query - Query di ricerca
   * @param {Object} options - Opzioni di ricerca
   * @returns {Promise<Object>} Risultati ricerca
   */
  async searchRepositories(query, options = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        sort: options.sort || 'stars',
        order: options.order || 'desc',
        per_page: options.perPage || 20,
        page: options.page || 1
      });

      const endpoint = `/search/repositories?${params.toString()}`;
      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        throw new Error(`Errore ricerca: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Errore ricerca repository:', error);
      throw error;
    }
  }

  /**
   * GIST MANAGEMENT per sincronizzazione
   */

  /**
   * Crea un nuovo Gist
   * @param {Object} gistData - Dati del Gist
   * @returns {Promise<Object>} Gist creato
   */
  async createGist(gistData) {
    try {
      const response = await this.makeRequest('/gists', {
        method: 'POST',
        headers: {
          ...await this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: gistData.description || 'SAKAI Sync Data',
          public: gistData.public || false,
          files: gistData.files
        })
      });

      if (!response.ok) {
        throw new Error(`Errore creazione Gist: ${response.statusText}`);
      }

      const gist = await response.json();
      console.log('✅ Gist creato:', gist.id);
      return gist;

    } catch (error) {
      console.error('Errore creazione Gist:', error);
      throw error;
    }
  }

  /**
   * Aggiorna un Gist esistente
   * @param {string} gistId - ID del Gist
   * @param {Object} gistData - Nuovi dati del Gist
   * @returns {Promise<Object>} Gist aggiornato
   */
  async updateGist(gistId, gistData) {
    try {
      const response = await this.makeRequest(`/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          ...await this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: gistData.description,
          files: gistData.files
        })
      });

      if (!response.ok) {
        throw new Error(`Errore aggiornamento Gist: ${response.statusText}`);
      }

      const gist = await response.json();
      console.log('✅ Gist aggiornato:', gist.id);
      return gist;

    } catch (error) {
      console.error('Errore aggiornamento Gist:', error);
      throw error;
    }
  }

  /**
   * Ottiene un Gist
   * @param {string} gistId - ID del Gist
   * @returns {Promise<Object>} Dati del Gist
   */
  async getGist(gistId) {
    try {
      const cacheKey = `gist:${gistId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await this.makeRequest(`/gists/${gistId}`, {
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Gist non trovato');
        }
        throw new Error(`Errore recupero Gist: ${response.statusText}`);
      }

      const gist = await response.json();
      this.setCache(cacheKey, gist, 60000); // Cache più breve per Gist
      
      return gist;

    } catch (error) {
      console.error('Errore recupero Gist:', error);
      throw error;
    }
  }

  /**
   * Elimina un Gist
   * @param {string} gistId - ID del Gist
   * @returns {Promise<boolean>} Successo operazione
   */
  async deleteGist(gistId) {
    try {
      const response = await this.makeRequest(`/gists/${gistId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Errore eliminazione Gist: ${response.statusText}`);
      }

      console.log('✅ Gist eliminato:', gistId);
      return true;

    } catch (error) {
      console.error('Errore eliminazione Gist:', error);
      throw error;
    }
  }

  /**
   * Lista i Gist dell'utente
   * @param {Object} options - Opzioni di listaggio
   * @returns {Promise<Array>} Lista Gist
   */
  async listGists(options = {}) {
    try {
      const params = new URLSearchParams({
        per_page: options.perPage || 30,
        page: options.page || 1
      });

      const endpoint = `/gists?${params.toString()}`;
      const response = await this.makeRequest(endpoint, {
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Errore lista Gist: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Errore lista Gist:', error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Parsa URL GitHub per estrarre owner e repo
   * @param {string} url - URL GitHub
   * @returns {Object|null} {owner, repo, branch}
   */
  parseGitHubUrl(url) {
    // Pattern per repository normale
    const repoMatch = url.match(REGEX_PATTERNS.GITHUB_URL);
    if (repoMatch) {
      return {
        owner: repoMatch[1],
        repo: repoMatch[2].replace('.git', ''),
        branch: 'main'
      };
    }

    // Pattern per GitHub Pages
    const pagesMatch = url.match(REGEX_PATTERNS.GITHUB_PAGES);
    if (pagesMatch) {
      return {
        owner: pagesMatch[1],
        repo: pagesMatch[2],
        branch: 'gh-pages',
        isPages: true
      };
    }

    return null;
  }

  /**
   * Verifica se un repository ha GitHub Pages attivo
   * @param {string} owner - Proprietario del repo
   * @param {string} repo - Nome del repository
   * @returns {Promise<Object|null>} Info Pages se attivo
   */
  async getGitHubPages(owner, repo) {
    try {
      const endpoint = `/repos/${owner}/${repo}/pages`;
      const response = await this.makeRequest(endpoint, {
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        return null; // Pages non attivo
      }

      return await response.json();

    } catch (error) {
      return null;
    }
  }

  /**
   * Ottiene le release del repository
   * @param {string} owner - Proprietario del repo
   * @param {string} repo - Nome del repository
   * @returns {Promise<Array>} Lista release
   */
  async getReleases(owner, repo) {
    try {
      const endpoint = `/repos/${owner}/${repo}/releases`;
      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        throw new Error(`Errore recupero release: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Errore recupero release:', error);
      throw error;
    }
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Effettua richiesta HTTP con gestione rate limit
   * @param {string} endpoint - Endpoint API
   * @param {Object} options - Opzioni fetch
   * @returns {Promise<Response>} Response
   */
  async makeRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    // Controllo rate limit
    if (this.rateLimitRemaining <= 10) {
      const resetTime = new Date(this.rateLimitReset * 1000);
      const waitTime = resetTime - new Date();
      
      if (waitTime > 0) {
        console.warn(`⏳ Rate limit GitHub, attesa ${Math.ceil(waitTime / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'SAKAI-App/1.0.0',
        ...options.headers
      }
    });

    // Aggiorna info rate limit
    this.updateRateLimit(response);

    return response;
  }

  /**
   * Aggiorna informazioni rate limit
   * @param {Response} response - Response della richiesta
   */
  updateRateLimit(response) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (remaining) this.rateLimitRemaining = parseInt(remaining);
    if (reset) this.rateLimitReset = parseInt(reset);

    if (this.rateLimitRemaining <= 50) {
      console.warn(`⚠️ Rate limit GitHub basso: ${this.rateLimitRemaining} rimanenti`);
    }
  }

  /**
   * Ottiene headers di autenticazione
   * @returns {Promise<Object>} Headers con token
   */
  async getAuthHeaders() {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Token GitHub non trovato');
    }

    return {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
  }

  /**
   * Salva token in modo sicuro
   * @param {string} token - GitHub token
   */
  async saveToken(token) {
    // In produzione, usa un sistema più sicuro
    const encrypted = btoa(token); // Crittografia base64 semplice
    localStorage.setItem('sakai_github_token', encrypted);
  }

  /**
   * Recupera token salvato
   * @returns {Promise<string|null>} Token se presente
   */
  async getToken() {
    const encrypted = localStorage.getItem('sakai_github_token');
    if (!encrypted) return null;

    try {
      return atob(encrypted);
    } catch (error) {
      console.error('Errore decrittazione token:', error);
      return null;
    }
  }

  /**
   * Rimuove token salvato
   */
  async clearToken() {
    localStorage.removeItem('sakai_github_token');
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
   * @param {number} timeout - Timeout custom (opzionale)
   */
  setCache(key, data, timeout = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout: timeout || this.cacheTimeout
    });
  }

  /**
   * Pulisce cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * SYNC INTEGRATION
   */

  /**
   * Upload dati di sync su Gist
   * @param {Object} syncData - Dati da sincronizzare
   * @param {string} gistId - ID Gist esistente (opzionale)
   * @returns {Promise<Object>} Risultato operazione
   */
  async uploadSyncData(syncData, gistId = null) {
    try {
      const gistContent = {
        description: 'SAKAI Sync Data',
        public: false,
        files: {
          'sakai-sync.json': {
            content: JSON.stringify(syncData, null, 2)
          },
          'sakai-meta.json': {
            content: JSON.stringify({
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              device: navigator.userAgent,
              checksum: await this.generateChecksum(syncData)
            }, null, 2)
          }
        }
      };

      let result;
      if (gistId) {
        result = await this.updateGist(gistId, gistContent);
      } else {
        result = await this.createGist(gistContent);
      }

      return {
        success: true,
        gistId: result.id,
        url: result.html_url,
        size: JSON.stringify(syncData).length
      };

    } catch (error) {
      console.error('Errore upload sync data:', error);
      throw error;
    }
  }

  /**
   * Download dati di sync da Gist
   * @param {string} gistId - ID del Gist
   * @returns {Promise<Object>} Dati scaricati
   */
  async downloadSyncData(gistId) {
    try {
      const gist = await this.getGist(gistId);
      
      const syncFile = gist.files['sakai-sync.json'];
      const metaFile = gist.files['sakai-meta.json'];

      if (!syncFile) {
        throw new Error('File sync non trovato nel Gist');
      }

      const syncData = JSON.parse(syncFile.content);
      let metadata = null;

      if (metaFile) {
        metadata = JSON.parse(metaFile.content);
        
        // Verifica checksum
        const currentChecksum = await this.generateChecksum(syncData);
        if (metadata.checksum && metadata.checksum !== currentChecksum) {
          console.warn('⚠️ Checksum sync data non corrisponde');
        }
      }

      return {
        success: true,
        data: syncData,
        metadata,
        gistInfo: {
          id: gist.id,
          url: gist.html_url,
          updatedAt: gist.updated_at
        }
      };

    } catch (error) {
      console.error('Errore download sync data:', error);
      throw error;
    }
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
   * Ottiene statistiche rate limit
   * @returns {Object} Info rate limit
   */
  getRateLimitInfo() {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset ? new Date(this.rateLimitReset * 1000) : null,
      authenticated: this.authenticated
    };
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

      const endpoint = '/user';
      const response = await this.makeRequest(endpoint, {
        headers: await this.getAuthHeaders()
      });

      return {
        success: response.ok,
        user: response.ok ? await response.json() : null,
        rateLimit: this.getRateLimitInfo()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}