class SAKLauncher {
    constructor() {
        this.apps = JSON.parse(localStorage.getItem('sakApps') || '[]');
        this.defaultEmojis = ['⚡', '🚀', '🎯', '💡', '🔧', '🎨', '📊', '🌟', '🔮', '🎪', '🎭', '🎪', '🎨', '🎯', '🚀', '⚡', '💫', '🌈', '🎲', '🎸', '🎹', '🎵', '🎬', '📱', '💻', '🖥️', '⌚', '📷', '🎮', '🕹️'];
        this.currentInfoApp = null;
        this.profileActive = localStorage.getItem('sakaiProfileActive') === 'true' || this.apps.length > 0;
        this.initializeEventListeners();
        this.renderAppList();
        this.registerServiceWorker();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('data:text/javascript;base64,' + btoa(`
                self.addEventListener('install', event => {
                    self.skipWaiting();
                });
                
                self.addEventListener('activate', event => {
                    clients.claim();
                });
            `)).catch(() => {
                // Service worker registration failed, but app still works
            });
        }
    }

    initializeEventListeners() {
        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Profile input
        document.getElementById('profileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importProfile(e.target.files[0]);
            }
        });

        // Drag and drop
        const dropZone = document.getElementById('dropZone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Close button
        document.getElementById('closeButton').addEventListener('click', () => {
            this.goHome();
        });

        // App header hover functionality
        const appHoverArea = document.getElementById('appHoverArea');
        const appHeader = document.getElementById('appHeader');
        let headerTimeout;

        appHoverArea.addEventListener('mouseenter', () => {
            clearTimeout(headerTimeout);
            appHeader.classList.add('visible');
        });

        appHoverArea.addEventListener('mouseleave', () => {
            headerTimeout = setTimeout(() => {
                appHeader.classList.remove('visible');
            }, 2000);
        });

        appHeader.addEventListener('mouseenter', () => {
            clearTimeout(headerTimeout);
        });

        appHeader.addEventListener('mouseleave', () => {
            headerTimeout = setTimeout(() => {
                appHeader.classList.remove('visible');
            }, 2000);
        });

        // Close popup on outside click
        document.getElementById('infoPopup').addEventListener('click', (e) => {
            if (e.target.id === 'infoPopup') {
                this.closeInfoPopup();
            }
        });

        // Close webapp dialog on outside click
        document.getElementById('webappDialog').addEventListener('click', (e) => {
            if (e.target.id === 'webappDialog') {
                this.closeWebAppDialog();
            }
        });
    }

    async handleFiles(files) {
        // Attiva il profilo se non è già attivo
        if (!this.profileActive) {
            this.profileActive = true;
        }
        
        for (const file of files) {
            if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                await this.importHTMLFile(file);
            } else if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
                await this.importZipFile(file);
            }
        }
        this.renderAppList();
    }

    async importHTMLFile(file) {
        const content = await this.readFileAsText(file);
        
        // Estrai titolo dal contenuto HTML (prioritario sul nome file)
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        const htmlTitle = titleMatch ? titleMatch[1].trim() : null;
        
        // Usa il titolo HTML se disponibile, altrimenti il nome del file
        const appName = htmlTitle || file.name.replace(/\.[^/.]+$/, "");
        
        // Estrai metadati dal contenuto HTML
        const favicon = this.extractFavicon(content);
        const author = this.extractAuthor(content);
        const description = this.extractDescription(content);
        const genre = this.extractGenre(content);
        const randomEmoji = this.getRandomEmoji();
        
        const app = {
            id: Date.now().toString(),
            name: appName,
            content: content,
            type: 'html',
            dateAdded: new Date().toLocaleString('it-IT'),
            favicon: favicon,
            author: author,
            description: description,
            genre: genre,
            emoji: randomEmoji,
            useCustomIcon: false
        };

        this.apps.unshift(app);
        this.saveApps();
    }

    async importZipFile(file) {
        try {
            // Importa il file ZIP usando JSZip se disponibile
            if (typeof JSZip !== 'undefined') {
                const zip = new JSZip();
                const contents = await zip.loadAsync(file);
                
                // Cerca file HTML nel ZIP
                const htmlFiles = Object.keys(contents.files).filter(filename => 
                    filename.endsWith('.html') || filename.endsWith('.htm')
                );
                
                if (htmlFiles.length > 0) {
                    // Priorità a index.html se esiste
                    const indexFile = htmlFiles.find(f => f.toLowerCase().includes('index.html'));
                    const mainHtmlFile = indexFile || htmlFiles[0];
                    
                    console.log(`File HTML principale trovato: ${mainHtmlFile}`);
                    
                    // Importa il file HTML principale
                    const content = await contents.files[mainHtmlFile].async('text');
                    
                    // Estrai titolo dal contenuto HTML
                    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
                    const htmlTitle = titleMatch ? titleMatch[1].trim() : null;
                    const appName = htmlTitle || file.name.replace(/\.[^/.]+$/, "");
                    
                    const favicon = this.extractFavicon(content);
                    const author = this.extractAuthor(content);
                    const description = this.extractDescription(content);
                    const genre = this.extractGenre(content) || 'Web App';
                    const randomEmoji = this.getRandomEmoji();
                    
                    const app = {
                        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                        name: appName,
                        content: content,
                        type: 'html',
                        dateAdded: new Date().toLocaleString('it-IT'),
                        favicon: favicon,
                        author: author,
                        description: description,
                        genre: genre,
                        emoji: randomEmoji,
                        useCustomIcon: false
                    };

                    this.apps.unshift(app);
                    console.log(`App "${appName}" creata con successo dal ZIP`);
                } else {
                    throw new Error('Nessun file HTML trovato nel ZIP');
                }
            } else {
                throw new Error('JSZip non disponibile');
            }
        } catch (error) {
            console.warn('Errore nell\'importazione ZIP:', error);
            // Fallback per ZIP - crea app placeholder
            const appName = file.name.replace(/\.[^/.]+$/, "");
            const randomEmoji = this.getRandomEmoji();
            
            const app = {
                id: Date.now().toString(),
                name: appName,
                content: `<html><body><h1>App ZIP: ${appName}</h1><p>Errore nell'importazione: ${error.message}</p><p>Prova ad estrarre manualmente i file HTML</p></body></html>`,
                type: 'zip',
                dateAdded: new Date().toLocaleString('it-IT'),
                favicon: null,
                author: null,
                description: 'Archivio ZIP - Errore importazione',
                genre: 'Archivio',
                emoji: randomEmoji,
                useCustomIcon: false
            };

            this.apps.unshift(app);
        }
        
        this.saveApps();
    }

    extractFavicon(htmlContent) {
        const faviconRegex = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i;
        const match = htmlContent.match(faviconRegex);
        
        if (match && match[1]) {
            let faviconUrl = match[1];
            
            if (!faviconUrl.startsWith('http') && !faviconUrl.startsWith('data:')) {
                return null;
            }
            
            return faviconUrl;
        }
        
        return null;
    }

    extractAuthor(htmlContent) {
        const authorPatterns = [
            /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']author["'][^>]*>/i,
            /<meta[^>]*name=["']creator["'][^>]*content=["']([^"']+)["'][^>]*>/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']creator["'][^>]*>/i
        ];
        
        for (const pattern of authorPatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1] && match[1].trim()) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    extractDescription(htmlContent) {
        const descriptionPatterns = [
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i,
            /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["'][^>]*>/i
        ];
        
        for (const pattern of descriptionPatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1] && match[1].trim()) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    extractGenre(htmlContent) {
        const genrePatterns = [
            /<meta[^>]*name=["']genre["'][^>]*content=["']([^"']+)["'][^>]*>/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']genre["'][^>]*>/i,
            /<meta[^>]*name=["']category["'][^>]*content=["']([^"']+)["'][^>]*>/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']category["'][^>]*>/i,
            /<meta[^>]*property=["']article:section["'][^>]*content=["']([^"']+)["'][^>]*>/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:section["'][^>]*>/i
        ];
        
        for (const pattern of genrePatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1] && match[1].trim()) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    getRandomEmoji() {
        return this.defaultEmojis[Math.floor(Math.random() * this.defaultEmojis.length)];
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    createNewProfile() {
        this.profileActive = true;
        this.renderAppList();
    }

    closeProfile() {
        const confirmClose = confirm(
            'Sei sicuro di voler chiudere questo profilo?\n\n' +
            'Tutte le app verranno rimosse e tornerai alla schermata iniziale.\n\n' +
            'SUGGERIMENTO: Esporta il profilo prima di chiuderlo per salvare le tue app.'
        );
        
        if (confirmClose) {
            this.apps = [];
            this.profileActive = false;
            this.saveApps();
            this.renderAppList();
        }
    }

    renderAppList() {
        const appList = document.getElementById('appList');
        const homeScreen = document.getElementById('homeScreen');
        const headerSection = document.getElementById('headerSection');
        const importSection = document.getElementById('importSection');
        const recentApps = document.getElementById('recentApps');
        const profileChoice = document.getElementById('profileChoice');
        const profileActive = document.getElementById('profileActive');
        
        appList.innerHTML = '';

        if (this.apps.length === 0 && !this.profileActive) {
            // Modalità "scelta profilo" - centrato
            homeScreen.classList.add('no-apps');
            headerSection.classList.remove('has-apps');
            importSection.classList.remove('has-apps');
            recentApps.classList.remove('has-apps');
            recentApps.style.display = 'none';
            profileChoice.style.display = 'flex';
            profileActive.style.display = 'none';
        } else {
            // Modalità "profilo attivo" - app in alto, controlli in basso
            homeScreen.classList.remove('no-apps');
            headerSection.classList.add('has-apps');
            importSection.classList.add('has-apps');
            recentApps.classList.add('has-apps');
            recentApps.style.display = 'flex';
            profileChoice.style.display = 'none';
            profileActive.style.display = 'flex';

            this.apps.forEach(app => {
                const appItem = document.createElement('div');
                appItem.className = 'app-item';
                
                const iconContent = this.getIconContent(app);
                const authorInfo = app.author ? `<div class="app-author">di ${app.author}</div>` : '';
                const genreInfo = app.genre ? `<div class="app-genre">${app.genre}</div>` : '';
                
                appItem.innerHTML = `
                    <div class="app-item-content">
                        <div class="app-icon">
                            ${iconContent}
                        </div>
                        <div class="app-info">
                            <div class="app-name">${app.name}</div>
                            <div class="app-meta">
                                ${authorInfo}
                                ${genreInfo}
                                <div class="app-date">Aggiunta il ${app.dateAdded}</div>
                            </div>
                        </div>
                    </div>
                    <div class="app-actions">
                        <button class="info-app" onclick="launcher.showAppInfo('${app.id}')" title="Informazioni e gestione app">i</button>
                    </div>
                `;
                
                // Aggiungi event listener per il click sull'item (escluse le azioni)
                appItem.addEventListener('click', (e) => {
                    if (!e.target.closest('.app-actions')) {
                        this.loadApp(app);
                    }
                });

                appList.appendChild(appItem);
            });
        }
    }

    getIconContent(app) {
        if (app.useCustomIcon || !app.favicon) {
            return `<span class="emoji">${app.emoji}</span>`;
        } else {
            return `<img src="${app.favicon}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display: block;">
                    <span class="emoji" style="display: none;">${app.emoji}</span>`;
        }
    }

    showAppInfo(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        
        this.currentInfoApp = app;
        
        // Popola il popup
        document.getElementById('infoAppName').textContent = app.name;
        document.getElementById('infoAppType').textContent = app.type.toUpperCase();
        document.getElementById('infoDate').textContent = app.dateAdded;
        
        // Icona
        const infoIcon = document.getElementById('infoIcon');
        infoIcon.innerHTML = this.getIconContent(app);
        
        // Campi editabili
        document.getElementById('infoAuthor').value = app.author || '';
        document.getElementById('infoGenre').value = app.genre || '';
        document.getElementById('infoDescription').value = app.description || '';
        
        // Prepara il picker di icone
        const iconPickerGrid = document.getElementById('iconPickerGrid');
        iconPickerGrid.innerHTML = this.defaultEmojis.map(emoji => 
            `<div class="icon-picker-option" onclick="launcher.changeAppIconFromInfo('${emoji}')">${emoji}</div>`
        ).join('');
        
        // Mostra popup
        document.getElementById('infoPopup').classList.add('show');
    }

    closeInfoPopup() {
        document.getElementById('infoPopup').classList.remove('show');
        document.getElementById('iconPickerField').style.display = 'none';
        this.currentInfoApp = null;
    }

    toggleIconPicker() {
        const iconPickerField = document.getElementById('iconPickerField');
        if (iconPickerField.style.display === 'none') {
            iconPickerField.style.display = 'flex';
        } else {
            iconPickerField.style.display = 'none';
        }
    }

    changeAppIconFromInfo(emoji) {
        if (!this.currentInfoApp) return;
        
        this.currentInfoApp.emoji = emoji;
        this.currentInfoApp.useCustomIcon = true;
        
        // Aggiorna l'icona nel popup
        const infoIcon = document.getElementById('infoIcon');
        infoIcon.innerHTML = this.getIconContent(this.currentInfoApp);
        
        // Nascondi il picker
        document.getElementById('iconPickerField').style.display = 'none';
    }

    saveAppInfo() {
        if (!this.currentInfoApp) return;
        
        // Salva i campi editabili
        this.currentInfoApp.author = document.getElementById('infoAuthor').value.trim() || null;
        this.currentInfoApp.genre = document.getElementById('infoGenre').value.trim() || null;
        this.currentInfoApp.description = document.getElementById('infoDescription').value.trim() || null;
        
        this.saveApps();
        this.renderAppList();
        this.closeInfoPopup();
        
        // Mostra conferma
        setTimeout(() => {
            alert('Informazioni salvate con successo!');
        }, 100);
    }

    deleteAppFromInfo() {
        if (!this.currentInfoApp) return;
        
        if (confirm(`Sei sicuro di voler eliminare "${this.currentInfoApp.name}"?`)) {
            this.apps = this.apps.filter(app => app.id !== this.currentInfoApp.id);
            this.saveApps();
            this.renderAppList();
            this.closeInfoPopup();
        }
    }

    async exportProfile() {
        if (this.apps.length === 0) {
            alert('Nessuna app da esportare nel profilo!');
            return;
        }

        try {
            // Usa JSZip se disponibile, altrimenti fallback
            if (typeof JSZip !== 'undefined') {
                await this.exportProfileAsZip();
            } else {
                await this.exportAppsAsSeparateFiles();
            }
        } catch (error) {
            console.error('Errore durante l\'esportazione del profilo:', error);
            alert('Errore durante l\'esportazione del profilo');
        }
    }

    async exportProfileAsZip() {
        const zip = new JSZip();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        // Aggiungi ogni app come file HTML
        this.apps.forEach((app, index) => {
            if (app.type === 'html' || app.type === 'webapp') {
                const filename = `${app.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`;
                zip.file(filename, app.content);
            }
        });
        
        // Aggiungi file di metadati con info sulle app
        const profileData = {
            exportDate: new Date().toISOString(),
            sakaiVersion: '1.0',
            profileType: 'sakai_profile',
            totalApps: this.apps.length,
            apps: this.apps.map(app => ({
                name: app.name,
                type: app.type,
                author: app.author,
                description: app.description,
                genre: app.genre,
                dateAdded: app.dateAdded,
                emoji: app.emoji,
                useCustomIcon: app.useCustomIcon,
                favicon: app.favicon // Salva anche la favicon nei metadati
            }))
        };
        
        zip.file('sakai_profile.json', JSON.stringify(profileData, null, 2));
        
        // Genera e scarica il ZIP
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sakai_profile_${timestamp}.sakaiprofile`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Profilo con ${this.apps.length} app esportato con successo come file .sakaiprofile!`);
    }

    async exportAppsAsSeparateFiles() {
        // Fallback: esporta le app una per una se JSZip non è disponibile
        alert('JSZip non disponibile. Esportazione come file HTML separati...');
        
        for (let i = 0; i < this.apps.length; i++) {
            const app = this.apps[i];
            if (app.type === 'html' || app.type === 'webapp') {
                const blob = new Blob([app.content], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${app.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Aggiungi un delay tra i download per evitare problemi
                if (i < this.apps.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        alert(`${this.apps.length} app esportate come file HTML separati! (JSZip non disponibile per creare .sakaiprofile)`);
    }

    async importProfile(file) {
        if (!file.name.endsWith('.sakaiprofile')) {
            alert('Seleziona un file .sakaiprofile valido');
            return;
        }

        try {
            if (typeof JSZip !== 'undefined') {
                const zip = new JSZip();
                const contents = await zip.loadAsync(file);
                
                // Cerca il file di metadati del profilo
                if (contents.files['sakai_profile.json']) {
                    const profileDataText = await contents.files['sakai_profile.json'].async('text');
                    const profileData = JSON.parse(profileDataText);
                    
                    if (profileData.profileType === 'sakai_profile') {
                        // Mostra anteprima profilo
                        const confirmImport = confirm(
                            `Profilo SAKAI trovato:\n\n` +
                            `• ${profileData.totalApps} app\n` +
                            `• Esportato il: ${new Date(profileData.exportDate).toLocaleString('it-IT')}\n\n` +
                            `Vuoi aprire questo profilo?`
                        );
                        
                        if (confirmImport) {
                            // Pulisci app attuali e attiva profilo
                            this.apps = [];
                            this.profileActive = true;
                            
                            // Importa tutte le app HTML dal profilo
                            const htmlFiles = Object.keys(contents.files).filter(filename => 
                                filename.endsWith('.html') || filename.endsWith('.htm')
                            );
                            
                            for (const filename of htmlFiles) {
                                const content = await contents.files[filename].async('text');
                                
                                // Estrai titolo dal contenuto HTML (prioritario sul nome file)
                                const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
                                const htmlTitle = titleMatch ? titleMatch[1].trim() : null;
                                const appName = htmlTitle || filename.replace(/\.[^/.]+$/, "");
                                
                                // Cerca metadati dell'app nel profilo usando il nome normalizzato
                                const normalizedFilename = filename.replace(/\.[^/.]+$/, "");
                                const appMeta = profileData.apps.find(a => 
                                    a.name.replace(/[^a-zA-Z0-9-_]/g, '_') === normalizedFilename ||
                                    a.name === appName ||
                                    a.name === htmlTitle
                                );
                                
                                // Estrai favicon dal contenuto se non presente nei metadati
                                let favicon = null;
                                if (appMeta && appMeta.favicon) {
                                    favicon = appMeta.favicon;
                                } else {
                                    favicon = this.extractFavicon(content);
                                }
                                
                                const app = {
                                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                                    name: appMeta ? appMeta.name : appName,
                                    content: content,
                                    type: appMeta ? appMeta.type : 'html',
                                    dateAdded: appMeta ? appMeta.dateAdded : new Date().toLocaleString('it-IT'),
                                    favicon: favicon,
                                    author: appMeta ? appMeta.author : this.extractAuthor(content),
                                    description: appMeta ? appMeta.description : this.extractDescription(content),
                                    genre: appMeta ? appMeta.genre : this.extractGenre(content),
                                    emoji: appMeta ? appMeta.emoji : this.getRandomEmoji(),
                                    useCustomIcon: appMeta ? appMeta.useCustomIcon : false
                                };

                                this.apps.push(app);
                            }
                            
                            this.saveApps();
                            this.renderAppList();
                            
                            alert(`Profilo caricato con successo!\n${this.apps.length} app disponibili.`);
                        }
                    } else {
                        alert('File non è un profilo SAKAI valido');
                    }
                } else {
                    alert('File .sakaiprofile non valido: metadati mancanti');
                }
            } else {
                alert('JSZip non disponibile. Non è possibile aprire profili.');
            }
        } catch (error) {
            console.error('Errore apertura profilo:', error);
            alert('Errore durante l\'apertura del profilo. Assicurati che sia un file .sakaiprofile valido.');
        }
        
        // Reset input
        document.getElementById('profileInput').value = '';
    }

    loadApp(app) {
        // Apri l'app in una nuova finestra invece che in iframe
        const blob = new Blob([app.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Apri in una nuova finestra con dimensioni ottimali
        const newWindow = window.open(
            url, 
            `sakai_app_${app.id}`, 
            'width=1200,height=800,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=yes,toolbar=yes'
        );
        
        // Pulisci l'URL dopo un po' di tempo
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 5000);
        
        // Verifica se la finestra si è aperta correttamente
        if (!newWindow) {
            // Fallback se il popup è bloccato
            const userChoice = confirm(
                `Il popup è stato bloccato dal browser.\n\n` +
                `Vuoi scaricare "${app.name}" come file HTML da aprire manualmente?`
            );
            
            if (userChoice) {
                this.downloadAppAsHTML(app);
            }
        } else {
            // Opzionale: aggiungi il titolo alla finestra quando si carica
            newWindow.onload = () => {
                try {
                    newWindow.document.title = `${app.name} - SAKAI`;
                } catch (e) {
                    // Ignora errori di cross-origin
                }
            };
        }
    }

    showAppOptions(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        
        const options = [
            '🪟 Apri in nuova finestra (raccomandato)',
            '📥 Scarica come file HTML',
            '❌ Annulla'
        ];
        
        const choice = prompt(
            `Come vuoi aprire "${app.name}"?\n\n` +
            '1. Apri in nuova finestra (raccomandato)\n' +
            '2. Scarica come file HTML\n' +
            '0. Annulla\n\n' +
            'Digita il numero della tua scelta:'
        );
        
        switch (choice) {
            case '1':
                this.loadApp(app);
                break;
            case '2':
                this.downloadAppAsHTML(app);
                break;
            default:
                // Annulla o input non valido
                break;
        }
    }

    // Versione migliorata della funzione loadApp
    loadApp(app) {
        // Verifica se l'app è una web app (iframe) o app HTML locale
        if (app.type === 'webapp' && app.content.includes('<iframe')) {
            // Per le web app, estrai l'URL e aprilo direttamente
            const iframeSrcMatch = app.content.match(/src=["']([^"']+)["']/);
            if (iframeSrcMatch && iframeSrcMatch[1]) {
                const webappUrl = iframeSrcMatch[1];
                window.open(webappUrl, `sakai_webapp_${app.id}`, 'width=1200,height=800,scrollbars=yes,resizable=yes');
                return;
            }
        }
        
        // Per app HTML normali, crea blob e apri in nuova finestra
        const blob = new Blob([app.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Apri in una nuova finestra con dimensioni ottimali
        const newWindow = window.open(
            url, 
            `sakai_app_${app.id}`, 
            'width=1200,height=800,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=yes,toolbar=yes'
        );
        
        // Pulisci l'URL dopo un po' di tempo
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 5000);
        
        // Verifica se la finestra si è aperta correttamente
        if (!newWindow) {
            // Fallback se il popup è bloccato
            const userChoice = confirm(
                `Il popup è stato bloccato dal browser.\n\n` +
                `Vuoi scaricare "${app.name}" come file HTML da aprire manualmente?`
            );
            
            if (userChoice) {
                this.downloadAppAsHTML(app);
            }
        } else {
            // Opzionale: aggiungi il titolo alla finestra quando si carica
            newWindow.onload = () => {
                try {
                    newWindow.document.title = `${app.name} - SAKAI`;
                } catch (e) {
                    // Ignora errori di cross-origin
                }
            };
        }
    }

    // Nuova funzione per scaricare l'app come file HTML
    downloadAppAsHTML(app) {
        const blob = new Blob([app.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`File "${app.name}.html" scaricato! Aprilo nel browser per usare l'app.`);
    }

    deleteApp(id) {
        const app = this.apps.find(a => a.id === id);
        if (app && confirm(`Sei sicuro di voler eliminare "${app.name}"?`)) {
            this.apps = this.apps.filter(app => app.id !== id);
            this.saveApps();
            this.renderAppList();
        }
    }

    goHome() {
        // Questa funzione non è più necessaria dato che non usiamo più iframe
        // ma la manteniamo per compatibilità
        console.log('goHome chiamata - non più necessaria con il nuovo sistema');
    }

    showWebAppDialog() {
        document.getElementById('webappDialog').classList.add('show');
        document.getElementById('webappName').value = '';
        document.getElementById('webappUrl').value = '';
    }

    closeWebAppDialog() {
        document.getElementById('webappDialog').classList.remove('show');
    }

    async addWebApp() {
        let name = document.getElementById('webappName').value.trim();
        const url = document.getElementById('webappUrl').value.trim();

        if (!url) {
            alert('Inserisci l\'URL della web app.');
            return;
        }

        let favicon = null;
        let description = null;
        let pageTitle = '';
        let author = null;
        let genre = 'Web App';

        try {
            // Prova a fare una richiesta CORS-friendly
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const htmlText = data.contents;
            
            if (htmlText) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                // Titolo pagina
                pageTitle = doc.querySelector('title')?.textContent?.trim() || '';

                // Favicon
                const iconLink = doc.querySelector('link[rel~="icon"]');
                if (iconLink) {
                    let href = iconLink.getAttribute('href');
                    if (href) {
                        if (href.startsWith('http') || href.startsWith('data:')) {
                            favicon = href;
                        } else {
                            const baseUrl = new URL(url);
                            favicon = new URL(href, baseUrl).href;
                        }
                    }
                }

                // Description
                const descMeta = doc.querySelector('meta[name="description"], meta[property="og:description"]');
                if (descMeta) {
                    description = descMeta.getAttribute('content');
                }

                // Author
                const authorMeta = doc.querySelector('meta[name="author"]');
                if (authorMeta) {
                    author = authorMeta.getAttribute('content');
                }
            }
        } catch (e) {
            console.warn('Impossibile recuperare favicon o metadati:', e);
            // Continua senza metadati
        }

        if (!name && pageTitle) {
            name = pageTitle;
        }

        if (!name) {
            name = new URL(url).hostname;
        }

        const app = {
            id: Date.now().toString(),
            name,
            content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        iframe { width: 100%; height: 100vh; border: none; }
    </style>
</head>
<body>
    <iframe src="${url}" allow="accelerometer; autoplay; camera; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; usb"></iframe>
</body>
</html>`,
            type: 'webapp',
            dateAdded: new Date().toLocaleString('it-IT'),
            favicon: favicon,
            author: author,
            description: description || `Web App: ${name}`,
            genre: genre,
            emoji: this.getRandomEmoji(),
            useCustomIcon: false
        };

        this.apps.unshift(app);
        this.saveApps();
        this.renderAppList();
        this.closeWebAppDialog();
        
        alert(`Web App "${name}" aggiunta con successo!`);
    }

    saveApps() {
        localStorage.setItem('sakApps', JSON.stringify(this.apps));
        localStorage.setItem('sakaiProfileActive', this.profileActive.toString());
    }
}

// Inizializza l'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inizializzazione SAKLauncher...');
    
    // Assicurati che JSZip sia caricato prima di inizializzare
    if (typeof JSZip !== 'undefined') {
        console.log('✅ JSZip disponibile');
    } else {
        console.warn('⚠️ JSZip non disponibile - funzionalità ZIP limitate');
    }
    
    // Inizializza l'applicazione
    window.launcher = new SAKLauncher();
    console.log('✅ SAKLauncher inizializzato con successo');
    
    // Imposta modalità home all'avvio
    document.body.classList.add('home-mode');
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('home-mode');
    }
});
