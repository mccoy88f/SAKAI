/**
 * SAKAI - Constants & Configuration
 * Costanti e configurazioni globali dell'applicazione
 */

// Informazioni applicazione
export const APP_INFO = {
  name: 'SAKAI',
  fullName: 'Swiss Army Knife by AI',
  version: '1.0.0',
  description: 'Launcher per applicazioni web generate da AI',
  author: 'SAKAI Team',
  website: 'https://sakai.dev',
  repository: 'https://github.com/sakai/sakai',
  license: 'MIT'
};

// Database configuration
export const DATABASE_CONFIG = {
  name: 'SAKAI_DB',
  version: 1,
  maxSize: 100 * 1024 * 1024, // 100MB
  backupRetention: 30 // giorni
};

// Limiti applicazione
export const LIMITS = {
  maxApps: 1000,
  maxConcurrentApps: 10,
  maxAppSize: 50 * 1024 * 1024, // 50MB per app ZIP
  maxIconSize: 2 * 1024 * 1024, // 2MB per icona
  maxDescriptionLength: 500,
  maxNameLength: 100,
  maxTagsCount: 20,
  maxTagLength: 30
};

// Tipi di app supportati
export const APP_TYPES = {
  ZIP: 'zip',
  URL: 'url',
  GITHUB: 'github',
  PWA: 'pwa'
};

// Categorie predefinite
export const CATEGORIES = {
  PRODUCTIVITY: 'productivity',
  ENTERTAINMENT: 'entertainment',
  TOOLS: 'tools',
  GAMES: 'games',
  AI: 'ai',
  SOCIAL: 'social',
  EDUCATION: 'education',
  BUSINESS: 'business',
  UTILITY: 'utility',
  UNCATEGORIZED: 'uncategorized'
};

// Labels per le categorie
export const CATEGORY_LABELS = {
  [CATEGORIES.PRODUCTIVITY]: 'Produttività',
  [CATEGORIES.ENTERTAINMENT]: 'Intrattenimento',
  [CATEGORIES.TOOLS]: 'Strumenti',
  [CATEGORIES.GAMES]: 'Giochi',
  [CATEGORIES.AI]: 'Intelligenza Artificiale',
  [CATEGORIES.SOCIAL]: 'Social',
  [CATEGORIES.EDUCATION]: 'Educazione',
  [CATEGORIES.BUSINESS]: 'Business',
  [CATEGORIES.UTILITY]: 'Utilità',
  [CATEGORIES.UNCATEGORIZED]: 'Altro'
};

// Icone per le categorie
export const CATEGORY_ICONS = {
  [CATEGORIES.PRODUCTIVITY]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
  </svg>`,
  [CATEGORIES.ENTERTAINMENT]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M13,2.05V5.08C16.39,5.57 19,8.47 19,12C19,12.9 18.82,13.75 18.5,14.54L21.12,16.07C21.68,14.83 22,13.45 22,12C22,6.82 18.05,2.55 13,2.05M12,19A7,7 0 0,1 5,12C5,8.47 7.61,5.57 11,5.08V2.05C5.94,2.55 2,6.81 2,12A10,10 0 0,0 12,22C15.3,22 18.23,20.39 20.05,17.91L17.45,16.38C16.17,18 14.21,19 12,19Z"/>
  </svg>`,
  [CATEGORIES.TOOLS]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z"/>
  </svg>`,
  [CATEGORIES.GAMES]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.97,16L5,19C4.67,19.3 4.23,19.5 3.75,19.5A1.75,1.75 0 0,1 2,17.75V17.5L3,10.12C3.21,7.81 5.14,6 7.5,6H16.5C18.86,6 20.79,7.81 21,10.12L22,17.5V17.75A1.75,1.75 0 0,1 20.25,19.5C19.77,19.5 19.33,19.3 19,19L16.03,16H7.97M9.5,8A1.5,1.5 0 0,0 8,9.5A1.5,1.5 0 0,0 9.5,11A1.5,1.5 0 0,0 11,9.5A1.5,1.5 0 0,0 9.5,8M14.5,8A1.5,1.5 0 0,0 13,9.5A1.5,1.5 0 0,0 14.5,11A1.5,1.5 0 0,0 16,9.5A1.5,1.5 0 0,0 14.5,8Z"/>
  </svg>`,
  [CATEGORIES.AI]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7.27C13.6,7.61 14,8.26 14,9A2,2 0 0,1 12,11A2,2 0 0,1 10,9A2,2 0 0,1 12,7A2,2 0 0,1 14,9A2,2 0 0,1 12,11A2,2 0 0,1 10,9C10,8.26 10.4,7.61 11,7.27V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M9,9A2,2 0 0,1 11,11A2,2 0 0,1 9,13A2,2 0 0,1 7,11A2,2 0 0,1 9,9M15,9A2,2 0 0,1 17,11A2,2 0 0,1 15,13A2,2 0 0,1 13,11A2,2 0 0,1 15,9M12,12A2,2 0 0,1 14,14C14,14.74 13.6,15.39 13,15.73V17.27C13.6,17.61 14,18.26 14,19A2,2 0 0,1 12,21A2,2 0 0,1 10,19A2,2 0 0,1 12,17A2,2 0 0,1 14,19A2,2 0 0,1 12,21A2,2 0 0,1 10,19C10,18.26 10.4,17.61 11,17.27V15.73C10.4,15.39 10,14.74 10,14A2,2 0 0,1 12,12Z"/>
  </svg>`,
  [CATEGORIES.SOCIAL]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16,4C18.11,4 19.8,5.69 19.8,7.8C19.8,9.91 18.11,11.6 16,11.6C13.89,11.6 12.2,9.91 12.2,7.8C12.2,5.69 13.89,4 16,4M16,5.9C15,5.9 14.1,6.8 14.1,7.8C14.1,8.8 15,9.7 16,9.7C17,9.7 17.9,8.8 17.9,7.8C17.9,6.8 17,5.9 16,5.9M16,13.64C18.67,13.64 22.4,14.97 22.4,17.64V20H9.6V17.64C9.6,14.97 13.33,13.64 16,13.64M16,15.26C14.5,15.26 11.22,16 11.22,17.64V18.38H20.78V17.64C20.78,16 17.5,15.26 16,15.26M7.76,4C9.87,4 11.56,5.69 11.56,7.8C11.56,9.91 9.87,11.6 7.76,11.6C5.65,11.6 3.96,9.91 3.96,7.8C3.96,5.69 5.65,4 7.76,4M7.76,5.9C6.76,5.9 5.86,6.8 5.86,7.8C5.86,8.8 6.76,9.7 7.76,9.7C8.76,9.7 9.66,8.8 9.66,7.8C9.66,6.8 8.76,5.9 7.76,5.9M7.76,13.64C10.43,13.64 14.16,14.97 14.16,17.64V20H1.36V17.64C1.36,14.97 5.09,13.64 7.76,13.64M7.76,15.26C6.26,15.26 2.98,16 2.98,17.64V18.38H12.54V17.64C12.54,16 9.26,15.26 7.76,15.26Z"/>
  </svg>`,
  [CATEGORIES.EDUCATION]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
  </svg>`,
  [CATEGORIES.BUSINESS]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,7V3H2V21H22V7H12M6,19H4V17H6V19M6,15H4V13H6V15M6,11H4V9H6V11M6,7H4V5H6V7M10,19H8V17H10V19M10,15H8V13H10V15M10,11H8V9H10V11M10,7H8V5H10V7M20,19H12V17H14V15H12V13H14V11H12V9H20V19M18,11H16V13H18V11M18,15H16V17H18V15Z"/>
  </svg>`,
  [CATEGORIES.UTILITY]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C9,20 10,19 11,17H12C14,15 16,13 17,8M18.5,2C16.7,2 15.14,2.9 14.22,4.22L15.63,5.63C16.07,5 16.72,4.5 17.5,4.5C18.61,4.5 19.5,5.39 19.5,6.5C19.5,7.28 19,7.93 18.37,8.37L19.78,9.78C21.1,8.86 22,7.3 22,5.5C22,3.57 20.43,2 18.5,2Z"/>
  </svg>`,
  [CATEGORIES.UNCATEGORIZED]: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
  </svg>`
};

// Modalità di lancio app
export const LAUNCH_MODES = {
  IFRAME: 'iframe',
  NEW_PAGE: 'newpage',
  AUTO: 'auto'
};

// Permessi sandbox per iframe
export const SANDBOX_PERMISSIONS = {
  STRICT: 'allow-scripts allow-forms',
  MODERATE: 'allow-scripts allow-forms allow-modals allow-popups-to-escape-sandbox',
  PERMISSIVE: 'allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin'
};

// Estensioni file supportate
export const SUPPORTED_EXTENSIONS = {
  ARCHIVES: ['.zip'],
  IMAGES: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
  DOCUMENTS: ['.html', '.css', '.js', '.json', '.md', '.txt'],
  MANIFESTS: ['manifest.json', 'sakai.json', 'package.json']
};

// MIME types
export const MIME_TYPES = {
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'mjs': 'application/javascript',
  'json': 'application/json',
  'txt': 'text/plain',
  'md': 'text/markdown',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  'ico': 'image/x-icon',
  'zip': 'application/zip',
  'pdf': 'application/pdf',
  'xml': 'application/xml'
};

// Provider di sincronizzazione
export const SYNC_PROVIDERS = {
  GITHUB: 'github',
  GOOGLE_DRIVE: 'googledrive'
};

// URL e endpoint API
export const API_ENDPOINTS = {
  GITHUB: {
    BASE: 'https://api.github.com',
    USER: 'https://api.github.com/user',
    GISTS: 'https://api.github.com/gists',
    REPOS: 'https://api.github.com/repos'
  },
  GOOGLE: {
    DRIVE: 'https://www.googleapis.com/drive/v3',
    AUTH: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN: 'https://oauth2.googleapis.com/token'
  },
  CDN: {
    CDNJS: 'https://cdnjs.cloudflare.com/ajax/libs',
    JSDELIVR: 'https://cdn.jsdelivr.net/npm',
    UNPKG: 'https://unpkg.com'
  }
};

// Temi disponibili
export const THEMES = {
  AUTO: 'auto',
  LIGHT: 'light',
  DARK: 'dark'
};

// Lingue supportate
export const LANGUAGES = {
  IT: 'it',
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de'
};

// Strategie di cache
export const CACHE_STRATEGIES = {
  AGGRESSIVE: 'aggressive',
  MODERATE: 'moderate',
  MINIMAL: 'minimal'
};

// Eventi personalizzati
export const CUSTOM_EVENTS = {
  APP_LAUNCHED: 'sakai:app:launched',
  APP_CLOSED: 'sakai:app:closed',
  APP_INSTALLED: 'sakai:app:installed',
  APP_UPDATED: 'sakai:app:updated',
  APP_DELETED: 'sakai:app:deleted',
  SYNC_STARTED: 'sakai:sync:started',
  SYNC_COMPLETED: 'sakai:sync:completed',
  SYNC_FAILED: 'sakai:sync:failed',
  SETTINGS_CHANGED: 'sakai:settings:changed',
  THEME_CHANGED: 'sakai:theme:changed'
};

// Chiavi localStorage
export const STORAGE_KEYS = {
  THEME: 'sakai_theme',
  LANGUAGE: 'sakai_language',
  FIRST_RUN: 'sakai_first_run',
  INSTALL_PROMPT: 'sakai_install_prompt_dismissed',
  LAST_BACKUP: 'sakai_last_backup',
  DEV_MODE: 'sakai_dev_mode'
};

// Configurazione PWA
export const PWA_CONFIG = {
  INSTALL_PROMPT_DELAY: 3000, // ms
  OFFLINE_READY_DELAY: 1000,  // ms
  UPDATE_CHECK_INTERVAL: 60000, // ms
  CACHE_VERSION: 'v1',
  PRECACHE_ROUTES: [
    '/',
    '/manifest.json',
    '/favicon.ico'
  ]
};

// Configurazioni di sicurezza
export const SECURITY_CONFIG = {
  ALLOWED_PROTOCOLS: ['http:', 'https:', 'data:', 'blob:'],
  BLOCKED_DOMAINS: [
    'malware.example.com',
    'phishing.example.com'
  ],
  MAX_REDIRECTS: 5,
  REQUEST_TIMEOUT: 30000, // ms
  CSP_DIRECTIVES: {
    'default-src': ['\'self\''],
    'script-src': ['\'self\'', '\'unsafe-inline\'', 'https://cdnjs.cloudflare.com'],
    'style-src': ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
    'img-src': ['\'self\'', 'data:', 'https:', 'blob:'],
    'connect-src': ['\'self\'', 'https://api.github.com', 'https://www.googleapis.com'],
    'font-src': ['\'self\'', 'https://fonts.gstatic.com']
  }
};

// Configurazioni performance
export const PERFORMANCE_CONFIG = {
  LAZY_LOAD_THRESHOLD: 200, // px
  DEBOUNCE_SEARCH: 300, // ms
  THROTTLE_SCROLL: 16, // ms
  IMAGE_QUALITY: 0.8,
  MAX_PARALLEL_DOWNLOADS: 3,
  CHUNK_SIZE: 64 * 1024, // 64KB
  PREFETCH_DELAY: 2000 // ms
};

// Formati di data
export const DATE_FORMATS = {
  SHORT: 'dd/MM/yyyy',
  LONG: 'dd MMMM yyyy',
  WITH_TIME: 'dd/MM/yyyy HH:mm',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
  RELATIVE_THRESHOLDS: {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
  }
};

// Messaggi di errore standard
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Errore di connessione. Controlla la tua connessione internet.',
  INVALID_FILE: 'Formato file non supportato.',
  FILE_TOO_LARGE: 'File troppo grande.',
  STORAGE_FULL: 'Spazio di archiviazione esaurito.',
  INVALID_URL: 'URL non valido.',
  SYNC_FAILED: 'Sincronizzazione fallita.',
  IMPORT_FAILED: 'Importazione fallita.',
  EXPORT_FAILED: 'Esportazione fallita.',
  PERMISSION_DENIED: 'Permesso negato.',
  APP_NOT_FOUND: 'Applicazione non trovata.',
  INVALID_MANIFEST: 'Manifest non valido.',
  UNSUPPORTED_BROWSER: 'Browser non supportato.'
};

// Messaggi di successo standard
export const SUCCESS_MESSAGES = {
  APP_INSTALLED: 'Applicazione installata con successo',
  APP_UPDATED: 'Applicazione aggiornata',
  APP_DELETED: 'Applicazione rimossa',
  SYNC_COMPLETED: 'Sincronizzazione completata',
  BACKUP_CREATED: 'Backup creato',
  SETTINGS_SAVED: 'Impostazioni salvate',
  EXPORT_COMPLETED: 'Esportazione completata',
  IMPORT_COMPLETED: 'Importazione completata'
};

// Configurazioni debug
export const DEBUG_CONFIG = {
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_PERFORMANCE_MARKS: false,
  ENABLE_ERROR_BOUNDARY: true,
  LOG_LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  }
};

// Breakpoints responsive
export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  DESKTOP: 1024,
  LARGE: 1200,
  XLARGE: 1440
};

// Configurazioni animazioni
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  EASING: {
    EASE: 'ease',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out'
  },
  SPRING: {
    BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    SMOOTH: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

// Default settings dell'applicazione
export const DEFAULT_SETTINGS = {
  // Generali
  language: LANGUAGES.IT,
  theme: THEMES.AUTO,
  
  // Launcher
  defaultLaunchMode: LAUNCH_MODES.IFRAME,
  maxConcurrentApps: 5,
  showAppTooltips: true,
  enableKeyboardShortcuts: true,
  autoUpdateApps: false,
  
  // UI/UX
  viewMode: 'grid',
  sortBy: 'lastUsed',
  showWelcomeMessage: true,
  enableAnimations: true,
  compactMode: false,
  
  // Sync & Backup
  syncEnabled: false,
  syncProvider: SYNC_PROVIDERS.GITHUB,
  autoSyncInterval: 60,
  backupBeforeSync: true,
  
  // Privacy & Security
  analyticsEnabled: false,
  crashReportingEnabled: true,
  allowTelemetry: false,
  validateAppsOnLaunch: true,
  sandboxMode: 'strict',
  
  // Performance
  enableServiceWorker: true,
  cacheStrategy: CACHE_STRATEGIES.MODERATE,
  preloadApps: false,
  lazyLoadImages: true,
  
  // Developer
  enableDebugMode: false,
  showConsoleErrors: false,
  enableExperimentalFeatures: false
};

// Regex patterns utili
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  GITHUB_URL: /github\.com\/([^\/]+)\/([^\/]+)/,
  GITHUB_PAGES: /([^\.]+)\.github\.io\/([^\/]+)/,
  SEMVER: /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/
};

// Feature flags per controllo funzionalità
export const FEATURE_FLAGS = {
  ENABLE_PWA_INSTALL: true,
  ENABLE_GITHUB_SYNC: true,
  ENABLE_GOOGLE_DRIVE_SYNC: false,
  ENABLE_APP_STORE: false,
  ENABLE_ANALYTICS: false,
  ENABLE_CRASH_REPORTING: true,
  ENABLE_BACKGROUND_SYNC: true,
  ENABLE_PUSH_NOTIFICATIONS: false,
  ENABLE_DARK_MODE: true,
  ENABLE_EXPERIMENTAL_FEATURES: false
};

// Export default configuration object
export default {
  APP_INFO,
  DATABASE_CONFIG,
  LIMITS,
  APP_TYPES,
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  LAUNCH_MODES,
  SANDBOX_PERMISSIONS,
  SUPPORTED_EXTENSIONS,
  MIME_TYPES,
  SYNC_PROVIDERS,
  API_ENDPOINTS,
  THEMES,
  LANGUAGES,
  CACHE_STRATEGIES,
  CUSTOM_EVENTS,
  STORAGE_KEYS,
  PWA_CONFIG,
  SECURITY_CONFIG,
  PERFORMANCE_CONFIG,
  DATE_FORMATS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEBUG_CONFIG,
  BREAKPOINTS,
  ANIMATION_CONFIG,
  DEFAULT_SETTINGS,
  REGEX_PATTERNS,
  FEATURE_FLAGS
};