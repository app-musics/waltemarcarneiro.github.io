class MusicPlayer {
    constructor() {
        this.currentTrack = null;
        this.isPlaying = false;
        this.queue = [];
        this.currentIndex = -1;
        this.shuffle = false;
        this.repeat = 'none'; // none, one, all
        this.volume = 100;
        this.audioElement = new Audio();
        this.youtubePlayer = null;
        this.currentSource = null; // 'local' ou 'youtube'
        this.setupEventListeners();
        this.setupYouTubePlayer();
    }

    setupEventListeners() {
        // Controles principais
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('prevBtn').addEventListener('click', () => this.playPrevious());
        document.getElementById('nextBtn').addEventListener('click', () => this.playNext());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.toggleShuffle());
        document.getElementById('repeatBtn').addEventListener('click', () => this.toggleRepeat());
        
        // Controle de volume
        const volumeControl = document.getElementById('volumeControl');
        volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Progress bar
        const progressBar = document.querySelector('.progress-bar');
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seekTo(percent);
        });

        // Upload de arquivos locais
        document.getElementById('audioFileInput').addEventListener('change', (e) => this.handleLocalFiles(e.target.files));

        // Eventos do áudio local
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('ended', () => this.handleTrackEnd());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateDuration());
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
            this.audioElement.src = track.id;
            this.audioElement.play();
        } else if (track.type === 'youtube' && this.youtubePlayer?.loadVideoById) {
            this.audioElement.pause();
            this.youtubePlayer.loadVideoById(track.id);
        }

        this.isPlaying = true;
        this.updatePlayerUI();
    }

    togglePlayPause() {
        if (this.currentSource === 'local') {
            if (this.isPlaying) {
                this.audioElement.pause();
            } else {
                this.audioElement.play();
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
        // Atualiza thumbnail
        const thumbnail = document.getElementById('currentThumbnail');
        thumbnail.src = this.currentTrack.type === 'youtube' 
            ? `https://img.youtube.com/vi/${this.currentTrack.id}/hqdefault.jpg`
            : 'https://waltemar.com.br/youtube/placeholder.jpg';

        // Atualiza informações da música
        document.getElementById('currentTitle').textContent = this.currentTrack.metadata?.title || 'Desconhecido';
        document.getElementById('currentArtist').textContent = this.currentTrack.metadata?.artist || '-';

        // Atualiza botões de controle
        this.updatePlayPauseButton();
        document.getElementById('shuffleBtn').classList.toggle('active', this.shuffle);
        
        const repeatBtn = document.getElementById('repeatBtn');
        repeatBtn.classList.toggle('active', this.repeat !== 'none');
        repeatBtn.setAttribute('data-repeat', this.repeat);
    }

    updateProgress() {
        const currentTime = this.currentSource === 'local' ? this.audioElement.currentTime : this.youtubePlayer?.getCurrentTime() || 0;
        const duration = this.currentSource === 'local' ? this.audioElement.duration : this.youtubePlayer?.getDuration() || 0;
        
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
            const duration = this.audioElement.duration;
            this.audioElement.currentTime = duration * percent;
        } else if (this.currentSource === 'youtube' && this.youtubePlayer) {
            const duration = this.youtubePlayer.getDuration();
            this.youtubePlayer.seekTo(duration * percent, true);
        }
    }

    setVolume(value) {
        this.volume = value;
        if (this.currentSource === 'local') {
            this.audioElement.volume = value / 100;
        } else if (this.currentSource === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.setVolume(value);
        }

        const volumeBtn = document.getElementById('volumeBtn');
        if (value == 0) {
            volumeBtn.innerHTML = '<ion-icon name="volume-mute-outline"></ion-icon>';
        } else if (value < 50) {
            volumeBtn.innerHTML = '<ion-icon name="volume-low-outline"></ion-icon>';
        } else {
            volumeBtn.innerHTML = '<ion-icon name="volume-high-outline"></ion-icon>';
        }
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        document.getElementById('shuffleBtn').classList.toggle('active');
    }

    toggleRepeat() {
        const states = ['none', 'one', 'all'];
        const currentIndex = states.indexOf(this.repeat);
        this.repeat = states[(currentIndex + 1) % states.length];
        
        const repeatBtn = document.getElementById('repeatBtn');
        repeatBtn.setAttribute('data-repeat', this.repeat);
        repeatBtn.classList.toggle('active', this.repeat !== 'none');
    }

    handleTrackEnd() {
        if (this.repeat === 'one') {
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
