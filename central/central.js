/* =========================
CONFIG
========================= */

const SCREEN_TIME = 10000; // 10s
const REFRESH_TIME = 300000; // 5 min

let screens = [];
let currentScreen = 0;

/* =========================
INIT
========================= */

init();

async function init() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

    await loadAllRankings();

    renderCurrentScreen();

    setInterval(
        nextScreen,
        SCREEN_TIME
    );

    setInterval(
        async () => {

            await loadAllRankings();

        },
        REFRESH_TIME
    );
}

/* =========================
CLOCK
========================= */

function updateClock() {

    const now = new Date();

    document.getElementById(
        "clock"
    ).textContent =
        now.toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}

/* =========================
LOAD DATA
========================= */

async function loadAllRankings() {

    const { data: players } =
        await client
            .from("players")
            .select("*");

    if (!players) return;

    document.getElementById(
        "lastUpdate"
    ).textContent =
        "Atualizado às " +
        new Date().toLocaleTimeString(
            "pt-BR"
        );

    screens = [

        {
            title: "🏆 CAMISA 10",
            metric: "points",
            unit: "pts",
            data: [...players]
                .sort(
                    (a, b) =>
                        b.points -
                        a.points
                )
        },

        {
            title: "⚽ ARTILHEIRO DAS FIGURINHAS",
            metric: "total_stickers",
            unit: "fig.",
            data: [...players]
                .sort(
                    (a, b) =>
                        b.total_stickers -
                        a.total_stickers
                )
        },

        {
            title: "⭐ CAÇADOR DE ESTRELAS",
            metric: "shiny_count",
            unit: "⭐",
            data: [...players]
                .sort(
                    (a, b) =>
                        b.shiny_count -
                        a.shiny_count
                )
        },

        {
            title: "🔄 REI DAS SUBSTITUIÇÕES",
            metric: "trade_count",
            unit: "trocas",
            data: [...players]
                .sort(
                    (a, b) =>
                        b.trade_count -
                        a.trade_count
                )
        },

        {
            title: "🤝 AMIGO DA TORCIDA",
            metric: "friend_count",
            unit: "amigos",
            data: [...players]
                .sort(
                    (a, b) =>
                        b.friend_count -
                        a.friend_count
                )
        },

        {
            title: "🏫 TAÇA DAS TURMAS",
            custom: buildStudentRanking(
                players
            )
        },

        {
            title: "🏢 TAÇA DOS FUNCIONÁRIOS",
            custom: buildEmployeeRanking(
                players
            )
        }

    ];

}

/* =========================
TURMAS
========================= */

function buildStudentRanking(players) {

    const students =
        players.filter(
            p =>
                p.type === "student"
        );

    const groups = {};

    students.forEach(player => {

        const area =
            player.turma_area ||
            "Sem turma";

        if (!groups[area]) {

            groups[area] = {
                name: area,
                total: 0,
                count: 0
            };

        }

        groups[area].total +=
            Number(
                player.album_completion || 0
            );

        groups[area].count++;

    });

    return Object.values(groups)
        .map(item => ({

            name: item.name,

            average:
                item.total /
                item.count

        }))
        .sort(
            (a, b) =>
                b.average -
                a.average
        );

}

/* =========================
FUNCIONÁRIOS
========================= */

function buildEmployeeRanking(players) {

    const employees =
        players.filter(
            p =>
                p.type === "employee"
        );

    const groups = {};

    employees.forEach(player => {

        const area =
            player.turma_area ||
            "Sem setor";

        if (!groups[area]) {

            groups[area] = {
                name: area,
                total: 0,
                count: 0
            };

        }

        groups[area].total +=
            Number(
                player.album_completion || 0
            );

        groups[area].count++;

    });

    return Object.values(groups)
        .map(item => ({

            name: item.name,

            average:
                item.total /
                item.count

        }))
        .sort(
            (a, b) =>
                b.average -
                a.average
        );

}

/* =========================
ROTACIONAR
========================= */

function nextScreen() {

    currentScreen++;

    if (
        currentScreen >=
        screens.length
    ) {
        currentScreen = 0;
    }

    renderCurrentScreen();
}

/* =========================
RENDER
========================= */

function renderCurrentScreen() {

    const screen =
        screens[currentScreen];

    document.getElementById(
        "sectionTitle"
    ).textContent =
        screen.title;

    const container =
        document.getElementById(
            "screenContainer"
        );

    if (screen.custom) {

        renderGroupRanking(
            container,
            screen
        );

        return;
    }

    renderPlayerRanking(
        container,
        screen
    );

}

/* =========================
RANKING PLAYER
========================= */

function renderPlayerRanking(
    container,
    screen
) {

    const metric =
        screen.metric;

    const unit =
        screen.unit;

    const top3 =
        screen.data.slice(0, 3);

    const rest =
        screen.data.slice(3, 10);

    container.innerHTML = `

<div class="ranking-card">

    <div class="ranking-layout">

        <div class="podium">

            ${buildPodiumCard(
        top3[1],
        "🥈",
        "second",
        metric,
        unit
    )}

            ${buildPodiumCard(
        top3[0],
        "🥇",
        "first",
        metric,
        unit
    )}

            ${buildPodiumCard(
        top3[2],
        "🥉",
        "third",
        metric,
        unit
    )}

        </div>

        <div class="top10-container">

            <div class="top10-list">

                ${rest.map(
        (player, index) => `
                    <div class="top10-item">

                        <div class="top10-left">

                            <div class="top10-name">
                                ${index + 4}. ${player.emoji || ""} ${player.name}
                            </div>

                            <div class="top10-area">
                                ${player.turma_area || ""}
                            </div>

                        </div>

                        <div class="top10-value">
                            ${player[metric] || 0} ${unit}
                        </div>

                    </div>
                `
    ).join("")}

            </div>

        </div>

    </div>

</div>
`;
}

/* =========================
RANKING GRUPOS
========================= */

function renderGroupRanking(
    container,
    screen
) {

    const data =
        screen.custom;

    container.innerHTML = `

<div class="ranking-card">

    <div class="ranking-list">

        ${data.map(
        (item, index) => `

            <div class="ranking-item">

                <div class="rank-position">
                    ${index + 1}
                </div>

                <div class="rank-info">

                    <div class="rank-name">
                        ${item.name}
                    </div>

                </div>

                <div class="rank-value">
                    ${item.average.toFixed(1)}%
                </div>

            </div>

        `
    ).join("")}

    </div>

</div>

`;

}

/* =========================
PODIUM
========================= */

function buildPodiumCard(
    player,
    medal,
    cssClass,
    metric,
    unit
) {

    if (!player) return "";

    return `
        <div class="podium-card ${cssClass}">

            <div class="podium-medal">
                ${medal}
            </div>

            <div class="podium-name">
                ${player.emoji || ""}
                ${player.name}
            </div>

            <div class="podium-area">
                ${player.turma_area || ""}
            </div>

            <div class="podium-value">
                ${player[metric] || 0}
                ${unit}
            </div>

        </div>
    `;
}