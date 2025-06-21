/**
 * SAKAI - Settings Panel Component
 * Gestisce tutte le impostazioni dell'applicazione
 */

import StorageService from '../services/StorageService.js';
import { showToast, showModal, hideModal, escapeHtml, formatFileSize, getDeviceInfo } from '../utils/helpers.js';

/**
 * Classe per gestire il pannello delle impostazioni
 */
export default class SettingsPanel {
  constructor() {
    this.currentSettings = {};
    this.defaultSettings = {
      // Generali
      language: 'it',
      theme: 'auto', // 'light', 'dark', 'auto'
      
      // Launcher
      defaultLaunchMode: 'iframe', // 'iframe', 'newpage'
      maxConcurrentApps: 5,
      showAppTooltips: true,
      enableKeyboardShortcuts: true,
      autoUpdateApps: false,
      
      // UI/UX
      viewMode: 'grid', // 'grid', 'list'
      sortBy: 'lastUsed', // 'lastUsed', 'name', 'installDate', 'category'
      showWelcomeMessage: true,
      enableAnimations: true,
      compactMode: false,
      
      // Sync & Backup
      syncEnabled: false,
      syncProvider: 'github', // 'github', 'googledrive'
      autoSyncInterval: 60, // minuti
      backupBeforeSync: true,
      
      // Privacy & Security
      analyticsEnabled: false,
      crashReportingEnabled: true,
      allowTelemetry: false,
      validateAppsOnLaunch: true,
      sandboxMode: 'strict', // 'strict', 'moderate', 'permissive'
      
      // Performance
      enableServiceWorker: true,
      cacheStrategy: 'aggressive', // 'aggressive', 'moderate', 'minimal'
      preloadApps: false,
      lazyLoadImages: true,
      
      // Developer
      enableDebugMode: false,
      showConsoleErrors: false,
      enableExperimentalFeatures: false
    };

    // Bind methods
    this.init = this.init.bind(this);
    this.showModal = this.showModal.bind(this);
    this.loadSettings = this.loadSettings.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.resetSettings = this.resetSettings.bind(this);
    this.exportSettings = this.exportSettings.bind(this);
    this.importSettings = this.importSettings.bind(this);
  }

  /**
   * Inizializza il pannello impostazioni
   */
  async init() {
    console.log('🔧 Inizializzazione SettingsPanel...');
    await this.loadSettings();
    this.applySettings();
  }

  /**
   * Carica le impostazioni dal database
   */
  async loadSettings() {
    try {
      const savedSettings = await StorageService.getAllSettings();
      this.currentSettings = { ...this.defaultSettings, ...savedSettings };
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error);
      this.currentSettings = { ...this.defaultSettings };
    }
  }

  /**
   * Applica le impostazioni all'interfaccia
   */
  applySettings() {
    // Tema
    this.applyTheme(this.currentSettings.theme);
    
    // Lingua
    this.applyLanguage(this.currentSettings.language);
    
    // Animazioni
    this.applyAnimations(this.currentSettings.enableAnimations);
    
    // Modalità compatta
    this.applyCompactMode(this.currentSettings.compactMode);
    
    // Debug mode
    this.applyDebugMode(this.currentSettings.enableDebugMode);
  }

  /**
   * Mostra il modal delle impostazioni
   */
  showModal() {
    const modalContent = this.createSettingsModal();
    showModal('settings-modal', modalContent, {
      size: 'modal-xl',
      disableBackdropClose: false
    });

    // Setup event listeners dopo che il modal è stato creato
    setTimeout(() => {
      this.setupModalEventListeners();
      this.populateForm();
    }, 100);
  }

  /**
   * Crea il contenuto del modal delle impostazioni
   */
  createSettingsModal() {
    return `
      <div class="modal-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="currentColor" class="header-icon">
            <path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11L19.5,12L19.43,13L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z"/>
          </svg>
          Impostazioni SAKAI
        </h2>
        <button class="modal-close">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Settings Navigation -->
        <div class="settings-layout">
          <nav class="settings-nav">
            <ul class="settings-nav-list">
              <li class="settings-nav-item">
                <button class="settings-nav-btn active" data-section="general">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/>
                  </svg>
                  Generale
                </button>
              </li>
              <li class="settings-nav-item">
                <button class="settings-nav-btn" data-section="launcher">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                  </svg>
                  Launcher
                </button>
              </li>
              <li class="settings-nav-item">
                <button class="settings-nav-btn" data-section="interface">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15Z"/>
                  </svg>
                  Interfaccia
                </button>
              </li>
              <li class="settings-nav-item">
                <button class="settings-nav-btn" data-section="sync">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z"/>
                  </svg>
                  Sincronizzazione
                </button>
              </li>
              <li class="settings-nav-item">
                <button class="settings-nav-btn" data-section="privacy">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V18H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
                  </svg>
                  Privacy & Sicurezza
                </button>
              </li>
              <li class="settings-nav-item">
                <button class="settings-nav-btn" data-section="performance">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12H16A4,4 0 0,0 12,8V6Z"/>
                  </svg>
                  Performance
                </button>
              </li>
              <li class="settings-nav-item">
                <button class="settings-nav-btn" data-section="advanced">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C9,20 10,19 11,17H12C14,15 16,13 17,8M18.5,2C16.7,2 15.14,2.9 14.22,4.22L15.63,5.63C16.07,5 16.72,4.5 17.5,4.5C18.61,4.5 19.5,5.39 19.5,6.5C19.5,7.28 19,7.93 18.37,8.37L19.78,9.78C21.1,8.86 22,7.3 22,5.5C22,3.57 20.43,2 18.5,2Z"/>
                  </svg>
                  Avanzate
                </button>
              </li>
            </ul>
          </nav>

          <!-- Settings Content -->
          <div class="settings-content">
            
            <!-- General Section -->
            <div class="settings-section active" id="section-general">
              <h3>Impostazioni Generali</h3>
              
              <div class="settings-group">
                <h4>Localizzazione</h4>
                
                <div class="setting-item">
                  <label for="setting-language">Lingua</label>
                  <select id="setting-language" class="form-input">
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                  <p class="setting-description">Lingua dell'interfaccia utente</p>
                </div>
                
                <div class="setting-item">
                  <label for="setting-theme">Tema</label>
                  <select id="setting-theme" class="form-input">
                    <option value="auto">Automatico (segue sistema)</option>
                    <option value="light">Chiaro</option>
                    <option value="dark">Scuro</option>
                  </select>
                  <p class="setting-description">Aspetto dell'interfaccia</p>
                </div>
              </div>
              
              <div class="settings-group">
                <h4>Comportamento</h4>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-welcomeMessage">
                    <span class="checkmark"></span>
                    Mostra messaggio di benvenuto
                  </label>
                  <p class="setting-description">Visualizza il messaggio al primo avvio</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-keyboardShortcuts">
                    <span class="checkmark"></span>
                    Abilita scorciatoie da tastiera
                  </label>
                  <p class="setting-description">Ctrl+K per ricerca, Ctrl+N per nuova app, etc.</p>
                </div>
              </div>
            </div>

            <!-- Launcher Section -->
            <div class="settings-section" id="section-launcher">
              <h3>Configurazione Launcher</h3>
              
              <div class="settings-group">
                <h4>Modalità di Apertura App</h4>
                
                <div class="setting-item">
                  <label for="setting-launchMode">Modalità predefinita</label>
                  <select id="setting-launchMode" class="form-input">
                    <option value="iframe">Finestra modale (sicura)</option>
                    <option value="newpage">Nuova pagina del browser</option>
                  </select>
                  <p class="setting-description">Come aprire le app per default</p>
                </div>
                
                <div class="setting-item">
                  <label for="setting-maxApps">App concorrenti massime</label>
                  <input type="number" id="setting-maxApps" class="form-input" min="1" max="20" value="5">
                  <p class="setting-description">Numero massimo di app aperte contemporaneamente</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-autoUpdateApps">
                    <span class="checkmark"></span>
                    Aggiornamento automatico app
                  </label>
                  <p class="setting-description">Controlla automaticamente aggiornamenti da GitHub</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-validateOnLaunch">
                    <span class="checkmark"></span>
                    Valida app al lancio
                  </label>
                  <p class="setting-description">Controlla integrità delle app prima dell'esecuzione</p>
                </div>
              </div>
              
              <div class="settings-group">
                <h4>Sandbox e Sicurezza</h4>
                
                <div class="setting-item">
                  <label for="setting-sandboxMode">Modalità sandbox</label>
                  <select id="setting-sandboxMode" class="form-input">
                    <option value="strict">Rigorosa (massima sicurezza)</option>
                    <option value="moderate">Moderata (bilanciata)</option>
                    <option value="permissive">Permissiva (più libertà)</option>
                  </select>
                  <p class="setting-description">Livello di restrizioni per l'esecuzione delle app</p>
                </div>
              </div>
            </div>

            <!-- Interface Section -->
            <div class="settings-section" id="section-interface">
              <h3>Configurazione Interfaccia</h3>
              
              <div class="settings-group">
                <h4>Visualizzazione</h4>
                
                <div class="setting-item">
                  <label for="setting-viewMode">Vista predefinita</label>
                  <select id="setting-viewMode" class="form-input">
                    <option value="grid">Griglia</option>
                    <option value="list">Lista</option>
                  </select>
                  <p class="setting-description">Come visualizzare le app nella dashboard</p>
                </div>
                
                <div class="setting-item">
                  <label for="setting-sortBy">Ordinamento predefinito</label>
                  <select id="setting-sortBy" class="form-input">
                    <option value="lastUsed">Ultimo utilizzo</option>
                    <option value="name">Nome A-Z</option>
                    <option value="installDate">Data installazione</option>
                    <option value="category">Categoria</option>
                  </select>
                  <p class="setting-description">Criterio di ordinamento delle app</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-compactMode">
                    <span class="checkmark"></span>
                    Modalità compatta
                  </label>
                  <p class="setting-description">Interfaccia più densa con meno spazi</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-enableAnimations">
                    <span class="checkmark"></span>
                    Abilita animazioni
                  </label>
                  <p class="setting-description">Transizioni ed effetti animati</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-showTooltips">
                    <span class="checkmark"></span>
                    Mostra tooltip
                  </label>
                  <p class="setting-description">Suggerimenti al passaggio del mouse</p>
                </div>
              </div>
            </div>

            <!-- Sync Section -->
            <div class="settings-section" id="section-sync">
              <h3>Sincronizzazione e Backup</h3>
              
              <div class="settings-group">
                <h4>Configurazione Cloud</h4>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-syncEnabled">
                    <span class="checkmark"></span>
                    Abilita sincronizzazione
                  </label>
                  <p class="setting-description">Sincronizza app e impostazioni su cloud</p>
                </div>
                
                <div class="setting-item">
                  <label for="setting-syncProvider">Provider di sincronizzazione</label>
                  <select id="setting-syncProvider" class="form-input">
                    <option value="github">GitHub Gist</option>
                    <option value="googledrive">Google Drive</option>
                  </select>
                  <p class="setting-description">Servizio cloud per la sincronizzazione</p>
                </div>
                
                <div class="setting-item">
                  <label for="setting-syncInterval">Intervallo auto-sync (minuti)</label>
                  <input type="number" id="setting-syncInterval" class="form-input" min="5" max="1440" value="60">
                  <p class="setting-description">Frequenza di sincronizzazione automatica</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-backupBeforeSync">
                    <span class="checkmark"></span>
                    Backup prima della sincronizzazione
                  </label>
                  <p class="setting-description">Crea backup locale prima di ogni sync</p>
                </div>
              </div>
              
              <div class="settings-group">
                <h4>Gestione Dati</h4>
                
                <div class="setting-actions">
                  <button class="btn btn-secondary" id="export-settings-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    Esporta Impostazioni
                  </button>
                  
                  <button class="btn btn-secondary" id="import-settings-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    Importa Impostazioni
                  </button>
                  
                  <button class="btn btn-warning" id="reset-settings-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,4C14.1,4 16.1,4.8 17.6,6.3C20.7,9.4 20.7,14.5 17.6,17.6C15.8,19.5 13.3,20.2 10.9,19.9L11.4,17.9C13.1,18.1 14.9,17.5 16.2,16.2C18.5,13.9 18.5,10.1 16.2,7.7C15.1,6.6 13.5,6 12,6V10.6L7,5.6L12,0.6V4M6.3,17.6C3.7,15 3.3,11 5.1,7.9L6.6,9.4C5.5,11.6 5.9,14.4 7.8,16.2C8.3,16.7 8.9,17.1 9.6,17.4L9,19.4C8,19 7.1,18.4 6.3,17.6Z"/>
                    </svg>
                    Ripristina Predefinite
                  </button>
                </div>
              </div>
            </div>

            <!-- Privacy Section -->
            <div class="settings-section" id="section-privacy">
              <h3>Privacy e Sicurezza</h3>
              
              <div class="settings-group">
                <h4>Raccolta Dati</h4>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-analyticsEnabled">
                    <span class="checkmark"></span>
                    Abilita analytics
                  </label>
                  <p class="setting-description">Raccolta dati anonimi per migliorare l'app</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-crashReporting">
                    <span class="checkmark"></span>
                    Report errori automatici
                  </label>
                  <p class="setting-description">Invia automaticamente report degli errori</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-telemetry">
                    <span class="checkmark"></span>
                    Telemetria di utilizzo
                  </label>
                  <p class="setting-description">Condividi statistiche d'uso anonime</p>
                </div>
              </div>
              
              <div class="settings-group">
                <h4>Gestione Privacy</h4>
                
                <div class="setting-actions">
                  <button class="btn btn-secondary" id="clear-cache-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                    Svuota Cache
                  </button>
                  
                  <button class="btn btn-warning" id="clear-all-data-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                    Elimina Tutti i Dati
                  </button>
                </div>
              </div>
            </div>

            <!-- Performance Section -->
            <div class="settings-section" id="section-performance">
              <h3>Performance e Cache</h3>
              
              <div class="settings-group">
                <h4>Ottimizzazioni</h4>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-serviceWorker">
                    <span class="checkmark"></span>
                    Abilita Service Worker
                  </label>
                  <p class="setting-description">Cache intelligente e funzionalità offline</p>
                </div>
                
                <div class="setting-item">
                  <label for="setting-cacheStrategy">Strategia cache</label>
                  <select id="setting-cacheStrategy" class="form-input">
                    <option value="aggressive">Aggressiva (più veloce, più spazio)</option>
                    <option value="moderate">Moderata (bilanciata)</option>
                    <option value="minimal">Minimale (meno spazio)</option>
                  </select>
                  <p class="setting-description">Quanto contenuto cachare per l'offline</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-preloadApps">
                    <span class="checkmark"></span>
                    Precarica app frequenti
                  </label>
                  <p class="setting-description">Carica in background le app più usate</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-lazyLoadImages">
                    <span class="checkmark"></span>
                    Caricamento lazy delle immagini
                  </label>
                  <p class="setting-description">Carica le immagini solo quando necessario</p>
                </div>
              </div>
              
              <div class="settings-group">
                <h4>Statistiche Storage</h4>
                <div class="storage-stats" id="storage-stats">
                  <div class="stat-item">
                    <span class="stat-label">Spazio utilizzato:</span>
                    <span class="stat-value" id="storage-used">Caricamento...</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">App installate:</span>
                    <span class="stat-value" id="apps-count">Caricamento...</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Cache size:</span>
                    <span class="stat-value" id="cache-size">Caricamento...</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Advanced Section -->
            <div class="settings-section" id="section-advanced">
              <h3>Impostazioni Avanzate</h3>
              
              <div class="settings-group">
                <h4>Developer Options</h4>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-debugMode">
                    <span class="checkmark"></span>
                    Modalità debug
                  </label>
                  <p class="setting-description">Mostra informazioni di debug nell'interfaccia</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-showConsoleErrors">
                    <span class="checkmark"></span>
                    Mostra errori console
                  </label>
                  <p class="setting-description">Visualizza errori JavaScript nell'interfaccia</p>
                </div>
                
                <div class="setting-item">
                  <label class="setting-checkbox">
                    <input type="checkbox" id="setting-experimentalFeatures">
                    <span class="checkmark"></span>
                    Funzionalità sperimentali
                  </label>
                  <p class="setting-description">Abilita features in fase di test</p>
                </div>
              </div>
              
              <div class="settings-group">
                <h4>Informazioni Sistema</h4>
                <div class="system-info" id="system-info">
                  <div class="info-item">
                    <span class="info-label">Versione SAKAI:</span>
                    <span class="info-value">1.0.0</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">User Agent:</span>
                    <span class="info-value" id="user-agent">Caricamento...</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Platform:</span>
                    <span class="info-value" id="platform">Caricamento...</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">PWA Support:</span>
                    <span class="info-value" id="pwa-support">Caricamento...</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-settings">Annulla</button>
        <button class="btn btn-primary" id="save-settings">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/>
          </svg>
          Salva Impostazioni
        </button>
      </div>
    `;
  }

  /**
   * Setup event listeners per il modal
   */
  setupModalEventListeners() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // Navigation between sections
    const navButtons = modal.querySelectorAll('.settings-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const section = btn.dataset.section;
        this.showSection(section);
      });
    });

    // Settings actions
    modal.querySelector('#export-settings-btn')?.addEventListener('click', () => {
      this.exportSettings();
    });

    modal.querySelector('#import-settings-btn')?.addEventListener('click', () => {
      this.importSettings();
    });

    modal.querySelector('#reset-settings-btn')?.addEventListener('click', () => {
      this.resetSettings();
    });

    modal.querySelector('#clear-cache-btn')?.addEventListener('click', () => {
      this.clearCache();
    });

    modal.querySelector('#clear-all-data-btn')?.addEventListener('click', () => {
      this.clearAllData();
    });

    // Modal actions
    modal.querySelector('#cancel-settings')?.addEventListener('click', () => {
      hideModal('settings-modal');
    });

    modal.querySelector('#save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Real-time theme preview
    modal.querySelector('#setting-theme')?.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });

    // Real-time animation preview
    modal.querySelector('#setting-enableAnimations')?.addEventListener('change', (e) => {
      this.applyAnimations(e.target.checked);
    });

    // Real-time compact mode preview
    modal.querySelector('#setting-compactMode')?.addEventListener('change', (e) => {
      this.applyCompactMode(e.target.checked);
    });

    // Load statistics
    this.loadStorageStats();
    this.loadSystemInfo();
  }

  /**
   * Mostra una sezione specifica
   */
  showSection(sectionName) {
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  }

  /**
   * Popola il form con le impostazioni correnti
   */
  populateForm() {
    // Itera su tutte le impostazioni e popola i campi
    for (const [key, value] of Object.entries(this.currentSettings)) {
      const field = document.getElementById(`setting-${this.camelToKebab(key)}`);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = value;
        } else {
          field.value = value;
        }
      }
    }
  }

  /**
   * Salva le impostazioni
   */
  async saveSettings() {
    try {
      // Raccogli dati dal form
      const formData = this.collectFormData();
      
      // Aggiorna impostazioni correnti
      this.currentSettings = { ...this.currentSettings, ...formData };
      
      // Salva nel database
      for (const [key, value] of Object.entries(this.currentSettings)) {
        await StorageService.setSetting(key, value);
      }
      
      // Applica le impostazioni
      this.applySettings();
      
      // Chiudi modal
      hideModal('settings-modal');
      
      // Mostra conferma
      showToast('Impostazioni salvate con successo', 'success');
      
      // Ricarica l'app se necessario
      if (this.requiresReload(formData)) {
        setTimeout(() => {
          if (confirm('Alcune modifiche richiedono il ricaricamento della pagina. Ricaricare ora?')) {
            window.location.reload();
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error);
      showToast('Errore durante il salvataggio delle impostazioni', 'error');
    }
  }

  /**
   * Raccogli dati dal form
   */
  collectFormData() {
    const formData = {};
    
    // Mappa tutti i campi delle impostazioni
    const settingFields = document.querySelectorAll('[id^="setting-"]');
    settingFields.forEach(field => {
      const key = this.kebabToCamel(field.id.replace('setting-', ''));
      
      if (field.type === 'checkbox') {
        formData[key] = field.checked;
      } else if (field.type === 'number') {
        formData[key] = parseInt(field.value);
      } else {
        formData[key] = field.value;
      }
    });
    
    return formData;
  }

  /**
   * Applica le impostazioni all'interfaccia
   */
  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      // Segui preferenza sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  applyLanguage(language) {
    document.documentElement.setAttribute('lang', language);
    // Qui si potrebbe implementare l'i18n completo
  }

  applyAnimations(enabled) {
    const root = document.documentElement;
    if (enabled) {
      root.classList.remove('no-animations');
    } else {
      root.classList.add('no-animations');
    }
  }

  applyCompactMode(enabled) {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  }

  applyDebugMode(enabled) {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('debug-mode');
    } else {
      root.classList.remove('debug-mode');
    }
  }

  /**
   * Reset alle impostazioni predefinite
   */
  async resetSettings() {
    const confirmed = confirm('Sei sicuro di voler ripristinare tutte le impostazioni ai valori predefiniti?');
    if (!confirmed) return;

    try {
      // Reset alle impostazioni predefinite
      this.currentSettings = { ...this.defaultSettings };
      
      // Salva nel database
      for (const [key, value] of Object.entries(this.currentSettings)) {
        await StorageService.setSetting(key, value);
      }
      
      // Ripopola form
      this.populateForm();
      
      // Applica impostazioni
      this.applySettings();
      
      showToast('Impostazioni ripristinate ai valori predefiniti', 'success');
      
    } catch (error) {
      console.error('Errore reset impostazioni:', error);
      showToast('Errore durante il ripristino delle impostazioni', 'error');
    }
  }

  /**
   * Esporta impostazioni
   */
  async exportSettings() {
    try {
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        settings: this.currentSettings,
        deviceInfo: getDeviceInfo()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `sakai-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Impostazioni esportate con successo', 'success');
      
    } catch (error) {
      console.error('Errore export impostazioni:', error);
      showToast('Errore durante l\'esportazione delle impostazioni', 'error');
    }
  }

  /**
   * Importa impostazioni
   */
  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validazione formato
        if (!importData.settings || !importData.version) {
          throw new Error('Formato file non valido');
        }
        
        // Merge con impostazioni attuali
        this.currentSettings = { ...this.defaultSettings, ...importData.settings };
        
        // Salva nel database
        for (const [key, value] of Object.entries(this.currentSettings)) {
          await StorageService.setSetting(key, value);
        }
        
        // Ripopola form
        this.populateForm();
        
        // Applica impostazioni
        this.applySettings();
        
        showToast('Impostazioni importate con successo', 'success');
        
      } catch (error) {
        console.error('Errore import impostazioni:', error);
        showToast('Errore durante l\'importazione delle impostazioni', 'error');
      }
    };
    
    input.click();
  }

  /**
   * Svuota cache
   */
  async clearCache() {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      showToast('Cache svuotata con successo', 'success');
      this.loadStorageStats(); // Ricarica statistiche
      
    } catch (error) {
      console.error('Errore svuotamento cache:', error);
      showToast('Errore durante lo svuotamento della cache', 'error');
    }
  }

  /**
   * Elimina tutti i dati
   */
  async clearAllData() {
    const confirmed = confirm('ATTENZIONE: Questa operazione eliminerà TUTTI i dati di SAKAI incluse app, impostazioni e cache. Continuare?');
    if (!confirmed) return;

    const doubleConfirm = confirm('Sei veramente sicuro? Questa operazione NON può essere annullata!');
    if (!doubleConfirm) return;

    try {
      // Elimina database IndexedDB
      await StorageService.close();
      indexedDB.deleteDatabase('SAKAI_DB');
      
      // Elimina localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sakai_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Elimina cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      showToast('Tutti i dati sono stati eliminati', 'success');
      
      // Ricarica la pagina dopo un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Errore eliminazione dati:', error);
      showToast('Errore durante l\'eliminazione dei dati', 'error');
    }
  }

  /**
   * Carica statistiche storage
   */
  async loadStorageStats() {
    try {
      const stats = await StorageService.getStats();
      
      const storageUsedEl = document.getElementById('storage-used');
      const appsCountEl = document.getElementById('apps-count');
      const cacheSizeEl = document.getElementById('cache-size');
      
      if (storageUsedEl) storageUsedEl.textContent = formatFileSize(stats.dbSize || 0);
      if (appsCountEl) appsCountEl.textContent = stats.totalApps || 0;
      
      // Calcola dimensione cache
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (cacheSizeEl) cacheSizeEl.textContent = formatFileSize(estimate.usage || 0);
      } else if (cacheSizeEl) {
        cacheSizeEl.textContent = 'Non disponibile';
      }
      
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    }
  }

  /**
   * Carica informazioni sistema
   */
  loadSystemInfo() {
    try {
      const deviceInfo = getDeviceInfo();
      
      const userAgentEl = document.getElementById('user-agent');
      const platformEl = document.getElementById('platform');
      const pwasSupportEl = document.getElementById('pwa-support');
      
      if (userAgentEl) userAgentEl.textContent = deviceInfo.userAgent.substring(0, 50) + '...';
      if (platformEl) platformEl.textContent = deviceInfo.platform;
      if (pwasSupportEl) pwasSupportEl.textContent = deviceInfo.isPWASupported ? 'Supportato' : 'Non supportato';
      
    } catch (error) {
      console.error('Errore caricamento info sistema:', error);
    }
  }

  /**
   * Utility methods
   */
  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  kebabToCamel(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  requiresReload(formData) {
    // Impostazioni che richiedono ricaricamento
    const reloadSettings = ['language', 'enableServiceWorker', 'cacheStrategy'];
    return reloadSettings.some(setting => setting in formData);
  }

  /**
   * Getter per impostazioni correnti
   */
  getSetting(key, defaultValue = null) {
    return this.currentSettings[key] !== undefined ? this.currentSettings[key] : defaultValue;
  }

  /**
   * Setter per singola impostazione
   */
  async setSetting(key, value) {
    this.currentSettings[key] = value;
    await StorageService.setSetting(key, value);
    this.applySettings();
  }
}