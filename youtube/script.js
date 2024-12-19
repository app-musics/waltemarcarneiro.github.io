// Chave da API do YouTube (você precisará criar uma no Google Cloud Console)
const API_KEY = 'AIzaSyDSD1qRSM61xXXDk6CBHfbhnLfoXbQPsYY';

let currentPlaylist = [];
let currentSongIndex = -1;
let isPlaying = false;

// Função para adicionar uma nova playlist
async function addPlaylist() {
    const playlistUrlInput = document.getElementById('playlist-url');
    const url = playlistUrlInput.value.trim();
    
    if (!url) {
        alert('Por favor, insira uma URL válida');
        return;
    }

    const playlistId = extractPlaylistId(url);
    
    if (!playlistId) {
        alert('URL da playlist inválida. Certifique-se de que é uma URL válida do YouTube');
        return;
    }

    try {
        // Aqui você precisará implementar a lógica para buscar os dados da playlist
        // Por enquanto, vamos apenas adicionar a playlist à lista
        const playlistList = document.getElementById('playlist-list');
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-item';
        playlistElement.innerHTML = `
            <i class="fas fa-music"></i>
            <span>Playlist ${playlistList.children.length + 1}</span>
        `;
        
        playlistList.appendChild(playlistElement);
        
        // Limpar o campo de input
        playlistUrlInput.value = '';
        
        // Feedback visual para o usuário
        alert('Playlist adicionada com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar playlist:', error);
        alert('Ocorreu um erro ao adicionar a playlist');
    }
}

// Função para extrair o ID da playlist de uma URL do YouTube
function extractPlaylistId(url) {
    const regex = /[&?]list=([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Função para exibir as músicas
function displaySongs() {
    const container = document.getElementById('songs-container');
    container.innerHTML = '';

    currentPlaylist.forEach((song, index) => {
        const songCard = document.createElement('div');
        songCard.className = 'song-card';
        songCard.innerHTML = `
            <img src="${song.thumbnail}" alt="${song.title}">
            <h3>${song.title}</h3>
            <p>${song.artist}</p>
        `;
        songCard.onclick = () => playSong(index);
        container.appendChild(songCard);
    });
}

// Função para tocar uma música
function playSong(index) {
    currentSongIndex = index;
    const song = currentPlaylist[index];
    
    document.getElementById('current-thumbnail').src = song.thumbnail;
    document.getElementById('current-song').textContent = song.title;
    document.getElementById('current-artist').textContent = song.artist;
    
    // Aqui você pode implementar a integração com o YouTube Embedded Player
    // ou usar a API do YouTube para tocar o vídeo
    
    isPlaying = true;
    updatePlayButton();
}

// Funções de controle do player
function togglePlay() {
    if (currentSongIndex === -1) return;
    
    isPlaying = !isPlaying;
    updatePlayButton();
}

function playNext() {
    if (currentSongIndex < currentPlaylist.length - 1) {
        playSong(currentSongIndex + 1);
    }
}

function playPrevious() {
    if (currentSongIndex > 0) {
        playSong(currentSongIndex - 1);
    }
}

function updatePlayButton() {
    const playBtn = document.getElementById('play-btn');
    playBtn.innerHTML = isPlaying ? 
        '<i class="fas fa-pause"></i>' : 
        '<i class="fas fa-play"></i>';
}

// Event Listeners
document.getElementById('play-btn').onclick = togglePlay;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrevious;

// Função para salvar playlist no localStorage
function savePlaylist(playlistId) {
    const savedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
    if (!savedPlaylists.includes(playlistId)) {
        savedPlaylists.push(playlistId);
        localStorage.setItem('playlists', JSON.stringify(savedPlaylists));
        updatePlaylistList();
    }
}

// Função para atualizar a lista de playlists
function updatePlaylistList() {
    const playlistList = document.getElementById('playlist-list');
    const savedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
    
    playlistList.innerHTML = savedPlaylists.map(id => 
        `<div class="playlist-item" onclick="loadPlaylist('${id}')">${id}</div>`
    ).join('');
}

// Carregar playlists salvas ao iniciar
updatePlaylistList(); 