document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('playlistModal');
    const addPlaylistBtn = document.getElementById('addPlaylistBtn');
    const closeModal = document.getElementById('closeModal');
    const savePlaylist = document.getElementById('savePlaylist');
    const playlistInput = document.getElementById('playlistId');
    const youtubeIframe = document.getElementById('youtube-iframe');

    // Abrir modal
    addPlaylistBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // Fechar modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Salvar nova playlist
    savePlaylist.addEventListener('click', () => {
        const playlistId = playlistInput.value.trim();
        if (playlistId) {
            youtubeIframe.src = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
            modal.style.display = 'none';
            playlistInput.value = '';
        }
    });
}); 