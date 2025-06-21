/**
 * SAKAI - App Launcher Component
 * Gestisce il lancio sicuro delle applicazioni in sandbox iframe
 */

import StorageService from '../services/StorageService.js';
import { showToast, showModal, hideModal, escapeHtml, generateId } from '../utils/helpers.js';

/**
 * Classe per gestire il lancio delle applicazioni
 */
export default class AppLauncher {
  constructor() {
    this.activeApps = new Map(); // Mappa delle app attualmente in esecuzione
    this.launchHistory = [];
    this.maxConcurrentApps = 5;
    
    // Bind methods
    this.launch = this.launch.bind(this);
    this.launchZipApp = this.launchZipApp.bind(this);
    this.launchUrlApp = this.launchUrlApp.bind(this);
    this.launchGitHubApp = this.launchGitHubApp.bind(this);
    this.launchPWA = this.launchPWA.bind(this);
    this.createSecureFrame = this.createSecureFrame.bind(this);
    this.closeApp = this.closeApp.bind(this);
    this.setupEventListeners = this.setupEventListeners.bind(this);
  }

  /**
   * Inizializza il launcher
   */
  async init() {
    this.setupEventListeners();
    await this.loadLaunchHistory();
  }

  /**
   * Lancia un'applicazione
   * @param {Object} app - Dati dell'applicazione
   * @param {Object} options - Opzioni di lancio
   */
  async launch(app, options = {}) {
    try {
      console.log(`🚀 Launching app: ${app.name} (${app.type})`);

      // Carica preferenze di lancio
      const launchMode = await StorageService.getSetting('defaultLaunchMode', 'iframe'); // 'iframe' o 'newpage'
      const appSpecificMode = app.metadata?.launchMode; // Override per app specifica
      
      // Determina modalità finale
      const finalLaunchMode = options.forceMode || appSpecificMode || launchMode;
      options.launchMode = finalLaunchMode;

      // Verifica limiti concorrenti (solo per iframe)
      if (finalLaunchMode === 'iframe' && this.activeApps.size >= this.maxConcurrentApps && !options.force) {
        const confirmed = await this.showConcurrentAppsDialog();
        if (!confirmed) return;
      }

      // Validazione app
      const validation = await this.validateApp(app);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Preparazione lancio
      const launchId = generateId('launch');
      const startTime = Date.now();

      // Mostra loading se il lancio richiede tempo
      const loadingTimeout = setTimeout(() => {
        showToast(`Caricamento ${app.name}...`, 'info', 0);
      }, 500);

      let result;

      // Lancio basato sul tipo
      switch (app.type) {
        case 'zip':
          result = await this.launchZipApp(app, options);
          break;
        case 'url':
          result = await this.launchUrlApp(app, options);
          break;
        case 'github':
          result = await this.launchGitHubApp(app, options);
          break;
        case 'pwa':
          result = await this.launchPWA(app, options);
          break;
        default:
          throw new Error(`Tipo di app non supportato: ${app.type}`);
      }

      clearTimeout(loadingTimeout);

      // Registra app attiva
      this.activeApps.set(launchId, {
        app,
        launchTime: startTime,
        window: result.window,
        iframe: result.iframe,
        options
      });

      // Aggiorna cronologia
      this.addToHistory(app, launchId);

      // Aggiorna ultimo utilizzo nel database
      await StorageService.updateLastUsed(app.id);

      // Mostra notifica successo
      showToast(`${app.name} avviata con successo`, 'success');

      // Analytics (se abilitato)
      this.trackLaunch(app, Date.now() - startTime);

      return { success: true, launchId, ...result };

    } catch (error) {
      console.error('Errore durante il lancio:', error);
      showToast(`Errore nel lancio di ${app.name}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Lancia un'app ZIP
   * @param {Object} app - Dati dell'app
   * @param {Object} options - Opzioni di lancio
   */
  async launchZipApp(app, options = {}) {
    try {
      // Carica i file dell'app dal database
      const appFiles = await StorageService.getAppFiles(app.id);
      if (!appFiles.length) {
        throw new Error('File dell\'app non trovati');
      }

      // Trova il file entry point
      const entryPoint = this.findEntryPoint(appFiles, app.manifest?.entryPoint);
      if (!entryPoint) {
        throw new Error('Entry point non trovato');
      }

      // Crea blob URLs per tutti i file
      const fileMap = new Map();
      const blobUrls = new Map();

      for (const file of appFiles) {
        const blob = new Blob([file.content], { type: file.mimeType });
        const blobUrl = URL.createObjectURL(blob);
        fileMap.set(file.filename, file);
        blobUrls.set(file.filename, blobUrl);
      }

      // Modifica l'HTML entry point per aggiustare TUTTI i percorsi
      let htmlContent = entryPoint.content;
      
      // Sostituisci TUTTI i percorsi relativi con blob URLs (più aggressivo)
      htmlContent = this.replaceAllLocalPaths(htmlContent, blobUrls, app);

      // Crea il blob per l'entry point modificato
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const htmlBlobUrl = URL.createObjectURL(htmlBlob);

      // Determina modalità di lancio
      if (options.launchMode === 'newpage') {
        // Apri in nuova pagina
        const newWindow = window.open('', `sakai_zip_${app.id}_${Date.now()}`, 
          'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!newWindow) {
          throw new Error('Popup bloccato dal browser. Consenti i popup per SAKAI.');
        }

        // Scrivi il contenuto direttamente nella nuova finestra
        newWindow.document.write(htmlContent);
        newWindow.document.close();

        // Inietta API SAKAI
        this.injectSakaiAPI({ contentWindow: newWindow }, app);

        // Setup cleanup
        const cleanup = () => {
          for (const url of blobUrls.values()) {
            URL.revokeObjectURL(url);
          }
          URL.revokeObjectURL(htmlBlobUrl);
        };

        newWindow.addEventListener('beforeunload', cleanup);

        return {
          window: newWindow,
          external: true,
          cleanup
        };
      } else {
        // Modalità iframe (default)
        const iframe = this.createSecureFrame(app, {
          src: htmlBlobUrl,
          sandbox: 'allow-scripts allow-forms allow-modals allow-popups-to-escape-sandbox allow-same-origin',
          files: fileMap,
          blobUrls
        });

        // Setup cleanup quando l'iframe viene chiuso
        iframe.addEventListener('unload', () => {
          for (const url of blobUrls.values()) {
            URL.revokeObjectURL(url);
          }
          URL.revokeObjectURL(htmlBlobUrl);
        });

        return {
          iframe,
          window: iframe.contentWindow,
          cleanup: () => {
            for (const url of blobUrls.values()) {
              URL.revokeObjectURL(url);
            }
            URL.revokeObjectURL(htmlBlobUrl);
          }
        };
      }

    } catch (error) {
      console.error('Errore lancio app ZIP:', error);
      throw error;
    }
  }

  /**
   * Lancia un'app URL
   * @param {Object} app - Dati dell'app
   * @param {Object} options - Opzioni di lancio
   */
  async launchUrlApp(app, options = {}) {
    try {
      // Validazione URL
      if (!app.url) {
        throw new Error('URL dell\'app non specificato');
      }

      let targetUrl = app.url;

      // Se forza nuova finestra o è impostato nelle preferenze
      if (options.launchMode === 'newpage' || options.forceNewWindow) {
        // Apri in nuova finestra/tab
        const newWindow = window.open(targetUrl, `sakai_app_${app.id}`, 
          'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!newWindow) {
          throw new Error('Popup bloccato dal browser. Consenti i popup per SAKAI.');
        }

        return {
          window: newWindow,
          external: true
        };
      } else {
        // Modalità iframe - controlla compatibilità
        const canUseIframe = await this.checkIframeCompatibility(targetUrl);

        if (!canUseIframe) {
          // Fallback a nuova finestra se iframe non supportato
          showToast('Questo sito non supporta iframe, apertura in nuova finestra', 'info');
          
          const newWindow = window.open(targetUrl, `sakai_app_${app.id}`, 
            'width=1200,height=800,scrollbars=yes,resizable=yes');
          
          if (!newWindow) {
            throw new Error('Popup bloccato dal browser. Consenti i popup per SAKAI.');
          }

          return {
            window: newWindow,
            external: true,
            fallback: true
          };
        } else {
          // Carica in iframe
          const iframe = this.createSecureFrame(app, {
            src: targetUrl,
            sandbox: 'allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin'
          });

          return {
            iframe,
            window: iframe.contentWindow
          };
        }
      }

    } catch (error) {
      console.error('Errore lancio app URL:', error);
      throw error;
    }
  }

  /**
   * Lancia un'app GitHub
   * @param {Object} app - Dati dell'app
   * @param {Object} options - Opzioni di lancio
   */
  async launchGitHubApp(app, options = {}) {
    try {
      if (!app.githubUrl) {
        throw new Error('URL GitHub non specificato');
      }

      // Estrai info repository
      const repoInfo = this.parseGitHubUrl(app.githubUrl);
      if (!repoInfo) {
        throw new Error('URL GitHub non valido');
      }

      // Costruisci URL per GitHub Pages o raw content
      let targetUrl;
      
      if (app.metadata?.usePagesUrl) {
        // Usa GitHub Pages
        targetUrl = `https://${repoInfo.owner}.github.io/${repoInfo.repo}/`;
      } else {
        // Usa raw content per index.html
        targetUrl = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.branch || 'main'}/index.html`;
      }

      // Prova a caricare come URL app
      const urlApp = { ...app, url: targetUrl, type: 'url' };
      return await this.launchUrlApp(urlApp, options);

    } catch (error) {
      console.error('Errore lancio app GitHub:', error);
      throw error;
    }
  }

  /**
   * Lancia una PWA
   * @param {Object} app - Dati dell'app
   * @param {Object} options - Opzioni di lancio
   */
  async launchPWA(app, options = {}) {
    try {
      if (!app.url) {
        throw new Error('URL della PWA non specificato');
      }

      // Per le PWA, preferisci sempre nuova finestra per esperienza nativa
      const newWindow = window.open(app.url, `sakai_pwa_${app.id}`,
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,status=no,menubar=no');
      
      if (!newWindow) {
        throw new Error('Popup bloccato dal browser. Consenti i popup per SAKAI.');
      }

      // Prova a richiedere installazione PWA se supportato
      if ('serviceWorker' in navigator && app.manifest) {
        setTimeout(() => {
          this.promptPWAInstall(app, newWindow);
        }, 2000);
      }

      return {
        window: newWindow,
        external: true,
        isPWA: true
      };

    } catch (error) {
      console.error('Errore lancio PWA:', error);
      throw error;
    }
  }

  /**
   * Crea un iframe sicuro per l'app
   * @param {Object} app - Dati dell'app
   * @param {Object} iframeOptions - Opzioni iframe
   */
  createSecureFrame(app, iframeOptions = {}) {
    // Crea modal container per l'app
    const modalId = `app-modal-${app.id}-${Date.now()}`;
    
    const modalContent = `
      <div class="modal-header">
        <div class="app-modal-title">
          <div class="app-modal-icon">
            ${app.icon ? `<img src="${app.icon}" alt="${app.name}">` : '📱'}
          </div>
          <div>
            <h2>${escapeHtml(app.name)}</h2>
            <p class="app-modal-subtitle">${escapeHtml(app.description || '')}</p>
          </div>
        </div>
        <div class="app-modal-controls">
          <select class="app-launch-mode" id="app-launch-mode-${app.id}" title="Modalità di apertura">
            <option value="default">Modalità predefinita</option>
            <option value="iframe">Apri in finestra modale</option>
            <option value="newpage">Apri in nuova pagina</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="app-refresh-${app.id}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
            </svg>
            Ricarica
          </button>
          <button class="btn btn-secondary btn-sm" id="app-fullscreen-${app.id}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,14H5V19H10V17H7V14M12,14H10V17H7V19H12V14M17,14V17H14V19H19V14H17M19,10H17V5H14V7H17V10H19M10,7V5H5V10H7V7H10M12,10V7H10V5H15V10H12Z"/>
            </svg>
            Schermo intero
          </button>
          <button class="modal-close">&times;</button>
        </div>
      </div>
      <div class="modal-body app-modal-body">
        <div class="app-frame-container">
          <div class="app-loading">
            <div class="spinner"></div>
            <p>Caricamento ${escapeHtml(app.name)}...</p>
          </div>
        </div>
      </div>
    `;

    // Mostra modal
    const modal = showModal(modalId, modalContent, {
      size: 'modal-xl',
      disableBackdropClose: false,
      disableEscapeClose: false
    });

    // Crea iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'app-frame';
    iframe.src = iframeOptions.src;
    iframe.sandbox = iframeOptions.sandbox || 'allow-scripts allow-forms allow-modals';
    iframe.style.cssText = `
      width: 100%;
      height: 70vh;
      border: none;
      border-radius: 8px;
      background: white;
    `;

    // Event listeners per iframe
    iframe.addEventListener('load', () => {
      const loadingEl = modal.querySelector('.app-loading');
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
      iframe.style.display = 'block';
      
      // Inietta API SAKAI nell'iframe
      this.injectSakaiAPI(iframe, app);
    });

    iframe.addEventListener('error', () => {
      const container = modal.querySelector('.app-frame-container');
      container.innerHTML = `
        <div class="app-error">
          <div class="app-error-icon">⚠️</div>
          <h3>Errore di caricamento</h3>
          <p>Impossibile caricare l'applicazione.</p>
          <button class="btn btn-primary" onclick="location.reload()">Riprova</button>
        </div>
      `;
    });

    // Aggiungi iframe al modal
    const frameContainer = modal.querySelector('.app-frame-container');
    frameContainer.appendChild(iframe);

    // Setup controlli modal
    this.setupAppModalControls(modal, iframe, app);

    return iframe;
  }

  /**
   * Setup controlli del modal dell'app
   * @param {Element} modal - Modal element
   * @param {Element} iframe - Iframe element
   * @param {Object} app - Dati dell'app
   */
  setupAppModalControls(modal, iframe, app) {
    // Launch mode selector
    const launchModeSelect = modal.querySelector(`#app-launch-mode-${app.id}`);
    launchModeSelect?.addEventListener('change', async () => {
      const newMode = launchModeSelect.value;
      if (newMode !== 'default') {
        const confirmed = confirm(`Vuoi riaprire l'app in modalità "${newMode === 'iframe' ? 'finestra modale' : 'nuova pagina'}"?`);
        if (confirmed) {
          // Chiudi modal corrente
          hideModal(modal.id);
          // Rilancia con nuova modalità
          await this.launch(app, { forceMode: newMode });
        } else {
          // Reset selezione
          launchModeSelect.value = 'default';
        }
      }
    });

    // Refresh button
    const refreshBtn = modal.querySelector(`#app-refresh-${app.id}`);
    refreshBtn?.addEventListener('click', () => {
      iframe.src = iframe.src; // Ricarica iframe
      showToast('App ricaricata', 'info');
    });

    // Fullscreen button
    const fullscreenBtn = modal.querySelector(`#app-fullscreen-${app.id}`);
    fullscreenBtn?.addEventListener('click', () => {
      if (modal.requestFullscreen) {
        modal.requestFullscreen();
      } else if (modal.webkitRequestFullscreen) {
        modal.webkitRequestFullscreen();
      } else if (modal.msRequestFullscreen) {
        modal.msRequestFullscreen();
      }
    });

    // Cleanup quando modal si chiude
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node === modal) {
              this.cleanupApp(app.id);
              observer.disconnect();
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true });
  }

  /**
   * Inietta l'API SAKAI nell'iframe
   * @param {Element} iframe - Iframe element
   * @param {Object} app - Dati dell'app
   */
  injectSakaiAPI(iframe, app) {
    try {
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) return;

      // API SAKAI per le app
      iframeWindow.SAKAI = {
        // Informazioni app
        app: {
          id: app.id,
          name: app.name,
          version: app.version
        },

        // Storage app-specific
        storage: {
          get: (key) => localStorage.getItem(`sakai_app_${app.id}_${key}`),
          set: (key, value) => localStorage.setItem(`sakai_app_${app.id}_${key}`, value),
          remove: (key) => localStorage.removeItem(`sakai_app_${app.id}_${key}`),
          clear: () => {
            const prefix = `sakai_app_${app.id}_`;
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
              }
            });
          }
        },

        // Utilities
        utils: {
          showNotification: (message, type = 'info') => {
            showToast(`[${app.name}] ${message}`, type);
          },
          
          getUserPreferences: async () => {
            return await StorageService.getAllSettings();
          },
          
          openUrl: (url) => {
            window.open(url, '_blank');
          },

          closeApp: () => {
            this.closeApp(app.id);
          }
        },

        // Lifecycle hooks
        lifecycle: {
          onAppStart: (callback) => {
            if (typeof callback === 'function') {
              setTimeout(callback, 100);
            }
          },
          
          onAppPause: (callback) => {
            window.addEventListener('blur', callback);
          },
          
          onAppResume: (callback) => {
            window.addEventListener('focus', callback);
          }
        }
      };

      console.log(`✅ SAKAI API iniettata in ${app.name}`);

    } catch (error) {
      console.warn('Impossibile iniettare SAKAI API:', error);
    }
  }

  /**
   * Utility methods
   */

  // Trova entry point nell'app ZIP
  findEntryPoint(files, specifiedEntry) {
    if (specifiedEntry) {
      const specified = files.find(f => f.filename === specifiedEntry);
      if (specified) return specified;
    }

    // Fallback: cerca index.html
    const indexHtml = files.find(f => f.filename === 'index.html');
    if (indexHtml) return indexHtml;

    // Fallback: primo file HTML
    const firstHtml = files.find(f => f.filename.endsWith('.html'));
    if (firstHtml) return firstHtml;

    throw new Error('Entry point HTML non trovato');
  }

  // Sostituisce TUTTI i percorsi relativi con blob URLs (gestione completa)
  replaceAllLocalPaths(htmlContent, blobUrls, app) {
    let modifiedContent = htmlContent;

    // Crea una mappa dei percorsi possibili (con e senza ./)
    const pathMap = new Map();
    for (const [filename, blobUrl] of blobUrls) {
      pathMap.set(filename, blobUrl);
      pathMap.set('./' + filename, blobUrl);
      pathMap.set('../' + filename, blobUrl); // Support anche ../
      
      // Support per percorsi nelle subdirectory
      const pathSegments = filename.split('/');
      if (pathSegments.length > 1) {
        // es. se filename è "js/app.js", aggiungi anche "app.js"
        const justFilename = pathSegments[pathSegments.length - 1];
        if (!pathMap.has(justFilename)) {
          pathMap.set(justFilename, blobUrl);
        }
      }
    }

    // 1. Sostituisci attributi src (script, img, iframe, etc.)
    modifiedContent = modifiedContent.replace(/\bsrc\s*=\s*["']([^"']+)["']/gi, (match, path) => {
      const cleanPath = this.cleanPath(path);
      if (pathMap.has(cleanPath)) {
        return match.replace(path, pathMap.get(cleanPath));
      }
      return match;
    });

    // 2. Sostituisci attributi href (link, a)
    modifiedContent = modifiedContent.replace(/\bhref\s*=\s*["']([^"']+)["']/gi, (match, path) => {
      const cleanPath = this.cleanPath(path);
      if (pathMap.has(cleanPath) && !path.startsWith('#') && !path.startsWith('mailto:')) {
        return match.replace(path, pathMap.get(cleanPath));
      }
      return match;
    });

    // 3. Sostituisci import statements JavaScript (ES6 modules)
    modifiedContent = modifiedContent.replace(/\bimport\s+.*?\s+from\s+["']([^"']+)["']/gi, (match, path) => {
      const cleanPath = this.cleanPath(path);
      if (pathMap.has(cleanPath)) {
        return match.replace(path, pathMap.get(cleanPath));
      }
      return match;
    });

    // 4. Sostituisci require() calls (CommonJS)
    modifiedContent = modifiedContent.replace(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/gi, (match, path) => {
      const cleanPath = this.cleanPath(path);
      if (pathMap.has(cleanPath)) {
        return match.replace(path, pathMap.get(cleanPath));
      }
      return match;
    });

    // 5. Sostituisci CSS url() references
    modifiedContent = modifiedContent.replace(/\burl\s*\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, path) => {
      const cleanPath = this.cleanPath(path);
      if (pathMap.has(cleanPath)) {
        return match.replace(path, pathMap.get(cleanPath));
      }
      return match;
    });

    // 6. Sostituisci fetch() e XMLHttpRequest references
    modifiedContent = modifiedContent.replace(/\bfetch\s*\(\s*["']([^"']+)["']/gi, (match, path) => {
      const cleanPath = this.cleanPath(path);
      if (pathMap.has(cleanPath)) {
        return match.replace(path, pathMap.get(cleanPath));
      }
      return match;
    });

    // 7. Sostituisci new URL() constructor
    modifiedContent = modifiedContent.replace(/\bnew\s+URL\s*\(\s*["']([^"']+)["']/gi, (match, path) => {
      const cleanPath = this.cleanPath(path);
      if (pathMap.has(cleanPath)) {
        return match.replace(path, pathMap.get(cleanPath));
      }
      return match;
    });

    // 8. Sostituisci JSON references e altri possibili pattern
    modifiedContent = modifiedContent.replace(/["']([^"']*\.[a-zA-Z0-9]+)["']/gi, (match, path) => {
      // Solo se il path sembra un file locale (ha estensione e non è URL)
      if (!path.includes('://') && !path.startsWith('data:') && !path.startsWith('#')) {
        const cleanPath = this.cleanPath(path);
        if (pathMap.has(cleanPath)) {
          return match.replace(path, pathMap.get(cleanPath));
        }
      }
      return match;
    });

    // Aggiungi meta tags per sicurezza e info
    const metaTags = `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="sakai-app" content="${escapeHtml(app.name)}">
      <meta name="sakai-version" content="${app.version || '1.0.0'}">
      <meta name="sakai-type" content="zip">
      <base href="blob:">
    `;

    if (modifiedContent.includes('<head>')) {
      modifiedContent = modifiedContent.replace('<head>', '<head>' + metaTags);
    } else if (modifiedContent.includes('<html>')) {
      modifiedContent = modifiedContent.replace('<html>', '<html><head>' + metaTags + '</head>');
    } else {
      modifiedContent = metaTags + modifiedContent;
    }

    return modifiedContent;
  }

  // Pulisce il percorso dai parametri query e hash
  cleanPath(path) {
    if (!path) return '';
    
    // Rimuovi query parameters e hash
    let cleanPath = path.split('?')[0].split('#')[0];
    
    // Normalizza slashes
    cleanPath = cleanPath.replace(/\\/g, '/');
    
    // Rimuovi leading/trailing whitespace
    cleanPath = cleanPath.trim();
    
    return cleanPath;
  }

  // Controlla compatibilità iframe per URL
  async checkIframeCompatibility(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const xFrameOptions = response.headers.get('X-Frame-Options');
      const csp = response.headers.get('Content-Security-Policy');

      // Controlla se il sito blocca iframe
      if (xFrameOptions && (xFrameOptions.toLowerCase() === 'deny' || xFrameOptions.toLowerCase() === 'sameorigin')) {
        return false;
      }

      if (csp && csp.includes('frame-ancestors')) {
        return false;
      }

      return true;
    } catch (error) {
      // Se non riusciamo a fare la richiesta, proviamo comunque
      return true;
    }
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
          repo: match[2].replace('.git', ''),
          branch: 'main'
        };
      }
    }
    return null;
  }

  // Validazione app prima del lancio
  async validateApp(app) {
    const validation = { valid: true, error: null };

    if (!app || !app.id) {
      validation.valid = false;
      validation.error = 'App non valida';
      return validation;
    }

    switch (app.type) {
      case 'zip':
        const files = await StorageService.getAppFiles(app.id);
        if (!files.length) {
          validation.valid = false;
          validation.error = 'File dell\'app non trovati';
        }
        break;

      case 'url':
      case 'github':
      case 'pwa':
        if (!app.url && !app.githubUrl) {
          validation.valid = false;
          validation.error = 'URL dell\'app non specificato';
        }
        break;

      default:
        validation.valid = false;
        validation.error = `Tipo di app non supportato: ${app.type}`;
    }

    return validation;
  }

  // Dialog per limite app concorrenti
  async showConcurrentAppsDialog() {
    return new Promise((resolve) => {
      showModal('concurrent-apps-dialog', `
        <div class="modal-header">
          <h2>Limite app raggiunto</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Hai raggiunto il limite di ${this.maxConcurrentApps} app aperte contemporaneamente.</p>
          <p>Vuoi chiudere un'app esistente e procedere?</p>
          <div class="concurrent-apps-list">
            ${Array.from(this.activeApps.values()).map(activeApp => `
              <div class="concurrent-app-item">
                <span>${activeApp.app.name}</span>
                <button class="btn btn-sm btn-secondary" onclick="this.closeApp('${activeApp.app.id}')">Chiudi</button>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="resolve(false)">Annulla</button>
          <button class="btn btn-primary" onclick="resolve(true)">Continua</button>
        </div>
      `, { disableBackdropClose: true });
      
      // Questo è semplificato - in realtà dovremmo gestire i click sui pulsanti
      setTimeout(() => resolve(true), 5000); // Auto-resolve dopo 5s per demo
    });
  }

  // Chiudi app
  closeApp(appId) {
    const activeApp = Array.from(this.activeApps.values()).find(a => a.app.id === appId);
    if (activeApp) {
      if (activeApp.window && !activeApp.window.closed) {
        activeApp.window.close();
      }
      if (activeApp.cleanup) {
        activeApp.cleanup();
      }
      this.activeApps.delete(appId);
    }
  }

  // Cleanup risorse app
  cleanupApp(appId) {
    this.closeApp(appId);
  }

  // Setup event listeners
  setupEventListeners() {
    // Ascolta chiusura finestre esterne
    window.addEventListener('beforeunload', () => {
      // Cleanup tutte le app attive
      for (const [launchId, activeApp] of this.activeApps) {
        if (activeApp.cleanup) {
          activeApp.cleanup();
        }
      }
    });
  }

  // Gestione cronologia
  async loadLaunchHistory() {
    const history = await StorageService.getSetting('launchHistory', []);
    this.launchHistory = history.slice(-50); // Mantieni ultimi 50
  }

  addToHistory(app, launchId) {
    this.launchHistory.push({
      appId: app.id,
      appName: app.name,
      launchId,
      timestamp: new Date().toISOString()
    });

    // Salva cronologia
    StorageService.setSetting('launchHistory', this.launchHistory.slice(-50));
  }

  // Analytics tracking
  trackLaunch(app, duration) {
    console.log(`📊 Launch tracked: ${app.name} in ${duration}ms`);
    // Qui potresti integrare con sistemi di analytics
  }

  // Prompt installazione PWA
  promptPWAInstall(app, window) {
    // Implementazione semplificata per demo
    console.log(`💡 PWA install prompt for ${app.name}`);
  }

  // Getter per informazioni stato
  get activeAppCount() {
    return this.activeApps.size;
  }

  get canLaunchMore() {
    return this.activeApps.size < this.maxConcurrentApps;
  }
}