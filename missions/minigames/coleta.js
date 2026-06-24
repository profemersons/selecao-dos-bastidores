const MIN_SCORE = 120;

const player = JSON.parse(localStorage.getItem("player"));

if (!player) {
    window.location.href = "../index.html";
}

const urlParams = new URLSearchParams(window.location.search);
const missionId = parseInt(urlParams.get("mission") || "1");

// =====================
// STATE
// =====================
let score = 0;
let currentRound = 0;
let gameActive = false;

// =====================
// ELEMENTOS
// =====================
const scoreTxt = document.getElementById("score-txt");
const roundTxt = document.getElementById("round-txt");
const modalStart = document.getElementById("modal-start");
const modalEnd = document.getElementById("modal-end");
const rewardArea = document.getElementById("reward-area");
const endTitle = document.getElementById("end-title");
const endMessage = document.getElementById("end-message");

// =====================
// INIT
// =====================
init();

function init() {
    modalStart.classList.remove("hidden");
}

// =====================
// GAME END
// =====================
async function finishGame() {

    modalEnd.classList.remove("hidden");

    // salva ranking (arquivo separado)
    await saveBestScore(player.id, missionId, score);

    if (score >= MIN_SCORE) {

        endTitle.innerText = "🎉 Missão concluída!";
        endMessage.innerText = "Digite seu código para liberar o pacote extra:";
        rewardArea.classList.remove("hidden");

    } else {

        endTitle.innerText = "Fim da missão";
        endMessage.innerText = `Você fez ${score} pontos. Precisa de ${MIN_SCORE}.`;
        rewardArea.classList.add("hidden");
    }
}

// =====================
// RESTART
// =====================
function restartGame() {
    location.reload();
}

// =====================
// UNLOCK REWARD
// =====================
async function unlockReward() {

    const code = document.getElementById("playerCode").value.trim();

    try {
        await unlockMissionReward(code, missionId);
        alert("🎁 Pacote liberado!");
        rewardArea.classList.add("hidden");
    } catch (err) {
        alert(err.message);
    }
}

// =====================
// EXPORT GLOBALS
// =====================
window.finishGame = finishGame;
window.restartGame = restartGame;
window.unlockReward = unlockReward;