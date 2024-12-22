// YouTube API Service
class YouTubeService {
    constructor() {
        this.cache = new Map();
        this.API_KEY = 'AIzaSyDSD1qRSM61xXXDk6CBHfbhnLfoXbQPsYY';  // YouTube API Key
    }

    async getAuthToken() {
        try {
            const response = await fetch('/api/youtube/token');
            if (!response.ok) throw new Error('Failed to get auth token');
            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Error getting auth token:', error);
            throw new Error('Authentication failed');
        }
    }

    async search(query, maxResults = 20) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=6&maxResults=${maxResults}&key=${this.API_KEY}`
            );

            if (!response.ok) {
                throw new Error('YouTube API error');
            }

            const data = await response.json();
            return this.processSearchResults(data);
        } catch (error) {
            console.error('YouTube search error:', error);
            throw new Error('Não foi possível realizar a busca');
        }
    }

    processSearchResults(data) {
        if (!data.items?.length) return [];

        return data.items
            .filter(item => item.id?.videoId && item.snippet)
            .map(item => ({
                id: item.id.videoId,
                type: 'youtube',
                metadata: {
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
                }
            }));
    }

    async getVideoDetails(videoId) {
        if (this.cache.has(videoId)) {
            return this.cache.get(videoId);
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${this.API_KEY}`
            );

            if (!response.ok) {
                throw new Error('Failed to get video details');
            }

            const data = await response.json();
            if (!data.items?.[0]?.snippet) {
                throw new Error('Invalid video data');
            }

            const track = {
                id: videoId,
                type: 'youtube',
                metadata: {
                    title: data.items[0].snippet.title,
                    artist: data.items[0].snippet.channelTitle,
                    thumbnail: data.items[0].snippet.thumbnails.high?.url || data.items[0].snippet.thumbnails.default?.url
                }
            };

            this.cache.set(videoId, track);
            return track;
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw new Error('Não foi possível obter detalhes do vídeo');
        }
    }
}

// UI Service
class UIService {
    constructor(app) {
        this.app = app;
        this.activeToast = null;
    }

    createMusicCard(track, container) {
        if (!track || !container) return;

        const card = document.createElement('div');
        card.className = 'music-card fade-in';
        
        const isFavorite = this.app.favorites.has(track.id);
        
        card.innerHTML = `
            <div class="card-thumbnail">
                <img src="${track.metadata.thumbnail}" alt="${track.metadata.title}" 
                     onerror="this.src='assets/images/placeholder.jpg'">
                <button class="play-overlay" title="Reproduzir">
                    <ion-icon name="play-circle-outline"></ion-icon>
                </button>
            </div>
            <div class="info">
                <h3 title="${track.metadata.title}">${track.metadata.title}</h3>
                <p title="${track.metadata.artist}">${track.metadata.artist}</p>
                <div class="card-actions">
                    <button class="action-btn favorite-btn ${isFavorite ? 'active' : ''}" 
                            title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                        <ion-icon name="${isFavorite ? 'heart' : 'heart-outline'}"></ion-icon>
                    </button>
                    <button class="action-btn share-btn" title="Compartilhar">
                        <ion-icon name="share-social-outline"></ion-icon>
                    </button>
                    <button class="action-btn add-to-queue-btn" title="Adicionar à fila">
                        <ion-icon name="list-outline"></ion-icon>
                    </button>
                    <button class="action-btn more-options-btn" title="Mais opções">
                        <ion-icon name="ellipsis-vertical-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;

        // Event Listeners
        const playBtn = card.querySelector('.play-overlay');
        const favoriteBtn = card.querySelector('.favorite-btn');
        const shareBtn = card.querySelector('.share-btn');
        const queueBtn = card.querySelector('.add-to-queue-btn');
        const optionsBtn = card.querySelector('.more-options-btn');

        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.app.player) {
                    this.app.player.loadAndPlay(track);
                }
            });
        }

        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.app.toggleFavorite(track);
                this.updateFavoriteButton(favoriteBtn, track.id);
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.app.shareTrack(track);
            });
        }

        if (queueBtn) {
            queueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.app.player) {
                    this.app.player.addToQueue(track);
                    this.showToast('Música adicionada à fila');
                }
            });
        }

        if (optionsBtn) {
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showTrackOptions(track, e.target);
            });
        }

        container.appendChild(card);
    }

    updateFavoriteButton(button, trackId) {
        if (!button) return;

        const isFavorite = this.app.favorites.has(trackId);
        button.innerHTML = `<ion-icon name="${isFavorite ? 'heart' : 'heart-outline'}"></ion-icon>`;
        button.classList.toggle('active', isFavorite);
        button.title = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    }

    showTrackOptions(track, targetElement) {
        const options = [
            {
                label: 'Adicionar à playlist',
                icon: 'add-circle-outline',
                action: () => this.showPlaylistSelector(track)
            },
            {
                label: 'Ver letra',
                icon: 'text-outline',
                action: () => this.showLyrics(track)
            },
            {
                label: 'Ver informações',
                icon: 'information-circle-outline',
                action: () => this.showTrackInfo(track)
            }
        ];

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = options.map(option => `
            <button class="menu-item">
                <ion-icon name="${option.icon}"></ion-icon>
                ${option.label}
            </button>
        `).join('');

        document.body.appendChild(menu);

        // Position menu
        const rect = targetElement.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;

        // Add event listeners
        menu.querySelectorAll('.menu-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                options[index].action();
                menu.remove();
            });
        });

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== targetElement) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }

    showToast(message, duration = 3000) {
        if (this.activeToast) {
            clearTimeout(this.activeToast.timeout);
            this.activeToast.element.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        this.activeToast = {
            element: toast,
            timeout: setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                    this.activeToast = null;
                }, 300);
            }, duration)
        };
    }

    showLoadingState(container) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Buscando músicas...</p>
            </div>
        `;
    }

    showErrorState(container, message) {
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <h3>Erro ao buscar músicas</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showEmptyState(container, { icon, title, message }) {
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="${icon}"></ion-icon>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Main App Class
class MusicApp {
    constructor() {
        this.youtubeService = new YouTubeService();
        this.uiService = new UIService(this);
        this.favorites = new Set();
        this.localTracks = new Map();

        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.loadFavorites();
            await this.setupServiceWorker();
            this.initializePlayer();
            this.setupEventListeners();
            this.setupTabNavigation();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.uiService.showToast('Erro ao inicializar o aplicativo');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchInput && searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput.value.trim()) {
                    this.performSearch(searchInput.value);
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && searchInput.value.trim()) {
                    this.performSearch(searchInput.value);
                }
            });
        }
    }

    async performSearch(query) {
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer || !query?.trim()) return;

        this.uiService.showLoadingState(resultsContainer);

        try {
            const results = await this.searchYouTube(query);
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.uiService.showErrorState(resultsContainer, error.message);
        }
    }

    async searchYouTube(query) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=10&maxResults=20&key=AIzaSyDSD1qRSM61xXXDk6CBHfbhnLfoXbQPsYY`
            );

            if (!response.ok) {
                throw new Error(await this.getErrorMessage(response));
            }

            const data = await response.json();
            
            if (!data.items?.length) {
                return [];
            }

            const tracks = data.items
                .filter(item => item.id?.videoId && item.snippet)
                .map(item => ({
                    id: item.id.videoId,
                    type: 'youtube',
                    metadata: {
                        title: item.snippet.title,
                        artist: item.snippet.channelTitle,
                        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
                    }
                }));

            tracks.forEach(track => {
                if (track.id) {
                    this.youtubeService.cache.set(track.id, track);
                }
            });

            return tracks;
        } catch (error) {
            console.error('YouTube search error:', error);
            throw new Error('Não foi possível realizar a busca. Tente novamente mais tarde.');
        }
    }

    async getErrorMessage(response) {
        try {
            const data = await response.json();
            return data.error?.message || 'Erro desconhecido';
        } catch {
            return `Erro ${response.status}: ${response.statusText}`;
        }
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        if (!results.length) {
            this.uiService.showEmptyState(resultsContainer, {
                icon: 'search-outline',
                title: 'Nenhum resultado encontrado',
                message: 'Tente uma busca diferente'
            });
            return;
        }

        results.forEach(track => {
            this.uiService.createMusicCard(track, resultsContainer);
        });

        // Add infinite scroll if needed
        this.setupInfiniteScroll(resultsContainer);
    }

    setupInfiniteScroll(container) {
        const observer = new IntersectionObserver(
            (entries) => {
                const lastEntry = entries[0];
                if (lastEntry.isIntersecting) {
                    // Load more results
                    this.loadMoreResults();
                }
            },
            { threshold: 0.5 }
        );

        const sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        container.appendChild(sentinel);
        observer.observe(sentinel);
    }

    async loadMoreResults() {
        // Implement pagination logic here
    }

    toggleFavorite(track) {
        if (!track?.id) return;

        if (this.favorites.has(track.id)) {
            this.favorites.delete(track.id);
            this.uiService.showToast('Removido dos favoritos');
        } else {
            this.favorites.add(track.id);
            this.uiService.showToast('Adicionado aos favoritos');
        }

        this.saveFavorites();
    }

    async shareTrack(track) {
        if (!track) return;

        const shareData = {
            title: track.metadata.title,
            text: `Ouça ${track.metadata.title} por ${track.metadata.artist} no Musics`,
            url: track.type === 'youtube' ? `https://youtu.be/${track.id}` : window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                this.uiService.showToast('Compartilhado com sucesso!');
            } else {
                await navigator.clipboard.writeText(shareData.url);
                this.uiService.showToast('Link copiado para a área de transferência!');
            }
        } catch (error) {
            console.error('Share error:', error);
            this.uiService.showToast('Erro ao compartilhar. Tente novamente.');
        }
    }

    async loadFavorites() {
        try {
            const savedFavorites = localStorage.getItem('favorites');
            if (savedFavorites) {
                const parsed = JSON.parse(savedFavorites);
                if (Array.isArray(parsed)) {
                    this.favorites = new Set(parsed);
                }
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
            this.favorites = new Set();
        }
    }

    saveFavorites() {
        try {
            localStorage.setItem('favorites', JSON.stringify([...this.favorites]));
        } catch (error) {
            console.error('Error saving favorites:', error);
            this.uiService.showToast('Erro ao salvar favoritos');
        }
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-btn');
        if (!tabs.length) {
            console.error('Navigation tabs not found');
            return;
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.switchTab(tab.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) {
            console.error('Results container not found');
            return;
        }

        resultsContainer.innerHTML = '';

        switch (tabName) {
            case 'search':
                break;
            case 'local':
                this.displayLocalTracks();
                break;
            case 'favorites':
                this.displayFavorites();
                break;
            default:
                console.warn('Unknown tab:', tabName);
        }
    }

    displayLocalTracks() {
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        if (this.localTracks.size === 0) {
            this.uiService.showEmptyState(resultsContainer, {
                icon: 'cloud-upload-outline',
                title: 'Nenhuma música local',
                message: 'Clique no botão de upload para adicionar músicas do seu computador'
            });
            return;
        }

        this.localTracks.forEach((track, id) => {
            this.uiService.createMusicCard(track, resultsContainer);
        });
    }

    async displayFavorites() {
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        if (this.favorites.size === 0) {
            this.uiService.showEmptyState(resultsContainer, {
                icon: 'heart-outline',
                title: 'Nenhuma música favorita',
                message: 'Adicione músicas aos favoritos clicando no coração durante a reprodução'
            });
            return;
        }

        try {
            const favoriteTracks = [];
            for (const trackId of this.favorites) {
                const track = this.localTracks.get(trackId) || 
                            await this.youtubeService.getVideoDetails(trackId);
                if (track) {
                    favoriteTracks.push(track);
                }
            }

            if (favoriteTracks.length === 0) {
                this.uiService.showEmptyState(resultsContainer, {
                    icon: 'alert-circle-outline',
                    title: 'Erro ao carregar favoritos',
                    message: 'Não foi possível carregar suas músicas favoritas'
                });
                return;
            }

            favoriteTracks.forEach(track => {
                this.uiService.createMusicCard(track, resultsContainer);
            });
        } catch (error) {
            console.error('Error displaying favorites:', error);
            this.uiService.showToast('Erro ao carregar favoritos');
        }
    }

    async setupServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker não suportado neste navegador');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado:', registration.scope);
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.uiService.showToast('Nova versão disponível! Recarregue a página para atualizar.');
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao registrar Service Worker:', error);
        }
    }

    initializePlayer() {
        try {
            this.player = new MusicPlayer();
        } catch (error) {
            console.error('Error initializing player:', error);
            this.uiService.showToast('Erro ao inicializar o player de música');
        }
    }
}

// Initialize app when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicApp();
});
