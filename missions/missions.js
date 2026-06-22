const player =
    JSON.parse(localStorage.getItem("player"));

if (!player) {
    window.location.href = "../index.html";
}
if (!player) {
    window.location.href = "../index.html";
}

const daysOrder = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday"
];

const dayLabel = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira"
};

init();

async function init() {
    await loadMissions();

    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";
}
function getGameDayStart() {
    const now = new Date();
    const today7 = new Date();
    today7.setHours(7, 0, 0, 0);

    if (now < today7) {
        today7.setDate(today7.getDate() - 1);
    }

    return today7;
}

function getCurrentWeekDay() {
    const day = new Date().getDay();

    return [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
    ][day];
}
async function loadMissions() {

    const container = document.getElementById("missionsContainer");
    container.innerHTML = "";

    const now = new Date();
    const currentDay = getCurrentWeekDay();
    const isAfter7 = now.getHours() >= 7;

    const { data: missions } = await client
        .from("missions")
        .select("*");

    if (!missions) return;

    daysOrder.forEach(day => {

        const dayMissions = missions.filter(m => m.day === day);

        const isToday = day === currentDay;
        const isLocked = !(isToday && isAfter7);

        dayMissions.forEach(mission => {

            const card = document.createElement("div");
            card.className = "mission-card";

            if (!isToday) card.classList.add("old");
            if (isToday) card.classList.add("today");
            if (isLocked) card.classList.add("locked");

            card.innerHTML = `
                <h3>${mission.title}</h3>

                <p>🎁 Jogar missão para desbloquear recompensa</p>

                <button ${isLocked ? "disabled" : ""}>
                    ${isLocked ? "Bloqueado 🔒" : "Jogar missão"}
                </button>
            `;

            if (!isLocked) {
                card.querySelector("button").onclick = () => {
                    window.location.href =
                        "../minigame/minigame.html?mission=" + mission.id;
                };
            }

            container.appendChild(card);
        });
    });
}