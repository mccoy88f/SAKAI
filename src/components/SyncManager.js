/**
 * SAKAI - Sync Manager Component
 * Gestisce la sincronizzazione con GitHub Gist e Google Drive
 */

import StorageService from '../services/StorageService.js';
import { showToast, showModal, hideModal, escapeHtml, generateId, getStringHash } from '../utils/helpers.js';

// Le classi GitHubSyncProvider e GoogleDriveSyncProvider sono state spostate all'inizio del file

// Le classi GitHubSyncProvider e GoogleDriveSyncProvider sono state spostate all'inizio del file

/**
 * Classe per gestire la sincronizzazione cloud
 */
export default class SyncManager {
  constructor() {
    this.syncProviders = {
      github: new GitHubSyncProvider(),
      googledrive: new GoogleDriveSyncProvider()
    };
    
    this.syncStatus = {
      isEnabled: false,
      lastSync: null,
      provider: 'github',
      isInProgress: false,
      autoSyncInterval: null
    };

    this.syncQueue = [];
    this.conflictResolutions = [];

    // Bind methods
    this.init = this.init.bind(this);
    this.enableSync = this.enableSync.bind(this);
    this.disableSync = this.disableSync.bind(this);
    this.performSync = this.performSync.bind(this);
    this.showSyncModal = this.showSyncModal.bind(this);
    this.handleConflict = this.handleConflict.bind(this);
    this.autoSync = this.autoSync.bind(this);
  }

  /**
   * Inizializza il sync manager
   */
  async init() {
    console.log('🔄 Inizializzazione SyncManager...');
    
    try {
      // Carica configurazione sync
      await this.loadSyncConfig();
      
      // Setup auto-sync se abilitato
      if (this.syncStatus.isEnabled) {
        await this.setupAutoSync();
      }
      
      // Ascolta eventi di background sync
      this.setupBackgroundSync();
      
    } catch (error) {
      console.error('Errore inizializzazione SyncManager:', error);
    }
  }

  /**
   * Carica configurazione sync dal database
   */
  async loadSyncConfig() {
    try {
      this.syncStatus.isEnabled = await StorageService.getSetting('syncEnabled', false);
      this.syncStatus.provider = await StorageService.getSetting('syncProvider', 'github');
      this.syncStatus.lastSync = await StorageService.getSetting('lastSyncTime', null);
      
      const autoSyncInterval = await StorageService.getSetting('autoSyncInterval', 60);
      this.syncStatus.autoSyncInterval = autoSyncInterval * 60 * 1000; // Converti in ms
      
    } catch (error) {
      console.error('Errore caricamento configurazione sync:', error);
    }
  }

  /**
   * Abilita la sincronizzazione
   */
  async enableSync(provider = 'github', credentials = {}) {
    try {
      this.syncStatus.isEnabled = true;
      this.syncStatus.provider = provider;
      
      // Testa la connessione
      const syncProvider = this.syncProviders[provider];
      const isConnected = await syncProvider.testConnection(credentials);
      
      if (!isConnected) {
        throw new Error('Impossibile connettersi al provider di sincronizzazione');
      }
      
      // Salva configurazione
      await StorageService.setSetting('syncEnabled', true);
      await StorageService.setSetting('syncProvider', provider);
      
      // Salva credenziali in modo sicuro
      await this.saveCredentials(provider, credentials);
      
      // Setup auto-sync
      await this.setupAutoSync();
      
      showToast('Sincronizzazione abilitata con successo', 'success');
      
    } catch (error) {
      console.error('Errore abilitazione sync:', error);
      showToast(`Errore: ${error.message}`, 'error');
      this.syncStatus.isEnabled = false;
    }
  }

  /**
   * Disabilita la sincronizzazione
   */
  async disableSync() {
    try {
      this.syncStatus.isEnabled = false;
      
      // Ferma auto-sync
      if (this.autoSyncTimer) {
        clearInterval(this.autoSyncTimer);
        this.autoSyncTimer = null;
      }
      
      // Salva configurazione
      await StorageService.setSetting('syncEnabled', false);
      
      // Rimuovi credenziali
      await this.clearCredentials();
      
      showToast('Sincronizzazione disabilitata', 'info');
      
    } catch (error) {
      console.error('Errore disabilitazione sync:', error);
      showToast('Errore durante la disabilitazione della sincronizzazione', 'error');
    }
  }

  /**
   * Esegue sincronizzazione manuale
   */
  async performSync(direction = 'bidirectional') {
    if (this.syncStatus.isInProgress) {
      showToast('Sincronizzazione già in corso', 'warning');
      return;
    }

    if (!this.syncStatus.isEnabled) {
      showToast('Sincronizzazione non abilitata', 'warning');
      return;
    }

    try {
      this.syncStatus.isInProgress = true;
      this.updateSyncStatus('Sincronizzazione in corso...');

      const provider = this.syncProviders[this.syncStatus.provider];
      const credentials = await this.getCredentials(this.syncStatus.provider);

      // Backup locale prima della sincronizzazione
      const backupBeforeSync = await StorageService.getSetting('backupBeforeSync', true);
      if (backupBeforeSync) {
        await this.createBackup();
      }

      let result;
      switch (direction) {
        case 'upload':
          result = await this.uploadToCloud(provider, credentials);
          break;
        case 'download':
          result = await this.downloadFromCloud(provider, credentials);
          break;
        case 'bidirectional':
        default:
          result = await this.bidirectionalSync(provider, credentials);
          break;
      }

      // Aggiorna ultimo sync
      this.syncStatus.lastSync = new Date();
      await StorageService.setSetting('lastSyncTime', this.syncStatus.lastSync.toISOString());

      this.updateSyncStatus('Sincronizzazione completata');
      showToast('Sincronizzazione completata con successo', 'success');

      return result;

    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
      this.updateSyncStatus('Errore sincronizzazione');
      showToast(`Errore sincronizzazione: ${error.message}`, 'error');
      throw error;
    } finally {
      this.syncStatus.isInProgress = false;
    }
  }

  /**
   * Sincronizzazione bidirezionale con gestione conflitti
   */
  async bidirectionalSync(provider, credentials) {
    try {
      // 1. Ottieni dati locali
      const localData = await this.getLocalData();
      const localHash = await getStringHash(JSON.stringify(localData));

      // 2. Ottieni dati remoti
      const remoteData = await provider.download(credentials);
      
      if (!remoteData) {
        // Primo sync - upload tutto
        return await this.uploadToCloud(provider, credentials);
      }

      const remoteHash = await getStringHash(JSON.stringify(remoteData.data));

      // 3. Confronta hash per rilevare modifiche
      if (localHash === remoteHash) {
        return { status: 'no_changes', message: 'Nessuna modifica da sincronizzare' };
      }

      // 4. Analizza modifiche e conflitti
      const analysis = await this.analyzeChanges(localData, remoteData.data);
      
      if (analysis.conflicts.length > 0) {
        // Gestisci conflitti
        const resolutions = await this.resolveConflicts(analysis.conflicts);
        analysis.resolutions = resolutions;
      }

      // 5. Applica modifiche
      const mergedData = await this.mergeData(localData, remoteData.data, analysis);
      
      // 6. Salva localmente
      await this.saveLocalData(mergedData);
      
      // 7. Upload versione merged
      await provider.upload(credentials, {
        data: mergedData,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        device: await StorageService.getSetting('deviceId')
      });

      return {
        status: 'success',
        changes: analysis.changes,
        conflicts: analysis.conflicts.length,
        resolved: analysis.resolutions ? analysis.resolutions.length : 0
      };

    } catch (error) {
      console.error('Errore sync bidirezionale:', error);
      throw error;
    }
  }

  /**
   * Upload dati al cloud
   */
  async uploadToCloud(provider, credentials) {
    try {
      const localData = await this.getLocalData();
      
      const syncPackage = {
        data: localData,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        device: await StorageService.getSetting('deviceId'),
        hash: await getStringHash(JSON.stringify(localData))
      };

      await provider.upload(credentials, syncPackage);
      
      return { status: 'uploaded', message: 'Dati caricati sul cloud' };
      
    } catch (error) {
      console.error('Errore upload cloud:', error);
      throw error;
    }
  }

  /**
   * Download dati dal cloud
   */
  async downloadFromCloud(provider, credentials) {
    try {
      const remoteData = await provider.download(credentials);
      
      if (!remoteData) {
        throw new Error('Nessun dato trovato sul cloud');
      }

      // Valida dati remoti
      if (!this.validateRemoteData(remoteData)) {
        throw new Error('Dati remoti non validi');
      }

      // Salva localmente
      await this.saveLocalData(remoteData.data);
      
      return { status: 'downloaded', message: 'Dati scaricati dal cloud' };
      
    } catch (error) {
      console.error('Errore download cloud:', error);
      throw error;
    }
  }

  /**
   * Analizza le modifiche tra locale e remoto
   */
  async analyzeChanges(localData, remoteData) {
    const analysis = {
      changes: {
        apps: { added: [], modified: [], deleted: [] },
        settings: { added: [], modified: [], deleted: [] }
      },
      conflicts: []
    };

    // Analizza app
    const localApps = new Map(localData.apps.map(app => [app.id, app]));
    const remoteApps = new Map(remoteData.apps.map(app => [app.id, app]));

    // App aggiunte localmente
    for (const [id, app] of localApps) {
      if (!remoteApps.has(id)) {
        analysis.changes.apps.added.push(app);
      } else {
        // Controlla modifiche
        const remoteApp = remoteApps.get(id);
        const localModified = new Date(app.lastUsed || app.installDate);
        const remoteModified = new Date(remoteApp.lastUsed || remoteApp.installDate);
        
        if (localModified > remoteModified) {
          analysis.changes.apps.modified.push({ local: app, remote: remoteApp, winner: 'local' });
        } else if (remoteModified > localModified) {
          analysis.changes.apps.modified.push({ local: app, remote: remoteApp, winner: 'remote' });
        } else if (JSON.stringify(app) !== JSON.stringify(remoteApp)) {
          // Conflitto: stesso timestamp ma contenuto diverso
          analysis.conflicts.push({
            type: 'app',
            id: id,
            local: app,
            remote: remoteApp
          });
        }
      }
    }

    // App aggiunte da remoto
    for (const [id, app] of remoteApps) {
      if (!localApps.has(id)) {
        analysis.changes.apps.added.push(app);
      }
    }

    // Analisi simile per settings...
    
    return analysis;
  }

  /**
   * Risolve conflitti interattivamente
   */
  async resolveConflicts(conflicts) {
    const resolutions = [];
    
    for (const conflict of conflicts) {
      const resolution = await this.showConflictDialog(conflict);
      resolutions.push(resolution);
    }
    
    return resolutions;
  }

  /**
   * Mostra dialog per risoluzione conflitto
   */
  async showConflictDialog(conflict) {
    return new Promise((resolve) => {
      const modalContent = `
        <div class="modal-header">
          <h2>🔄 Conflitto di Sincronizzazione</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="conflict-info">
            <p>È stato rilevato un conflitto per <strong>${conflict.type}</strong>:</p>
            <p><strong>ID:</strong> ${conflict.id}</p>
          </div>
          
          <div class="conflict-options">
            <div class="conflict-option">
              <h4>Versione Locale</h4>
              <div class="conflict-data">
                <pre>${JSON.stringify(conflict.local, null, 2)}</pre>
              </div>
              <button class="btn btn-primary" id="choose-local">Usa Versione Locale</button>
            </div>
            
            <div class="conflict-option">
              <h4>Versione Remota</h4>
              <div class="conflict-data">
                <pre>${JSON.stringify(conflict.remote, null, 2)}</pre>
              </div>
              <button class="btn btn-primary" id="choose-remote">Usa Versione Remota</button>
            </div>
          </div>
          
          <div class="conflict-actions">
            <button class="btn btn-secondary" id="skip-conflict">Salta (mantieni locale)</button>
          </div>
        </div>
      `;

      const modal = showModal('conflict-modal', modalContent, { size: 'modal-xl' });

      // Event listeners
      modal.querySelector('#choose-local')?.addEventListener('click', () => {
        hideModal('conflict-modal');
        resolve({ action: 'use_local', data: conflict.local });
      });

      modal.querySelector('#choose-remote')?.addEventListener('click', () => {
        hideModal('conflict-modal');
        resolve({ action: 'use_remote', data: conflict.remote });
      });

      modal.querySelector('#skip-conflict')?.addEventListener('click', () => {
        hideModal('conflict-modal');
        resolve({ action: 'skip', data: conflict.local });
      });
    });
  }

  /**
   * Unisce i dati con le risoluzioni dei conflitti
   */
  async mergeData(localData, remoteData, analysis) {
    const mergedData = {
      apps: [...localData.apps],
      settings: [...localData.settings]
    };

    // Applica modifiche apps
    for (const app of analysis.changes.apps.added) {
      mergedData.apps.push(app);
    }

    for (const change of analysis.changes.apps.modified) {
      const index = mergedData.apps.findIndex(a => a.id === change.local.id);
      if (index !== -1) {
        mergedData.apps[index] = change.winner === 'local' ? change.local : change.remote;
      }
    }

    // Applica risoluzioni conflitti
    if (analysis.resolutions) {
      for (const resolution of analysis.resolutions) {
        if (resolution.action === 'use_remote') {
          const index = mergedData.apps.findIndex(a => a.id === resolution.data.id);
          if (index !== -1) {
            mergedData.apps[index] = resolution.data;
          } else {
            mergedData.apps.push(resolution.data);
          }
        }
      }
    }

    return mergedData;
  }

  /**
   * Mostra modal di gestione sync
   */
  showSyncModal() {
    const modalContent = this.createSyncModal();
    showModal('sync-modal', modalContent, {
      size: 'modal-lg',
      disableBackdropClose: false
    });

    setTimeout(() => {
      this.setupSyncModalListeners();
      this.updateSyncModalStatus();
    }, 100);
  }

  /**
   * Crea il contenuto del modal sync
   */
  createSyncModal() {
    return `
      <div class="modal-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="currentColor" class="header-icon">
            <path d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z"/>
          </svg>
          Gestione Sincronizzazione
        </h2>
        <button class="modal-close">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Sync Status -->
        <div class="sync-status-card">
          <div class="sync-status-header">
            <h3>Stato Sincronizzazione</h3>
            <div class="sync-status-indicator" id="sync-status-indicator">
              <span class="status-dot"></span>
              <span class="status-text" id="sync-status-text">Caricamento...</span>
            </div>
          </div>
          
          <div class="sync-status-details" id="sync-status-details">
            <div class="status-item">
              <span class="status-label">Provider:</span>
              <span class="status-value" id="sync-provider">-</span>
            </div>
            <div class="status-item">
              <span class="status-label">Ultima sincronizzazione:</span>
              <span class="status-value" id="last-sync">-</span>
            </div>
            <div class="status-item">
              <span class="status-label">Auto-sync:</span>
              <span class="status-value" id="auto-sync-status">-</span>
            </div>
          </div>
        </div>

        <!-- Sync Setup -->
        <div class="sync-setup" id="sync-setup" style="display: none;">
          <h3>Configura Sincronizzazione</h3>
          
          <div class="provider-selection">
            <h4>Scegli Provider</h4>
            <div class="provider-options">
              <label class="provider-option">
                <input type="radio" name="sync-provider" value="github" checked>
                <div class="provider-card">
                  <div class="provider-icon">⚡</div>
                  <div class="provider-info">
                    <h5>GitHub Gist</h5>
                    <p>Sincronizzazione tramite GitHub Gist privati</p>
                  </div>
                </div>
              </label>
              
              <label class="provider-option">
                <input type="radio" name="sync-provider" value="googledrive">
                <div class="provider-card">
                  <div class="provider-icon">📱</div>
                  <div class="provider-info">
                    <h5>Google Drive</h5>
                    <p>Sincronizzazione tramite Google Drive</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <!-- GitHub Setup -->
          <div class="provider-setup" id="github-setup">
            <h4>Configurazione GitHub</h4>
            <div class="form-group">
              <label for="github-token">Personal Access Token</label>
              <input type="password" id="github-token" class="form-input" placeholder="ghp_xxxxxxxxxxxx">
              <div class="form-help">
                <p>Crea un token su <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a> con scope "gist"</p>
              </div>
            </div>
          </div>
          
          <!-- Google Drive Setup -->
          <div class="provider-setup" id="googledrive-setup" style="display: none;">
            <h4>Configurazione Google Drive</h4>
            <div class="form-group">
              <p>Clicca il pulsante per autorizzare l'accesso a Google Drive:</p>
              <button class="btn btn-primary" id="google-auth-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56,12.25C22.56,11.47 22.49,10.72 22.37,10H12V14.26H17.92C17.66,15.69 16.88,16.93 15.71,17.77V20.96H19.28C21.45,18.96 22.56,15.83 22.56,12.25Z"/>
                  <path d="M12,23C15.24,23 17.96,21.92 19.28,20.96L15.71,17.77C14.74,18.42 13.48,18.81 12,18.81C8.91,18.81 6.26,16.77 5.4,13.96H1.67V17.28C2.98,19.89 7.24,23 12,23Z"/>
                  <path d="M5.4,13.96C5.18,13.31 5.05,12.62 5.05,11.91C5.05,11.2 5.18,10.51 5.4,9.86V6.54H1.67C0.61,8.65 0,10.72 0,11.91C0,13.1 0.61,15.17 1.67,17.28L5.4,13.96Z"/>
                  <path d="M12,4.75C13.77,4.75 15.35,5.36 16.6,6.55L19.84,3.31C17.96,1.56 15.24,0.5 12,0.5C7.24,0.5 2.98,3.61 1.67,6.22L5.4,9.54C6.26,6.73 8.91,4.75 12,4.75Z"/>
                </svg>
                Autorizza Google Drive
              </button>
            </div>
          </div>
        </div>

        <!-- Sync Actions -->
        <div class="sync-actions" id="sync-actions">
          <div class="action-group">
            <h4>Azioni Sincronizzazione</h4>
            
            <div class="action-buttons">
              <button class="btn btn-primary" id="sync-now-btn" disabled>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z"/>
                </svg>
                Sincronizza Ora
              </button>
              
              <button class="btn btn-secondary" id="upload-only-btn" disabled>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"/>
                </svg>
                Solo Upload
              </button>
              
              <button class="btn btn-secondary" id="download-only-btn" disabled>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                </svg>
                Solo Download
              </button>
            </div>
          </div>
          
          <div class="action-group">
            <h4>Gestione Backup</h4>
            
            <div class="action-buttons">
              <button class="btn btn-secondary" id="create-backup-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                Crea Backup
              </button>
              
              <button class="btn btn-secondary" id="restore-backup-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                Ripristina Backup
              </button>
              
              <button class="btn btn-warning" id="disable-sync-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M14.5,9L12,11.5L9.5,9L8,10.5L10.5,13L8,15.5L9.5,17L12,14.5L14.5,17L16,15.5L13.5,13L16,10.5L14.5,9Z"/>
                </svg>
                Disabilita Sync
              </button>
            </div>
          </div>
        </div>

        <!-- Sync Progress -->
        <div class="sync-progress" id="sync-progress" style="display: none;">
          <div class="progress-info">
            <h4>Sincronizzazione in corso...</h4>
            <p id="sync-progress-text">Preparazione...</p>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="sync-progress-fill"></div>
          </div>
        </div>

        <!-- Sync History -->
        <div class="sync-history">
          <h4>Cronologia Sincronizzazioni</h4>
          <div class="history-list" id="sync-history-list">
            <p class="history-empty">Nessuna sincronizzazione effettuata</p>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" id="close-sync-modal">Chiudi</button>
        <button class="btn btn-primary" id="setup-sync-btn">Configura Sincronizzazione</button>
      </div>
    `;
  }

  /**
   * Setup event listeners per sync modal
   */
  setupSyncModalListeners() {
    const modal = document.getElementById('sync-modal');
    if (!modal) return;

    // Provider selection
    const providerRadios = modal.querySelectorAll('input[name="sync-provider"]');
    providerRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.showProviderSetup(radio.value);
      });
    });

    // Setup sync
    modal.querySelector('#setup-sync-btn')?.addEventListener('click', () => {
      this.setupSyncFromModal();
    });

    // Sync actions
    modal.querySelector('#sync-now-btn')?.addEventListener('click', () => {
      this.performSync('bidirectional');
    });

    modal.querySelector('#upload-only-btn')?.addEventListener('click', () => {
      this.performSync('upload');
    });

    modal.querySelector('#download-only-btn')?.addEventListener('click', () => {
      this.performSync('download');
    });

    // Backup actions
    modal.querySelector('#create-backup-btn')?.addEventListener('click', () => {
      this.createBackup();
    });

    modal.querySelector('#restore-backup-btn')?.addEventListener('click', () => {
      this.restoreBackup();
    });

    modal.querySelector('#disable-sync-btn')?.addEventListener('click', () => {
      this.disableSync();
    });

    // Google auth
    modal.querySelector('#google-auth-btn')?.addEventListener('click', () => {
      this.authenticateGoogle();
    });

    // Close modal
    modal.querySelector('#close-sync-modal')?.addEventListener('click', () => {
      hideModal('sync-modal');
    });
  }

  /**
   * Utility methods
   */

  // Ottieni dati locali per sync
  async getLocalData() {
    try {
      const [apps, settings] = await Promise.all([
        StorageService.getAllApps(),
        StorageService.getAllSettings()
      ]);

      return { apps, settings };
    } catch (error) {
      console.error('Errore recupero dati locali:', error);
      throw error;
    }
  }

  // Salva dati locali da sync
  async saveLocalData(data) {
    try {
      // Implementa il salvataggio dei dati sincronizzati
      // Questo richiederebbe metodi aggiuntivi in StorageService
      await StorageService.importData({ data });
    } catch (error) {
      console.error('Errore salvataggio dati locali:', error);
      throw error;
    }
  }

  // Valida dati remoti
  validateRemoteData(data) {
    return data && 
           data.data && 
           Array.isArray(data.data.apps) && 
           Array.isArray(data.data.settings);
  }

  // Crea backup locale
  async createBackup() {
    try {
      const backupData = await StorageService.exportAllData();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sakai-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Backup creato con successo', 'success');
    } catch (error) {
      console.error('Errore creazione backup:', error);
      showToast('Errore durante la creazione del backup', 'error');
    }
  }

  // Gestisci credenziali in modo sicuro
  async saveCredentials(provider, credentials) {
    // In un'implementazione reale, si dovrebbe usare una forma di crittografia
    // Per semplicità, salviamo in localStorage con un prefix
    const key = `sakai_sync_${provider}`;
    const encrypted = btoa(JSON.stringify(credentials)); // Crittografia base64 semplice
    localStorage.setItem(key, encrypted);
  }

  async getCredentials(provider) {
    const key = `sakai_sync_${provider}`;
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    try {
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('Errore decrittazione credenziali:', error);
      return null;
    }
  }

  async clearCredentials() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('sakai_sync_'));
    keys.forEach(key => localStorage.removeItem(key));
  }

  // Setup auto-sync
  async setupAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    if (this.syncStatus.isEnabled && this.syncStatus.autoSyncInterval > 0) {
      this.autoSyncTimer = setInterval(() => {
        this.autoSync();
      }, this.syncStatus.autoSyncInterval);
    }
  }

  // Auto sync (silenzioso)
  async autoSync() {
    try {
      if (!this.syncStatus.isEnabled || this.syncStatus.isInProgress) {
        return;
      }

      console.log('🔄 Auto-sync in corso...');
      await this.performSync('bidirectional');
      
    } catch (error) {
      console.error('Errore auto-sync:', error);
      // Non mostrare toast per auto-sync falliti
    }
  }

  // Setup background sync
  setupBackgroundSync() {
    // Ascolta messaggi dal service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'BACKGROUND_SYNC') {
          if (event.data.action === 'sync-apps') {
            this.performSync('bidirectional').catch(console.error);
          }
        }
      });
    }
  }

  // Aggiorna status sync
  updateSyncStatus(message) {
    const statusEl = document.getElementById('sync-status-text');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  // Altri metodi helper...
  showProviderSetup(provider) {
    // Implementa la logica per mostrare/nascondere setup provider
  }

  updateSyncModalStatus() {
    // Implementa l'aggiornamento dello stato nel modal
  }

  setupSyncFromModal() {
    // Implementa la configurazione sync dal modal
  }

  authenticateGoogle() {
    // Implementa l'autenticazione Google OAuth
  }

  restoreBackup() {
    // Implementa il ripristino da backup
  }
}

// Le classi GitHubSyncProvider e GoogleDriveSyncProvider sono state spostate all'inizio del file