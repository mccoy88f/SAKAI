/**
 * SAKAI - Debug Utilities
 * Utilità per il debugging dell'applicazione
 */

import { DEBUG_CONFIG } from './constants.js';

export const DEBUG = {
  enabled: import.meta.env.DEV || localStorage.getItem('sakai_debug') === 'true',
  verbose: localStorage.getItem('sakai_verbose_logging') === 'true',
  
  log(...args) {
    if (this.enabled) {
      console.log('[SAKAI Debug]', ...args);
    }
  },
  
  warn(...args) {
    if (this.enabled) {
      console.warn('[SAKAI Debug]', ...args);
    }
  },
  
  error(...args) {
    console.error('[SAKAI Debug]', ...args);
  },
  
  table(data) {
    if (this.enabled) {
      console.table(data);
    }
  },
  
  group(label) {
    if (this.enabled) {
      console.group(label);
    }
  },
  
  groupEnd() {
    if (this.enabled) {
      console.groupEnd();
    }
  }
};

// Development console tools
if (import.meta.env.DEV || DEBUG.enabled) {
  window.SAKAI_DEV = {
    // Storage inspection
    async inspectStorage() {
      const StorageService = await import('../services/StorageService.js').then(m => m.default);
      const stats = await StorageService.getStats();
      const apps = await StorageService.getAllApps();
      const settings = await StorageService.getAllSettings();
      
      console.group('🔍 SAKAI Storage Inspection');
      console.log('Stats:', stats);
      console.table(apps);
      console.log('Settings:', settings);
      console.groupEnd();
    },
    
    // Performance metrics
    getPerformance() {
      return {
        timing: performance.timing,
        navigation: performance.navigation,
        memory: performance.memory
      };
    },
    
    // Error log
    getErrors() {
      return window.SAKAI_ERRORS || [];
    },
    
    // Clear all data
    async clearAll() {
      if (confirm('Clear all SAKAI data? This cannot be undone!')) {
        const StorageService = await import('../services/StorageService.js').then(m => m.default);
        await StorageService.clearAllData();
        localStorage.clear();
        location.reload();
      }
    },
    
    // Enable verbose logging
    enableVerbose() {
      localStorage.setItem('sakai_verbose_logging', 'true');
      DEBUG.verbose = true;
      console.log('Verbose logging enabled');
    },
    
    // Disable verbose logging
    disableVerbose() {
      localStorage.removeItem('sakai_verbose_logging');
      DEBUG.verbose = false;
      console.log('Verbose logging disabled');
    }
  };
}

// Tracking degli errori globali
export class ErrorTracker {
  static errors = [];
  
  static init() {
    window.SAKAI_ERRORS = this.errors;
    
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'runtime',
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  static trackError(error) {
    this.errors.push(error);
    if (DEBUG.enabled) {
      console.error('[SAKAI Error Tracker]', error);
    }
    
    // Limita il numero di errori memorizzati
    if (this.errors.length > 100) {
      this.errors.shift();
    }
  }
  
  static getErrors() {
    return this.errors;
  }
  
  static clearErrors() {
    this.errors = [];
    return true;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  static metrics = {
    marks: {},
    measures: {},
    counters: {}
  };
  
  static mark(name) {
    if (!DEBUG_CONFIG.ENABLE_PERFORMANCE_MARKS) return;
    
    const timestamp = performance.now();
    this.metrics.marks[name] = timestamp;
    
    if (DEBUG.verbose) {
      DEBUG.log(`Performance mark: ${name} at ${timestamp.toFixed(2)}ms`);
    }
  }
  
  static measure(name, startMark, endMark) {
    if (!DEBUG_CONFIG.ENABLE_PERFORMANCE_MARKS) return;
    
    if (!this.metrics.marks[startMark] || !this.metrics.marks[endMark]) {
      DEBUG.warn(`Cannot measure ${name}: marks not found`);
      return;
    }
    
    const duration = this.metrics.marks[endMark] - this.metrics.marks[startMark];
    this.metrics.measures[name] = duration;
    
    if (DEBUG.verbose) {
      DEBUG.log(`Performance measure: ${name} = ${duration.toFixed(2)}ms`);
    }
  }
  
  static count(name) {
    if (!DEBUG_CONFIG.ENABLE_PERFORMANCE_MARKS) return;
    
    if (!this.metrics.counters[name]) {
      this.metrics.counters[name] = 0;
    }
    
    this.metrics.counters[name]++;
  }
  
  static getMetrics() {
    return this.metrics;
  }
  
  static clearMetrics() {
    this.metrics = {
      marks: {},
      measures: {},
      counters: {}
    };
  }
}

// Inizializza il tracker degli errori
ErrorTracker.init();