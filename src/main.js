/**
 * SAKAI - Main Entry Point
 * Inizializza l'applicazione e coordina tutti i componenti
 */

import StorageService from './services/StorageService.js';
import AppLauncher from './components/AppLauncher.js';
import AppImporter from './components/AppImporter.js';
import AppCard from './components/AppCard.js';
import SyncManager from './components/SyncManager.js';
import SettingsPanel from './components/SettingsPanel.js';
import { showToast, showModal, hideModal } from './utils/helpers.js';
import { DEBUG, ErrorTracker, PerformanceMonitor } from './utils/debug.js';

/**
 * Classe principale dell'applicazione SAKAI
 */
class SakaiApp {
  constructor() {
    this.currentView = 'all';
    this.currentSort = 'lastUsed';
    this.currentViewMode = 'grid';
    this.searchQuery = '';
    this.apps = [];
    this.filteredApps = [];
    
    // Componenti
    this.appLauncher = new AppLauncher();
    this.appImporter = new AppImporter();
    this.syncManager = new SyncManager();
    this.settingsPanel = new SettingsPanel();
    
    // Bind methods
    this.init = this.init.bind(this);
    this.setupEventListeners = this.setupEventListeners.bind(this);
    this.loadApps = this.loadApps.bind(this);
    this.renderApps = this.renderApps.bind(this);
    this.filterApps = this.filterApps.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleCategoryChange = this.handleCategoryChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleViewChange = this.handleViewChange.bind(this);
  }

  /**
   * Inizializza l'applicazione
   */
  async init() {
    try {
      console.log('🚀 Inizializzazione SAKAI...');
      
      // Mostra loading screen
      this.showLoadingScreen();
      
      // Inizializza storage
      await this.initializeStorage();
      
      // Carica impostazioni utente
      await this.loadUserSettings();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Carica apps
      await this.loadApps();
      
      // Inizializza componenti
      await this.initializeComponents();
      
      // Aggiorna UI
      this.updateUI();
      
      // Nascondi loading e mostra app
      this.hideLoadingScreen();
      
      // Inizializza sync se configurato
      await this.initializeSync();
      
      console.log('✅ SAKAI inizializzato con successo');
      
      // Mostra welcome message se è la prima volta
      await this.checkFirstRun();
      
    } catch (error) {
      console.error('❌ Errore inizializzazione SAKAI:', error);
      this.showError('Errore durante l\'inizializzazione dell\'applicazione');
    }
  }

  /**
   * Mostra loading screen
   */
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app');
    
    if (loadingScreen && appContainer) {
      loadingScreen.style.display = 'flex';
      appContainer.style.display = 'none';
    }
  }

  /**
   * Nascondi loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app');
    
    if (loadingScreen && appContainer) {
      // Animazione fade out
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.style.display = 'block';
        appContainer.style.opacity = '0';
        // Fade in dell'app
        requestAnimationFrame(() => {
          appContainer.style.transition = 'opacity 0.3s ease';
          appContainer.style.opacity = '1';
        });
      }, 300);
    }
  }

  /**
   * Inizializza il database storage
   */
  async initializeStorage() {
    try {
      // Il StorageService è già inizializzato come singleton
      const stats = await StorageService.getStats();
      console.log('📊 Database stats:', stats);
    } catch (error) {
      console.error('Errore inizializzazione storage:', error);
      throw error;
    }
  }

  /**
   * Carica impostazioni utente
   */
  async loadUserSettings() {
    try {
      const settings = await StorageService.getAllSettings();
      
      // Applica impostazioni
      this.currentViewMode = settings.viewMode || 'grid';
      this.currentSort = settings.sortBy || 'lastUsed';
      
      // Applica tema
      if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
      }
      
      // Applica lingua
      if (settings.language) {
        document.documentElement.setAttribute('lang', settings.language);
      }
      
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle?.addEventListener('click', () => {
      sidebar?.classList.toggle('sidebar-open');
    });

    // Chiudi sidebar su click esterno (mobile)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar?.contains(e.target) && !sidebarToggle?.contains(e.target)) {
          sidebar?.classList.remove('sidebar-open');
        }
      }
    });

    // Search
    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('input', this.handleSearch);
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSearch(e);
      }
    });

    // Category navigation
    const categoryNavs = document.querySelectorAll('[data-category]');
    categoryNavs.forEach(nav => {
      nav.addEventListener('click', this.handleCategoryChange);
    });

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    sortSelect?.addEventListener('change', this.handleSortChange);

    // View toggle
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', this.handleViewChange);
    });

    // Add app buttons
    const addAppBtns = document.querySelectorAll('#add-app-btn, #fab-add, #empty-add-btn');
    addAppBtns.forEach(btn => {
      btn.addEventListener('click', () => this.showAddAppModal());
    });

    // User menu
    const userBtn = document.getElementById('user-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    userBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown?.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      userDropdown?.classList.remove('show');
    });

    // User menu actions
    document.getElementById('settings-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showSettingsModal();
    });

    document.getElementById('export-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportData();
    });

    document.getElementById('import-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.importData();
    });

    document.getElementById('about-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showAboutModal();
    });

    // Sync button
    document.getElementById('sync-btn')?.addEventListener('click', () => {
      this.syncManager.showSyncModal();
    });

    // App store button
    document.getElementById('app-store-btn')?.addEventListener('click', () => {
      this.showAppStoreModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

    // Resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Carica tutte le app dal database
   */
  async loadApps() {
    try {
      this.apps = await StorageService.getAllApps();
      this.filterApps();
      this.updateCategoryCounts();
    } catch (error) {
      console.error('Errore caricamento apps:', error);
      showToast('Errore durante il caricamento delle app', 'error');
    }
  }

  /**
   * Filtra e ordina le app
   */
  filterApps() {
    let filtered = [...this.apps];

    // Filtra per categoria
    if (this.currentView === 'favorites') {
      filtered = filtered.filter(app => app.favorite);
    } else if (this.currentView === 'recent') {
      // Ultimi 30 giorni
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(app => new Date(app.lastUsed) > thirtyDaysAgo);
    } else if (this.currentView !== 'all') {
      filtered = filtered.filter(app => app.category === this.currentView);
    }

    // Filtra per ricerca
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Ordina
    filtered.sort((a, b) => {
      switch (this.currentSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'installDate':
          return new Date(b.installDate) - new Date(a.installDate);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'lastUsed':
        default:
          return new Date(b.lastUsed) - new Date(a.lastUsed);
      }
    });

    this.filteredApps = filtered;
    this.renderApps();
  }

  /**
   * Renderizza le app nella UI
   */
  renderApps() {
    const appsGrid = document.getElementById('apps-grid');
    const emptyState = document.getElementById('empty-state');

    if (!appsGrid) return;

    // Aggiorna classe per view mode
    appsGrid.className = `apps-${this.currentViewMode}`;

    if (this.filteredApps.length === 0) {
      appsGrid.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    appsGrid.style.display = 'grid';

    // Renderizza le app cards
    appsGrid.innerHTML = this.filteredApps.map(app => 
      AppCard.render(app)
    ).join('');

    // Aggiungi event listeners alle app cards
    this.setupAppCardListeners();
  }

  /**
   * Setup event listeners per le app cards
   */
  setupAppCardListeners() {
    // Launch app
    document.querySelectorAll('.app-card-launch').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const appId = parseInt(btn.dataset.appId);
        await this.launchApp(appId);
      });
    });

    // Toggle favorite
    document.querySelectorAll('.app-card-favorite').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const appId = parseInt(btn.dataset.appId);
        await this.toggleFavorite(appId);
      });
    });

    // App menu
    document.querySelectorAll('.app-card-menu').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = parseInt(btn.dataset.appId);
        this.showAppMenu(appId, e.target);
      });
    });

    // Card click to launch
    document.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('click', async () => {
        const appId = parseInt(card.dataset.appId);
        await this.launchApp(appId);
      });
    });
  }

  /**
   * Lancia un'app
   */
  async launchApp(appId) {
    try {
      const app = await StorageService.getApp(appId);
      if (!app) {
        showToast('App non trovata', 'error');
        return;
      }

      // Aggiorna ultimo utilizzo
      await StorageService.updateLastUsed(appId);
      
      // Lancia l'app
      await this.appLauncher.launch(app);
      
      // Aggiorna la lista
      await this.loadApps();
      
    } catch (error) {
      console.error('Errore lancio app:', error);
      showToast('Errore durante il lancio dell\'app', 'error');
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(appId) {
    try {
      const newStatus = await StorageService.toggleFavorite(appId);
      showToast(newStatus ? 'Aggiunta ai preferiti' : 'Rimossa dai preferiti', 'success');
      await this.loadApps();
    } catch (error) {
      console.error('Errore toggle favorite:', error);
      showToast('Errore durante l\'operazione', 'error');
    }
  }

  /**
   * Handlers per eventi UI
   */
  handleSearch(e) {
    this.searchQuery = e.target.value.trim();
    this.filterApps();
  }

  handleCategoryChange(e) {
    e.preventDefault();
    const category = e.target.dataset.category || e.target.closest('[data-category]').dataset.category;
    
    // Aggiorna UI navigazione
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    e.target.closest('.nav-link').classList.add('active');
    
    // Aggiorna view
    this.currentView = category;
    this.updateSectionTitle();
    this.filterApps();
  }

  handleSortChange(e) {
    this.currentSort = e.target.value;
    StorageService.setSetting('sortBy', this.currentSort);
    this.filterApps();
  }

  handleViewChange(e) {
    const viewMode = e.target.dataset.view || e.target.closest('[data-view]').dataset.view;
    
    // Aggiorna UI buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    e.target.closest('.view-btn').classList.add('active');
    
    // Aggiorna view
    this.currentViewMode = viewMode;
    StorageService.setSetting('viewMode', this.currentViewMode);
    this.renderApps();
  }

  /**
   * Gestione keyboard shortcuts
   */
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K per focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    
    // Ctrl/Cmd + N per nuova app
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      this.showAddAppModal();
    }
    
    // Escape per chiudere modals
    if (e.key === 'Escape') {
      this.closeAllModals();
    }
  }

  /**
   * Gestione resize
   */
  handleResize() {
    // Chiudi sidebar su resize se mobile
    if (window.innerWidth > 768) {
      document.getElementById('sidebar')?.classList.remove('sidebar-open');
    }
  }

  /**
   * Aggiorna titolo sezione
   */
  updateSectionTitle() {
    const sectionTitle = document.getElementById('section-title');
    const sectionSubtitle = document.getElementById('section-subtitle');
    
    const titles = {
      'all': { title: 'Tutte le App', subtitle: 'Gestisci le tue applicazioni web' },
      'favorites': { title: 'App Preferite', subtitle: 'Le tue app più amate' },
      'recent': { title: 'App Recenti', subtitle: 'Utilizzate negli ultimi 30 giorni' }
    };
    
    const titleData = titles[this.currentView] || { 
      title: this.currentView.charAt(0).toUpperCase() + this.currentView.slice(1), 
      subtitle: `App della categoria ${this.currentView}` 
    };
    
    if (sectionTitle) sectionTitle.textContent = titleData.title;
    if (sectionSubtitle) sectionSubtitle.textContent = titleData.subtitle;
  }

  /**
   * Aggiorna contatori categorie
   */
  updateCategoryCounts() {
    // Contatore app totali
    const allCount = document.getElementById('all-count');
    if (allCount) allCount.textContent = this.apps.length;
    
    // Contatore preferiti
    const favoritesCount = document.getElementById('favorites-count');
    const favorites = this.apps.filter(app => app.favorite).length;
    if (favoritesCount) favoritesCount.textContent = favorites;
    
    // Aggiorna categorie dinamiche
    this.updateDynamicCategories();
  }

  /**
   * Aggiorna categorie dinamiche nella sidebar
   */
  updateDynamicCategories() {
    const dynamicCategories = document.getElementById('dynamic-categories');
    if (!dynamicCategories) return;
    
    // Raggruppa per categoria
    const categoryMap = new Map();
    this.apps.forEach(app => {
      const category = app.category || 'uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    
    // Renderizza categorie
    const categoryItems = Array.from(categoryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => `
        <li class="nav-item">
          <a href="#" class="nav-link" data-category="${category}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
            </svg>
            ${category}
            <span class="nav-badge">${count}</span>
          </a>
        </li>
      `).join('');
    
    dynamicCategories.innerHTML = categoryItems;
    
    // Riattacca event listeners
    dynamicCategories.querySelectorAll('[data-category]').forEach(nav => {
      nav.addEventListener('click', this.handleCategoryChange);
    });
  }

  /**
   * Mostra modal per aggiungere app
   */
  showAddAppModal() {
    this.appImporter.showModal();
  }

  /**
   * Mostra modal impostazioni
   */
  showSettingsModal() {
    this.settingsPanel.showModal();
  }

  /**
   * Mostra modal about
   */
  showAboutModal() {
    showModal('about-modal', `
      <div class="modal-header">
        <h2>Su SAKAI</h2>
        <button class="modal-close" onclick="hideModal('about-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="about-content">
          <div class="about-logo">
            <svg viewBox="0 0 100 100" class="about-icon">
              <defs>
                <linearGradient id="aboutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#2563eb"/>
                  <stop offset="100%" style="stop-color:#1d4ed8"/>
                </linearGradient>
              </defs>
              <rect x="10" y="10" width="80" height="80" rx="16" fill="url(#aboutGradient)"/>
              <text x="50" y="65" text-anchor="middle" fill="white" font-size="32" font-weight="bold">S</text>
            </svg>
          </div>
          <h3>SAKAI v1.0.0</h3>
          <p><strong>Swiss Army Knife by AI</strong></p>
          <p>Launcher per applicazioni web generate da AI</p>
          <div class="about-features">
            <h4>Caratteristiche:</h4>
            <ul>
              <li>✅ 100% Client-side</li>
              <li>✅ Funziona offline</li>
              <li>✅ Sincronizzazione cloud opzionale</li>
              <li>✅ Sandbox sicuro per le app</li>
              <li>✅ Import/Export profili</li>
            </ul>
          </div>
          <div class="about-links">
            <a href="https://github.com/sakai/sakai" target="_blank" rel="noopener">GitHub</a>
            <a href="https://sakai.dev/docs" target="_blank" rel="noopener">Documentazione</a>
          </div>
        </div>
      </div>
    `);
  }

  /**
   * Mostra modal app store
   */
  showAppStoreModal() {
    showModal('app-store-modal', `
      <div class="modal-header">
        <h2>SAKAI App Store</h2>
        <button class="modal-close" onclick="hideModal('app-store-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <p>App Store in arrivo nella prossima versione...</p>
        <p>Nel frattempo puoi aggiungere app tramite:</p>
        <ul>
          <li>File ZIP</li>
          <li>URL diretto</li>
          <li>Repository GitHub</li>
        </ul>
      </div>
    `);
  }

  /**
   * Esporta dati
   */
  async exportData() {
    try {
      const data = await StorageService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `sakai-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Dati esportati con successo', 'success');
    } catch (error) {
      console.error('Errore export:', error);
      showToast('Errore durante l\'esportazione', 'error');
    }
  }

  /**
   * Importa dati
   */
  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        await StorageService.importData(data);
        await this.loadApps();
        
        showToast('Dati importati con successo', 'success');
      } catch (error) {
        console.error('Errore import:', error);
        showToast('Errore durante l\'importazione', 'error');
      }
    };
    
    input.click();
  }

  /**
   * Inizializza componenti
   */
  async initializeComponents() {
    await this.appImporter.init();
    await this.syncManager.init();
    await this.settingsPanel.init();
  }

  /**
   * Inizializza sync
   */
  async initializeSync() {
    // Inizializza sync solo se configurato
    const syncEnabled = await StorageService.getSetting('syncEnabled', false);
    if (syncEnabled) {
      await this.syncManager.autoSync();
    }
  }

  /**
   * Controlla se è la prima esecuzione
   */
  async checkFirstRun() {
    const isFirstRun = await StorageService.getSetting('firstRun', true);
    if (isFirstRun) {
      await StorageService.setSetting('firstRun', false);
      showToast('Benvenuto in SAKAI! Inizia aggiungendo la tua prima app.', 'info', 5000);
    }
  }

  /**
   * Aggiorna UI generale
   */
  updateUI() {
    this.updateSectionTitle();
    this.updateCategoryCounts();
    
    // Applica view mode
    document.querySelector(`[data-view="${this.currentViewMode}"]`)?.classList.add('active');
    
    // Applica sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = this.currentSort;
  }

  /**
   * Chiudi tutti i modals
   */
  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      hideModal(modal.id);
    });
  }

  /**
   * Mostra errore
   */
  showError(message) {
    showToast(message, 'error');
  }
}

/**
 * Bootstrap dell'applicazione
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Inizializza app
  const app = new SakaiApp();
  
  // Rendi globale per debugging
  window.sakaiApp = app;
  
  // Avvia applicazione
  await app.init();
});

// Gestione errori globali
window.addEventListener('error', (e) => {
  console.error('Errore globale:', e.error);
  showToast('Si è verificato un errore imprevisto', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Promise rejections non gestita:', e.reason);
  showToast('Errore durante un\'operazione asincrona', 'error');
});

// Esporta per debug
export default SakaiApp;