class MusicPlayer {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.setupEventListeners();
        
        // Initialize YouTube player when API is ready
        window.addEventListener('youtubeApiReady', () => {
            this.initializeYouTubePlayer();
        });
    }

    initializeElements() {
        this.elements = {
            playPause: document.getElementById('playPauseBtn'),
            progressBar: document.querySelector('#progress-bar .progress'),
            progressContainer: document.getElementById('progress-container'),
            title: document.getElementById('currentTitle'),
            artist: document.getElementById('currentArtist'),
            volume: document.getElementById('volumeBtn'),
            volumeSlider: document.getElementById('volumeControl'),
            currentTime: document.getElementById('currentTime'),
            duration: document.getElementById('duration'),
            shuffleBtn: document.getElementById('shuffleBtn'),
            repeatBtn: document.getElementById('repeatBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            thumbnail: document.getElementById('currentThumbnail')
        };
    }

    initializeState() {
        this.currentTrack = null;
        this.isPlaying = false;
        this.isShuffle = false;
        this.isRepeat = false;
        this.volume = 1;
        this.progressInterval = null;
    }

    initializeYouTubePlayer() {
        // Criar o player do YouTube quando a API estiver pronta
        if (window.YT) {
            this.createYouTubePlayer();
        } else {
            window.onYouTubeIframeAPIReady = () => {
                this.createYouTubePlayer();
            };
        }
    }

    createYouTubePlayer() {
        this.player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'disablekb': 1,
                'fs': 0,
                'modestbranding': 1,
                'rel': 0
            },
            events: {
                'onReady': this.onPlayerReady.bind(this),
                'onStateChange': this.onPlayerStateChange.bind(this),
                'onError': this.onPlayerError.bind(this)
            }
        });
    }

    onPlayerReady(event) {
        console.log('YouTube player ready');
        // Set initial volume
        event.target.setVolume(this.elements.volumeSlider.value);
    }

    onPlayerStateChange(event) {
        switch(event.data) {
            case YT.PlayerState.PLAYING:
                this.isPlaying = true;
                this.startProgressInterval();
                this.updatePlayPauseButton();
                break;
            case YT.PlayerState.PAUSED:
                this.isPlaying = false;
                this.clearProgressInterval();
                this.updatePlayPauseButton();
                break;
            case YT.PlayerState.ENDED:
                this.isPlaying = false;
                this.clearProgressInterval();
                this.updatePlayPauseButton();
                if (this.isRepeat) {
                    this.play();
                } else {
                    // Dispatch ended event for app.js to handle
                    this.dispatchEvent('trackEnded');
                }
                break;
        }
    }

    onPlayerError(event) {
        console.error('YouTube player error:', event);
        this.dispatchError('Erro ao reproduzir o vídeo');
    }

    async loadAndPlay(track) {
        try {
            if (!track || !track.videoId) {
                throw new Error('Track inválida');
            }

            this.currentTrack = track;
            
            // Update UI
            if (this.elements.title) this.elements.title.textContent = track.title;
            if (this.elements.artist) this.elements.artist.textContent = track.artist || 'Desconhecido';
            if (this.elements.thumbnail) this.elements.thumbnail.src = track.thumbnail || 'placeholder.jpg';

            // Load and play video
            await this.player.loadVideoById(track.videoId);
            this.play();
        } catch (error) {
            console.error('Error loading track:', error);
            this.dispatchError('Erro ao carregar a música');
        }
    }

    play() {
        if (!this.player || !this.player.playVideo) return;
        this.player.playVideo();
        this.isPlaying = true;
        this.updatePlayPauseButton();
        this.startProgressInterval();
    }

    pause() {
        if (!this.player || !this.player.pauseVideo) return;
        this.player.pauseVideo();
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.clearProgressInterval();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    startProgressInterval() {
        this.clearProgressInterval();
        this.progressInterval = setInterval(() => this.updateProgressBar(), 1000);
    }

    clearProgressInterval() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    updateProgressBar() {
        if (!this.player || !this.player.getCurrentTime || !this.player.getDuration) return;

        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();

        if (duration > 0) {
            const progress = (currentTime / duration) * 100;
            if (this.elements.progressBar) {
                this.elements.progressBar.style.width = `${progress}%`;
            }
        }

        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(currentTime);
        }
        if (this.elements.duration) {
            this.elements.duration.textContent = this.formatTime(duration);
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    seekTo(event) {
        if (!this.player || !this.player.seekTo || !this.player.getDuration) return;

        const rect = this.elements.progressContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const containerWidth = rect.width;
        const duration = this.player.getDuration();
        
        const seekTime = (clickX / containerWidth) * duration;
        this.player.seekTo(seekTime, true);
    }

    updatePlayPauseButton() {
        const playIcon = this.elements.playPause.querySelector('.play-icon');
        const pauseIcon = this.elements.playPause.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    dispatchError(message) {
        const event = new CustomEvent('playerError', { 
            detail: { message } 
        });
        window.dispatchEvent(event);
    }

    setVolume(volume) {
        if (!this.player || !this.player.setVolume) return;
        this.volume = volume;
        this.player.setVolume(volume * 100);
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.elements.shuffleBtn.classList.toggle('active', this.isShuffle);
        this.dispatchEvent('shuffleChanged', { isShuffle: this.isShuffle });
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        this.elements.repeatBtn.classList.toggle('active', this.isRepeat);
        this.dispatchEvent('repeatChanged', { isRepeat: this.isRepeat });
    }

    dispatchEvent(name, detail = {}) {
        const event = new CustomEvent(name, { detail });
        window.dispatchEvent(event);
    }

    setupEventListeners() {
        // Player controls
        if (this.elements.playPause) {
            this.elements.playPause.addEventListener('click', () => this.togglePlay());
        }

        if (this.elements.progressContainer) {
            this.elements.progressContainer.addEventListener('click', (e) => this.seekTo(e));
        }

        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        }

        if (this.elements.shuffleBtn) {
            this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }

        if (this.elements.repeatBtn) {
            this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        }

        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', () => this.playPrevious());
        }

        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => this.playNext());
        }
    }
}

// Initialize player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});
