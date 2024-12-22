class MusicApp {
    constructor() {
        this.currentUser = null;
        this.player = null;
        this.favorites = new Set();
        this.localTracks = new Map();
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
                // Mantém o container vazio até uma busca ser realizada
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

    displayFavorites() {
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

        this.favorites.forEach(trackId => {
            const track = this.localTracks.get(trackId) || this.getYouTubeTrack(trackId);
            if (track) {
                this.createMusicCard(track, resultsContainer);
            }
        });
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
                    <p>Tente novamente mais tarde</p>
                </div>
            `;
        }
    }

    async searchYouTube(query) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=10&maxResults=6&key=${this.API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error('Erro na API do YouTube');
            }

            const data = await response.json();
            return data.items.map(item => ({
                id: item.id.videoId,
                type: 'youtube',
                streamUrl: `https://vid.puffyan.us/latest_version?id=${item.id.videoId}&itag=140`,
                metadata: {
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.high.url
                }
            }));
        } catch (error) {
            console.error('Erro na busca:', error);
            this.showToast('Não foi possível realizar a busca. Tente novamente.');
            return [];
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
                <img src="${track.metadata.thumbnail}" alt="${track.metadata.title}" 
                     onerror="this.src='assets/images/placeholder.jpg'">
            </div>
            <div class="info">
                <h3>${track.metadata.title}</h3>
                <p>${track.metadata.artist}</p>
                <div class="card-actions">
                    <button class="action-btn play-btn" title="Reproduzir">
                        <ion-icon name="play-circle-outline"></ion-icon>
                    </button>
                    <button class="action-btn favorite-btn ${isFavorite ? 'active' : ''}" 
                            title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                        <ion-icon name="${isFavorite ? 'heart' : 'heart-outline'}"></ion-icon>
                    </button>
                    <button class="action-btn share-btn" title="Compartilhar">
                        <ion-icon name="share-social-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;

        // Event Listeners
        card.querySelector('.play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Play button clicked, track:', track);
            if (this.player) {
                this.player.loadAndPlay(track);
            }
        });

        card.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(track);
            this.updateFavoriteButton(e.currentTarget, track.id);
        });

        card.querySelector('.share-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.shareTrack(track);
        });

        container.appendChild(card);
    }

    updateFavoriteButton(button, trackId) {
        const isFavorite = this.favorites.has(trackId);
        button.innerHTML = `<ion-icon name="${isFavorite ? 'heart' : 'heart-outline'}"></ion-icon>`;
        button.classList.toggle('active', isFavorite);
        button.title = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    }

    toggleFavorite(track) {
        if (this.favorites.has(track.id)) {
            this.favorites.delete(track.id);
            this.showToast('Removido dos favoritos');
        } else {
            this.favorites.add(track.id);
            this.showToast('Adicionado aos favoritos');
        }
        this.saveFavorites();
    }

    async shareTrack(track) {
        const shareData = {
            title: track.metadata.title,
            text: `Ouça ${track.metadata.title} por ${track.metadata.artist} no Musics`,
            url: track.type === 'youtube' ? `https://youtu.be/${track.id}` : window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                this.showToast('Compartilhado com sucesso!');
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

        // Força um reflow para garantir que a animação funcione
        toast.offsetHeight;
        
        // Adiciona a classe para mostrar o toast
        toast.classList.add('fade-in');

        // Remove o toast após 5 segundos
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    initializePlayer() {
        this.player = new MusicPlayer();
        
        // Listen for player errors
        document.addEventListener('playerError', (event) => {
            this.showToast(event.detail.message);
        });
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
    window.app = new MusicApp();
});
