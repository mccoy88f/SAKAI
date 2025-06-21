/**
 * SAKAI - Security Service
 * Gestisce validazione, sanitizzazione e sicurezza delle applicazioni
 */

import { SECURITY_CONFIG, SANDBOX_PERMISSIONS, SUPPORTED_EXTENSIONS } from '../utils/constants.js';
import { showToast } from '../utils/helpers.js';
import DOMPurify from 'dompurify';

/**
 * Servizio centralizzato per la sicurezza delle applicazioni
 */
export default class SecurityService {
  constructor() {
    this.blockedDomains = new Set(SECURITY_CONFIG.BLOCKED_DOMAINS);
    this.allowedProtocols = new Set(SECURITY_CONFIG.ALLOWED_PROTOCOLS);
    this.trustedDomains = new Set([
      'github.com',
      'githubusercontent.com',
      'googleapis.com',
      'gstatic.com',
      'cdnjs.cloudflare.com',
      'jsdelivr.net',
      'unpkg.com'
    ]);
    
    // Rate limiting per API calls
    this.rateLimits = new Map();
    this.requestCounts = new Map();
    
    // Cache per validazioni
    this.validationCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
  }

  /**
   * VALIDAZIONE URL E DOMINI
   */

  /**
   * Valida se un URL è sicuro per l'utilizzo
   * @param {string} url - URL da validare
   * @param {Object} options - Opzioni di validazione
   * @returns {Promise<Object>} Risultato validazione
   */
  async validateUrl(url, options = {}) {
    try {
      if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL non valido' };
      }

      // Controlla cache
      const cacheKey = `url:${url}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const validation = { valid: true, warnings: [], errors: [] };

      // Parse URL
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch (error) {
        return { valid: false, error: 'URL malformato' };
      }

      // Controlla protocollo
      if (!this.allowedProtocols.has(parsedUrl.protocol)) {
        validation.valid = false;
        validation.errors.push(`Protocollo non sicuro: ${parsedUrl.protocol}`);
      }

      // Controlla domini bloccati
      if (this.blockedDomains.has(parsedUrl.hostname)) {
        validation.valid = false;
        validation.errors.push(`Dominio bloccato: ${parsedUrl.hostname}`);
      }

      // Controlla pattern sospetti
      const suspiciousPatterns = [
        /[<>'"]/,  // Caratteri HTML/JS
        /javascript:/i,
        /data:(?!image\/)/i,  // Data URLs non immagini
        /vbscript:/i,
        /about:/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          validation.valid = false;
          validation.errors.push('URL contiene pattern sospetti');
          break;
        }
      }

      // Test connettività (opzionale)
      if (options.testConnection && validation.valid) {
        try {
          const connectivityResult = await this.testUrlConnectivity(url);
          validation.connectivity = connectivityResult;
          
          if (!connectivityResult.accessible) {
            validation.warnings.push('URL non raggiungibile');
          }
        } catch (error) {
          validation.warnings.push('Impossibile testare connettività');
        }
      }

      // Controlla headers di sicurezza (se connessione testata)
      if (validation.connectivity?.headers) {
        this.analyzeSecurityHeaders(validation.connectivity.headers, validation);
      }

      // Cache risultato
      this.setCache(cacheKey, validation);
      return validation;

    } catch (error) {
      console.error('Errore validazione URL:', error);
      return { valid: false, error: 'Errore durante la validazione' };
    }
  }

  /**
   * Testa la connettività di un URL
   * @param {string} url - URL da testare
   * @returns {Promise<Object>} Risultato test
   */
  async testUrlConnectivity(url) {
    try {
      // Usa HEAD request per efficienza
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Evita problemi CORS per test
      });

      clearTimeout(timeoutId);

      return {
        accessible: response.type === 'opaque' || response.ok,
        status: response.status,
        headers: this.extractSecurityHeaders(response),
        redirected: response.redirected,
        url: response.url
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        return { accessible: false, error: 'Timeout' };
      }
      return { accessible: false, error: error.message };
    }
  }

  /**
   * Estrae header di sicurezza dalla response
   * @param {Response} response - Response HTTP
   * @returns {Object} Headers di sicurezza
   */
  extractSecurityHeaders(response) {
    const securityHeaders = {};
    const headerNames = [
      'x-frame-options',
      'content-security-policy',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'referrer-policy'
    ];

    for (const headerName of headerNames) {
      const value = response.headers.get(headerName);
      if (value) {
        securityHeaders[headerName] = value;
      }
    }

    return securityHeaders;
  }

  /**
   * Analizza header di sicurezza
   * @param {Object} headers - Headers HTTP
   * @param {Object} validation - Oggetto validazione da aggiornare
   */
  analyzeSecurityHeaders(headers, validation) {
    // X-Frame-Options
    if (headers['x-frame-options']) {
      const xFrameOptions = headers['x-frame-options'].toLowerCase();
      if (xFrameOptions === 'deny' || xFrameOptions === 'sameorigin') {
        validation.warnings.push('Sito potrebbe non funzionare in iframe');
      }
    }

    // Content Security Policy
    if (headers['content-security-policy']) {
      const csp = headers['content-security-policy'].toLowerCase();
      if (csp.includes('frame-ancestors')) {
        validation.warnings.push('CSP potrebbe bloccare iframe');
      }
    }

    // HTTPS enforcement
    if (!headers['strict-transport-security']) {
      validation.warnings.push('Sito non utilizza HSTS');
    }
  }

  /**
   * VALIDAZIONE FILE E CONTENUTI
   */

  /**
   * Valida un file caricato
   * @param {File} file - File da validare
   * @param {Object} options - Opzioni di validazione
   * @returns {Promise<Object>} Risultato validazione
   */
  async validateFile(file, options = {}) {
    try {
      const validation = { valid: true, warnings: [], errors: [] };

      // Controlla dimensione
      if (file.size > (options.maxSize || 50 * 1024 * 1024)) {
        validation.valid = false;
        validation.errors.push(`File troppo grande: ${file.size} bytes`);
      }

      // Controlla estensione
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      if (options.allowedExtensions) {
        if (!options.allowedExtensions.includes(extension)) {
          validation.valid = false;
          validation.errors.push(`Estensione non permessa: ${extension}`);
        }
      }

      // Controlla MIME type
      if (options.allowedMimeTypes) {
        if (!options.allowedMimeTypes.includes(file.type)) {
          validation.valid = false;
          validation.errors.push(`Tipo MIME non permesso: ${file.type}`);
        }
      }

      // Controlla nome file
      const fileNameValidation = this.validateFileName(file.name);
      if (!fileNameValidation.valid) {
        validation.valid = false;
        validation.errors.push(...fileNameValidation.errors);
      }

      // Scansione contenuto per ZIP
      if (extension === '.zip' && validation.valid) {
        const contentValidation = await this.validateZipContent(file);
        validation.zipContent = contentValidation;
        
        if (!contentValidation.valid) {
          validation.warnings.push('Contenuto ZIP potenzialmente non sicuro');
        }
      }

      return validation;

    } catch (error) {
      console.error('Errore validazione file:', error);
      return { valid: false, error: 'Errore durante la validazione del file' };
    }
  }

  /**
   * Valida il nome di un file
   * @param {string} fileName - Nome file da validare
   * @returns {Object} Risultato validazione
   */
  validateFileName(fileName) {
    const validation = { valid: true, errors: [] };

    // Pattern pericolosi
    const dangerousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Caratteri non validi Windows
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,  // Nomi riservati Windows
      /^\./,  // File nascosti che iniziano con .
      /\.(exe|bat|cmd|scr|pif|vbs|js|jar|com|scr)$/i  // Estensioni eseguibili
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(fileName)) {
        validation.valid = false;
        validation.errors.push('Nome file contiene pattern non sicuri');
        break;
      }
    }

    // Lunghezza nome
    if (fileName.length > 255) {
      validation.valid = false;
      validation.errors.push('Nome file troppo lungo');
    }

    // Caratteri di controllo
    if (/[\x00-\x1f\x80-\x9f]/.test(fileName)) {
      validation.valid = false;
      validation.errors.push('Nome file contiene caratteri di controllo');
    }

    return validation;
  }

  /**
   * Valida il contenuto di un file ZIP
   * @param {File} zipFile - File ZIP da validare
   * @returns {Promise<Object>} Risultato validazione
   */
  async validateZipContent(zipFile) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipFile);
      
      const validation = {
        valid: true,
        warnings: [],
        errors: [],
        files: [],
        totalSize: 0,
        hasExecutables: false,
        hasHiddenFiles: false,
        suspiciousFiles: []
      };

      for (const [filename, fileObj] of Object.entries(contents.files)) {
        if (fileObj.dir) continue;

        const fileInfo = {
          name: filename,
          size: fileObj._data?.uncompressedSize || 0,
          compressed: fileObj._data?.compressedSize || 0
        };

        validation.files.push(fileInfo);
        validation.totalSize += fileInfo.size;

        // Controlla file eseguibili
        if (/\.(exe|bat|cmd|scr|pif|vbs|jar|com)$/i.test(filename)) {
          validation.hasExecutables = true;
          validation.suspiciousFiles.push(filename);
        }

        // Controlla file nascosti
        if (filename.startsWith('.') || filename.includes('/.')) {
          validation.hasHiddenFiles = true;
        }

        // Controlla path traversal
        if (filename.includes('..') || filename.includes('~')) {
          validation.suspiciousFiles.push(filename);
          validation.errors.push(`File con path sospetto: ${filename}`);
        }

        // Controlla dimensioni eccessive
        if (fileInfo.size > 10 * 1024 * 1024) { // 10MB per singolo file
          validation.warnings.push(`File molto grande: ${filename} (${fileInfo.size} bytes)`);
        }
      }

      // Validazioni globali
      if (validation.hasExecutables) {
        validation.warnings.push('ZIP contiene file eseguibili');
      }

      if (validation.suspiciousFiles.length > 0) {
        validation.valid = false;
        validation.errors.push('ZIP contiene file sospetti');
      }

      if (validation.totalSize > 100 * 1024 * 1024) { // 100MB totali
        validation.warnings.push('ZIP molto grande quando estratto');
      }

      return validation;

    } catch (error) {
      console.error('Errore validazione ZIP:', error);
      return {
        valid: false,
        error: 'Impossibile analizzare il contenuto ZIP'
      };
    }
  }

  /**
   * SANITIZZAZIONE CONTENUTI
   */

  /**
   * Sanitizza contenuto HTML
   * @param {string} html - HTML da sanitizzare
   * @param {Object} options - Opzioni di sanitizzazione
   * @returns {string} HTML sanitizzato
   */
  sanitizeHTML(html, options = {}) {
    const defaultConfig = {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'br', 'hr', 
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'b', 'i', 'u',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'a', 'img', 
        'canvas', 'svg', 'path', 'circle', 'rect',
        'input', 'button', 'form', 'label', 'select', 'option'
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'style',
        'href', 'target', 'title', 'alt',
        'src', 'width', 'height',
        'type', 'value', 'name', 'placeholder',
        'viewBox', 'd', 'fill', 'stroke'
      ],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'frame'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
      ...options
    };

    try {
      return DOMPurify.sanitize(html, defaultConfig);
    } catch (error) {
      console.error('Errore sanitizzazione HTML:', error);
      return '<!-- Contenuto rimosso per sicurezza -->';
    }
  }

  /**
   * Sanitizza contenuto JavaScript
   * @param {string} jsContent - Codice JavaScript
   * @param {Object} options - Opzioni di sanitizzazione  
   * @returns {Object} Risultato sanitizzazione
   */
  sanitizeJavaScript(jsContent, options = {}) {
    const result = {
      safe: false,
      sanitized: '',
      issues: [],
      blocked: []
    };

    try {
      // Pattern pericolosi
      const dangerousPatterns = [
        { pattern: /eval\s*\(/gi, description: 'Uso di eval()' },
        { pattern: /Function\s*\(/gi, description: 'Costruttore Function()' },
        { pattern: /document\.write/gi, description: 'document.write()' },
        { pattern: /innerHTML\s*=/gi, description: 'Modifica innerHTML' },
        { pattern: /outerHTML\s*=/gi, description: 'Modifica outerHTML' },
        { pattern: /\.appendChild\s*\(/gi, description: 'appendChild dinamico' },
        { pattern: /createElement\s*\(/gi, description: 'createElement dinamico' },
        { pattern: /setTimeout\s*\(/gi, description: 'setTimeout con string' },
        { pattern: /setInterval\s*\(/gi, description: 'setInterval con string' },
        { pattern: /XMLHttpRequest/gi, description: 'XMLHttpRequest' },
        { pattern: /fetch\s*\(/gi, description: 'Fetch API' },
        { pattern: /websocket/gi, description: 'WebSocket' },
        { pattern: /localStorage|sessionStorage/gi, description: 'Web Storage' },
        { pattern: /navigator\./gi, description: 'Navigator API' },
        { pattern: /window\./gi, description: 'Window object access' },
        { pattern: /parent\.|top\./gi, description: 'Frame parent access' }
      ];

      let sanitizedContent = jsContent;
      
      for (const { pattern, description } of dangerousPatterns) {
        if (pattern.test(jsContent)) {
          result.issues.push(description);
          
          if (options.removeUnsafe) {
            sanitizedContent = sanitizedContent.replace(pattern, '/* REMOVED: ' + description + ' */');
            result.blocked.push(description);
          }
        }
      }

      // Controlla lunghezza eccessiva
      if (jsContent.length > 1024 * 1024) { // 1MB
        result.issues.push('Codice JavaScript molto grande');
      }

      // Controlla offuscamento
      if (this.isObfuscated(jsContent)) {
        result.issues.push('Codice potenzialmente offuscato');
      }

      result.safe = result.issues.length === 0;
      result.sanitized = sanitizedContent;

      return result;

    } catch (error) {
      console.error('Errore sanitizzazione JavaScript:', error);
      return {
        safe: false,
        sanitized: '/* Codice rimosso per errore di sanitizzazione */',
        issues: ['Errore durante la sanitizzazione'],
        blocked: []
      };
    }
  }

  /**
   * Controlla se il codice JavaScript è offuscato
   * @param {string} jsContent - Codice da controllare
   * @returns {boolean} True se sembra offuscato
   */
  isObfuscated(jsContent) {
    // Euristics per rilevare offuscamento
    const indicators = [
      jsContent.length > 1000 && jsContent.split('\n').length < 10, // Codice molto lungo su poche righe
      /\\x[0-9a-f]{2}/gi.test(jsContent), // Escape hex
      /\\u[0-9a-f]{4}/gi.test(jsContent), // Escape unicode
      /\['[^']+'\]\['[^']+'\]/g.test(jsContent), // Accesso proprietà con stringhe
      jsContent.split(';').length > jsContent.split('\n').length * 3 // Molti statement per riga
    ];

    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * GESTIONE PERMESSI SANDBOX
   */

  /**
   * Genera permessi sandbox per un'app
   * @param {Object} app - Dati dell'app
   * @param {string} securityLevel - Livello di sicurezza (strict, moderate, permissive)
   * @returns {string} Stringa sandbox permissions
   */
  generateSandboxPermissions(app, securityLevel = 'moderate') {
    const basePermissions = ['allow-scripts', 'allow-forms'];
    
    const permissions = {
      strict: [...basePermissions],
      moderate: [...basePermissions, 'allow-modals', 'allow-popups-to-escape-sandbox'],
      permissive: [...basePermissions, 'allow-modals', 'allow-popups', 'allow-popups-to-escape-sandbox', 'allow-same-origin']
    };

    // Permessi aggiuntivi basati sul tipo di app
    if (app.type === 'url' && app.url?.startsWith('https://')) {
      permissions[securityLevel].push('allow-same-origin');
    }

    // Permessi basati sui metadati dell'app
    if (app.metadata?.permissions) {
      for (const permission of app.metadata.permissions) {
        switch (permission) {
          case 'geolocation':
            // Geolocation richiede same-origin
            if (!permissions[securityLevel].includes('allow-same-origin')) {
              permissions[securityLevel].push('allow-same-origin');
            }
            break;
          case 'camera':
          case 'microphone':
            permissions[securityLevel].push('allow-camera');
            permissions[securityLevel].push('allow-microphone');
            break;
        }
      }
    }

    return permissions[securityLevel].join(' ');
  }

  /**
   * RATE LIMITING
   */

  /**
   * Controlla rate limiting per una risorsa
   * @param {string} resource - Identificatore risorsa
   * @param {number} limit - Limite richieste per finestra
   * @param {number} window - Finestra temporale in ms
   * @returns {boolean} True se permesso
   */
  checkRateLimit(resource, limit = 60, window = 60000) {
    const now = Date.now();
    const windowStart = now - window;

    // Pulisci vecchie entry
    if (!this.requestCounts.has(resource)) {
      this.requestCounts.set(resource, []);
    }

    const requests = this.requestCounts.get(resource);
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    this.requestCounts.set(resource, validRequests);

    // Controlla limite
    if (validRequests.length >= limit) {
      return false;
    }

    // Registra nuova richiesta
    validRequests.push(now);
    return true;
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
    const cached = this.validationCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.validationCache.delete(key);
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
    this.validationCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Pulisce cache
   */
  clearCache() {
    this.validationCache.clear();
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Aggiunge dominio alla blacklist
   * @param {string} domain - Dominio da bloccare
   */
  blockDomain(domain) {
    this.blockedDomains.add(domain);
  }

  /**
   * Rimuove dominio dalla blacklist
   * @param {string} domain - Dominio da sbloccare
   */
  allowDomain(domain) {
    this.blockedDomains.delete(domain);
  }

  /**
   * Aggiunge dominio ai trusted
   * @param {string} domain - Dominio trusted
   */
  trustDomain(domain) {
    this.trustedDomains.add(domain);
  }

  /**
   * Ottiene statistiche di sicurezza
   * @returns {Object} Statistiche
   */
  getSecurityStats() {
    return {
      blockedDomains: Array.from(this.blockedDomains),
      trustedDomains: Array.from(this.trustedDomains),
      cacheSize: this.validationCache.size,
      rateLimitedResources: this.requestCounts.size
    };
  }

  /**
   * Esegue scan completo di sicurezza su un'app
   * @param {Object} appData - Dati dell'app
   * @param {Array} files - File dell'app (per ZIP)
   * @returns {Promise<Object>} Risultato scan
   */
  async performSecurityScan(appData, files = []) {
    const scanResult = {
      overall: 'safe', // safe, warning, dangerous
      score: 100,
      issues: [],
      recommendations: []
    };

    try {
      // Scan URL se presente
      if (appData.url) {
        const urlValidation = await this.validateUrl(appData.url, { testConnection: true });
        if (!urlValidation.valid) {
          scanResult.issues.push({
            type: 'url',
            severity: 'high',
            message: 'URL non sicuro',
            details: urlValidation.errors
          });
          scanResult.score -= 30;
        }
      }

      // Scan file se presenti
      if (files.length > 0) {
        for (const file of files) {
          // Scan contenuto HTML
          if (file.filename.endsWith('.html')) {
            const htmlScan = this.scanHTMLContent(file.content);
            if (htmlScan.issues.length > 0) {
              scanResult.issues.push({
                type: 'html',
                file: file.filename,
                severity: 'medium',
                message: 'Contenuto HTML potenzialmente non sicuro',
                details: htmlScan.issues
              });
              scanResult.score -= 10;
            }
          }

          // Scan contenuto JavaScript
          if (file.filename.endsWith('.js')) {
            const jsScan = this.sanitizeJavaScript(file.content);
            if (!jsScan.safe) {
              scanResult.issues.push({
                type: 'javascript',
                file: file.filename,
                severity: 'high',
                message: 'Codice JavaScript non sicuro',
                details: jsScan.issues
              });
              scanResult.score -= 20;
            }
          }
        }
      }

      // Determina overall status
      if (scanResult.score >= 80) {
        scanResult.overall = 'safe';
      } else if (scanResult.score >= 50) {
        scanResult.overall = 'warning';
      } else {
        scanResult.overall = 'dangerous';
      }

      // Genera raccomandazioni
      if (scanResult.issues.length === 0) {
        scanResult.recommendations.push('App appears to be safe for installation');
      } else {
        scanResult.recommendations.push('Review security issues before installation');
        if (scanResult.score < 70) {
          scanResult.recommendations.push('Consider using strict sandbox mode');
        }
      }

      return scanResult;

    } catch (error) {
      console.error('Errore security scan:', error);
      return {
        overall: 'warning',
        score: 50,
        issues: [{ type: 'scan', severity: 'medium', message: 'Errore durante la scansione' }],
        recommendations: ['Manual review recommended due to scan error']
      };
    }
  }

  /**
   * Scansiona contenuto HTML per pattern sospetti
   * @param {string} htmlContent - Contenuto HTML
   * @returns {Object} Risultato scan
   */
  scanHTMLContent(htmlContent) {
    const result = { safe: true, issues: [] };

    const suspiciousPatterns = [
      { pattern: /<script[^>]*src=[^>]*>/gi, issue: 'External script inclusion' },
      { pattern: /javascript:/gi, issue: 'JavaScript URL protocol' },
      { pattern: /on\w+\s*=/gi, issue: 'Inline event handlers' },
      { pattern: /<iframe[^>]*>/gi, issue: 'Iframe element' },
      { pattern: /<object[^>]*>/gi, issue: 'Object element' },
      { pattern: /<embed[^>]*>/gi, issue: 'Embed element' },
      { pattern: /document\.write/gi, issue: 'document.write usage' },
      { pattern: /eval\s*\(/gi, issue: 'eval() usage' }
    ];

    for (const { pattern, issue } of suspiciousPatterns) {
      if (pattern.test(htmlContent)) {
        result.safe = false;
        result.issues.push(issue);
      }
    }

    return result;
  }
}