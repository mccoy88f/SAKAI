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
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrato:', registration);
                })
                .catch(error => {
                    console.log('❌ Service Worker registrazione fallita:', error);
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
            tagEl.onclick = () => {
                if (window.launcher) {
                    this.toggleFilterTag(tag, tagEl);
                }
            };
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
        
        appItems.forEach((item) => {
            const appId = item.dataset.appId; // Assumendo che aggiungerai un data-app-id all'elemento app-item
            const app = this.apps.find(a => a.id === appId);
            if (!app) return;
            
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
        
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        const htmlTitle = titleMatch ? titleMatch[1].trim() : null;
        
        const appName = htmlTitle || file.name.replace(/\.[^/.]+$/, "");
        
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
            if (typeof JSZip !== 'undefined') {
                const zip = new JSZip();
                const contents = await zip.loadAsync(file);
                
                const htmlFiles = Object.keys(contents.files).filter(filename => 
                    filename.endsWith('.html') || filename.endsWith('.htm')
                );
                
                if (htmlFiles.length > 0) {
                    const indexFile = htmlFiles.find(f => f.toLowerCase().includes('index.html'));
                    const mainHtmlFile = indexFile || htmlFiles[0];
                    
                    const content = await contents.files[mainHtmlFile].async('text');
                    
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
                } else {
                    throw new Error('Nessun file HTML trovato nel ZIP');
                }
            } else {
                throw new Error('JSZip non disponibile');
            }
        } catch (error) {
            console.warn('Errore nell\'importazione ZIP:', error);
            const appName = file.name.replace(/\.[^/.]+$/, "");
            const randomEmoji = this.getRandomEmoji();
            
            const app = {
                id: Date.now().toString(),
                name: appName,
                content: `<html><body><h1>App ZIP: ${appName}</h1><p>Errore nell'importazione: ${error.message}</p></body></html>`,
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
        const patterns = [/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/i, /<meta[^>]*name=["']creator["'][^>]*content=["']([^"']+)["'][^>]*>/i];
        for (const pattern of patterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) return match[1].trim();
        }
        return null;
    }

    extractDescription(htmlContent) {
        const patterns = [/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i];
        for (const pattern of patterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) return match[1].trim();
        }
        return null;
    }

    extractGenre(htmlContent) {
        const patterns = [/<meta[^>]*name=["']genre["'][^>]*content=["']([^"']+)["'][^>]*>/i, /<meta[^>]*name=["']category["'][^>]*content=["']([^"']+)["'][^>]*>/i];
        for (const pattern of patterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) return match[1].trim();
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
        if (confirm('Sei sicuro di voler chiudere questo profilo?')) {
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
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.view-btn[onclick*="'${mode}'"]`).classList.add('active');
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
        let frameCount = { '2x1': 2, '1x2': 2, '3x1': 3, '1x3': 3, '2x2': 4 }[this.frameLayout] || 0;
        for (let i = 0; i < frameCount; i++) {
            container.appendChild(this.createFrame(i));
        }
        if (typeof Sortable !== 'undefined') new Sortable(container, { animation: 150 });
    }

    createFrame(index) {
        const frame = document.createElement('div');
        frame.className = 'app-frame empty';
        frame.id = `frame-${index}`;
        const content = this.framesContent[index];
        if (content) {
            frame.classList.remove('empty');
            frame.innerHTML = `<div class="frame-toolbar"><div class="frame-app-name">${content.name}</div><div class="frame-actions"><button onclick="launcher.reloadFrame(${index})">🔄</button><button onclick="launcher.closeFrame(${index})">✖</button></div></div><div class="frame-content"><iframe src="${content.url}"></iframe></div>`;
        } else {
            frame.innerHTML = `<div class="empty-frame-content" onclick="launcher.selectAppForFrame(${index})"><div class="empty-frame-icon">+</div><div class="empty-frame-text">Clicca per aggiungere app</div></div>`;
        }
        return frame;
    }

    selectAppForFrame(frameIndex) {
        const appName = prompt('Inserisci il nome dell\'app da caricare:');
        if (appName) {
            const app = this.apps.find(a => a.name.toLowerCase() === appName.toLowerCase());
            if (app) this.loadAppInFrame(app, frameIndex);
            else alert('App non trovata.');
        }
    }

    loadAppInFrame(app, frameIndex) {
        const blob = new Blob([app.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        this.framesContent[frameIndex] = { name: app.name, url: url, appId: app.id };
        this.updateAppUsage(app.id);
        const frame = document.getElementById(`frame-${frameIndex}`);
        frame.replaceWith(this.createFrame(frameIndex));
    }

    reloadFrame(frameIndex) {
        const iframe = document.querySelector(`#frame-${frameIndex} iframe`);
        if (iframe) iframe.src = iframe.src;
    }

    closeFrame(frameIndex) {
        delete this.framesContent[frameIndex];
        const frame = document.getElementById(`frame-${frameIndex}`);
        frame.replaceWith(this.createFrame(frameIndex));
    }

    renderAppList() {
        const appList = document.getElementById('appList');
        const homeScreen = document.getElementById('homeScreen');
        const headerSection = document.getElementById('headerSection');
        const importSection = document.getElementById('importSection');
        const recentApps = document.getElementById('recentApps');
        const profileChoice = document.getElementById('profileChoice');
        const profileActiveEl = document.getElementById('profileActive');
        
        appList.innerHTML = '';

        if (this.apps.length === 0 && !this.profileActive) {
            homeScreen.classList.add('no-apps');
            headerSection.classList.remove('has-apps');
            importSection.classList.remove('has-apps');
            recentApps.style.display = 'none';
            profileChoice.style.display = 'flex';
            profileActiveEl.style.display = 'none';
        } else {
            homeScreen.classList.remove('no-apps');
            headerSection.classList.add('has-apps');
            importSection.classList.add('has-apps');
            recentApps.style.display = 'flex';
            profileChoice.style.display = 'none';
            profileActiveEl.style.display = 'flex';

            this.apps.forEach(app => {
                const appItem = document.createElement('div');
                appItem.className = 'app-item';
                appItem.dataset.appId = app.id; // Importante per la ricerca/filtro

                const iconContent = this.getIconContent(app);
                const authorInfo = app.author ? `<div class="app-author">di ${app.author}</div>` : '';
                const genreInfo = app.genre ? `<div class="app-genre">${app.genre}</div>` : '';
                const tagsHtml = app.tags ? `<div class="app-tags">${app.tags.split(',').map(tag => `<span class="app-tag">${tag.trim()}</span>`).join('')}</div>` : '';
                
                appItem.innerHTML = `
                    <div class="app-item-content">
                        <div class="app-icon">${iconContent}</div>
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
                        <button class="info-app" onclick="launcher.showAppInfo('${app.id}')" title="Info">i</button>
                    </div>`;
                
                appItem.addEventListener('click', (e) => {
                    if (!e.target.closest('.app-actions')) this.loadApp(app);
                });

                appList.appendChild(appItem);
            });
            this.setViewMode(this.viewMode);
        }
    }

    getIconContent(app) {
        if (app.useCustomIcon || !app.favicon) {
            return `<span class="emoji">${app.emoji}</span>`;
        } else {
            return `<img src="${app.favicon}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span class="emoji" style="display: none;">${app.emoji}</span>`;
        }
    }

    showAppInfo(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        this.currentInfoApp = app;
        document.getElementById('infoAppName').textContent = app.name;
        document.getElementById('infoAppType').textContent = app.type.toUpperCase();
        document.getElementById('infoDate').textContent = app.dateAdded;
        document.getElementById('infoUsageCount').textContent = app.usageCount || 0;
        document.getElementById('infoIcon').innerHTML = this.getIconContent(app);
        document.getElementById('infoAuthor').value = app.author || '';
        document.getElementById('infoGenre').value = app.genre || '';
        document.getElementById('infoTags').value = app.tags || '';
        document.getElementById('infoDescription').value = app.description || '';
        const iconPickerGrid = document.getElementById('iconPickerGrid');
        iconPickerGrid.innerHTML = this.defaultEmojis.map(emoji => `<div class="icon-picker-option" onclick="launcher.changeAppIconFromInfo('${emoji}')">${emoji}</div>`).join('');
        document.getElementById('infoPopup').classList.add('show');
    }

    closeInfoPopup() {
        document.getElementById('infoPopup').classList.remove('show');
        document.getElementById('iconPickerField').style.display = 'none';
        this.currentInfoApp = null;
    }

    toggleIconPicker() {
        const field = document.getElementById('iconPickerField');
        field.style.display = field.style.display === 'none' ? 'flex' : 'none';
    }

    changeAppIconFromInfo(emoji) {
        if (!this.currentInfoApp) return;
        this.currentInfoApp.emoji = emoji;
        this.currentInfoApp.useCustomIcon = true;
        document.getElementById('infoIcon').innerHTML = this.getIconContent(this.currentInfoApp);
        document.getElementById('iconPickerField').style.display = 'none';
    }

    saveAppInfo() {
        if (!this.currentInfoApp) return;
        this.currentInfoApp.author = document.getElementById('infoAuthor').value.trim() || null;
        this.currentInfoApp.genre = document.getElementById('infoGenre').value.trim() || null;
        this.currentInfoApp.tags = document.getElementById('infoTags').value.trim() || '';
        this.currentInfoApp.description = document.getElementById('infoDescription').value.trim() || null;
        this.saveApps();
        this.renderAppList();
        this.updateFilterTags();
        this.closeInfoPopup();
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
            alert('Nessuna app da esportare!');
            return;
        }
        if (typeof JSZip === 'undefined') {
            alert('Libreria JSZip non disponibile.');
            return;
        }
        const zip = new JSZip();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        this.apps.forEach(app => {
            if (app.type === 'html' || app.type === 'webapp') {
                zip.file(`${app.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`, app.content);
            }
        });
        const profileData = {
            exportDate: new Date().toISOString(),
            sakaiVersion: '2.0',
            profileType: 'sakai_profile',
            apps: this.apps,
            theme: this.theme,
            stats: this.stats
        };
        zip.file('sakai_profile.json', JSON.stringify(profileData, null, 2));
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sakai_profile_${timestamp}.sakaiprofile`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importProfile(file) {
        if (!file.name.endsWith('.sakaiprofile') || typeof JSZip === 'undefined') {
            alert('Seleziona un file .sakaiprofile valido. JSZip deve essere disponibile.');
            return;
        }
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        if (contents.files['sakai_profile.json']) {
            const profileData = JSON.parse(await contents.files['sakai_profile.json'].async('text'));
            if (profileData.profileType === 'sakai_profile' && confirm(`Importare il profilo con ${profileData.apps.length} app?`)) {
                this.apps = profileData.apps;
                this.profileActive = true;
                this.theme = profileData.theme || 'default';
                this.stats = profileData.stats || {};
                this.saveApps();
                this.saveStats();
                this.applyTheme();
                this.renderAppList();
                this.initializeSearch();
            }
        }
        document.getElementById('profileInput').value = '';
    }

    loadApp(app) {
        this.updateAppUsage(app.id);
        if (app.type === 'webapp' && app.content.includes('<iframe')) {
            const match = app.content.match(/src=["']([^"']+)["']/);
            if (match && match[1]) {
                window.open(match[1], `sakai_webapp_${app.id}`);
                return;
            }
        }
        const blob = new Blob([app.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, `sakai_app_${app.id}`);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    updateAppUsage(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (app) {
            app.usageCount = (app.usageCount || 0) + 1;
            this.saveApps();
            const today = new Date().toISOString().split('T')[0];
            if (!this.stats[today]) this.stats[today] = {};
            this.stats[today][appId] = (this.stats[today][appId] || 0) + 1;
            this.saveStats();
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
        if (!url) return alert('URL obbligatorio.');
        if (!name) name = new URL(url).hostname;
        
        const app = {
            id: Date.now().toString(),
            name: name,
            content: `<!DOCTYPE html><html><head><title>${name}</title><style>body,html{margin:0;padding:0;overflow:hidden;width:100%;height:100%;}iframe{border:none;width:100%;height:100%;}</style></head><body><iframe src="${url}"></iframe></body></html>`,
            type: 'webapp',
            dateAdded: new Date().toLocaleString('it-IT'),
            favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`,
            author: new URL(url).hostname,
            description: `Web App: ${name}`,
            genre: 'Web App',
            tags: tags,
            emoji: '🌐',
            useCustomIcon: true,
            usageCount: 0
        };

        this.apps.unshift(app);
        this.saveApps();
        this.renderAppList();
        this.updateFilterTags();
        this.closeWebAppDialog();
    }

    showSettings() {
        document.getElementById('settingsDialog').classList.add('show');
        this.showSettingsTab('appearance');
    }

    closeSettings() {
        document.getElementById('settingsDialog').classList.remove('show');
    }

    showSettingsTab(tab) {
        document.querySelectorAll('.settings-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.settings-tab[onclick*="'${tab}'"]`).classList.add('active');
        const content = document.getElementById('settingsTabContent');
        if (tab === 'appearance') {
            content.innerHTML = `<h3>Tema</h3><div class="theme-selector">...</div>`; // Semplificato
        } else if (tab === 'backup') {
            content.innerHTML = `<h3>Backup</h3><div class="backup-options">...</div>`; // Semplificato
        } else if (tab === 'stats') {
            content.innerHTML = `<h3>Statistiche</h3><div class="stats-grid">...</div>`; // Semplificato
        }
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('sakaiTheme', theme);
        this.applyTheme();
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector(`.theme-option[onclick*="'${theme}'"]`).classList.add('active');
    }

    async backupToGithubGist() { /* ... */ }
    async restoreFromGithubGist() { /* ... */ }

    saveApps() {
        localStorage.setItem('sakApps', JSON.stringify(this.apps));
        localStorage.setItem('sakaiProfileActive', this.profileActive.toString());
    }

    saveStats() {
        localStorage.setItem('sakaiStats', JSON.stringify(this.stats));
    }
}

// Inizializzazione diretta grazie a 'defer' nell'HTML
console.log('🚀 script.js caricato, inizializzazione SAKLauncher...');
window.launcher = new SAKLauncher();
console.log('✅ SAKLauncher inizializzato con successo.');
