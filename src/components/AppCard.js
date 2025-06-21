/**
 * SAKAI - App Card Component
 * Renderizza le card delle applicazioni nella UI
 */

import { formatRelativeDate, formatFileSize, escapeHtml } from '../utils/helpers.js';

/**
 * Classe per gestire il rendering e l'interazione delle app cards
 */
export default class AppCard {
  
  /**
   * Renderizza una singola app card
   * @param {Object} app - Dati dell'app
   * @param {string} viewMode - Modalità vista: 'grid' o 'list'
   * @returns {string} HTML della card
   */
  static render(app, viewMode = 'grid') {
    if (viewMode === 'list') {
      return this.renderListView(app);
    }
    return this.renderGridView(app);
  }

  /**
   * Renderizza app card in vista griglia
   * @param {Object} app - Dati dell'app
   * @returns {string} HTML della card
   */
  static renderGridView(app) {
    const {
      id,
      name,
      description,
      category,
      version,
      type,
      lastUsed,
      installDate,
      favorite,
      tags,
      icon,
      url,
      githubUrl,
      metadata
    } = app;

    const displayName = escapeHtml(name || 'App Senza Nome');
    const displayDescription = escapeHtml(description || 'Nessuna descrizione disponibile');
    const displayCategory = this.getCategoryInfo(category);
    const appIcon = this.getAppIcon(app);
    const typeInfo = this.getTypeInfo(type);
    const lastUsedFormatted = formatRelativeDate(lastUsed);

    return `
      <div class="app-card" data-app-id="${id}" data-category="${category}" data-type="${type}">
        <!-- App Icon & Status -->
        <div class="app-card-header">
          <div class="app-icon-container">
            ${appIcon}
            <div class="app-type-badge" title="${typeInfo.label}">
              ${typeInfo.icon}
            </div>
          </div>
          
          <!-- Favorite Button -->
          <button 
            class="app-card-favorite ${favorite ? 'is-favorite' : ''}" 
            data-app-id="${id}"
            aria-label="${favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}"
            title="${favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
            </svg>
          </button>
        </div>

        <!-- App Info -->
        <div class="app-card-body">
          <div class="app-card-title">
            <h3 class="app-name" title="${displayName}">${displayName}</h3>
            <span class="app-version">v${version || '1.0.0'}</span>
          </div>
          
          <p class="app-description" title="${displayDescription}">
            ${this.truncateText(displayDescription, 80)}
          </p>

          <!-- Tags -->
          ${tags && tags.length > 0 ? `
            <div class="app-tags">
              ${tags.slice(0, 3).map(tag => `
                <span class="app-tag">${escapeHtml(tag)}</span>
              `).join('')}
              ${tags.length > 3 ? `<span class="app-tag-more">+${tags.length - 3}</span>` : ''}
            </div>
          ` : ''}

          <!-- Metadata -->
          <div class="app-metadata">
            <div class="app-category" title="Categoria">
              ${displayCategory.icon}
              <span>${displayCategory.name}</span>
            </div>
            <div class="app-last-used" title="Ultimo utilizzo: ${new Date(lastUsed).toLocaleString()}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z"/>
              </svg>
              <span>${lastUsedFormatted}</span>
            </div>
          </div>
        </div>

        <!-- App Actions -->
        <div class="app-card-actions">
          <button 
            class="app-card-launch btn btn-primary" 
            data-app-id="${id}"
            aria-label="Avvia ${displayName}"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
            </svg>
            Avvia
          </button>
          
          <div class="app-card-menu-container">
            <button 
              class="app-card-menu btn btn-secondary" 
              data-app-id="${id}"
              aria-label="Menu ${displayName}"
              title="Opzioni app"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Hover Overlay -->
        <div class="app-card-overlay">
          <div class="app-card-overlay-content">
            <h4>${displayName}</h4>
            <p>${displayDescription}</p>
            <div class="app-overlay-stats">
              <div class="stat">
                <span class="stat-label">Installata:</span>
                <span class="stat-value">${formatRelativeDate(installDate)}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Tipo:</span>
                <span class="stat-value">${typeInfo.label}</span>
              </div>
              ${metadata?.size ? `
                <div class="stat">
                  <span class="stat-label">Dimensione:</span>
                  <span class="stat-value">${formatFileSize(metadata.size)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderizza app card in vista lista
   * @param {Object} app - Dati dell'app
   * @returns {string} HTML della card
   */
  static renderListView(app) {
    const {
      id,
      name,
      description,
      category,
      version,
      type,
      lastUsed,
      installDate,
      favorite,
      tags,
      metadata
    } = app;

    const displayName = escapeHtml(name || 'App Senza Nome');
    const displayDescription = escapeHtml(description || 'Nessuna descrizione disponibile');
    const displayCategory = this.getCategoryInfo(category);
    const appIcon = this.getAppIcon(app);
    const typeInfo = this.getTypeInfo(type);
    const lastUsedFormatted = formatRelativeDate(lastUsed);
    const installDateFormatted = formatRelativeDate(installDate);

    return `
      <div class="app-card app-card-list" data-app-id="${id}" data-category="${category}" data-type="${type}">
        <!-- App Icon -->
        <div class="app-list-icon">
          ${appIcon}
          <div class="app-type-badge-mini" title="${typeInfo.label}">
            ${typeInfo.icon}
          </div>
        </div>

        <!-- App Info -->
        <div class="app-list-info">
          <div class="app-list-header">
            <h3 class="app-list-name">${displayName}</h3>
            <span class="app-list-version">v${version || '1.0.0'}</span>
            <div class="app-list-category" title="Categoria">
              ${displayCategory.icon}
              <span>${displayCategory.name}</span>
            </div>
          </div>
          
          <p class="app-list-description">${this.truncateText(displayDescription, 120)}</p>
          
          <!-- Tags in list view -->
          ${tags && tags.length > 0 ? `
            <div class="app-list-tags">
              ${tags.slice(0, 5).map(tag => `
                <span class="app-tag app-tag-small">${escapeHtml(tag)}</span>
              `).join('')}
              ${tags.length > 5 ? `<span class="app-tag-more app-tag-small">+${tags.length - 5}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- App Metadata -->
        <div class="app-list-metadata">
          <div class="app-list-stat">
            <span class="stat-label">Ultimo utilizzo:</span>
            <span class="stat-value">${lastUsedFormatted}</span>
          </div>
          <div class="app-list-stat">
            <span class="stat-label">Installata:</span>
            <span class="stat-value">${installDateFormatted}</span>
          </div>
          ${metadata?.size ? `
            <div class="app-list-stat">
              <span class="stat-label">Dimensione:</span>
              <span class="stat-value">${formatFileSize(metadata.size)}</span>
            </div>
          ` : ''}
        </div>

        <!-- App Actions -->
        <div class="app-list-actions">
          <button 
            class="app-card-favorite ${favorite ? 'is-favorite' : ''}" 
            data-app-id="${id}"
            aria-label="${favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}"
            title="${favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
            </svg>
          </button>
          
          <button 
            class="app-card-launch btn btn-primary" 
            data-app-id="${id}"
            aria-label="Avvia ${displayName}"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
            </svg>
            Avvia
          </button>
          
          <button 
            class="app-card-menu btn btn-secondary" 
            data-app-id="${id}"
            aria-label="Menu ${displayName}"
            title="Opzioni app"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Ottiene l'icona dell'app
   * @param {Object} app - Dati dell'app
   * @returns {string} HTML dell'icona
   */
  static getAppIcon(app) {
    if (app.icon) {
      // Se è un'icona custom (base64, URL, etc.)
      if (app.icon.startsWith('data:') || app.icon.startsWith('http')) {
        return `<img src="${app.icon}" alt="${app.name}" class="app-icon" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="app-icon-fallback" style="display: none;">${this.getDefaultIcon(app.type)}</div>`;
      }
      // Se è un'icona SVG inline
      if (app.icon.includes('<svg')) {
        return `<div class="app-icon app-icon-svg">${app.icon}</div>`;
      }
    }

    // Fallback: icona basata sul tipo di app
    return `<div class="app-icon app-icon-default">${this.getDefaultIcon(app.type)}</div>`;
  }

  /**
   * Ottiene l'icona di default basata sul tipo
   * @param {string} type - Tipo di app
   * @returns {string} SVG icon
   */
  static getDefaultIcon(type) {
    const icons = {
      zip: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>`,
      url: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8Z"/>
      </svg>`,
      github: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"/>
      </svg>`,
      pwa: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C9,20 10,19 11,17H12C14,15 16,13 17,8M18.5,2C16.7,2 15.14,2.9 14.22,4.22L15.63,5.63C16.07,5 16.72,4.5 17.5,4.5C18.61,4.5 19.5,5.39 19.5,6.5C19.5,7.28 19,7.93 18.37,8.37L19.78,9.78C21.1,8.86 22,7.3 22,5.5C22,3.57 20.43,2 18.5,2Z"/>
      </svg>`
    };

    return icons[type] || icons.url;
  }

  /**
   * Ottiene informazioni sul tipo di app
   * @param {string} type - Tipo di app
   * @returns {Object} Info tipo con label e icona
   */
  static getTypeInfo(type) {
    const types = {
      zip: {
        label: 'App ZIP',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>`
      },
      url: {
        label: 'Web App',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.59,13.41C11,13.8 11,14.4 10.59,14.81C10.2,15.2 9.6,15.2 9.19,14.81L7.77,13.39L6.36,14.81C5.95,15.22 5.34,15.22 4.93,14.81C4.53,14.4 4.53,13.8 4.93,13.39L6.34,12L4.93,10.59C4.53,10.2 4.53,9.59 4.93,9.18C5.34,8.78 5.95,8.78 6.36,9.18L7.77,10.6L9.19,9.19C9.6,8.78 10.2,8.78 10.59,9.19C11,9.6 11,10.2 10.59,10.61L9.17,12L10.59,13.41M19.07,4.93C19.47,5.34 19.47,5.95 19.07,6.36L17.65,7.77L19.07,9.19C19.47,9.6 19.47,10.2 19.07,10.61C18.66,11 18.05,11 17.64,10.61L16.23,9.19L14.81,10.61C14.4,11 13.8,11 13.39,10.61C13,10.2 13,9.6 13.39,9.19L14.81,7.77L13.39,6.36C13,5.95 13,5.34 13.39,4.93C13.8,4.53 14.4,4.53 14.81,4.93L16.23,6.34L17.64,4.93C18.05,4.53 18.66,4.53 19.07,4.93Z"/>
        </svg>`
      },
      github: {
        label: 'GitHub App',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"/>
        </svg>`
      },
      pwa: {
        label: 'PWA',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
        </svg>`
      }
    };

    return types[type] || types.url;
  }

  /**
   * Ottiene informazioni sulla categoria
   * @param {string} category - Categoria dell'app
   * @returns {Object} Info categoria con nome e icona
   */
  static getCategoryInfo(category) {
    const categories = {
      productivity: {
        name: 'Produttività',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
        </svg>`
      },
      entertainment: {
        name: 'Intrattenimento',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13,2.05V5.08C16.39,5.57 19,8.47 19,12C19,12.9 18.82,13.75 18.5,14.54L21.12,16.07C21.68,14.83 22,13.45 22,12C22,6.82 18.05,2.55 13,2.05M12,19A7,7 0 0,1 5,12C5,8.47 7.61,5.57 11,5.08V2.05C5.94,2.55 2,6.81 2,12A10,10 0 0,0 12,22C15.3,22 18.23,20.39 20.05,17.91L17.45,16.38C16.17,18 14.21,19 12,19Z"/>
        </svg>`
      },
      tools: {
        name: 'Strumenti',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z"/>
        </svg>`
      },
      games: {
        name: 'Giochi',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.97,16L5,19C4.67,19.3 4.23,19.5 3.75,19.5A1.75,1.75 0 0,1 2,17.75V17.5L3,10.12C3.21,7.81 5.14,6 7.5,6H16.5C18.86,6 20.79,7.81 21,10.12L22,17.5V17.75A1.75,1.75 0 0,1 20.25,19.5C19.77,19.5 19.33,19.3 19,19L16.03,16H7.97M9.5,8A1.5,1.5 0 0,0 8,9.5A1.5,1.5 0 0,0 9.5,11A1.5,1.5 0 0,0 11,9.5A1.5,1.5 0 0,0 9.5,8M14.5,8A1.5,1.5 0 0,0 13,9.5A1.5,1.5 0 0,0 14.5,11A1.5,1.5 0 0,0 16,9.5A1.5,1.5 0 0,0 14.5,8Z"/>
        </svg>`
      },
      ai: {
        name: 'Intelligenza Artificiale',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7.27C13.6,7.61 14,8.26 14,9A2,2 0 0,1 12,11A2,2 0 0,1 10,9A2,2 0 0,1 12,7A2,2 0 0,1 14,9A2,2 0 0,1 12,11A2,2 0 0,1 10,9C10,8.26 10.4,7.61 11,7.27V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M9,9A2,2 0 0,1 11,11A2,2 0 0,1 9,13A2,2 0 0,1 7,11A2,2 0 0,1 9,9M15,9A2,2 0 0,1 17,11A2,2 0 0,1 15,13A2,2 0 0,1 13,11A2,2 0 0,1 15,9M12,12A2,2 0 0,1 14,14C14,14.74 13.6,15.39 13,15.73V17.27C13.6,17.61 14,18.26 14,19A2,2 0 0,1 12,21A2,2 0 0,1 10,19A2,2 0 0,1 12,17A2,2 0 0,1 14,19A2,2 0 0,1 12,21A2,2 0 0,1 10,19C10,18.26 10.4,17.61 11,17.27V15.73C10.4,15.39 10,14.74 10,14A2,2 0 0,1 12,12Z"/>
        </svg>`
      },
      social: {
        name: 'Social',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"/>
        </svg>`
      },
      uncategorized: {
        name: 'Altro',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
        </svg>`
      }
    };

    return categories[category] || categories.uncategorized;
  }

  /**
   * Tronca testo a lunghezza specificata
   * @param {string} text - Testo da troncare
   * @param {number} maxLength - Lunghezza massima
   * @returns {string} Testo troncato
   */
  static truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Genera il menu di contesto per un'app
   * @param {Object} app - Dati dell'app
   * @returns {string} HTML del menu
   */
  static generateContextMenu(app) {
    const { id, name, type, favorite, githubUrl, url } = app;

    return `
      <div class="app-context-menu" data-app-id="${id}">
        <div class="context-menu-item" data-action="launch">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
          </svg>
          Avvia
        </div>
        
        <div class="context-menu-item" data-action="favorite">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
          </svg>
          ${favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        </div>
        
        <div class="context-menu-separator"></div>
        
        <div class="context-menu-item" data-action="edit">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
          </svg>
          Modifica
        </div>
        
        <div class="context-menu-item" data-action="duplicate">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
          </svg>
          Duplica
        </div>
        
        <div class="context-menu-item" data-action="export">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          Esporta
        </div>
        
        ${(githubUrl || url) ? `
          <div class="context-menu-separator"></div>
          ${githubUrl ? `
            <div class="context-menu-item" data-action="open-github">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"/>
              </svg>
              Apri GitHub
            </div>
          ` : ''}
          ${url && type === 'url' ? `
            <div class="context-menu-item" data-action="open-original">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
              </svg>
              Apri originale
            </div>
          ` : ''}
        ` : ''}
        
        <div class="context-menu-separator"></div>
        
        <div class="context-menu-item context-menu-danger" data-action="delete">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          </svg>
          Elimina
        </div>
      </div>
    `;
  }
}