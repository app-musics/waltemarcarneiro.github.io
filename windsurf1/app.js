class MusicApp {
    constructor() {
        this.currentUser = null;
        this.player = null;
        this.favorites = new Set();
        this.localTracks = new Map();
        this.youtubeCache = new Map();
        this.activeToast = null;
        
        // Initialize app components
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
            this.showToast('Erro ao inicializar o aplicativo');
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
        } else {
            console.error('Search elements not found');
        }
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-btn');
        if (!tabs.length) {
            console.error('Navigation tabs not found');
            return;
        }

        tabs.forEach(tab => {
            if (tab) {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t?.classList.remove('active'));
                    tab.classList.add('active');
                    this.switchTab(tab.dataset.tab);
                });
            }
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
            this.showEmptyState(resultsContainer, {
                icon: 'cloud-upload-outline',
                title: 'Nenhuma música local',
                message: 'Clique no botão de upload para adicionar músicas do seu computador'
            });
            return;
        }

        this.localTracks.forEach((track, id) => {
            this.createMusicCard(track, resultsContainer);
        });
    }

    async displayFavorites() {
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        if (this.favorites.size === 0) {
            this.showEmptyState(resultsContainer, {
                icon: 'heart-outline',
                title: 'Nenhuma música favorita',
                message: 'Adicione músicas aos favoritos clicando no coração durante a reprodução'
            });
            return;
        }

        try {
            const favoriteTracks = [];
            for (const trackId of this.favorites) {
                const track = this.localTracks.get(trackId) || await this.getYouTubeTrack(trackId);
                if (track) {
                    favoriteTracks.push(track);
                }
            }

            if (favoriteTracks.length === 0) {
                this.showEmptyState(resultsContainer, {
                    icon: 'alert-circle-outline',
                    title: 'Erro ao carregar favoritos',
                    message: 'Não foi possível carregar suas músicas favoritas'
                });
                return;
            }

            favoriteTracks.forEach(track => {
                this.createMusicCard(track, resultsContainer);
            });
        } catch (error) {
            console.error('Error displaying favorites:', error);
            this.showToast('Erro ao carregar favoritos');
        }
    }

    async getYouTubeTrack(videoId) {
        if (!videoId) {
            console.error('Invalid video ID');
            return null;
        }

        if (this.youtubeCache.has(videoId)) {
            return this.youtubeCache.get(videoId);
        }

        try {
            const response = await this.fetchWithRetry(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`);
            
            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.items?.[0]?.snippet) {
                throw new Error('Invalid YouTube API response');
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

            this.youtubeCache.set(videoId, track);
            return track;
        } catch (error) {
            console.error('Error fetching YouTube track:', error);
            return null;
        }
    }

    async performSearch(query) {
        if (!query?.trim()) return;

        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;

        this.showLoadingState(resultsContainer);

        try {
            const results = await this.searchYouTube(query);
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showErrorState(resultsContainer, error.message);
        }
    }

    async searchYouTube(query) {
        try {
            const response = await this.fetchWithRetry(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=10&maxResults=20`
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
                    this.youtubeCache.set(track.id, track);
                }
            });

            return tracks;
        } catch (error) {
            console.error('YouTube search error:', error);
            throw new Error('Não foi possível realizar a busca. Tente novamente mais tarde.');
        }
    }

    async fetchWithRetry(url, retries = 3) {
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': await this.getAuthToken()
                    }
                });
                return response;
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
        
        throw lastError;
    }

    async getAuthToken() {
        // This should be implemented in your backend
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

    async getErrorMessage(response) {
        try {
            const data = await response.json();
            return data.error?.message || 'Erro desconhecido';
        } catch {
            return `Erro ${response.status}: ${response.statusText}`;
        }
    }

    showLoadingState(container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Buscando músicas...</p>
            </div>
        `;
    }

    showErrorState(container, message) {
        container.innerHTML = `
            <div class="error-state">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <h3>Erro ao buscar músicas</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showEmptyState(container, { icon, title, message }) {
        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="${icon}"></ion-icon>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            this.showEmptyState(resultsContainer, {
                icon: 'search-outline',
                title: 'Nenhum resultado encontrado',
                message: 'Tente uma busca diferente'
            });
            return;
        }

        results.forEach(track => {
            this.createMusicCard(track, resultsContainer);
        });
    }

    createMusicCard(track, container) {
        const card = document.createElement('div');
        card.className = 'music-card fade-in';
        
        const isFavorite = this.favorites.has(track.id);
        
        card.innerHTML = `
            <div class="card-thumbnail">
                <img src="${track.metadata.thumbnail}" alt="${track.metadata.title}">
                <button class="play-overlay">
                    <ion-icon name="play-circle-outline"></ion-icon>
                </button>
            </div>
            <div class="info">
                <h3>${track.metadata.title}</h3>
                <p>${track.metadata.artist}</p>
                <div class="card-actions">
                    <button class="action-btn favorite-btn ${isFavorite ? 'active' : ''}" title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                        <ion-icon name="${isFavorite ? 'heart' : 'heart-outline'}"></ion-icon>
                    </button>
                    <button class="action-btn share-btn" title="Compartilhar">
                        <ion-icon name="share-social-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;

        // Event Listeners
        card.querySelector('.play-overlay').addEventListener('click', (e) => {
            e.stopPropagation();
            this.player.loadAndPlay(track);
        });

        card.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(track);
            const btn = e.currentTarget;
            const isNowFavorite = this.favorites.has(track.id);
            btn.innerHTML = `<ion-icon name="${isNowFavorite ? 'heart' : 'heart-outline'}"></ion-icon>`;
            btn.classList.toggle('active', isNowFavorite);
            btn.title = isNowFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
        });

        card.querySelector('.share-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.shareTrack(track);
        });

        container.appendChild(card);
    }

    toggleFavorite(track) {
        if (this.favorites.has(track.id)) {
            this.favorites.delete(track.id);
        } else {
            this.favorites.add(track.id);
        }
        this.saveFavorites();
    }

    loadFavorites() {
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
            this.showToast('Erro ao salvar favoritos');
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
                        this.showToast('Nova versão disponível! Recarregue a página para atualizar.');
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
            this.showToast('Erro ao inicializar o player de música');
        }
    }

    showToast(message) {
        if (this.activeToast) {
            clearTimeout(this.activeToast.timeout);
            this.activeToast.element.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('show'));

        // Store reference to active toast
        this.activeToast = {
            element: toast,
            timeout: setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                    this.activeToast = null;
                }, 300);
            }, 3000)
        };
    }

    async shareTrack(track) {
        const shareData = {
            title: track.metadata.title,
            text: `Ouça ${track.metadata.title} por ${track.metadata.artist} no SanMusic`,
            url: track.type === 'youtube' ? `https://youtu.be/${track.id}` : window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                this.showToast('Link copiado para a área de transferência!');
            }
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
            this.showToast('Erro ao compartilhar. Tente novamente.');
        }
    }
}

// Initialize app when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicApp();
});
