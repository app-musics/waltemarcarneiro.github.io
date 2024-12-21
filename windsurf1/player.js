class MusicPlayer {
    constructor() {
        this.currentTrack = null;
        this.audioPlayer = new Audio();
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 1;
        this.queue = [];
        this.currentIndex = -1;
        this.shuffle = false;
        this.repeat = false;
        this.favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
        this.lastVolume = 1;

        this.setupEventListeners();
        this.setupYouTubePlayer();
    }

    setupEventListeners() {
        // Main controls
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('prevBtn').addEventListener('click', () => this.playPrevious());
        document.getElementById('nextBtn').addEventListener('click', () => this.playNext());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.toggleShuffle());
        document.getElementById('repeatBtn').addEventListener('click', () => this.toggleRepeat());
        
        // Volume controls
        const volumeBtn = document.getElementById('volumeBtn');
        const volumeControl = document.getElementById('volumeControl');
        
        volumeBtn.addEventListener('click', () => this.toggleMute());
        volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Additional controls
        document.getElementById('shareBtn').addEventListener('click', () => this.shareTrack());
        document.getElementById('favoriteBtn').addEventListener('click', () => this.toggleFavorite());
        
        // Progress bar
        const progressBar = document.querySelector('.progress-bar');
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seekTo(percent);
        });

        // File upload
        document.getElementById('audioFileInput').addEventListener('change', (e) => this.handleLocalFiles(e.target.files));

        // Audio events
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioPlayer.addEventListener('ended', () => this.handleTrackEnd());
    }

    setupYouTubePlayer() {
        if (window.YT) {
            this.initYouTubePlayer();
        } else {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            window.onYouTubeIframeAPIReady = () => this.initYouTubePlayer();
        }
    }

    initYouTubePlayer() {
        this.youtubePlayer = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            events: {
                'onReady': () => console.log('YouTube Player pronto'),
                'onStateChange': (event) => this.handleYouTubeStateChange(event),
                'onError': (error) => console.error('Erro no YouTube Player:', error)
            }
        });
    }

    handleYouTubeStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            this.handleTrackEnd();
        }
        this.isPlaying = event.data === YT.PlayerState.PLAYING;
        this.updatePlayPauseButton();
    }

    async handleLocalFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('audio/')) {
                const track = {
                    id: URL.createObjectURL(file),
                    type: 'local',
                    metadata: {
                        title: file.name.replace(/\.[^/.]+$/, ''),
                        artist: 'Arquivo Local',
                        duration: 0
                    },
                    file: file
                };

                // Tenta extrair metadados usando a Web Audio API
                try {
                    const metadata = await this.extractAudioMetadata(file);
                    if (metadata) {
                        track.metadata = { ...track.metadata, ...metadata };
                    }
                } catch (error) {
                    console.warn('Não foi possível extrair metadados:', error);
                }

                this.queue.push(track);
                if (this.queue.length === 1) {
                    this.currentIndex = 0;
                    this.loadAndPlay(track);
                }
            }
        }
    }

    async extractAudioMetadata(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(e.target.result);
                    resolve({
                        duration: audioBuffer.duration,
                        // Adicione mais metadados conforme necessário
                    });
                } catch (error) {
                    console.warn('Erro ao extrair metadados:', error);
                    resolve(null);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    loadAndPlay(track) {
        this.currentTrack = track;
        this.currentSource = track.type;

        if (track.type === 'local') {
            this.youtubePlayer?.stopVideo();
            this.audioPlayer.src = track.id;
            this.audioPlayer.play();
        } else if (track.type === 'youtube' && this.youtubePlayer?.loadVideoById) {
            this.audioPlayer.pause();
            this.youtubePlayer.loadVideoById(track.id);
        }

        this.isPlaying = true;
        this.updatePlayerUI();
    }

    togglePlayPause() {
        if (this.currentSource === 'local') {
            if (this.isPlaying) {
                this.audioPlayer.pause();
            } else {
                this.audioPlayer.play();
            }
        } else if (this.currentSource === 'youtube' && this.youtubePlayer) {
            if (this.isPlaying) {
                this.youtubePlayer.pauseVideo();
            } else {
                this.youtubePlayer.playVideo();
            }
        }
        this.isPlaying = !this.isPlaying;
        this.updatePlayPauseButton();
    }

    updatePlayPauseButton() {
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    updatePlayerUI() {
        if (!this.currentTrack) return;

        // Update thumbnail
        const thumbnail = document.getElementById('currentThumbnail');
        thumbnail.src = this.currentTrack.type === 'youtube' 
            ? `https://img.youtube.com/vi/${this.currentTrack.id}/hqdefault.jpg`
            : 'https://waltemar.com.br/youtube/placeholder.jpg';

        // Update track info
        document.getElementById('currentTitle').textContent = this.currentTrack.metadata?.title || 'Desconhecido';
        document.getElementById('currentArtist').textContent = this.currentTrack.metadata?.artist || '-';

        // Update control buttons
        this.updatePlayPauseButton();
        document.getElementById('shuffleBtn').classList.toggle('active', this.shuffle);
        document.getElementById('repeatBtn').classList.toggle('active', this.repeat);
        
        // Update favorite button
        const favoriteBtn = document.getElementById('favoriteBtn');
        const isFavorite = this.favorites.has(this.currentTrack.id);
        favoriteBtn.innerHTML = `<ion-icon name="${isFavorite ? 'heart' : 'heart-outline'}"></ion-icon>`;
        favoriteBtn.classList.toggle('active', isFavorite);
    }

    toggleFavorite() {
        if (!this.currentTrack) return;

        const trackId = this.currentTrack.id;
        if (this.favorites.has(trackId)) {
            this.favorites.delete(trackId);
        } else {
            this.favorites.add(trackId);
        }

        // Save to localStorage
        localStorage.setItem('favorites', JSON.stringify([...this.favorites]));
        
        // Update UI
        this.updatePlayerUI();
        
        // Show feedback
        this.showToast(this.favorites.has(trackId) ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    }

    async shareTrack() {
        if (!this.currentTrack) return;

        const shareData = {
            title: this.currentTrack.metadata.title,
            text: `Ouça ${this.currentTrack.metadata.title} por ${this.currentTrack.metadata.artist}`,
            url: this.currentTrack.type === 'youtube' 
                ? `https://youtu.be/${this.currentTrack.id}`
                : window.location.href
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

    toggleMute() {
        const volumeBtn = document.getElementById('volumeBtn');
        const volumeControl = document.getElementById('volumeControl');
        
        if (this.volume > 0) {
            this.lastVolume = this.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.lastVolume * 100 || 100);
        }
    }

    setVolume(value) {
        this.volume = value / 100;
        const volumeBtn = document.getElementById('volumeBtn');
        const volumeControl = document.getElementById('volumeControl');

        // Update audio players
        this.audioPlayer.volume = this.volume;
        if (this.youtubePlayer) {
            this.youtubePlayer.setVolume(value);
        }

        // Update UI
        volumeControl.value = value;
        volumeBtn.innerHTML = `<ion-icon name="${
            this.volume === 0 ? 'volume-mute-outline' :
            this.volume < 0.5 ? 'volume-low-outline' :
            'volume-high-outline'
        }"></ion-icon>`;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after animation
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateProgress() {
        const currentTime = this.currentSource === 'local' ? this.audioPlayer.currentTime : this.youtubePlayer?.getCurrentTime() || 0;
        const duration = this.currentSource === 'local' ? this.audioPlayer.duration : this.youtubePlayer?.getDuration() || 0;
        
        if (duration > 0) {
            const percent = (currentTime / duration) * 100;
            document.querySelector('.progress').style.width = `${percent}%`;
            document.getElementById('currentTime').textContent = this.formatTime(currentTime);
            document.getElementById('duration').textContent = this.formatTime(duration);
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    seekTo(percent) {
        if (this.currentSource === 'local') {
            const duration = this.audioPlayer.duration;
            this.audioPlayer.currentTime = duration * percent;
        } else if (this.currentSource === 'youtube' && this.youtubePlayer) {
            const duration = this.youtubePlayer.getDuration();
            this.youtubePlayer.seekTo(duration * percent, true);
        }
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        document.getElementById('shuffleBtn').classList.toggle('active');
    }

    toggleRepeat() {
        this.repeat = !this.repeat;
        const repeatBtn = document.getElementById('repeatBtn');
        repeatBtn.classList.toggle('active', this.repeat);
    }

    handleTrackEnd() {
        if (this.repeat) {
            this.seekTo(0);
            this.togglePlayPause();
        } else {
            this.playNext();
        }
    }

    playNext() {
        if (this.queue.length === 0) return;

        if (this.shuffle) {
            const nextIndex = Math.floor(Math.random() * this.queue.length);
            this.currentIndex = nextIndex;
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.queue.length;
        }

        this.loadAndPlay(this.queue[this.currentIndex]);
    }

    playPrevious() {
        if (this.queue.length === 0) return;

        if (this.shuffle) {
            const prevIndex = Math.floor(Math.random() * this.queue.length);
            this.currentIndex = prevIndex;
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
        }

        this.loadAndPlay(this.queue[this.currentIndex]);
    }
}

// Initialize player when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.player = new MusicPlayer();
});
