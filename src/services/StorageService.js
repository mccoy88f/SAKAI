import Dexie from 'dexie';

/**
 * SAKAI Storage Service - Gestione IndexedDB con Dexie.js
 * Classe singleton per gestire tutto lo storage locale dell'applicazione
 */
class StorageService {
  constructor() {
    if (StorageService.instance) {
      return StorageService.instance;
    }

    this.db = new Dexie('SAKAI_DB');
    this.initDatabase();
    StorageService.instance = this;
  }

  /**
   * Inizializza lo schema del database
   */
  initDatabase() {
    this.db.version(1).stores({
      // Apps installate dall'utente
      apps: '++id, name, description, category, version, url, type, githubUrl, installDate, lastUsed, favorite, *tags',
      
      // Files delle app (per ZIP imports) 
      appFiles: '++id, appId, filename, content, size, mimeType',
      
      // Impostazioni utente
      settings: 'key, value, lastModified',
      
      // Eventi per sincronizzazione
      syncEvents: '++id, timestamp, action, data, synced, deviceId',
      
      // Catalogo app store
      catalog: '++id, name, description, author, githubUrl, rating, downloads, featured, *categories'
    });

    // Hook per validazione dati
    this.db.apps.hook('creating', (primKey, obj, trans) => {
      obj.installDate = obj.installDate || new Date();
      obj.lastUsed = obj.lastUsed || new Date();
      obj.favorite = obj.favorite || false;
      obj.tags = obj.tags || [];
    });

    this.db.syncEvents.hook('creating', (primKey, obj, trans) => {
      obj.timestamp = obj.timestamp || new Date();
      obj.synced = obj.synced || false;
      obj.deviceId = obj.deviceId || this.getDeviceId();
    });
  }

  /**
   * APPS MANAGEMENT
   */

  // Installa una nuova app
  async installApp(appData) {
    try {
      const app = {
        name: appData.name,
        description: appData.description || '',
        category: appData.category || 'uncategorized',
        version: appData.version || '1.0.0',
        url: appData.url || null,
        type: appData.type, // 'zip', 'url', 'github', 'pwa'
        githubUrl: appData.githubUrl || null,
        icon: appData.icon || null,
        manifest: appData.manifest || {},
        permissions: appData.permissions || [],
        tags: appData.tags || [],
        metadata: appData.metadata || {}
      };

      const appId = await this.db.apps.add(app);
      
      // Salva i file se è un'app ZIP
      if (appData.files && appData.files.length > 0) {
        await this.saveAppFiles(appId, appData.files);
      }

      // Registra evento sync
      await this.addSyncEvent('app_installed', { appId, app });

      return appId;
    } catch (error) {
      console.error('Errore installazione app:', error);
      throw new Error(`Impossibile installare l'app: ${error.message}`);
    }
  }

  // Ottieni tutte le app
  async getAllApps(options = {}) {
    try {
      let query = this.db.apps.orderBy('lastUsed').reverse();

      if (options.category) {
        query = query.filter(app => app.category === options.category);
      }

      if (options.search) {
        query = query.filter(app => 
          app.name.toLowerCase().includes(options.search.toLowerCase()) ||
          app.description.toLowerCase().includes(options.search.toLowerCase()) ||
          app.tags.some(tag => tag.toLowerCase().includes(options.search.toLowerCase()))
        );
      }

      if (options.favorite) {
        query = query.filter(app => app.favorite === true);
      }

      return await query.toArray();
    } catch (error) {
      console.error('Errore recupero app:', error);
      return [];
    }
  }

  // Ottieni app per ID
  async getApp(appId) {
    try {
      return await this.db.apps.get(appId);
    } catch (error) {
      console.error('Errore recupero app:', error);
      return null;
    }
  }

  // Aggiorna app
  async updateApp(appId, updates) {
    try {
      await this.db.apps.update(appId, updates);
      await this.addSyncEvent('app_updated', { appId, updates });
      return true;
    } catch (error) {
      console.error('Errore aggiornamento app:', error);
      return false;
    }
  }

  // Elimina app
  async deleteApp(appId) {
    try {
      await this.db.transaction('rw', [this.db.apps, this.db.appFiles], async () => {
        await this.db.apps.delete(appId);
        await this.db.appFiles.where('appId').equals(appId).delete();
      });

      await this.addSyncEvent('app_deleted', { appId });
      return true;
    } catch (error) {
      console.error('Errore eliminazione app:', error);
      return false;
    }
  }

  // Aggiorna ultimo utilizzo
  async updateLastUsed(appId) {
    try {
      await this.db.apps.update(appId, { lastUsed: new Date() });
    } catch (error) {
      console.error('Errore aggiornamento ultimo utilizzo:', error);
    }
  }

  // Toggle preferito
  async toggleFavorite(appId) {
    try {
      const app = await this.db.apps.get(appId);
      if (app) {
        await this.db.apps.update(appId, { favorite: !app.favorite });
        return !app.favorite;
      }
      return false;
    } catch (error) {
      console.error('Errore toggle preferito:', error);
      return false;
    }
  }

  /**
   * APP FILES MANAGEMENT
   */

  // Salva file di un'app
  async saveAppFiles(appId, files) {
    try {
      const filePromises = files.map(file => 
        this.db.appFiles.add({
          appId,
          filename: file.filename,
          content: file.content,
          size: file.size || file.content.length,
          mimeType: file.mimeType || this.getMimeType(file.filename)
        })
      );

      await Promise.all(filePromises);
      return true;
    } catch (error) {
      console.error('Errore salvataggio file app:', error);
      return false;
    }
  }

  // Ottieni file di un'app
  async getAppFiles(appId) {
    try {
      return await this.db.appFiles.where('appId').equals(appId).toArray();
    } catch (error) {
      console.error('Errore recupero file app:', error);
      return [];
    }
  }

  /**
   * SETTINGS MANAGEMENT  
   */

  // Ottieni impostazione
  async getSetting(key, defaultValue = null) {
    try {
      const setting = await this.db.settings.get(key);
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error('Errore recupero impostazione:', error);
      return defaultValue;
    }
  }

  // Salva impostazione
  async setSetting(key, value) {
    try {
      await this.db.settings.put({
        key,
        value,
        lastModified: new Date()
      });
      return true;
    } catch (error) {
      console.error('Errore salvataggio impostazione:', error);
      return false;
    }
  }

  // Ottieni tutte le impostazioni
  async getAllSettings() {
    try {
      const settings = await this.db.settings.toArray();
      const result = {};
      settings.forEach(setting => {
        result[setting.key] = setting.value;
      });
      return result;
    } catch (error) {
      console.error('Errore recupero impostazioni:', error);
      return {};
    }
  }

  /**
   * SYNC EVENTS MANAGEMENT
   */

  // Aggiungi evento sync
  async addSyncEvent(action, data) {
    try {
      await this.db.syncEvents.add({
        action,
        data,
        timestamp: new Date(),
        synced: false,
        deviceId: await this.getDeviceId()
      });
    } catch (error) {
      console.error('Errore aggiunta evento sync:', error);
    }
  }

  // Ottieni eventi non sincronizzati
  async getUnsyncedEvents() {
    try {
      return await this.db.syncEvents.where('synced').equals(false).toArray();
    } catch (error) {
      console.error('Errore recupero eventi non sincronizzati:', error);
      return [];
    }
  }

  // Marca eventi come sincronizzati
  async markEventsSynced(eventIds) {
    try {
      await this.db.syncEvents.where('id').anyOf(eventIds).modify({ synced: true });
    } catch (error) {
      console.error('Errore aggiornamento eventi sync:', error);
    }
  }

  /**
   * CATALOG MANAGEMENT
   */

  // Aggiorna catalogo
  async updateCatalog(apps) {
    try {
      await this.db.catalog.clear();
      await this.db.catalog.bulkAdd(apps);
      return true;
    } catch (error) {
      console.error('Errore aggiornamento catalogo:', error);
      return false;
    }
  }

  // Cerca nel catalogo
  async searchCatalog(query, options = {}) {
    try {
      let result = this.db.catalog.orderBy('downloads').reverse();

      if (query) {
        result = result.filter(app =>
          app.name.toLowerCase().includes(query.toLowerCase()) ||
          app.description.toLowerCase().includes(query.toLowerCase()) ||
          app.categories.some(cat => cat.toLowerCase().includes(query.toLowerCase()))
        );
      }

      if (options.category) {
        result = result.filter(app => app.categories.includes(options.category));
      }

      if (options.featured) {
        result = result.filter(app => app.featured === true);
      }

      return await result.limit(options.limit || 50).toArray();
    } catch (error) {
      console.error('Errore ricerca catalogo:', error);
      return [];
    }
  }

  /**
   * UTILITY METHODS
   */

  // Ottieni ID dispositivo univoco
  async getDeviceId() {
    let deviceId = await this.getSetting('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      await this.setSetting('deviceId', deviceId);
    }
    return deviceId;
  }

  // Ottieni MIME type da filename
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

  // Esporta tutti i dati
  async exportAllData() {
    try {
      const [apps, settings, syncEvents] = await Promise.all([
        this.db.apps.toArray(),
        this.db.settings.toArray(),
        this.db.syncEvents.toArray()
      ]);

      return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        deviceId: await this.getDeviceId(),
        data: { apps, settings, syncEvents }
      };
    } catch (error) {
      console.error('Errore export dati:', error);
      throw error;
    }
  }

  // Importa dati
  async importData(exportData) {
    try {
      if (!exportData.data) {
        throw new Error('Formato dati non valido');
      }

      const { apps, settings, syncEvents } = exportData.data;

      await this.db.transaction('rw', [this.db.apps, this.db.settings, this.db.syncEvents], async () => {
        if (apps) await this.db.apps.bulkPut(apps);
        if (settings) await this.db.settings.bulkPut(settings);
        if (syncEvents) await this.db.syncEvents.bulkPut(syncEvents);
      });

      return true;
    } catch (error) {
      console.error('Errore import dati:', error);
      throw error;
    }
  }

  // Ottieni statistiche
  async getStats() {
    try {
      const [totalApps, totalFiles, settingsCount, favoriteApps] = await Promise.all([
        this.db.apps.count(),
        this.db.appFiles.count(),
        this.db.settings.count(),
        this.db.apps.where('favorite').equals(true).count()
      ]);

      const categories = await this.db.apps.orderBy('category').uniqueKeys();
      const lastInstall = await this.db.apps.orderBy('installDate').reverse().first();

      return {
        totalApps,
        totalFiles,
        settingsCount,
        favoriteApps,
        categories: categories.length,
        lastInstall: lastInstall?.installDate || null,
        dbSize: await this.estimateDbSize()
      };
    } catch (error) {
      console.error('Errore recupero statistiche:', error);
      return null;
    }
  }

  // Stima dimensione database
  async estimateDbSize() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // Chiudi connessione database
  async close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Esporta istanza singleton
export default new StorageService();