# SAKAI - Swiss Army Knife by AI

> 🚀 **Launcher avanzato per applicazioni web generate da AI**

SAKAI è una Progressive Web App che permette di importare, gestire e lanciare applicazioni web in modo sicuro e organizzato. Progettato specificamente per app generate da AI, offre un ambiente sandbox sicuro e funzionalità avanzate di sincronizzazione cloud.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/sakai/sakai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-orange.svg)](https://web.dev/progressive-web-apps/)

## ✨ Caratteristiche Principali

### 🛡️ **Sicurezza e Privacy**
- **100% Client-side**: Tutti i dati rimangono sul tuo dispositivo
- **Sandbox sicuro**: Isolamento completo delle app in iframe
- **Nessun tracking**: Zero raccolta dati, privacy garantita
- **Funziona offline**: Non richiede connessione internet

### 📦 **Gestione App Completa**
- **Import multipli**: ZIP, URL, GitHub, PWA
- **Organizzazione smart**: Categorie, tag, preferiti
- **Ricerca avanzata**: Fuzzy search e filtri dinamici
- **Launcher flessibile**: Iframe sicuro o nuova pagina

### ☁️ **Sincronizzazione Cloud (Opzionale)**
- **GitHub Gist**: Sync tramite repository privati
- **Google Drive**: Integrazione con Google Drive
- **Risoluzione conflitti**: Merge intelligente dei dati
- **Backup automatici**: Protezione dai dati persi

### 📱 **Esperienza Moderna**
- **PWA installabile**: Funziona come app nativa
- **Design responsive**: Ottimizzato per mobile e desktop
- **Tema dark/light**: Adattamento automatico al sistema
- **Keyboard shortcuts**: Navigazione rapida

## 🚀 Quick Start

### Requisiti
- **Node.js** 16+ 
- **npm** 8+ o **yarn** 1.22+
- Browser moderno con supporto ES2020

### Installazione

```bash
# Clona il repository
git clone https://github.com/sakai/sakai.git
cd sakai

# Installa le dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev

# Apri http://localhost:3000
```

### Build per Produzione

```bash
# Genera build ottimizzato
npm run build

# Test build in locale
npm run preview

# Deploy contenuto di /dist/ sul server
```

## 📋 Comandi Disponibili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia server sviluppo |
| `npm run build` | Build per produzione |
| `npm run preview` | Test build produzione |
| `npm run lint` | Controllo codice |
| `npm run format` | Formattazione codice |
| `npm run test` | Esegui test |

## 🏗️ Architettura

```
sakai/
├── public/                 # File statici
│   ├── index.html         # Entry point
│   ├── manifest.json      # PWA manifest
│   ├── sw.js             # Service worker
│   └── assets/           # Icone e risorse
├── src/
│   ├── components/       # Componenti UI
│   │   ├── AppLauncher.js    # Sistema lancio app
│   │   ├── AppImporter.js    # Import da varie fonti
│   │   ├── AppCard.js        # Rendering app cards
│   │   ├── SettingsPanel.js  # Pannello impostazioni
│   │   └── SyncManager.js    # Gestione sincronizzazione
│   ├── services/         # Servizi core
│   │   └── StorageService.js # Database IndexedDB
│   ├── utils/           # Utility e helpers
│   │   ├── helpers.js       # Funzioni di supporto
│   │   └── constants.js     # Costanti applicazione
│   ├── styles/          # Stili CSS
│   │   └── main.css        # Design system
│   └── main.js          # Entry point JavaScript
├── vite.config.js       # Configurazione build
├── package.json         # Dipendenze e script
└── README.md           # Questa documentazione
```

## 📱 Utilizzo

### 1. **Importare App**

#### Da File ZIP
1. Clicca "Aggiungi App" o usa **Ctrl+N**
2. Seleziona "File ZIP" 
3. Trascina il file o clicca "Seleziona File"
4. Configura metadati e salva

#### Da URL
1. Scegli "Web App URL"
2. Inserisci URL dell'applicazione
3. Test automatico compatibilità
4. Personalizza nome e categoria

#### Da GitHub
1. Seleziona "Repository GitHub"
2. Incolla URL del repository
3. Scelta automatica GitHub Pages/raw
4. Import con metadati del repo

### 2. **Gestire App**

- **Avvio**: Click sulla card o doppio-click
- **Preferiti**: Stella sulla card
- **Menu**: Tre puntini per opzioni avanzate
- **Ricerca**: **Ctrl+K** per ricerca rapida
- **Filtri**: Sidebar con categorie dinamiche

### 3. **Configurazione**

#### Modalità di Apertura
- **Iframe** (default): Sandbox sicuro integrato
- **Nuova pagina**: Apertura in tab separato
- **Auto**: Rilevamento automatico compatibilità

#### Sincronizzazione Cloud
1. Vai in Impostazioni > Sincronizzazione
2. Scegli provider (GitHub/Google Drive)
3. Autorizza accesso
4. Configura intervallo auto-sync

## 🔧 Configurazione Avanzata

### Environment Variables

```bash
# .env.local
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_BASE_URL=https://api.sakai.dev
VITE_ENABLE_ANALYTICS=false
```

### Personalizzazione Sicurezza

```javascript
// src/utils/constants.js
export const SECURITY_CONFIG = {
  SANDBOX_MODE: 'strict', // strict, moderate, permissive
  ALLOWED_PROTOCOLS: ['https:', 'data:', 'blob:'],
  MAX_APP_SIZE: 50 * 1024 * 1024, // 50MB
  VALIDATE_ON_LAUNCH: true
};
```

## 🛠️ Sviluppo

### Struttura Componenti

```javascript
// Esempio componente
import StorageService from '@/services/StorageService.js';
import { showToast } from '@/utils/helpers.js';

class MioComponente {
  async init() {
    // Inizializzazione
  }
  
  async metodoAsync() {
    try {
      const dati = await StorageService.getAllApps();
      // Logica business
    } catch (error) {
      showToast('Errore operazione', 'error');
    }
  }
}
```

### Database Schema

```javascript
// IndexedDB con Dexie.js
const schema = {
  apps: '++id, name, category, lastUsed, favorite, *tags',
  appFiles: '++id, appId, filename, content, mimeType',
  settings: 'key, value, lastModified',
  syncEvents: '++id, timestamp, action, synced'
};
```

### API Integration

```javascript
// GitHub API
const response = await fetch('https://api.github.com/repos/user/repo', {
  headers: {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});
```

## 📄 Formato App

### Struttura ZIP Consigliata

```
my-app.zip
├── sakai.json          # Manifest SAKAI (opzionale)
├── index.html          # Entry point principale
├── assets/
│   ├── icon.png       # Icona app (512x512)
│   └── style.css      # Stili personalizzati
├── js/
│   └── main.js        # JavaScript principale
└── README.md          # Documentazione app
```

### Manifest SAKAI (sakai.json)

```json
{
  "name": "La Mia App",
  "description": "Descrizione dell'applicazione",
  "version": "1.0.0",
  "author": "Nome Autore",
  "category": "productivity",
  "tags": ["ai", "tool", "utility"],
  "entryPoint": "index.html",
  "icon": "assets/icon.png",
  "permissions": ["geolocation"],
  "launchMode": "iframe"
}
```

### API SAKAI per App

Le app possono utilizzare l'API SAKAI esposta:

```javascript
// Disponibile in window.SAKAI
SAKAI.storage.set('mia-chiave', 'valore');
SAKAI.utils.showNotification('Ciao!', 'success');
SAKAI.utils.closeApp(); // Chiude l'app corrente
```

## 🔐 Sicurezza

### Sandbox Permissions

```html
<!-- Iframe con sandbox rigoroso -->
<iframe sandbox="allow-scripts allow-forms allow-modals">
```

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
```

### Validazione Input

- Controllo dimensioni file (max 50MB)
- Validazione MIME types
- Sanitizzazione HTML con DOMPurify
- Verifica URL con whitelist/blacklist

## 🌐 Deploy

### Hosting Statico

```bash
# Build e deploy su Vercel
npm run build
vercel --prod

# Deploy su Netlify
npm run build
netlify deploy --dir=dist --prod

# Deploy su GitHub Pages
npm run build
# Copia contenuto /dist/ in gh-pages branch
```

### Server Requirements

- **HTTPS obbligatorio** (per PWA e moderne API)
- **Gzip/Brotli** compression abilitata
- **Headers CORS** configurati per API esterne
- **Cache headers** per risorse statiche

### Apache .htaccess

```apache
# PWA e SPA routing
RewriteEngine On
RewriteRule ^(?!.*\.).*$ /index.html [L]

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Cache statico
<FilesMatch "\.(ico|png|jpg|jpeg|svg|woff2)$">
  Header set Cache-Control "max-age=31536000"
</FilesMatch>
```

## 🤝 Contribuire

### Setup Sviluppo

```bash
# Fork e clona il repo
git clone https://github.com/TUO_USERNAME/sakai.git
cd sakai

# Installa dipendenze
npm install

# Crea branch feature
git checkout -b feature/nuova-funzionalita

# Sviluppa e testa
npm run dev
npm run test
npm run lint

# Commit e push
git commit -m "feat: aggiungi nuova funzionalità"
git push origin feature/nuova-funzionalita
```

### Guidelines

- **ES6+ moderno** con modules
- **Vanilla JS** o Vue.js leggero
- **CSS moderno** (Grid, Flexbox, Custom Properties)
- **Mobile-first** responsive design
- **Accessibilità** con ARIA e semantic HTML

### Pull Request

1. Descrivi chiaramente le modifiche
2. Includi test per nuove funzionalità
3. Aggiorna documentazione se necessario
4. Verifica che tutti i test passino
5. Mantieni compatibilità con browser moderni

## 📊 Performance

### Bundle Analysis

```bash
# Analizza dimensioni bundle
npm run build
npx vite-bundle-analyzer dist

# Lighthouse audit
npx lighthouse http://localhost:4173 --view
```

### Ottimizzazioni Implementate

- **Code splitting** automatico
- **Lazy loading** immagini e componenti
- **Service Worker** con cache intelligente
- **Preload** risorse critiche
- **Compression** Gzip/Brotli
- **CDN** per librerie esterne

## 🐛 Troubleshooting

### Problemi Comuni

#### App non si avvia
- Verifica console per errori JavaScript
- Controlla che tutti i file siano presenti nel ZIP
- Verifica permessi sandbox se necessario

#### Sincronizzazione fallisce
- Controlla token GitHub/Google Drive
- Verifica connessione internet
- Controlla limiti rate delle API

#### PWA non si installa
- Verifica HTTPS attivo
- Controlla service worker registrato
- Verifica manifest.json valido

#### Performance lente
- Svuota cache browser
- Controlla dimensioni app installate
- Verifica spazio disco disponibile

### Debug Mode

```javascript
// Abilita debug in console
localStorage.setItem('sakai_debug', 'true');
location.reload();

// Info database
console.table(await StorageService.getStats());
```

## 📝 Roadmap

### v1.1 (Q2 2024)
- [ ] App Store integrato
- [ ] Plugin system per estensioni
- [ ] Sync real-time con WebSockets
- [ ] Collaboration features

### v1.2 (Q3 2024)
- [ ] Desktop app con Electron
- [ ] Advanced analytics
- [ ] Multi-tenant support
- [ ] Custom themes engine

### v2.0 (Q4 2024)
- [ ] AI assistant integrato
- [ ] No-code app builder
- [ ] Marketplace pubblico
- [ ] Enterprise features

## 📞 Supporto

- **Issues**: [GitHub Issues](https://github.com/sakai/sakai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sakai/sakai/discussions)
- **Documentation**: [docs.sakai.dev](https://docs.sakai.dev)
- **Discord**: [SAKAI Community](https://discord.gg/sakai)

## 📜 Licenza

Questo progetto è rilasciato sotto licenza [MIT](LICENSE).

```
MIT License

Copyright (c) 2024 SAKAI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<p align="center">
  <strong>Fatto con ❤️ dal Team SAKAI</strong><br>
  <a href="https://sakai.dev">sakai.dev</a> • 
  <a href="https://github.com/sakai/sakai">GitHub</a> • 
  <a href="https://twitter.com/sakai_dev">Twitter</a>
</p>