//function showBanner() {
//document.getElementById('banner').classList.add('show');
//}
//function closeBanner() {
//document.getElementById('banner').classList.remove('show');
//}
//setTimeout(showBanner, 20000);


    function showBanner() {
        const banner = document.getElementById('banner');
        banner.classList.add('show');
        setTimeout(hideBanner, 20000); // Esconde o banner após 15 segundos
    }

    function hideBanner() {
        document.getElementById('banner').classList.remove('show');
    }

    function closeBanner() {
        hideBanner();
    }

    setTimeout(showBanner, 60000); // Exibe o banner após 40 segundos
