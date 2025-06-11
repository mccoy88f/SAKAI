class SAKLauncher {
    constructor() {
        this.apps = JSON.parse(localStorage.getItem('sakApps') || '[]');
        this.defaultEmojis = ['⚡', '🚀', '🎯', '💡', '🔧', '🎨', '📊', '🌟', '🔮', '🎪', '🎭', '🎪', '🎨', '🎯', '🚀', '⚡', '💫', '🌈', '🎲', '🎸', '🎹', '🎵', '🎬', '📱', '💻', '🖥️', '⌚', '📷', '🎮', '🕹️'];
        this.currentInfoApp = null;
        this.profileActive = localStorage.getItem('sakaiProfileActive') === 'true' || this.apps.length > 0;
        this.viewMode = localStorage.getItem('sakaiViewMode') || 'grid';
        this.theme = localStorage.getItem('sakaiTheme') || 'default';
        this.frameLayout = '2x1';
        this.framesContent = {};
        this.stats = JSON.parse(localStorage.getItem('sakaiStats') || '{}');
        this.filterTags = [];
        this.initializeEventListeners();
        this.renderAppList();
        this.registerServiceWorker();
        this.applyTheme();
        this.initializeSearch();
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

        // Close settings dialog on outside click
        document.getElementById('settingsDialog').addEventListener('click', (e) => {
            if (e.target.id === 'settingsDialog') {
                this.closeSettings();
            }
        });

        // Search input
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.filterApps(e.target.value);
        });
    }

    initializeSearch() {
        if (this.apps.length > 0 && this.profileActive) {
            document.getElementById('searchSection').style.display = 'block';
            this.updateFilterTags();
        }
    }

    updateFilterTags() {
        const allTags = new Set();
        this.apps.forEach(app => {
            if (app.tags) {
                app.tags.split(',').forEach(tag => {
                    allTags.add(tag.trim());
                });
            }
            if (app.genre) {
                allTags.add(app.genre);
            }
        });

        const filterTagsEl = document.getElementById('filterTags');
        filterTagsEl.innerHTML = '';
        
        allTags.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.className = 'filter-tag';
            tagEl.textContent = tag;
            tagEl.onclick = () => this.toggleFilterTag(tag, tagEl);
            filterTagsEl.appendChild(tagEl);
        });
    }

    toggleFilterTag(tag, element) {
        const index = this.filterTags.indexOf(tag);
        if (index > -1) {
            this.filterTags.splice(index, 1);
            element.classList.remove('active');
        } else {
            this.filterTags.push(tag);
            element.classList.add('active');
        }
        this.filterApps(document.getElementById('searchInput').value);
    }

    filterApps(searchTerm) {
        const appItems = document.querySelectorAll('.app-item');
        const searchLower = searchTerm.toLowerCase();
        
        appItems.forEach((item, index) => {
            const app = this.apps[index];
            const matchesSearch = !searchTerm || 
                app.name.toLowerCase().includes(searchLower) ||
                (app.author && app.author.toLowerCase().includes(searchLower)) ||
                (app.description && app.description.toLowerCase().includes(searchLower));
            
            const matchesTags = this.filterTags.length === 0 || 
                this.filterTags.some(tag => 
                    (app.tags && app.tags.includes(tag)) || 
                    (app.genre === tag)
                );
            
            item.style.display = matchesSearch && matchesTags ? 'flex' : 'none';
        });
    }

    applyTheme() {
        document.body.className = `theme-${this.theme}`;
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
        this.initializeSearch();
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
            useCustomIcon: false,
            usageCount: 0,
            tags: ''
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
                        useCustomIcon: false,
                        usageCount: 0,
                        tags: ''
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
                useCustomIcon: false,
                usageCount: 0,
                tags: ''
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
            document.getElementById('searchSection').style.display = 'none';
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        localStorage.setItem('sakaiViewMode', mode);
        
        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Update app list class
        const appList = document.getElementById('appList');
        if (mode === 'list') {
            appList.classList.add('view-list');
        } else {
            appList.classList.remove('view-list');
        }
    }

    showFrameView() {
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('frameView').style.display = 'flex';
        this.initializeFrames();
    }

    exitFrameView() {
        document.getElementById('homeScreen').style.display = 'flex';
        document.getElementById('frameView').style.display = 'none';
        
        // Clear frames
        this.framesContent = {};
        document.getElementById('frameContainer').innerHTML = '';
    }

    changeFrameLayout(layout) {
        this.frameLayout = layout;
        this.initializeFrames();
    }

    initializeFrames() {
        const container = document.getElementById('frameContainer');
        container.className = `frame-container layout-${this.frameLayout}`;
        container.innerHTML = '';
        
        let frameCount = 0;
        switch(this.frameLayout) {
            case '2x1': frameCount = 2; break;
            case '1x2': frameCount = 2; break;
            case '3x1': frameCount = 3; break;
            case '1x3': frameCount = 3; break;
            case '2x2': frameCount = 4; break;
        }
        
        for (let i = 0; i < frameCount; i++) {
            const frame = this.createFrame(i);
            container.appendChild(frame);
        }
        
        // Make frames sortable
        if (typeof Sortable !== 'undefined') {
            new Sortable(container, {
                animation: 150,
                ghostClass: 'dragging',
                onEnd: (evt) => {
                    // Update frame content positions
                    this.updateFramePositions();
                }
            });
        }
    }

    createFrame(index) {
        const frame = document.createElement('div');
        frame.className = 'app-frame empty';
        frame.id = `frame-${index}`;
        frame.setAttribute('data-frame-index', index);
        
        const content = this.framesContent[index];
        
        if (content) {
            frame.classList.remove('empty');
            frame.innerHTML = `
                <div class="frame-toolbar">
                    <div class="frame-app-name">${content.name}</div>
                    <div class="frame-actions">
                        <button class="frame-action-btn" onclick="launcher.reloadFrame(${index})" title="Ricarica">🔄</button>
                        <button class="frame-action-btn" onclick="launcher.maximizeFrame(${index})" title="Massimizza">⬜</button>
                        <button class="frame-action-btn" onclick="launcher.closeFrame(${index})" title="Chiudi">✖</button>
                    </div>
                </div>
                <div class="frame-content">
                    <iframe src="${content.url}" allow="accelerometer; autoplay; camera; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; usb"></iframe>
                </div>
            `;
        } else {
            frame.innerHTML = `
                <div class="empty-frame-content" onclick="launcher.selectAppForFrame(${index})">
                    <div class="empty-frame-icon">+</div>
                    <div class="empty-frame-text">Clicca per aggiungere app</div>
                </div>
            `;
        }
        
        // Drag and drop
        frame.addEventListener('dragover', (e) => {
            e.preventDefault();
            frame.classList.add('drag-over');
        });
        
        frame.addEventListener('dragleave', () => {
            frame.classList.remove('drag-over');
        });
        
        frame.addEventListener('drop', (e) => {
            e.preventDefault();
            frame.classList.remove('drag-over');
            // Handle drop logic here
        });
        
        return frame;
    }

    selectAppForFrame(frameIndex) {
        const appNames = this.apps.map(app => app.name).join('\n');
        const selection = prompt(`Seleziona un'app per questo frame:\n\n${appNames}\n\nInserisci il nome dell'app:`);
        
        if (selection) {
            const app = this.apps.find(a => a.name.toLowerCase() === selection.toLowerCase());
            if (app) {
                this.loadAppInFrame(app, frameIndex);
            } else {
                alert('App non trovata!');
            }
        }
    }

    loadAppInFrame(app, frameIndex) {
        const blob = new Blob([app.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        this.framesContent[frameIndex] = {
            name: app.name,
            url: url,
            appId: app.id
        };
        
        // Update usage stats
        this.updateAppUsage(app.id);
        
        // Re-render frame
        const frame = document.getElementById(`frame-${frameIndex}`);
        const newFrame = this.createFrame(frameIndex);
        frame.replaceWith(newFrame);
    }

    reloadFrame(frameIndex) {
        const iframe = document.querySelector(`#frame-${frameIndex} iframe`);
        if (iframe) {
            iframe.src = iframe.src;
        }
    }

    maximizeFrame(frameIndex) {
        const frame = document.getElementById(`frame-${frameIndex}`);
        if (frame.style.gridColumn === 'span 1') {
            frame.style.gridColumn = 'span 2';
            frame.style.gridRow = 'span 2';
        } else {
            frame.style.gridColumn = 'span 1';
            frame.style.gridRow = 'span 1';
        }
    }

    closeFrame(frameIndex) {
        delete this.framesContent[frameIndex];
        const frame = document.getElementById(`frame-${frameIndex}`);
        const newFrame = this.createFrame(frameIndex);
        frame.replaceWith(newFrame);
    }

    updateFramePositions() {
        // Update frame content based on new positions
        const frames = document.querySelectorAll('.app-frame');
        const newContent = {};
        
        frames.forEach((frame, index) => {
            const oldIndex = parseInt(frame.getAttribute('data-frame-index'));
            if (this.framesContent[oldIndex]) {
                newContent[index] = this.framesContent[oldIndex];
            }
        });
        
        this.framesContent = newContent;
        this.initializeFrames();
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
                
                const tagsHtml = app.tags ? `
                    <div class="app-tags">
                        ${app.tags.split(',').map(tag => `<span class="app-tag">${tag.trim()}</span>`).join('')}
                    </div>
                ` : '';
                
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
                                ${tagsHtml}
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
        document.getElementById('infoUsageCount').textContent = app.usageCount || 0;
        
        // Icona
        const infoIcon = document.getElementById('infoIcon');
        infoIcon.innerHTML = this.getIconContent(app);
        
        // Campi editabili
        document.getElementById('infoAuthor').value = app.author || '';
        document.getElementById('infoGenre').value = app.genre || '';
        document.getElementById('infoTags').value = app.tags || '';
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
        this.currentInfoApp.tags = document.getElementById('infoTags').value.trim() || '';
        this.currentInfoApp.description = document.getElementById('infoDescription').value.trim() || null;
        
        this.saveApps();
        this.renderAppList();
        this.updateFilterTags();
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
            this.updateFilterTags();
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
            sakaiVersion: '2.0',
            profileType: 'sakai_profile',
            totalApps: this.apps.length,
            theme: this.theme,
            stats: this.stats,
            apps: this.apps.map(app => ({
                name: app.name,
                type: app.type,
                author: app.author,
                description: app.description,
                genre: app.genre,
                tags: app.tags,
                dateAdded: app.dateAdded,
                emoji: app.emoji,
                useCustomIcon: app.useCustomIcon,
                favicon: app.favicon,
                usageCount: app.usageCount || 0
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
                            
                            // Importa tema e statistiche se presenti
                            if (profileData.theme) {
                                this.theme = profileData.theme;
                                this.applyTheme();
                            }
                            
                            if (profileData.stats) {
                                this.stats = profileData.stats;
                            }
                            
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
                                    tags: appMeta ? appMeta.tags : '',
                                    emoji: appMeta ? appMeta.emoji : this.getRandomEmoji(),
                                    useCustomIcon: appMeta ? appMeta.useCustomIcon : false,
                                    usageCount: appMeta ? (appMeta.usageCount || 0) : 0
                                };

                                this.apps.push(app);
                            }
                            
                            this.saveApps();
                            this.renderAppList();
                            this.initializeSearch();
                            
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
        // Update usage stats
        this.updateAppUsage(app.id);
        
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

    updateAppUsage(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (app) {
            app.usageCount = (app.usageCount || 0) + 1;
            this.saveApps();
            
            // Update global stats
            const today = new Date().toISOString().split('T')[0];
            if (!this.stats[today]) {
                this.stats[today] = {};
            }
            this.stats[today][appId] = (this.stats[today][appId] || 0) + 1;
            this.saveStats();
        }
    }

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
            this.updateFilterTags();
        }
    }

    showWebAppDialog() {
        document.getElementById('webappDialog').classList.add('show');
        document.getElementById('webappName').value = '';
        document.getElementById('webappUrl').value = '';
        document.getElementById('webappTags').value = '';
    }

    closeWebAppDialog() {
        document.getElementById('webappDialog').classList.remove('show');
    }

    async addWebApp() {
        let name = document.getElementById('webappName').value.trim();
        const url = document.getElementById('webappUrl').value.trim();
        const tags = document.getElementById('webappTags').value.trim();

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
            tags: tags,
            emoji: this.getRandomEmoji(),
            useCustomIcon: false,
            usageCount: 0
        };

        this.apps.unshift(app);
        this.saveApps();
        this.renderAppList();
        this.updateFilterTags();
        this.closeWebAppDialog();
        
        alert(`Web App "${name}" aggiunta con successo!`);
    }

    showSettings() {
        document.getElementById('settingsDialog').classList.add('show');
        this.showSettingsTab('appearance');
    }

    closeSettings() {
        document.getElementById('settingsDialog').classList.remove('show');
    }

    showSettingsTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Show tab content
        const content = document.getElementById('settingsTabContent');
        
        switch(tab) {
            case 'appearance':
                content.innerHTML = `
                    <h3>Tema</h3>
                    <div class="theme-selector">
                        <div class="theme-option ${this.theme === 'default' ? 'active' : ''}" onclick="launcher.setTheme('default')">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);"></div>
                            <div class="theme-name">Default</div>
                        </div>
                        <div class="theme-option ${this.theme === 'dark' ? 'active' : ''}" onclick="launcher.setTheme('dark')">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);"></div>
                            <div class="theme-name">Dark</div>
                        </div>
                        <div class="theme-option ${this.theme === 'ocean' ? 'active' : ''}" onclick="launcher.setTheme('ocean')">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #2193b0, #6dd5ed);"></div>
                            <div class="theme-name">Ocean</div>
                        </div>
                        <div class="theme-option ${this.theme === 'sunset' ? 'active' : ''}" onclick="launcher.setTheme('sunset')">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #ff6b6b, #feca57, #ee5a6f);"></div>
                            <div class="theme-name">Sunset</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'backup':
                content.innerHTML = `
                    <h3>Backup e Sincronizzazione</h3>
                    <div class="backup-options">
                        <div class="backup-option" onclick="launcher.exportProfile()">
                            <div class="backup-option-title">📦 Esporta profilo locale</div>
                            <div class="backup-option-desc">Scarica il profilo come file .sakaiprofile</div>
                        </div>
                        <div class="backup-option" onclick="launcher.backupToGithubGist()">
                            <div class="backup-option-title">📤 Backup su GitHub Gist</div>
                            <div class="backup-option-desc">Salva il profilo su GitHub (richiede token)</div>
                        </div>
                        <div class="backup-option" onclick="launcher.restoreFromGithubGist()">
                            <div class="backup-option-title">📥 Ripristina da GitHub Gist</div>
                            <div class="backup-option-desc">Carica il profilo da GitHub</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'stats':
                const totalApps = this.apps.length;
                const totalUsage = this.apps.reduce((sum, app) => sum + (app.usageCount || 0), 0);
                const mostUsedApp = this.apps.reduce((max, app) => 
                    (app.usageCount || 0) > (max.usageCount || 0) ? app : max
                , this.apps[0] || {});
                
                content.innerHTML = `
                    <h3>Statistiche</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${totalApps}</div>
                            <div class="stat-label">App totali</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${totalUsage}</div>
                            <div class="stat-label">Utilizzi totali</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${mostUsedApp.name || 'N/A'}</div>
                            <div class="stat-label">App più usata</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${Object.keys(this.stats).length}</div>
                            <div class="stat-label">Giorni di utilizzo</div>
                        </div>
                    </div>
                `;
                break;
        }
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('sakaiTheme', theme);
        this.applyTheme();
        
        // Update theme selector
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }

    async backupToGithubGist() {
        const token = prompt('Inserisci il tuo GitHub Personal Access Token:\n\n(Necessario per salvare su GitHub)');
        if (!token) return;
        
        try {
            const profileData = {
                exportDate: new Date().toISOString(),
                sakaiVersion: '2.0',
                profileType: 'sakai_profile',
                totalApps: this.apps.length,
                theme: this.theme,
                stats: this.stats,
                apps: this.apps
            };
            
            const gistData = {
                description: 'SAKAI Profile Backup',
                public: false,
                files: {
                    'sakai_profile.json': {
                        content: JSON.stringify(profileData, null, 2)
                    }
                }
            };
            
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });
            
            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('sakaiGistId', result.id);
                localStorage.setItem('sakaiGithubToken', token);
                alert(`Backup completato!\n\nID Gist: ${result.id}\n\nSalva questo ID per ripristinare il profilo in futuro.`);
            } else {
                throw new Error('Errore nella creazione del Gist');
            }
        } catch (error) {
            alert('Errore durante il backup su GitHub: ' + error.message);
        }
    }

    async restoreFromGithubGist() {
        const gistId = prompt('Inserisci l\'ID del Gist da ripristinare:', localStorage.getItem('sakaiGistId') || '');
        if (!gistId) return;
        
        const token = prompt('Inserisci il tuo GitHub Personal Access Token:', localStorage.getItem('sakaiGithubToken') || '');
        if (!token) return;
        
        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });
            
            if (response.ok) {
                const gist = await response.json();
                const profileData = JSON.parse(gist.files['sakai_profile.json'].content);
                
                if (profileData.profileType === 'sakai_profile') {
                    const confirmRestore = confirm(
                        `Profilo SAKAI trovato:\n\n` +
                        `• ${profileData.totalApps} app\n` +
                        `• Backup del: ${new Date(profileData.exportDate).toLocaleString('it-IT')}\n\n` +
                        `Vuoi ripristinare questo profilo?`
                    );
                    
                    if (confirmRestore) {
                        this.apps = profileData.apps;
                        this.theme = profileData.theme || 'default';
                        this.stats = profileData.stats || {};
                        this.profileActive = true;
                        
                        this.saveApps();
                        this.saveStats();
                        this.applyTheme();
                        this.renderAppList();
                        this.initializeSearch();
                        this.closeSettings();
                        
                        alert('Profilo ripristinato con successo!');
                    }
                }
            } else {
                throw new Error('Gist non trovato o non accessibile');
            }
        } catch (error) {
            alert('Errore durante il ripristino da GitHub: ' + error.message);
        }
    }

    saveApps() {
        localStorage.setItem('sakApps', JSON.stringify(this.apps));
        localStorage.setItem('sakaiProfileActive', this.profileActive.toString());
    }

    saveStats() {
        localStorage.setItem('sakaiStats', JSON.stringify(this.stats));
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
    
    // Controlla Sortable
    if (typeof Sortable !== 'undefined') {
        console.log('✅ Sortable disponibile');
    } else {
        console.warn('⚠️ Sortable non disponibile - drag & drop disabilitato');
    }
    
    // Inizializza l'applicazione
    window.launcher = new SAKLauncher();
    console.log('✅ SAKLauncher inizializzato con successo');
});