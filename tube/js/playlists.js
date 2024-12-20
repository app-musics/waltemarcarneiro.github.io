let playlists = [
    {
        id: 'PLX_YaKXOr1s6u6O3srDxVJn720Zi2RRC5',
        name: 'Playlist Padrão'
    }
];

// Carregar playlists do localStorage
function loadPlaylists() {
    const savedPlaylists = localStorage.getItem('playlists');
    if (savedPlaylists) {
        playlists = JSON.parse(savedPlaylists);
    }
    displayPlaylists();
}

// Salvar playlists no localStorage
function savePlaylists() {
    localStorage.setItem('playlists', JSON.stringify(playlists));
}

// Exibir playlists na interface
function displayPlaylists() {
    const playlistsGrid = document.getElementById('playlistsGrid');
    playlistsGrid.innerHTML = '';

    playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-item';
        playlistElement.innerHTML = `
            <h3>${playlist.name}</h3>
            <button onclick="loadYouTubePlaylist('${playlist.id}')">Reproduzir</button>
        `;
        playlistsGrid.appendChild(playlistElement);
    });
}

// Adicionar nova playlist
function addPlaylist(id, name) {
    playlists.push({ id, name });
    savePlaylists();
    displayPlaylists();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadPlaylists();

    const addPlaylistBtn = document.getElementById('addPlaylistBtn');
    const playlistModal = document.getElementById('playlistModal');
    const savePlaylistBtn = document.getElementById('savePlaylist');
    const closeModalBtn = document.getElementById('closeModal');
    const playlistsLink = document.querySelector('a[href="#playlists"]');

    addPlaylistBtn.addEventListener('click', () => {
        playlistModal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        playlistModal.style.display = 'none';
    });

    savePlaylistBtn.addEventListener('click', () => {
        const id = document.getElementById('playlistId').value;
        const name = document.getElementById('playlistName').value;
        
        if (id && name) {
            addPlaylist(id, name);
            playlistModal.style.display = 'none';
            document.getElementById('playlistId').value = '';
            document.getElementById('playlistName').value = '';
        }
    });

    playlistsLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('youtube-container').style.display = 'none';
        document.getElementById('playlists-container').style.display = 'block';
    });
}); 