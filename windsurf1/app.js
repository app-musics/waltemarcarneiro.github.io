class MusicApp {
    constructor() {
        this.currentUser = null;
        this.player = null;
        this.favorites = new Set();
        this.localTracks = new Map();
        this.youtubeCache = new Map();
        this.API_KEY = 'AIzaSyDSD1qRSM61xXXDk6CBHfbhnLfoXbQPsYY';
        
        this.setupEventListeners();
        this.loadFavorites();
        this.setupServiceWorker();
        this.initializePlayer();
        this.setupTabNavigation();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        searchBtn.addEventListener('click', () => this.performSearch(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(searchInput.value);
            }
        });
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-btn');
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
        }
    }

    displayLocalTracks() {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (this.localTracks.size === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="cloud-upload-outline"></ion-icon>
                    <h3>Nenhuma música local</h3>
                    <p>Clique no botão de upload para adicionar músicas do seu computador</p>
                </div>
            `;
            return;
        }

        this.localTracks.forEach((track, id) => {
            this.createMusicCard(track, resultsContainer);
        });
    }

    async displayFavorites() {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (this.favorites.size === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="heart-outline"></ion-icon>
                    <h3>Nenhuma música favorita</h3>
                    <p>Adicione músicas aos favoritos clicando no coração durante a reprodução</p>
                </div>
            `;
            return;
        }

        const favoriteTracks = [];
        for (const trackId of this.favorites) {
            const track = this.localTracks.get(trackId) || await this.getYouTubeTrack(trackId);
            if (track) {
                favoriteTracks.push(track);
            }
        }

        favoriteTracks.forEach(track => {
            this.createMusicCard(track, resultsContainer);
        });
    }

    async getYouTubeTrack(videoId) {
        if (this.youtubeCache.has(videoId)) {
            return this.youtubeCache.get(videoId);
        }

        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${this.API_KEY}`);
            const data = await response.json();

            if (data.items && data.items[0]) {
                const track = {
                    id: videoId,
                    type: 'youtube',
                    metadata: {
                        title: data.items[0].snippet.title,
                        artist: data.items[0].snippet.channelTitle,
                        thumbnail: data.items[0].snippet.thumbnails.high.url
                    }
                };
                this.youtubeCache.set(videoId, track);
                return track;
            }
        } catch (error) {
            console.error('Error fetching YouTube track:', error);
        }
        return null;
    }

    async performSearch(query) {
        if (!query.trim()) return;

        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Buscando músicas...</p>
            </div>
        `;

        try {
            const results = await this.searchYouTube(query);
            this.displayResults(results);
        } catch (error) {
            console.error('Erro na busca:', error);
            resultsContainer.innerHTML = `
                <div class="error-state">
                    <ion-icon name="alert-circle-outline"></ion-icon>
                    <h3>Erro ao buscar músicas</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    async searchYouTube(query) {
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=10&maxResults=20&key=${this.API_KEY}`);
            
            if (!response.ok) {
                throw new Error('Erro ao conectar com a API do YouTube');
            }

            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                return [];
            }

            const tracks = data.items.map(item => ({
                id: item.id.videoId,
                type: 'youtube',
                metadata: {
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.high.url
                }
            }));

            // Cache the results
            tracks.forEach(track => {
                this.youtubeCache.set(track.id, track);
            });

            return tracks;
        } catch (error) {
            console.error('Erro na busca:', error);
            throw new Error('Não foi possível realizar a busca. Tente novamente mais tarde.');
        }
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="search-outline"></ion-icon>
                    <h3>Nenhum resultado encontrado</h3>
                    <p>Tente uma busca diferente</p>
                </div>
            `;
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
        const savedFavorites = localStorage.getItem('favorites');
        if (savedFavorites) {
            this.favorites = new Set(JSON.parse(savedFavorites));
        }
    }

    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify([...this.favorites]));
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

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    initializePlayer() {
        this.player = new MusicPlayer();
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registrado com sucesso:', registration);
            } catch (error) {
                console.error('Erro ao registrar Service Worker:', error);
            }
        }
    }
}

// Initialize app when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new MusicApp();
});
