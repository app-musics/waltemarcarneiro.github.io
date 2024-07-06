<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Player de Música Avançado</title>
    <meta name="theme-color" content="#ffffff">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="player-container">
        <div class="player">
            <div class="player-header">
                <h1>Player de Música</h1>
                <button id="theme-toggle">Modo Escuro</button>
            </div>
            <div class="player-controls">

                <div id="music-player"></div>
                <div class="info">
                    <p id="title" class="title">Título</p>
                    <p id="artist" class="artist">Artista</p>
                </div>
                <div class="progress-container">
                    <span id="current-time">0:00</span>
                    <input type="range" id="progress" value="0">
                    <span id="duration">0:00</span>
                </div>
                <div class="controls">
                    <button id="repeat-shuffle"><i class="fas fa-redo"></i></button>
                    <button id="prev"><i class="fas fa-backward"></i></button>
                    <button id="play-pause"><i class="fas fa-play"></i></button>
                    <button id="next"><i class="fas fa-forward"></i></button>
                    <button id="playlist-toggle"><i class="fas fa-list"></i></button>
                </div>
                
            </div>
        </div>
    </div>
    <div id="playlist-overlay">
        <div id="playlist">
            <h2>Playlist</h2>
            <ul id="playlist-items"></ul>
            <button id="close-playlist">Fechar</button>
        </div>
    </div>


<script>
    const rangeInput = document.querySelector('input[type="range"]');

    rangeInput.addEventListener('input', function() {
        this.style.setProperty('--slider-value', ${this.value}%);
    });

    // Inicialize o valor da variável
    rangeInput.style.setProperty('--slider-value', ${rangeInput.value}%);
</script>

    
    <script src="https://kit.fontawesome.com/a7bac8094a.js" crossorigin="anonymous"></script>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script src="script.js"></script>
</body>
</html>
