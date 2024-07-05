let player;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let progressBar = document.getElementById('progress');
let currentTimeDisplay = document.getElementById('current-time');
let durationDisplay = document.getElementById('duration');

function onYouTubeIframeAPIReady() {
    player = new YT.Player('music-player', {
        height: '315',
        width: '100%',
        videoId: 'ckUV8X6MkaI',
        playerVars: {
            'listType': 'playlist',
            'list': 'PLX_YaKXOr1s6u6O3srDxVJn720Zi2RRC5',
            'autoplay': 0,
            'controls': 0,
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    document.getElementById('play-pause').addEventListener('click', function() {
        if (isPlaying) {
            player.pauseVideo();
            this.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            player.playVideo();
            this.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    });

    document.getElementById('prev').addEventListener('click', function() {
        player.previousVideo();
    });

    document.getElementById('next').addEventListener('click', function() {
        player.nextVideo();
    });

    document.getElementById('repeat-shuffle').addEventListener('click', function() {
        if (isRepeat) {
            isRepeat = false;
            isShuffle = true;
            player.setShuffle(true);
            this.innerHTML = '<i class="fas fa-random"></i>';
        } else if (isShuffle) {
            isShuffle = false;
            this.innerHTML = '<i class="fas fa-redo"></i>';
        } else {
            isRepeat = true;
            player.setLoop(true);
            this.innerHTML = '<i class="fas fa-redo"></i>';
        }
    });

    document.getElementById('theme-toggle').addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        this.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    document.getElementById('playlist-toggle').addEventListener('click', function() {
        document.getElementById('playlist-overlay').style.display = 'flex';
        loadPlaylist();
    });

    document.getElementById('close-playlist').addEventListener('click', function() {
        document.getElementById('playlist-overlay').style.display = 'none';
    });

    // Update progress bar and time
    setInterval(() => {
        if (player && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            if (duration > 0) {
                progressBar.value = (currentTime / duration) * 100;
                currentTimeDisplay.textContent = formatTime(currentTime);
                durationDisplay.textContent = formatTime(duration);
            }
        }
    }, 1000);

    progressBar.addEventListener('input', function() {
        const duration = player.getDuration();
        player.seekTo((progressBar.value / 100) * duration, true);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        document.getElementById('theme-toggle').textContent = savedTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }

    updateTitleAndArtist();
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        document.getElementById('play-pause').innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    }
    updateTitleAndArtist();
}

function updateTitleAndArtist() {
    const videoData = player.getVideoData();
    document.getElementById('title').textContent = videoData.title;
    document.getElementById('artist').textContent = videoData.author;
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function initializeEqualizer() {
    // Equalizer implementation
    let context = new (window.AudioContext || window.webkitAudioContext)();
    let analyser = context.createAnalyser();
    analyser.fftSize = 256;

    let source = context.createMediaElementSource(player.getIframe());
    source.connect(analyser);
    analyser.connect(context.destination);

    let bufferLength = analyser.frequencyBinCount;
    let dataArray = new Uint8Array(bufferLength);

    let equalizer = document.getElementById('equalizer');
    let canvas = document.createElement('canvas');
    canvas.width = equalizer.clientWidth;
    canvas.height = equalizer.clientHeight;
    equalizer.appendChild(canvas);
    let canvasContext = canvas.getContext('2d');

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasContext.fillStyle = '#f0f0f0';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);

        let barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];

            canvasContext.fillStyle = '#007bff';
            canvasContext.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth + 1;
        }
    }

    draw();
}

function loadPlaylist() {
    const playlist = player.getPlaylist();
    const playlistContainer = document.getElementById('playlist-items');
    playlistContainer.innerHTML = '';

    playlist.forEach((videoId, index) => {
        player.cuePlaylist({listType: 'playlist', list: 'PLX_YaKXOr1s6u6O3srDxVJn720Zi2RRC5'});
        const listItem = document.createElement('li');
        listItem.textContent = `Video ${index + 1}`;
        listItem.addEventListener('click', () => {
            player.playVideoAt(index);
            document.getElementById('playlist-overlay').style.display = 'none';
        });
        playlistContainer.appendChild(listItem);
    });
}
