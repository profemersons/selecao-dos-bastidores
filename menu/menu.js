/* =========================
MENU GLOBAL COPA
========================= */

function goAlbum() {
    window.location.href = "../album/album.html";
}

function goPacks() {
    window.location.href = "../pacotes/pacotes.html";
}

function goMissions() {
    window.location.href = "../missions/missions.html";
}

function goTrades() {
    window.location.href = "../trocas/trades.html";
}

function goProfile() {
    window.location.href = "../perfil/perfil.html";
}

function logout() {
    localStorage.removeItem("player");
    window.location.href = "../index.html";
}