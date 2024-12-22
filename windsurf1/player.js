class MusicPlayer {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.initializeAudio();
        this.setupEventListeners();
    }

    initializeElements() {
        // Player controls
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

        // Validate required elements
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Required element not found: ${key}`);
            }
        });
    }

    initializeState() {
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.currentTrack = null;
        this.shuffle = false;
        this.repeat = 'none'; // none, one, all
        this.volume = parseFloat(localStorage.getItem('volume')) || 1;
        this.playQueue = [];
        this.playHistory = [];
    }

    initializeAudio() {
        this.audio = new Audio();
        this.audio.volume = this.volume;

        // Update volume UI
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.value = this.volume * 100;
        }
        this.updateVolumeIcon();
    }

    setupEventListeners() {
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('playing', () => this.updatePlayState(true));
        this.audio.addEventListener('pause', () => this.updatePlayState(false));

        // Control events
        if (this.elements.playPause) {
            this.elements.playPause.addEventListener('click', () => this.togglePlayPause());
        }

        if (this.elements.progressContainer) {
            this.elements.progressContainer.addEventListener('click', (e) => this.setProgress(e));
        }

        if (this.elements.volume) {
            this.elements.volume.addEventListener('click', () => this.toggleMute());
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

        // Media Session API
        if ('mediaSession' in navigator) {
            this.setupMediaSession();
        }
    }

    setupMediaSession() {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
    }

    updateMediaSessionMetadata(track) {
        if ('mediaSession' in navigator && track) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.metadata.title,
                artist: track.metadata.artist,
                artwork: [
                    { src: track.metadata.thumbnail, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
        }
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

            // Set audio source based on track type
            if (track.type === 'youtube') {
                console.log('Track URL:', track.streamUrl);
                if (!track.streamUrl) {
                    throw new Error('Stream URL not found');
                }

                // Primeiro tenta obter a URL do stream
                const response = await fetch(track.streamUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'audio/mp4,audio/*;q=0.9,*/*;q=0.8',
                        'Range': 'bytes=0-',
                    }
                });

                if (!response.ok) {
                    throw new Error('Erro ao obter stream de áudio');
                }

                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                this.audio.src = audioUrl;
            } else {
                this.audio.src = track.src;
            }

            // Update media session
            this.updateMediaSessionMetadata(track);

            // Play the track
            console.log('Attempting to play audio...');
            await this.play();

            // Add to history
            this.addToHistory(track);

        } catch (error) {
            console.error('Error loading track:', error);
            this.dispatchError(`Erro ao carregar música: ${error.message}`);
        }
    }

    async play() {
        try {
            console.log('Play called, current src:', this.audio.src);
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                console.log('Audio playing successfully');
                this.updatePlayState(true);
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            throw error; // Propaga o erro para ser tratado em loadAndPlay
        }
    }

    pause() {
        this.audio.pause();
        this.updatePlayState(false);
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    updatePlayState(isPlaying) {
        this.isPlaying = isPlaying;
        if (this.elements.playPause) {
            this.elements.playPause.innerHTML = isPlaying
                ? '<ion-icon name="pause-outline"></ion-icon>'
                : '<ion-icon name="play-outline"></ion-icon>';
        }
    }

    updateProgress() {
        if (!this.audio.duration) return;

        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        const progressPercent = (currentTime / duration) * 100;

        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${progressPercent}%`;
        }

        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(currentTime);
        }
    }

    updateDuration() {
        if (this.elements.duration) {
            this.elements.duration.textContent = this.formatTime(this.audio.duration);
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    setProgress(e) {
        const width = this.elements.progressContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = this.audio.duration;
        
        if (duration) {
            this.audio.currentTime = (clickX / width) * duration;
        }
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.audio.volume = this.volume;
        localStorage.setItem('volume', this.volume.toString());
        this.updateVolumeIcon();
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.lastVolume = this.audio.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.lastVolume || 1);
        }
    }

    updateVolumeIcon() {
        if (!this.elements.volume) return;

        let iconName;
        if (this.volume === 0) {
            iconName = 'volume-mute-outline';
        } else if (this.volume < 0.3) {
            iconName = 'volume-low-outline';
        } else if (this.volume < 0.7) {
            iconName = 'volume-medium-outline';
        } else {
            iconName = 'volume-high-outline';
        }

        this.elements.volume.innerHTML = `<ion-icon name="${iconName}"></ion-icon>`;
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        if (this.elements.shuffleBtn) {
            this.elements.shuffleBtn.classList.toggle('active', this.shuffle);
        }
    }

    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeat);
        this.repeat = modes[(currentIndex + 1) % modes.length];

        if (this.elements.repeatBtn) {
            this.elements.repeatBtn.classList.toggle('active', this.repeat !== 'none');
            // Update icon based on repeat mode
            const icon = this.repeat === 'one' ? 'repeat-one-outline' : 'repeat-outline';
            this.elements.repeatBtn.innerHTML = `<ion-icon name="${icon}"></ion-icon>`;
        }
    }

    handleTrackEnd() {
        if (this.repeat === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else {
            this.playNext();
        }
    }

    playNext() {
        if (this.playQueue.length > 0) {
            const nextTrack = this.playQueue.shift();
            this.loadAndPlay(nextTrack);
        }
    }

    playPrevious() {
        if (this.playHistory.length > 1) {
            // Remove current track from history
            this.playHistory.pop();
            // Get previous track
            const previousTrack = this.playHistory.pop();
            this.loadAndPlay(previousTrack);
        }
    }

    addToHistory(track) {
        this.playHistory.push(track);
        // Keep only last 50 tracks in history
        if (this.playHistory.length > 50) {
            this.playHistory.shift();
        }
    }

    addToQueue(track) {
        this.playQueue.push(track);
    }

    clearQueue() {
        this.playQueue = [];
    }

    handleAudioError(error) {
        console.error('Audio error event:', error);
        let errorMessage = 'Erro desconhecido';

        if (error.target.error) {
            switch (error.target.error.code) {
                case 1:
                    errorMessage = 'Processo abortado';
                    break;
                case 2:
                    errorMessage = 'Erro de rede';
                    break;
                case 3:
                    errorMessage = 'Erro ao decodificar áudio';
                    break;
                case 4:
                    errorMessage = 'Formato não suportado';
                    break;
            }
        }

        console.error('Error details:', errorMessage);
        this.dispatchError(`Erro ao reproduzir áudio: ${errorMessage}`);
    }

    dispatchError(message) {
        const event = new CustomEvent('playerError', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }
}

// Initialize player when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.player = new MusicPlayer();
});
