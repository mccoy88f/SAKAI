/**
 * SAKAI - App Importer Component
 * Gestisce l'importazione di applicazioni da varie fonti (ZIP, URL, GitHub)
 */

import StorageService from '../services/StorageService.js';
import { showToast, showModal, hideModal, escapeHtml, generateId, isValidUrl, extractDomain, formatFileSize } from '../utils/helpers.js';
import JSZip from 'jszip';

/**
 * Classe per gestire l'importazione delle applicazioni
 */
export default class AppImporter {
  constructor() {
    this.supportedTypes = ['zip', 'url', 'github', 'pwa'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedExtensions = ['.zip'];
    this.defaultCategories = [
      'productivity', 'entertainment', 'tools', 'games', 
      'ai', 'social', 'education', 'business', 'utility'
    ];

    // Bind methods
    this.init = this.init.bind(this);
    this.showModal = this.showModal.bind(this);
    this.importFromZip = this.importFromZip.bind(this);
    this.importFromUrl = this.importFromUrl.bind(this);
    this.importFromGitHub = this.importFromGitHub.bind(this);
    this.validateAppData = this.validateAppData.bind(this);
    this.extractAppMetadata = this.extractAppMetadata.bind(this);
    this.setupDropZone = this.setupDropZone.bind(this);
  }

  /**
   * Inizializza l'importatore
   */
  async init() {
    console.log('🔧 Inizializzazione AppImporter...');
    this.setupDropZone();
    this.setupKeyboardShortcuts();
  }

  /**
   * Mostra il modal di importazione
   */
  showModal() {
    const modalContent = this.createImportModal();
    showModal('app-import-modal', modalContent, {
      size: 'modal-lg',
      disableBackdropClose: false
    });

    // Setup event listeners dopo che il modal è stato creato
    setTimeout(() => {
      this.setupModalEventListeners();
    }, 100);
  }

  /**
   * Crea il contenuto del modal di importazione
   */
  createImportModal() {
    return `
      <div class="modal-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="currentColor" class="header-icon">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
          </svg>
          Aggiungi Nuova App
        </h2>
        <button class="modal-close">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Import Type Selector -->
        <div class="import-type-selector">
          <h3>Scegli il tipo di importazione:</h3>
          <div class="import-types">
            <button class="import-type-btn active" data-type="zip">
              <div class="import-type-icon">📦</div>
              <div class="import-type-info">
                <h4>File ZIP</h4>
                <p>Carica un archivio contenente la tua app</p>
              </div>
            </button>
            
            <button class="import-type-btn" data-type="url">
              <div class="import-type-icon">🌐</div>
              <div class="import-type-info">
                <h4>Web App URL</h4>
                <p>Aggiungi un link a un'applicazione web</p>
              </div>
            </button>
            
            <button class="import-type-btn" data-type="github">
              <div class="import-type-icon">⚡</div>
              <div class="import-type-info">
                <h4>Repository GitHub</h4>
                <p>Importa da un repository pubblico</p>
              </div>
            </button>
            
            <button class="import-type-btn" data-type="pwa">
              <div class="import-type-icon">📱</div>
              <div class="import-type-info">
                <h4>Progressive Web App</h4>
                <p>Aggiungi una PWA esistente</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Import Forms -->
        <div class="import-forms">
          
          <!-- ZIP Import Form -->
          <div class="import-form active" id="form-zip">
            <div class="form-section">
              <h4>📦 Importa da File ZIP</h4>
              <p class="form-description">Trascina il file ZIP qui o clicca per selezionarlo</p>
              
              <div class="file-drop-zone" id="zip-drop-zone">
                <div class="drop-zone-content">
                  <div class="drop-zone-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                  </div>
                  <p class="drop-zone-text">Trascina il file ZIP qui</p>
                  <p class="drop-zone-subtext">o</p>
                  <button class="btn btn-primary" id="select-zip-btn">Seleziona File</button>
                  <input type="file" id="zip-file-input" accept=".zip" style="display: none;">
                </div>
                
                <div class="drop-zone-info">
                  <p>💡 <strong>Struttura consigliata del ZIP:</strong></p>
                  <ul>
                    <li><code>index.html</code> - File principale</li>
                    <li><code>sakai.json</code> - Metadati (opzionale)</li>
                    <li><code>assets/</code> - Immagini e risorse</li>
                    <li><code>js/</code> - File JavaScript</li>
                    <li><code>css/</code> - Fogli di stile</li>
                  </ul>
                  <p class="file-size-limit">Dimensione massima: ${formatFileSize(this.maxFileSize)}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- URL Import Form -->
          <div class="import-form" id="form-url">
            <div class="form-section">
              <h4>🌐 Importa da URL</h4>
              <p class="form-description">Inserisci l'URL dell'applicazione web</p>
              
              <div class="form-group">
                <label for="url-input">URL dell'applicazione</label>
                <div class="input-with-button">
                  <input 
                    type="url" 
                    id="url-input" 
                    class="form-input" 
                    placeholder="https://esempio.com/app"
                    required
                  >
                  <button class="btn btn-secondary" id="test-url-btn">Test</button>
                </div>
                <div class="form-help">
                  <p>Esempi: WhatsApp Web, Google Drive, tool online, ecc.</p>
                </div>
              </div>
              
              <div class="url-preview" id="url-preview" style="display: none;">
                <div class="preview-content">
                  <div class="preview-info">
                    <h5>Anteprima del sito:</h5>
                    <div class="preview-details">
                      <div class="preview-favicon">🌐</div>
                      <div class="preview-text">
                        <p class="preview-title">Caricamento...</p>
                        <p class="preview-url"></p>
                      </div>
                    </div>
                  </div>
                  <div class="preview-status">
                    <span class="status-badge">Verificando...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- GitHub Import Form -->
          <div class="import-form" id="form-github">
            <div class="form-section">
              <h4>⚡ Importa da GitHub</h4>
              <p class="form-description">Importa un'app da un repository GitHub pubblico</p>
              
              <div class="form-group">
                <label for="github-url-input">URL del Repository</label>
                <input 
                  type="url" 
                  id="github-url-input" 
                  class="form-input" 
                  placeholder="https://github.com/username/repository"
                  required
                >
                <div class="form-help">
                  <p>Il repository deve contenere un file <code>index.html</code> o <code>sakai.json</code></p>
                </div>
              </div>
              
              <div class="github-options">
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="use-github-pages"> 
                    Usa GitHub Pages (username.github.io/repo)
                  </label>
                </div>
                
                <div class="form-group">
                  <label for="github-branch">Branch (opzionale)</label>
                  <input 
                    type="text" 
                    id="github-branch" 
                    class="form-input" 
                    placeholder="main"
                    value="main"
                  >
                </div>
              </div>
              
              <div class="github-preview" id="github-preview" style="display: none;">
                <div class="repo-info">
                  <h5>Repository trovato:</h5>
                  <div class="repo-details">
                    <div class="repo-avatar">
                      <img src="" alt="Avatar" id="repo-avatar">
                    </div>
                    <div class="repo-text">
                      <p class="repo-name" id="repo-name"></p>
                      <p class="repo-description" id="repo-description"></p>
                      <div class="repo-stats">
                        <span class="repo-stat">⭐ <span id="repo-stars">0</span></span>
                        <span class="repo-stat">🍴 <span id="repo-forks">0</span></span>
                        <span class="repo-stat">📅 <span id="repo-updated"></span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PWA Import Form -->
          <div class="import-form" id="form-pwa">
            <div class="form-section">
              <h4>📱 Importa Progressive Web App</h4>
              <p class="form-description">Aggiungi una PWA per un'esperienza simile ad app nativa</p>
              
              <div class="form-group">
                <label for="pwa-url-input">URL della PWA</label>
                <input 
                  type="url" 
                  id="pwa-url-input" 
                  class="form-input" 
                  placeholder="https://app.esempio.com"
                  required
                >
                <div class="form-help">
                  <p>L'URL deve puntare a una PWA con un manifest valido</p>
                </div>
              </div>
              
              <div class="pwa-detection" id="pwa-detection" style="display: none;">
                <div class="detection-status">
                  <div class="detection-icon">📱</div>
                  <div class="detection-info">
                    <h5>PWA Rilevata</h5>
                    <p>Manifest trovato con successo</p>
                  </div>
                  <div class="detection-badge">
                    <span class="badge badge-success">✓ PWA</span>
                  </div>
                </div>
                
                <div class="pwa-manifest-info" id="pwa-manifest-info">
                  <!-- Informazioni del manifest verranno inserite qui -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- App Metadata Form (Comune per tutti i tipi) -->
        <div class="app-metadata-form" id="app-metadata-form" style="display: none;">
          <div class="form-section">
            <h4>📝 Informazioni App</h4>
            <p class="form-description">Personalizza le informazioni dell'app</p>
            
            <div class="form-row">
              <div class="form-group">
                <label for="app-name">Nome App *</label>
                <input 
                  type="text" 
                  id="app-name" 
                  class="form-input" 
                  placeholder="Il mio Tool Fantastico"
                  required
                  maxlength="50"
                >
              </div>
              
              <div class="form-group">
                <label for="app-version">Versione</label>
                <input 
                  type="text" 
                  id="app-version" 
                  class="form-input" 
                  placeholder="1.0.0"
                  value="1.0.0"
                >
              </div>
            </div>
            
            <div class="form-group">
              <label for="app-description">Descrizione</label>
              <textarea 
                id="app-description" 
                class="form-input" 
                rows="3"
                placeholder="Descrivi cosa fa questa app..."
                maxlength="200"
              ></textarea>
              <div class="char-count">
                <span id="desc-char-count">0</span>/200
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="app-category">Categoria</label>
                <select id="app-category" class="form-input">
                  ${this.defaultCategories.map(cat => 
                    `<option value="${cat}">${this.getCategoryLabel(cat)}</option>`
                  ).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label for="app-launch-mode">Modalità di apertura</label>
                <select id="app-launch-mode" class="form-input">
                  <option value="">Usa impostazione globale</option>
                  <option value="iframe">Sempre in finestra modale</option>
                  <option value="newpage">Sempre in nuova pagina</option>
                </select>
                <div class="form-help">
                  <p>Scegli come questa app dovrebbe aprirsi di default</p>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="app-tags">Tag (separati da virgola)</label>
              <input 
                type="text" 
                id="app-tags" 
                class="form-input" 
                placeholder="ai, produttività, strumento"
              >
            </div>
            
            <div class="form-group">
              <label for="app-icon">Icona App (URL o carica file)</label>
              <div class="icon-input-group">
                <input 
                  type="url" 
                  id="app-icon" 
                  class="form-input" 
                  placeholder="https://esempio.com/icon.png"
                >
                <button class="btn btn-secondary" id="upload-icon-btn">Carica</button>
                <input type="file" id="icon-file-input" accept="image/*" style="display: none;">
              </div>
              <div class="icon-preview" id="icon-preview" style="display: none;">
                <img src="" alt="Preview icona" id="icon-preview-img">
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="import-progress" id="import-progress" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <p class="progress-text" id="progress-text">Importazione in corso...</p>
        </div>
        
        <div class="modal-actions" id="modal-actions">
          <button class="btn btn-secondary" id="cancel-import">Annulla</button>
          <button class="btn btn-primary" id="start-import" disabled>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>
            Importa App
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners per il modal
   */
  setupModalEventListeners() {
    const modal = document.getElementById('app-import-modal');
    if (!modal) return;

    // Import type selector
    const typeButtons = modal.querySelectorAll('.import-type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const type = btn.dataset.type;
        this.switchImportForm(type);
      });
    });

    // ZIP import
    this.setupZipImport(modal);
    
    // URL import
    this.setupUrlImport(modal);
    
    // GitHub import
    this.setupGitHubImport(modal);
    
    // PWA import
    this.setupPWAImport(modal);
    
    // Metadata form
    this.setupMetadataForm(modal);
    
    // Modal actions
    modal.querySelector('#cancel-import')?.addEventListener('click', () => {
      hideModal('app-import-modal');
    });
    
    modal.querySelector('#start-import')?.addEventListener('click', () => {
      this.startImport();
    });
  }

  /**
   * Switch tra i diversi form di importazione
   */
  switchImportForm(type) {
    const forms = document.querySelectorAll('.import-form');
    forms.forEach(form => form.classList.remove('active'));
    
    const targetForm = document.getElementById(`form-${type}`);
    if (targetForm) {
      targetForm.classList.add('active');
    }

    // Reset import button
    const importBtn = document.getElementById('start-import');
    if (importBtn) {
      importBtn.disabled = true;
    }

    // Nascondi metadata form
    const metadataForm = document.getElementById('app-metadata-form');
    if (metadataForm) {
      metadataForm.style.display = 'none';
    }
  }

  /**
   * Setup ZIP import
   */
  setupZipImport(modal) {
    const dropZone = modal.querySelector('#zip-drop-zone');
    const fileInput = modal.querySelector('#zip-file-input');
    const selectBtn = modal.querySelector('#select-zip-btn');

    // Click su pulsante selezione
    selectBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    // File selection
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleZipFile(file);
      }
    });

    // Drag & Drop
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.zip')) {
        this.handleZipFile(file);
      } else {
        showToast('Per favore seleziona un file ZIP valido', 'error');
      }
    });
  }

  /**
   * Setup URL import
   */
  setupUrlImport(modal) {
    const urlInput = modal.querySelector('#url-input');
    const testBtn = modal.querySelector('#test-url-btn');
    const preview = modal.querySelector('#url-preview');

    testBtn?.addEventListener('click', async () => {
      const url = urlInput?.value.trim();
      if (!url) {
        showToast('Inserisci un URL valido', 'warning');
        return;
      }

      if (!isValidUrl(url)) {
        showToast('URL non valido', 'error');
        return;
      }

      await this.testUrl(url, preview);
    });

    urlInput?.addEventListener('blur', async () => {
      const url = urlInput.value.trim();
      if (url && isValidUrl(url)) {
        await this.testUrl(url, preview);
      }
    });
  }

  /**
   * Setup GitHub import
   */
  setupGitHubImport(modal) {
    const githubInput = modal.querySelector('#github-url-input');
    const githubPreview = modal.querySelector('#github-preview');

    githubInput?.addEventListener('blur', async () => {
      const url = githubInput.value.trim();
      if (url && this.isGitHubUrl(url)) {
        await this.fetchGitHubInfo(url, githubPreview);
      }
    });
  }

  /**
   * Setup PWA import
   */
  setupPWAImport(modal) {
    const pwaInput = modal.querySelector('#pwa-url-input');
    const pwaDetection = modal.querySelector('#pwa-detection');

    pwaInput?.addEventListener('blur', async () => {
      const url = pwaInput.value.trim();
      if (url && isValidUrl(url)) {
        await this.detectPWA(url, pwaDetection);
      }
    });
  }

  /**
   * Setup metadata form
   */
  setupMetadataForm(modal) {
    const descInput = modal.querySelector('#app-description');
    const charCount = modal.querySelector('#desc-char-count');
    const iconInput = modal.querySelector('#app-icon');
    const uploadIconBtn = modal.querySelector('#upload-icon-btn');
    const iconFileInput = modal.querySelector('#icon-file-input');
    const iconPreview = modal.querySelector('#icon-preview');

    // Character count per descrizione
    descInput?.addEventListener('input', () => {
      if (charCount) {
        charCount.textContent = descInput.value.length;
      }
    });

    // Upload icona
    uploadIconBtn?.addEventListener('click', () => {
      iconFileInput?.click();
    });

    iconFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.handleIconUpload(file, iconInput, iconPreview);
      }
    });

    // Preview icona da URL
    iconInput?.addEventListener('blur', () => {
      const url = iconInput.value.trim();
      if (url && isValidUrl(url)) {
        this.showIconPreview(url, iconPreview);
      }
    });
  }

  /**
   * Gestisce il file ZIP caricato
   */
  async handleZipFile(file) {
    try {
      // Validazione dimensione
      if (file.size > this.maxFileSize) {
        showToast(`File troppo grande. Massimo: ${formatFileSize(this.maxFileSize)}`, 'error');
        return;
      }

      showToast('Analizzando file ZIP...', 'info');

      // Leggi ZIP
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      // Estrai file
      const files = [];
      let manifest = null;

      for (const [filename, fileObj] of Object.entries(contents.files)) {
        if (fileObj.dir) continue;

        const content = await fileObj.async('text');
        const fileData = {
          filename,
          content,
          size: content.length,
          mimeType: this.getMimeType(filename)
        };

        files.push(fileData);

        // Cerca manifest SAKAI
        if (filename === 'sakai.json') {
          try {
            manifest = JSON.parse(content);
          } catch (e) {
            console.warn('Manifest sakai.json non valido:', e);
          }
        }
      }

      // Validazione contenuto
      const hasHTML = files.some(f => f.filename.endsWith('.html'));
      if (!hasHTML) {
        showToast('Il ZIP deve contenere almeno un file HTML', 'error');
        return;
      }

      // Estrai metadati
      const metadata = this.extractZipMetadata(files, manifest);
      
      // Popola form con metadati estratti
      this.populateMetadataForm(metadata);
      
      // Mostra form metadata
      const metadataForm = document.getElementById('app-metadata-form');
      if (metadataForm) {
        metadataForm.style.display = 'block';
      }

      // Salva dati per l'importazione
      this.currentImportData = {
        type: 'zip',
        files,
        manifest,
        metadata,
        originalFile: file
      };

      // Abilita pulsante importazione
      const importBtn = document.getElementById('start-import');
      if (importBtn) {
        importBtn.disabled = false;
      }

      showToast('ZIP analizzato con successo!', 'success');

    } catch (error) {
      console.error('Errore durante l\'analisi del ZIP:', error);
      showToast('Errore durante l\'analisi del file ZIP', 'error');
    }
  }

  /**
   * Testa un URL e mostra anteprima
   */
  async testUrl(url, previewElement) {
    if (!previewElement) return;

    previewElement.style.display = 'block';
    const statusBadge = previewElement.querySelector('.status-badge');
    const titleEl = previewElement.querySelector('.preview-title');
    const urlEl = previewElement.querySelector('.preview-url');

    // Reset stato
    statusBadge.textContent = 'Verificando...';
    statusBadge.className = 'status-badge';
    titleEl.textContent = 'Caricamento...';
    urlEl.textContent = url;

    try {
      // Test connettività
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors' // Per evitare problemi CORS
      });

      // Estrai metadati
      const metadata = await this.extractUrlMetadata(url);
      
      // Aggiorna preview
      titleEl.textContent = metadata.title || extractDomain(url);
      statusBadge.textContent = '✓ Accessibile';
      statusBadge.className = 'status-badge badge-success';

      // Popola form metadata
      this.populateMetadataForm(metadata);
      
      // Mostra form metadata
      const metadataForm = document.getElementById('app-metadata-form');
      if (metadataForm) {
        metadataForm.style.display = 'block';
      }

      // Salva dati per importazione
      this.currentImportData = {
        type: 'url',
        url,
        metadata
      };

      // Abilita importazione
      const importBtn = document.getElementById('start-import');
      if (importBtn) {
        importBtn.disabled = false;
      }

    } catch (error) {
      console.error('Errore test URL:', error);
      statusBadge.textContent = '⚠ Errore';
      statusBadge.className = 'status-badge badge-error';
      titleEl.textContent = 'Impossibile verificare il sito';
    }
  }

  /**
   * Fetch informazioni repository GitHub
   */
  async fetchGitHubInfo(url, previewElement) {
    if (!previewElement) return;

    const repoInfo = this.parseGitHubUrl(url);
    if (!repoInfo) {
      showToast('URL GitHub non valido', 'error');
      return;
    }

    try {
      // Chiamata API GitHub
      const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('Repository non trovato o non accessibile');
      }

      const repoData = await response.json();

      // Mostra info repository
      previewElement.style.display = 'block';
      previewElement.querySelector('#repo-avatar').src = repoData.owner.avatar_url;
      previewElement.querySelector('#repo-name').textContent = repoData.full_name;
      previewElement.querySelector('#repo-description').textContent = repoData.description || 'Nessuna descrizione';
      previewElement.querySelector('#repo-stars').textContent = repoData.stargazers_count;
      previewElement.querySelector('#repo-forks').textContent = repoData.forks_count;
      previewElement.querySelector('#repo-updated').textContent = new Date(repoData.updated_at).toLocaleDateString();

      // Popola metadata form
      const metadata = {
        name: repoData.name,
        description: repoData.description,
        category: 'tools',
        version: '1.0.0',
        githubUrl: url
      };

      this.populateMetadataForm(metadata);

      // Mostra form metadata
      const metadataForm = document.getElementById('app-metadata-form');
      if (metadataForm) {
        metadataForm.style.display = 'block';
      }

      // Salva dati
      this.currentImportData = {
        type: 'github',
        url,
        githubUrl: url,
        repoData,
        metadata
      };

      // Abilita importazione
      const importBtn = document.getElementById('start-import');
      if (importBtn) {
        importBtn.disabled = false;
      }

    } catch (error) {
      console.error('Errore fetch GitHub:', error);
      showToast(`Errore: ${error.message}`, 'error');
    }
  }

  /**
   * Rileva se un URL è una PWA
   */
  async detectPWA(url, detectionElement) {
    if (!detectionElement) return;

    try {
      // Prova a ottenere il manifest
      const manifestUrl = new URL('/manifest.json', url).href;
      
      // Questo è semplificato - in realtà servirebbe un proxy per CORS
      const metadata = {
        name: extractDomain(url),
        description: 'Progressive Web App',
        category: 'pwa',
        url,
        type: 'pwa'
      };

      // Mostra detection success
      detectionElement.style.display = 'block';

      // Popola metadata
      this.populateMetadataForm(metadata);

      // Mostra form metadata
      const metadataForm = document.getElementById('app-metadata-form');
      if (metadataForm) {
        metadataForm.style.display = 'block';
      }

      // Salva dati
      this.currentImportData = {
        type: 'pwa',
        url,
        metadata
      };

      // Abilita importazione
      const importBtn = document.getElementById('start-import');
      if (importBtn) {
        importBtn.disabled = false;
      }

    } catch (error) {
      console.error('Errore rilevamento PWA:', error);
      showToast('PWA non rilevata o non accessibile', 'warning');
    }
  }

  /**
   * Avvia il processo di importazione
   */
  async startImport() {
    if (!this.currentImportData) {
      showToast('Nessun dato da importare', 'error');
      return;
    }

    try {
      // Mostra progress
      this.showImportProgress(true);

      // Raccogli dati dal form
      const formData = this.collectFormData();
      
      // Valida dati
      const validation = this.validateAppData(formData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Combina dati
      const appData = {
        ...this.currentImportData.metadata,
        ...formData,
        type: this.currentImportData.type,
        url: this.currentImportData.url,
        githubUrl: this.currentImportData.githubUrl,
        files: this.currentImportData.files
      };

      // Aggiorna progress
      this.updateImportProgress(50, 'Salvando app...');

      // Salva nel database
      const appId = await StorageService.installApp(appData);

      // Aggiorna progress
      this.updateImportProgress(100, 'Importazione completata!');

      // Successo
      setTimeout(() => {
        hideModal('app-import-modal');
        showToast(`App "${appData.name}" importata con successo!`, 'success');
        
        // Ricarica la lista app (se disponibile)
        if (window.sakaiApp && window.sakaiApp.loadApps) {
          window.sakaiApp.loadApps();
        }
      }, 1000);

    } catch (error) {
      console.error('Errore durante l\'importazione:', error);
      showToast(`Errore importazione: ${error.message}`, 'error');
      this.showImportProgress(false);
    }
  }

  /**
   * Utility methods
   */

  // Estrai metadati da ZIP
  extractZipMetadata(files, manifest) {
    const metadata = {
      name: manifest?.name || 'App Importata',
      description: manifest?.description || '',
      version: manifest?.version || '1.0.0',
      category: manifest?.category || 'tools',
      tags: manifest?.tags || [],
      icon: manifest?.icon || null,
      permissions: manifest?.permissions || []
    };

    // Cerca icona nei file se non specificata nel manifest
    if (!metadata.icon) {
      const iconFile = files.find(f => 
        f.filename.match(/^(icon|logo|app-icon)\.(png|jpg|jpeg|svg)$/i)
      );
      if (iconFile) {
        const blob = new Blob([iconFile.content], { type: iconFile.mimeType });
        metadata.icon = URL.createObjectURL(blob);
      }
    }

    return metadata;
  }

  // Estrai metadati da URL
  async extractUrlMetadata(url) {
    const domain = extractDomain(url);
    return {
      name: domain,
      description: `App web da ${domain}`,
      category: 'tools',
      url: url,
      icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    };
  }

  // Parsing URL GitHub
  parseGitHubUrl(url) {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /([^\/]+)\.github\.io\/([^\/]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', '')
        };
      }
    }
    return null;
  }

  // Validazione URL GitHub
  isGitHubUrl(url) {
    return url.includes('github.com') || url.includes('github.io');
  }

  // Get MIME type
  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Get category label
  getCategoryLabel(category) {
    const labels = {
      'productivity': 'Produttività',
      'entertainment': 'Intrattenimento',
      'tools': 'Strumenti',
      'games': 'Giochi',
      'ai': 'Intelligenza Artificiale',
      'social': 'Social',
      'education': 'Educazione',
      'business': 'Business',
      'utility': 'Utilità'
    };
    return labels[category] || category;
  }

  // Popola form metadata
  populateMetadataForm(metadata) {
    const fields = {
      'app-name': metadata.name,
      'app-description': metadata.description,
      'app-version': metadata.version,
      'app-category': metadata.category,
      'app-tags': Array.isArray(metadata.tags) ? metadata.tags.join(', ') : metadata.tags,
      'app-icon': metadata.icon
    };

    for (const [fieldId, value] of Object.entries(fields)) {
      const field = document.getElementById(fieldId);
      if (field && value) {
        field.value = value;
        
        // Trigger events
        field.dispatchEvent(new Event('input'));
        field.dispatchEvent(new Event('change'));
      }
    }
  }

  // Raccogli dati dal form
  collectFormData() {
    const nameEl = document.getElementById('app-name');
    const descEl = document.getElementById('app-description');
    const versionEl = document.getElementById('app-version');
    const categoryEl = document.getElementById('app-category');
    const launchModeEl = document.getElementById('app-launch-mode');
    const tagsEl = document.getElementById('app-tags');
    const iconEl = document.getElementById('app-icon');

    const tags = tagsEl?.value ? 
      tagsEl.value.split(',').map(tag => tag.trim()).filter(tag => tag) : 
      [];

    const formData = {
      name: nameEl?.value.trim() || '',
      description: descEl?.value.trim() || '',
      version: versionEl?.value.trim() || '1.0.0',
      category: categoryEl?.value || 'tools',
      tags,
      icon: iconEl?.value.trim() || null
    };

    // Aggiungi modalità di lancio ai metadata se specificata
    const launchMode = launchModeEl?.value;
    if (launchMode) {
      formData.metadata = formData.metadata || {};
      formData.metadata.launchMode = launchMode;
    }

    return formData;
  }

  // Validazione dati app
  validateAppData(data) {
    if (!data.name) {
      return { valid: false, error: 'Nome app richiesto' };
    }

    if (data.name.length > 50) {
      return { valid: false, error: 'Nome app troppo lungo (max 50 caratteri)' };
    }

    if (data.description && data.description.length > 200) {
      return { valid: false, error: 'Descrizione troppo lunga (max 200 caratteri)' };
    }

    return { valid: true };
  }

  // Gestione progress importazione
  showImportProgress(show) {
    const progress = document.getElementById('import-progress');
    const actions = document.getElementById('modal-actions');
    
    if (progress && actions) {
      progress.style.display = show ? 'block' : 'none';
      actions.style.display = show ? 'none' : 'flex';
    }
  }

  updateImportProgress(percent, text) {
    const fill = document.getElementById('progress-fill');
    const textEl = document.getElementById('progress-text');
    
    if (fill) fill.style.width = `${percent}%`;
    if (textEl) textEl.textContent = text;
  }

  // Setup drag & drop globale
  setupDropZone() {
    // Previeni drop su tutta la pagina
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    // Mostra modal su drop globale
    document.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.zip')) {
        this.showModal();
        setTimeout(() => {
          this.handleZipFile(file);
        }, 200);
      }
    });
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + I per importare
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        this.showModal();
      }
    });
  }

  // Handle icon upload
  async handleIconUpload(file, iconInput, iconPreview) {
    if (!file.type.startsWith('image/')) {
      showToast('Per favore seleziona un file immagine', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      showToast('Immagine troppo grande (max 2MB)', 'error');
      return;
    }

    try {
      // Converti in base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        iconInput.value = dataUrl;
        this.showIconPreview(dataUrl, iconPreview);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Errore upload icona:', error);
      showToast('Errore durante l\'upload dell\'icona', 'error');
    }
  }

  // Mostra preview icona
  showIconPreview(url, previewElement) {
    if (!previewElement) return;
    
    const img = previewElement.querySelector('#icon-preview-img');
    if (img) {
      img.src = url;
      img.onload = () => {
        previewElement.style.display = 'block';
      };
      img.onerror = () => {
        previewElement.style.display = 'none';
        showToast('Impossibile caricare l\'icona', 'warning');
      };
    }
  }
}