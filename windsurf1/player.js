class MusicPlayer {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.initializeYouTubePlayer();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            playPause: document.getElementById('play-pause'),
            progressBar: document.getElementById('progress-bar'),
            progressContainer: document.getElementById('progress-container'),
            title: document.getElementById('title'),
            artist: document.getElementById('artist'),
            volume: document.getElementById('volume'),
            volumeSlider: document.getElementById('volume-slider'),
            currentTime: document.getElementById('current-time'),
            duration: document.getElementById('duration'),
            shuffleBtn: document.getElementById('shuffle'),
            repeatBtn: document.getElementById('repeat'),
            prevBtn: document.getElementById('prev'),
            nextBtn: document.getElementById('next')
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
                'controls': 0
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
        this.updateProgressBar();
    }

    onPlayerStateChange(event) {
        switch(event.data) {
            case YT.PlayerState.PLAYING:
                this.isPlaying = true;
                this.startProgressInterval();
                break;
            case YT.PlayerState.PAUSED:
                this.isPlaying = false;
                this.clearProgressInterval();
                break;
            case YT.PlayerState.ENDED:
                this.clearProgressInterval();
                if (this.isRepeat) {
                    this.play();
                } else {
                    this.playNext();
                }
                break;
        }
        this.updatePlayPauseButton();
    }

    onPlayerError(event) {
        console.error('YouTube player error:', event);
        this.dispatchError('Erro ao reproduzir o vídeo');
    }

    async loadAndPlay(track) {
        try {
            if (!track) {
                throw new Error('No track provided');
            }

            console.log('Loading track:', track);
            this.currentTrack = track;
            
            // Update UI
            if (this.elements.title) {
                this.elements.title.textContent = track.metadata.title;
            }
            if (this.elements.artist) {
                this.elements.artist.textContent = track.metadata.artist;
            }

            // Load and play YouTube video
            if (track.type === 'youtube' && this.player && this.player.loadVideoById) {
                console.log('Loading YouTube video:', track.id);
                this.player.loadVideoById(track.id);
                this.isPlaying = true;
                this.updatePlayPauseButton();
            }

        } catch (error) {
            console.error('Error loading track:', error);
            this.dispatchError(`Erro ao carregar música: ${error.message}`);
        }
    }

    play() {
        if (this.player && this.player.playVideo) {
            this.player.playVideo();
            this.isPlaying = true;
            this.updatePlayPauseButton();
        }
    }

    pause() {
        if (this.player && this.player.pauseVideo) {
            this.player.pauseVideo();
            this.isPlaying = false;
            this.updatePlayPauseButton();
        }
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
        if (this.elements.playPause) {
            this.elements.playPause.innerHTML = this.isPlaying ? 
                '<ion-icon name="pause"></ion-icon>' : 
                '<ion-icon name="play"></ion-icon>';
        }
    }

    dispatchError(message) {
        const event = new CustomEvent('playerError', { 
            detail: { message } 
        });
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

// Initialize player when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.player = new MusicPlayer();
});
