/**
 * SAKAI - Utility Functions & Helpers
 * Funzioni di supporto utilizzate in tutta l'applicazione
 */

/**
 * TOAST NOTIFICATIONS
 */

let toastCounter = 0;

/**
 * Mostra una notifica toast
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Durata in ms (default 4000)
 * @param {Object} options - Opzioni aggiuntive
 */
export function showToast(message, type = 'info', duration = 4000, options = {}) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    console.warn('Toast container non trovato');
    return;
  }

  const toastId = `toast-${++toastCounter}`;
  const toast = document.createElement('div');
  
  toast.id = toastId;
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  
  // Icone per i diversi tipi
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
    </svg>`,
    error: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
    </svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13,13H11V7H13M12,17.3A1.3,1.3 0 0,1 10.7,16A1.3,1.3 0 0,1 12,14.7A1.3,1.3 0 0,1 13.3,16A1.3,1.3 0 0,1 12,17.3M15.73,3H8.27L3,8.27V15.73L8.27,21H15.73L21,15.73V8.27L15.73,3Z"/>
    </svg>`,
    info: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
    </svg>`
  };

  toast.innerHTML = `
    <div class="toast-icon">
      ${icons[type] || icons.info}
    </div>
    <div class="toast-content">
      <div class="toast-message">${escapeHtml(message)}</div>
      ${options.action ? `<button class="toast-action">${options.action}</button>` : ''}
    </div>
    <button class="toast-close" aria-label="Chiudi notifica">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
      </svg>
    </button>
  `;

  // Event listeners
  const closeBtn = toast.querySelector('.toast-close');
  const actionBtn = toast.querySelector('.toast-action');
  
  const removeToast = () => {
    toast.classList.add('toast-removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };

  closeBtn.addEventListener('click', removeToast);
  
  if (actionBtn && options.onAction) {
    actionBtn.addEventListener('click', () => {
      options.onAction();
      removeToast();
    });
  }

  // Aggiungi al container
  toastContainer.appendChild(toast);
  
  // Animazione di entrata
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  // Auto-remove dopo duration
  if (duration > 0) {
    setTimeout(removeToast, duration);
  }

  return toastId;
}

/**
 * Rimuove un toast specifico
 * @param {string} toastId - ID del toast da rimuovere
 */
export function removeToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.querySelector('.toast-close').click();
  }
}

/**
 * Rimuove tutti i toast
 */
export function clearAllToasts() {
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    toast.querySelector('.toast-close').click();
  });
}

/**
 * MODAL MANAGEMENT
 */

/**
 * Mostra un modal
 * @param {string} modalId - ID del modal
 * @param {string} content - Contenuto HTML del modal
 * @param {Object} options - Opzioni aggiuntive
 */
export function showModal(modalId, content, options = {}) {
  const modalsContainer = document.getElementById('modals-container');
  if (!modalsContainer) {
    console.warn('Modals container non trovato');
    return;
  }

  // Rimuovi modal esistente con stesso ID
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', `${modalId}-title`);

  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-dialog ${options.size || 'modal-md'}">
      <div class="modal-content">
        ${content}
      </div>
    </div>
  `;

  // Event listeners
  const backdrop = modal.querySelector('.modal-backdrop');
  const closeButtons = modal.querySelectorAll('.modal-close');

  const closeModal = (e) => {
    if (e) e.preventDefault();
    modal.classList.add('modal-closing');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      // Ripristina focus
      if (options.returnFocus) {
        options.returnFocus.focus();
      }
    }, 300);
  };

  // Click su backdrop
  if (!options.disableBackdropClose) {
    backdrop.addEventListener('click', closeModal);
  }

  // Click sui pulsanti close
  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  // Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape' && !options.disableEscapeClose) {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Salva focus corrente
  const currentFocus = document.activeElement;
  options.returnFocus = currentFocus;

  // Aggiungi al DOM
  modalsContainer.appendChild(modal);

  // Animazione di entrata
  requestAnimationFrame(() => {
    modal.classList.add('modal-show');
    
    // Focus sul primo elemento focusabile
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  });

  return modal;
}

/**
 * Nasconde un modal
 * @param {string} modalId - ID del modal da nascondere
 */
export function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.click();
    }
  }
}

/**
 * Nasconde tutti i modal
 */
export function hideAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    hideModal(modal.id);
  });
}

/**
 * UTILITY FUNCTIONS
 */

/**
 * Escape HTML per prevenire XSS
 * @param {string} text - Testo da escapare
 * @returns {string} Testo escapato
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Formatta dimensione file in formato leggibile
 * @param {number} bytes - Dimensione in bytes
 * @param {number} decimals - Numero di decimali (default 2)
 * @returns {string} Dimensione formattata
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formatta data in formato locale
 * @param {Date|string|number} date - Data da formattare
 * @param {Object} options - Opzioni Intl.DateTimeFormat
 * @returns {string} Data formattata
 */
export function formatDate(date, options = {}) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Data non valida';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Intl.DateTimeFormat('it-IT', { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Formatta data relativa (es. "2 ore fa")
 * @param {Date|string|number} date - Data da formattare
 * @returns {string} Data relativa
 */
export function formatRelativeDate(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Data non valida';

  const now = new Date();
  const diffMs = now - dateObj;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return 'Proprio ora';
  if (diffMinutes < 60) return `${diffMinutes} minut${diffMinutes === 1 ? 'o' : 'i'} fa`;
  if (diffHours < 24) return `${diffHours} or${diffHours === 1 ? 'a' : 'e'} fa`;
  if (diffDays < 7) return `${diffDays} giorn${diffDays === 1 ? 'o' : 'i'} fa`;
  if (diffWeeks < 4) return `${diffWeeks} settiman${diffWeeks === 1 ? 'a' : 'e'} fa`;
  if (diffMonths < 12) return `${diffMonths} mes${diffMonths === 1 ? 'e' : 'i'} fa`;
  return `${diffYears} ann${diffYears === 1 ? 'o' : 'i'} fa`;
}

/**
 * Genera ID univoco
 * @param {string} prefix - Prefisso per l'ID
 * @returns {string} ID univoco
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

/**
 * Debounce function per ottimizzare performance
 * @param {Function} func - Funzione da eseguire
 * @param {number} wait - Millisecondi di attesa
 * @param {boolean} immediate - Esecuzione immediata
 * @returns {Function} Funzione debounced
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function per limitare chiamate
 * @param {Function} func - Funzione da eseguire
 * @param {number} limit - Limite in millisecondi
 * @returns {Function} Funzione throttled
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Copia testo negli appunti
 * @param {string} text - Testo da copiare
 * @returns {Promise<boolean>} Successo dell'operazione
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback per browser più vecchi
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.cssText = 'position: fixed; left: -999999px; top: -999999px;';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Errore copia negli appunti:', error);
    return false;
  }
}

/**
 * Verifica se il dispositivo è mobile
 * @returns {boolean} True se è mobile
 */
export function isMobile() {
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Verifica se il dispositivo supporta le PWA
 * @returns {boolean} True se supporta PWA
 */
export function isPWASupported() {
  return 'serviceWorker' in navigator && 'manifests' in window;
}

/**
 * Ottieni informazioni sul dispositivo
 * @returns {Object} Info dispositivo
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    isMobile: isMobile(),
    isPWASupported: isPWASupported()
  };
}

/**
 * Valida URL
 * @param {string} url - URL da validare
 * @returns {boolean} True se valido
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Estrae dominio da URL
 * @param {string} url - URL di origine
 * @returns {string} Dominio estratto
 */
export function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Converte blob in base64
 * @param {Blob} blob - Blob da convertire
 * @returns {Promise<string>} Base64 string
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converte base64 in blob
 * @param {string} base64 - String base64
 * @param {string} mimeType - Tipo MIME
 * @returns {Blob} Blob risultante
 */
export function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Scarica file dal browser
 * @param {string|Blob} data - Dati da scaricare
 * @param {string} filename - Nome file
 * @param {string} mimeType - Tipo MIME (se data è string)
 */
export function downloadFile(data, filename, mimeType = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ottieni hash di una stringa
 * @param {string} str - Stringa di input
 * @returns {Promise<string>} Hash SHA-256
 */
export async function getStringHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sleep utility per async/await
 * @param {number} ms - Millisecondi di attesa
 * @returns {Promise} Promise che si risolve dopo ms
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  // Toast
  showToast,
  removeToast,
  clearAllToasts,
  
  // Modal
  showModal,
  hideModal,
  hideAllModals,
  
  // Utility
  escapeHtml,
  formatFileSize,
  formatDate,
  formatRelativeDate,
  generateId,
  debounce,
  throttle,
  copyToClipboard,
  isMobile,
  isPWASupported,
  getDeviceInfo,
  isValidUrl,
  extractDomain,
  blobToBase64,
  base64ToBlob,
  downloadFile,
  getStringHash,
  sleep
};