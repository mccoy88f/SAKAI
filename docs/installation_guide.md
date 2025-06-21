# 📖 Guida all'Installazione di SAKAI

> **SAKAI - Swiss Army Knife by AI**  
> Guida completa per installazione, configurazione e deployment

## 📋 Indice

- [Requisiti di Sistema](#-requisiti-di-sistema)
- [Installazione Locale](#-installazione-locale)
- [Configurazione Development](#️-configurazione-development)
- [Build per Produzione](#-build-per-produzione)
- [Deploy su Hosting](#-deploy-su-hosting)
- [Configurazione PWA](#-configurazione-pwa)
- [Servizi Cloud](#☁️-servizi-cloud)
- [Troubleshooting](#-troubleshooting)
- [Aggiornamenti](#-aggiornamenti)

---

## 🖥️ Requisiti di Sistema

### Ambiente di Sviluppo

| Requisito | Versione Minima | Versione Consigliata |
|-----------|----------------|---------------------|
| **Node.js** | 16.0.0 | 18.0.0 o superiore |
| **npm** | 8.0.0 | 9.0.0 o superiore |
| **Git** | 2.25.0 | Ultima versione |

### Browser Supportati

| Browser | Versione Minima | Note |
|---------|----------------|------|
| **Chrome** | 90+ | Raccomandato per sviluppo |
| **Firefox** | 88+ | Supporto completo PWA |
| **Safari** | 14+ | Limitazioni su iOS < 14.5 |
| **Edge** | 90+ | Basato su Chromium |

### Dispositivi

- **Desktop**: Windows 10+, macOS 10.15+, Linux Ubuntu 18.04+
- **Mobile**: iOS 14.5+, Android 8.0+ (API 26+)
- **Tablet**: iPadOS 14+, Android tablet 8.0+

---

## 🚀 Installazione Locale

### 1. Clonazione Repository

```bash
# Clona il repository principale
git clone https://github.com/sakai/sakai.git
cd sakai

# Verifica la struttura del progetto
ls -la
```

### 2. Installazione Dipendenze

```bash
# Installa con npm (raccomandato)
npm install

# Oppure con yarn
yarn install

# Oppure con pnpm (più veloce)
pnpm install
```

### 3. Verifica Installazione

```bash
# Controlla che tutti i pacchetti siano installati
npm list --depth=0

# Verifica versioni
node --version  # >= 16.0.0
npm --version   # >= 8.0.0
```

### 4. Primo Avvio

```bash
# Avvia il server di sviluppo
npm run dev

# L'applicazione sarà disponibile su:
# http://localhost:3000
```

### 5. Test Funzionalità Base

1. **Interfaccia**: Verifica che l'interfaccia si carichi correttamente
2. **Database**: Prova ad aggiungere un'app di test
3. **Import**: Testa l'importazione da URL
4. **PWA**: Controlla l'installabilità (Chrome DevTools > Application > Manifest)

---

## ⚙️ Configurazione Development

### Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto:

```bash
# .env.local

# GitHub Integration (opzionale)
VITE_GITHUB_CLIENT_ID=your_github_client_id_here

# Google Drive Integration (opzionale)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Configurazioni di sviluppo
VITE_DEV_MODE=true
VITE_DEBUG_ENABLED=true
VITE_MOCK_SYNC=false

# API Base URL (per versioni hosted)
VITE_API_BASE_URL=http://localhost:3000

# Analytics (disabilitato in sviluppo)
VITE_ENABLE_ANALYTICS=false
VITE_GTAG_ID=

# Feature Flags
VITE_ENABLE_EXPERIMENTAL=true
VITE_ENABLE_BETA_FEATURES=false
```

### Configurazione GitHub OAuth

1. **Crea GitHub App**:
   - Vai su [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Compila i campi:
     - **Application name**: `SAKAI Development`
     - **Homepage URL**: `http://localhost:3000`
     - **Authorization callback URL**: `http://localhost:3000/auth/github`

2. **Ottieni credenziali**:
   - Copia `Client ID` in `VITE_GITHUB_CLIENT_ID`
   - Il `Client Secret` non è necessario per l'app client-side

### Configurazione Google Drive OAuth

1. **Crea progetto Google Cloud**:
   - Vai su [Google Cloud Console](https://console.cloud.google.com)
   - Crea nuovo progetto o seleziona esistente
   - Abilita "Google Drive API"

2. **Configura OAuth2**:
   - Vai in "Credentials" > "Create Credentials" > "OAuth 2.0 Client ID"
   - Tipo applicazione: "Web application"
   - Authorized origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/auth/google`

3. **Ottieni Client ID**:
   - Copia `Client ID` in `VITE_GOOGLE_CLIENT_ID`

### Configurazione Opzionale

#### Service Worker Development

```bash
# Abilita service worker in sviluppo
# nel file vite.config.js
export default defineConfig({
  plugins: [
    VitePWA({
      devOptions: {
        enabled: true,  // <- Abilita SW in dev
        type: 'module'
      }
    })
  ]
});
```

#### Debug Mode Avanzato

```javascript
// Nel browser console
localStorage.setItem('sakai_debug', 'true');
localStorage.setItem('sakai_verbose_logging', 'true');
location.reload();
```

---

## 🏗️ Build per Produzione

### 1. Configurazione Produzione

Crea `.env.production`:

```bash
# .env.production

# URL di produzione
VITE_APP_URL=https://your-domain.com

# GitHub OAuth produzione
VITE_GITHUB_CLIENT_ID=your_production_github_client_id

# Google OAuth produzione  
VITE_GOOGLE_CLIENT_ID=your_production_google_client_id

# Feature flags produzione
VITE_ENABLE_ANALYTICS=true
VITE_GTAG_ID=G-XXXXXXXXXX
VITE_ENABLE_EXPERIMENTAL=false
VITE_DEBUG_ENABLED=false
```

### 2. Build Ottimizzato

```bash
# Build per produzione
npm run build

# Il build sarà generato in /dist/
ls -la dist/

# Test del build localmente
npm run preview
# Disponibile su http://localhost:4173
```

### 3. Analisi Bundle

```bash
# Installa analyzer
npm install --save-dev vite-bundle-analyzer

# Genera report dimensioni
npx vite-bundle-analyzer dist/

# Oppure usa webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/
```

### 4. Ottimizzazioni Build

#### Configurazione Vite Avanzata

```javascript
// vite.config.js
export default defineConfig({
  build: {
    // Ottimizzazioni produzione
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false, // Disabilita in produzione
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Separazione vendor
          vendor: ['dexie', 'jszip'],
          ui: ['fuse.js', 'date-fns']
        }
      }
    },
    
    // Compressione
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000
  }
});
```

#### Compressione Avanzata

```bash
# Installa plugin compressione
npm install --save-dev vite-plugin-compression

# Configura Gzip + Brotli
import { compression } from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' })
  ]
});
```

---

## 🌐 Deploy su Hosting

### Vercel (Raccomandato)

```bash
# Installa Vercel CLI
npm install -g vercel

# Deploy diretto
vercel

# Deploy produzione
vercel --prod

# Configurazione custom
# Crea vercel.json:
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

### Netlify

```bash
# Deploy via Git
# 1. Connetti repository GitHub a Netlify
# 2. Configurazione build:
#    - Build command: npm run build
#    - Publish directory: dist

# Deploy manuale
npm install -g netlify-cli
netlify deploy --dir=dist --prod

# Configurazione _redirects
echo "/*    /index.html   200" > dist/_redirects

# Headers personalizzati (_headers)
cat > dist/_headers << EOF
/sw.js
  Cache-Control: no-cache

/assets/*
  Cache-Control: max-age=31536000

/manifest.json
  Cache-Control: max-age=86400
EOF
```

### GitHub Pages

```bash
# Installa gh-pages
npm install --save-dev gh-pages

# Script in package.json
{
  "scripts": {
    "deploy": "gh-pages -d dist"
  }
}

# Deploy
npm run build
npm run deploy

# Configurazione GitHub Pages
# 1. Vai su Settings > Pages
# 2. Source: Deploy from a branch
# 3. Branch: gh-pages / root
```

### Apache/Nginx

#### Configurazione Apache (.htaccess)

```apache
# .htaccess per Apache
RewriteEngine On

# SPA Routing
RewriteRule ^(?!.*\.).*$ /index.html [L]

# Security Headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# HTTPS Redirect
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Cache Control
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|svg|woff2|woff|ttf)$">
  Header set Cache-Control "max-age=31536000"
</FilesMatch>

<FilesMatch "sw\.js$">
  Header set Cache-Control "no-cache"
</FilesMatch>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/css text/javascript application/javascript text/html
</IfModule>
```

#### Configurazione Nginx

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    root /var/www/sakai/dist;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Static Assets Cache
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
    }
    
    # Service Worker No Cache
    location = /sw.js {
        add_header Cache-Control "no-cache";
        expires 0;
    }
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/css text/javascript application/javascript text/html application/json;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 📱 Configurazione PWA

### 1. Verifica Requisiti PWA

**Checklist PWA**:
- [x] HTTPS attivo
- [x] Service Worker registrato
- [x] Web App Manifest valido
- [x] Icone di tutte le dimensioni
- [x] Offline functionality
- [x] Install prompt handling

### 2. Test PWA

```bash
# Lighthouse PWA audit
npx lighthouse https://your-domain.com --view

# Chrome DevTools
# Application > Manifest
# Application > Service Workers
# Application > Storage
```

### 3. Personalizzazione Manifest

```json
// public/manifest.json
{
  "name": "SAKAI - Swiss Army Knife by AI",
  "short_name": "SAKAI",
  "description": "Il tuo launcher per app AI",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  
  "categories": ["productivity", "utilities"],
  
  "shortcuts": [
    {
      "name": "Aggiungi App",
      "url": "/?action=import",
      "icons": [{"src": "/icons/shortcut-add.png", "sizes": "192x192"}]
    }
  ],
  
  "share_target": {
    "action": "/import",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "files": [{"name": "file", "accept": ["application/zip"]}]
    }
  }
}
```

### 4. Generazione Icone

```bash
# Usa PWA Asset Generator
npm install -g pwa-asset-generator

# Genera tutte le icone da un'immagine sorgente
pwa-asset-generator source-icon.svg public/assets/icons \
  --manifest public/manifest.json \
  --index public/index.html \
  --type png \
  --padding "10%"

# Oppure manualmente con ImageMagick
convert source-icon.png -resize 72x72 icon-72x72.png
convert source-icon.png -resize 96x96 icon-96x96.png
convert source-icon.png -resize 128x128 icon-128x128.png
convert source-icon.png -resize 144x144 icon-144x144.png
convert source-icon.png -resize 152x152 icon-152x152.png
convert source-icon.png -resize 192x192 icon-192x192.png
convert source-icon.png -resize 384x384 icon-384x384.png
convert source-icon.png -resize 512x512 icon-512x512.png
```

---

## ☁️ Servizi Cloud

### GitHub Integration

#### 1. Setup GitHub App

```bash
# Crea GitHub App invece di OAuth App per funzionalità avanzate
# https://github.com/settings/apps/new

# Configurazione GitHub App:
# - Repository access: Public repositories
# - Permissions: Contents (Read), Metadata (Read)
# - Webhook: Disabled
```

#### 2. Configurazione Client

```javascript
// .env.production
VITE_GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
VITE_GITHUB_APP_NAME=sakai-production
```

### Google Drive Integration

#### 1. Setup Google Cloud Project

```bash
# 1. Crea progetto su Google Cloud Console
# 2. Abilita APIs:
#    - Google Drive API
#    - Google Picker API (opzionale)
# 3. Configura OAuth consent screen
# 4. Crea credenziali OAuth 2.0
```

#### 2. Configurazione Scopes

```javascript
// Scopes necessari per SAKAI
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',      // Accesso ai file creati dall'app
  'https://www.googleapis.com/auth/drive.appdata',   // Accesso cartella appdata
  'https://www.googleapis.com/auth/userinfo.profile' // Info profilo utente base
];
```

#### 3. Test Integrazione

```bash
# Test API Google Drive
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://www.googleapis.com/drive/v3/about?fields=user,storageQuota"
```

---

## 🐛 Troubleshooting

### Problemi Comuni di Installazione

#### Node.js Version Mismatch

```bash
# Errore: Node version not supported
# Soluzione: Usa nvm per gestire versioni Node

# Installa nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Installa Node 18
nvm install 18
nvm use 18

# Verifica versione
node --version  # v18.x.x
```

#### Dipendenze Non Installate

```bash
# Errore: Module not found
# Soluzione: Reinstalla dipendenze

# Pulisci cache npm
npm cache clean --force

# Rimuovi node_modules e lock file
rm -rf node_modules package-lock.json

# Reinstalla
npm install
```

#### Porta 3000 Occupata

```bash
# Errore: Port 3000 is already in use
# Soluzione: Cambia porta

# Metodo 1: Variable d'ambiente
PORT=3001 npm run dev

# Metodo 2: Configura vite.config.js
export default defineConfig({
  server: {
    port: 3001
  }
});
```

### Problemi Build

#### Out of Memory

```bash
# Errore: JavaScript heap out of memory
# Soluzione: Aumenta memoria Node

# Metodo 1: Variable d'ambiente
NODE_OPTIONS="--max_old_space_size=4096" npm run build

# Metodo 2: Script package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max_old_space_size=4096' vite build"
  }
}
```

#### Import Errors

```bash
# Errore: Failed to resolve import
# Soluzione: Controlla alias vite.config.js

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components')
    }
  }
});
```

### Problemi PWA

#### Service Worker Non Registrato

```bash
# Controlla in Chrome DevTools:
# Application > Service Workers

# Debug service worker
console.log('SW registered:', navigator.serviceWorker.controller);

# Forza update service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.update());
});
```

#### Manifest Non Valido

```bash
# Valida manifest con Lighthouse
npx lighthouse https://your-domain.com --only-categories=pwa --view

# Oppure usa PWA Builder
# https://www.pwabuilder.com/
```

### Problemi Sync

#### GitHub API Rate Limit

```bash
# Errore: API rate limit exceeded
# Soluzione: Usa authenticated requests

# Controlla rate limit
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/rate_limit
```

#### Google Drive OAuth

```bash
# Errore: redirect_uri_mismatch
# Soluzione: Verifica redirect URI esatti

# Authorized redirect URIs deve contenere:
# - http://localhost:3000/auth/google (development)
# - https://your-domain.com/auth/google (production)
```

---

## 🔄 Aggiornamenti

### Update Framework

```bash
# Controlla versioni outdated
npm outdated

# Update patch versions
npm update

# Update major versions (caution!)
npx npm-check-updates -u
npm install
```

### Update SAKAI

```bash
# Pull latest changes
git fetch origin
git pull origin main

# Install new dependencies
npm install

# Run any migration scripts
npm run migrate  # Se disponibili

# Rebuild
npm run build
```

### Backup Prima Update

```bash
# Backup database (se applicabile)
# SAKAI usa IndexedDB client-side, backup automatico nell'app

# Backup configurazione
cp .env.production .env.production.backup
cp vite.config.js vite.config.js.backup

# Backup build
cp -r dist dist.backup
```

### Rollback Strategy

```bash
# Rollback git
git log --oneline -n 10  # Trova commit precedente
git checkout PREVIOUS_COMMIT_HASH

# Rebuild
npm install
npm run build

# Oppure usa git revert
git revert HEAD  # Reverte ultimo commit
```

---

## 📚 Risorse Aggiuntive

### Documentazione Ufficiale

- [Vite Documentation](https://vitejs.dev/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [GitHub API](https://docs.github.com/en/rest)
- [Google Drive API](https://developers.google.com/drive/api)

### Tools Utili

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Manifest Generator](https://tomitm.github.io/appmanifest/)
- [Icon Generator](https://realfavicongenerator.net/)

### Community

- [GitHub Discussions](https://github.com/sakai/sakai/discussions)
- [Discord Server](https://discord.gg/sakai)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/sakai)

---

## 📝 Changelog

### v1.0.0 (2024-01-15)
- ✅ Installazione locale funzionante
- ✅ Build produzione ottimizzato
- ✅ Deploy su hosting principali
- ✅ PWA completa
- ✅ Integrazione GitHub/Google Drive

---

<p align="center">
  <strong>Hai bisogno di aiuto?</strong><br>
  <a href="https://github.com/sakai/sakai/issues">Apri un Issue</a> • 
  <a href="https://github.com/sakai/sakai/discussions">Fai una Domanda</a> • 
  <a href="https://discord.gg/sakai">Unisciti alla Community</a>
</p>