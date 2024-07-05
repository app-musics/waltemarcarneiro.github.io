// script.js

let player;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '100%',
        videoId: 'ckUV8X6MkaI',
        playerVars: {
            'listType': 'playlist',
            'list': 'PLX_YaKXOr1s6u6O3srDxVJn720Zi2RRC5'
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    document.getElementById('play-pause').addEventListener('click', togglePlayPause);
    document.getElementById('next').addEventListener('click', () => player.nextVideo());
    document.getElementById('prev').addEventListener('click', () => player.previousVideo());
    document.getElementById('repeat-shuffle').addEventListener('click', toggleRepeatShuffle);
    document.getElementById('playlist-toggle').addEventListener('click', togglePlaylist);
    document.getElementById('close-playlist').addEventListener('click', closePlaylist);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    updateTitleAndArtist();
    updatePlaylist();
    setInterval(updateProgressBar, 1000);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.querySelector('#play-pause ion-icon').setAttribute('name', 'pause-outline');
    } else {
        isPlaying = false;
        document.querySelector('#play-pause ion-icon').setAttribute('name', 'play-outline');
    }
    updateTitleAndArtist();
}

function togglePlayPause() {
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function toggleRepeatShuffle() {
    if (!isShuffle && !isRepeat) {
        isShuffle = true;
        player.setShuffle(true);
        document.querySelector('#repeat-shuffle ion-icon').setAttribute('name', 'shuffle-outline');
    } else if (isShuffle) {
        isShuffle = false;
        isRepeat = true;
        player.setLoop(true);
        document.querySelector('#repeat-shuffle ion-icon').setAttribute('name', 'repeat-outline');
    } else {
        isRepeat = false;
        player.setShuffle(false);
        player.setLoop(false);
        document.querySelector('#repeat-shuffle ion-icon').setAttribute('name', 'shuffle-outline');
    }
}

function togglePlaylist() {
    document.getElementById('playlist-overlay').style.display = 'flex';
    updatePlaylist();
}

function closePlaylist() {
    document.getElementById('playlist-overlay').style.display = 'none';
}

function updateTitleAndArtist() {
    const videoData = player.getVideoData();
    document.getElementById('title').innerText = videoData.title;
    document.getElementById('artist').innerText = videoData.author;
}

function updatePlaylist() {
    const playlist = player.getPlaylist();
    const playlistContainer = document.getElementById('playlist-items');
    playlistContainer.innerHTML = '';

    playlist.forEach((videoId, index) => {
        player.getVideoData(videoId, (data) => {
            const listItem = document.createElement('li');
            listItem.innerText = data.title;
            listItem.addEventListener('click', () => player.playVideoAt(index));
            playlistContainer.appendChild(listItem);
        });
    });
}

function updateProgressBar() {
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    const progress = (currentTime / duration) * 100;

    document.getElementById('progress-bar').value = progress;
    document.getElementById('current-time').innerText = formatTime(currentTime);
    document.getElementById('total-time').innerText = formatTime(duration);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateIconColors();
}

function updateIconColors() {
    const icons = document.querySelectorAll('ion-icon');
    icons.forEach(icon => {
        icon.style.color = document.body.classList.contains('dark-mode') ? '#fff' : '#f76700';
    });
    document.querySelector('.player-header h1').style.color = document.body.classList.contains('dark-mode') ? '#fff' : '#222';
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateIconColors();
});
