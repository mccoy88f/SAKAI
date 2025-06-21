import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    
    rollupOptions: {
      input: {
        main: '/Users/antonello/Downloads/SAKAI/public/index.html'
      },
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
        manualChunks: {
          vendor: ['dexie', 'jszip', 'fuse.js', 'date-fns', 'lodash-es', 'dompurify'],
        }
      }
    },
    
    // Ottimizzazioni build
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000
  },
  
  // Development server
  server: {
    port: 3000,
    host: '0.0.0.0',  // Consente l'accesso da qualsiasi indirizzo IP
    open: false,        // Non aprire automaticamente il browser
    cors: true,
    strictPort: false,  // Permetti di provare un'altra porta se 3000 è occupata
    hmr: {
      overlay: true
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization'
    },
    fs: {
      strict: false,    // Permetti l'accesso a file al di fuori della directory root
      allow: ['..']     // Permetti l'accesso alla directory parent
    }
  },
  
  // Preview server (for production build testing)
  preview: {
    port: 4173,
    host: true,
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@services': '/src/services',
      '@utils': '/src/utils',
      '@styles': '/src/styles',
      '@assets': '/public/assets'
    }
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // Optimizations
  optimizeDeps: {
    include: [
      'dexie',
      'jszip',
      'fuse.js',
      'date-fns',
      'lodash-es',
      'dompurify'
    ],
    exclude: []
  },
  
  // Plugins
  plugins: [
    // PWA Plugin
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdnjs-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                return `${request.url}?version=1.0.0`;
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        skipWaiting: true,
        clientsClaim: true
      },
      
      // Manifest configuration
      manifest: {
        name: 'SAKAI - Swiss Army Knife by AI',
        short_name: 'SAKAI',
        description: 'Launcher per applicazioni web generate da AI. Gestisci, organizza e lancia le tue app web in sicurezza.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        
        icons: [
          {
            src: '/assets/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/assets/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        
        categories: ['productivity', 'utilities', 'developer'],
        
        screenshots: [
          {
            src: '/assets/screenshots/desktop-main.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'SAKAI Dashboard - Vista principale con launcher app'
          },
          {
            src: '/assets/screenshots/mobile-apps.png',
            sizes: '375x812',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'SAKAI Mobile - Gestione app su dispositivo mobile'
          }
        ],
        
        shortcuts: [
          {
            name: 'Aggiungi App',
            short_name: 'Nuova App',
            description: 'Importa una nuova applicazione',
            url: '/?action=import',
            icons: [
              {
                src: '/assets/icons/shortcut-add.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          },
          {
            name: 'App Preferite',
            short_name: 'Preferite',
            description: 'Visualizza le tue app preferite',
            url: '/?category=favorites',
            icons: [
              {
                src: '/assets/icons/shortcut-favorites.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          }
        ],
        
        file_handlers: [
          {
            action: '/import',
            accept: {
              'application/zip': ['.zip'],
              'application/x-zip-compressed': ['.zip']
            },
            launch_type: 'single-client'
          }
        ],
        
        protocol_handlers: [
          {
            protocol: 'sakai',
            url: '/launch?url=%s'
          }
        ],
        
        share_target: {
          action: '/import',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'file',
                accept: ['application/zip', 'application/x-zip-compressed']
              }
            ]
          }
        }
      },
      
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  
  // Base URL (change for deployment to subdirectory)
  base: '/',
  
  // Worker configuration
  worker: {
    format: 'es'
  },
  
  // Experimental features
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` };
      } else {
        return { relative: true };
      }
    }
  },
  
  // Security headers for development
  headers: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.github.com https://www.googleapis.com https://accounts.google.com",
      "frame-src 'self' https:",
      "worker-src 'self'",
      "manifest-src 'self'"
    ].join('; ')
  }
});