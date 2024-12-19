// Variáveis globais
let playlists = [];
let currentPlaylist = null;
let currentSongIndex = 0;
let isPlaying = false;
let player = null;

// Elementos do DOM
const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenu = document.getElementById('close-menu');
const searchBtn = document.getElementById('search-btn');
const searchOverlay = document.getElementById('search-overlay');
const closeSearch = document.getElementById('close-search');
const searchInput = document.getElementById('search-input');
const suggestedPlaylists = document.getElementById('suggested-playlists');

// Controle do menu
menuBtn.addEventListener('click', () => {
    sideMenu.classList.add('active');
});

closeMenu.addEventListener('click', () => {
    sideMenu.classList.remove('active');
});

// Controle da busca
searchBtn.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    searchInput.focus();
});

closeSearch.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
});

// Função de busca
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const songs = document.querySelectorAll('.song-item');
    
    songs.forEach(song => {
        const title = song.querySelector('.song-title').textContent.toLowerCase();
        const artist = song.querySelector('.song-artist').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || artist.includes(searchTerm)) {
            song.style.display = 'flex';
        } else {
            song.style.display = 'none';
        }
    });
});

// Manipulação das playlists sugeridas
suggestedPlaylists.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
        const playlistId = e.target.dataset.playlistId;
        // Aqui você pode usar a mesma lógica que usa para carregar playlists
        // do input de URL, mas usando o playlistId diretamente
        loadPlaylist(playlistId);
        sideMenu.classList.remove('active');
    }
});

// Adicione esta função que será chamada automaticamente quando a API do YouTube carregar
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        playerVars: {
            'playsinline': 1,
            'controls': 0
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// Adicione esta função para lidar com mudanças de estado do player
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNext();
    }
}

// Função para adicionar playlist
function addPlaylist() {
    const playlistUrl = document.getElementById('playlist-url').value;
    if (!playlistUrl) return;

    // Extrair o ID da playlist do URL do YouTube
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
        alert('URL da playlist inválida');
        return;
    }

    // Fazer requisição para a API do YouTube (você precisará de uma chave de API)
    fetchPlaylistData(playlistId);
}

// Função para extrair ID da playlist
function extractPlaylistId(url) {
    const regex = /[?&]list=([^#\&\?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Função para buscar dados da playlist
async function fetchPlaylistData(playlistId) {
    const API_KEY = 'AIzaSyDSD1qRSM61xXXDk6CBHfbhnLfoXbQPsYY'; // Você precisa substituir por uma chave API válida
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Erro na resposta da API');
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('Playlist vazia ou não encontrada');
        }

        // Buscar informações adicionais da playlist
        const playlistInfoUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`;
        const playlistResponse = await fetch(playlistInfoUrl);
        const playlistData = await playlistResponse.json();
        
        const playlistTitle = playlistData.items?.[0]?.snippet?.title || 'Nova Playlist';

        const playlist = {
            id: playlistId,
            name: playlistTitle,
            songs: data.items.map(item => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.default.url,
                artist: item.snippet.videoOwnerChannelTitle || 'Artista Desconhecido'
            }))
        };

        playlists.push(playlist);
        updatePlaylistDisplay();
        loadPlaylist(playlist);
        
        // Feedback visual para o usuário
        document.getElementById('playlist-url').value = '';
        alert('Playlist carregada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao carregar playlist:', error);
        alert('Erro ao carregar playlist: ' + error.message);
    }
}

// Função para atualizar display das playlists
function updatePlaylistDisplay() {
    const playlistList = document.getElementById('playlist-list');
    playlistList.innerHTML = playlists.map(playlist => `
        <div class="playlist-item" onclick="loadPlaylist('${playlist.id}')">
            <i class="fas fa-music"></i> ${playlist.name}
        </div>
    `).join('');
}

// Função para carregar playlist
function loadPlaylist(playlist) {
    currentPlaylist = playlist;
    currentSongIndex = 0;
    displaySongs();
    loadSong(currentSongIndex);
}

// Função para exibir músicas
function displaySongs() {
    if (!currentPlaylist) return;

    const songsContainer = document.getElementById('songs-container');
    songsContainer.innerHTML = currentPlaylist.songs.map((song, index) => `
        <div class="song-item ${currentSongIndex === index ? 'active' : ''}" onclick="loadSong(${index})">
            <img src="${song.thumbnail}" alt="${song.title}">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
        </div>
    `).join('');
}

// Função para carregar música
function loadSong(index) {
    if (!currentPlaylist || !currentPlaylist.songs[index]) return;

    currentSongIndex = index;
    const song = currentPlaylist.songs[index];
    
    document.getElementById('current-thumbnail').src = song.thumbnail;
    document.getElementById('current-song').textContent = song.title;
    document.getElementById('current-artist').textContent = song.artist;

    // Carrega e reproduz o vídeo usando o player do YouTube
    if (player && player.loadVideoById) {
        player.loadVideoById(song.id);
        isPlaying = true;
        updatePlayButton();
    }
}

// Controles do player
document.getElementById('play-btn').addEventListener('click', togglePlay);
document.getElementById('prev-btn').addEventListener('click', playPrevious);
document.getElementById('next-btn').addEventListener('click', playNext);

function togglePlay() {
    if (!player) return;

    isPlaying = !isPlaying;
    if (isPlaying) {
        player.playVideo();
    } else {
        player.pauseVideo();
    }
    updatePlayButton();
}

function playPrevious() {
    if (currentSongIndex > 0) {
        loadSong(currentSongIndex - 1);
    }
}

function playNext() {
    if (currentPlaylist && currentSongIndex < currentPlaylist.songs.length - 1) {
        loadSong(currentSongIndex + 1);
    }
}

// Adicione esta função auxiliar
function updatePlayButton() {
    const playBtn = document.getElementById('play-btn');
    playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}
  