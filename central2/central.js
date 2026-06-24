/* =========================
CONFIGURAÇÕES DA TV
========================= */
const SCREEN_TIME = 12000;   // Rotaciona a tela a cada 12 segundos (melhor leitura para TV)
const REFRESH_TIME = 180000; // Recarrega do banco a cada 3 minutos

let screens = [];
let currentScreen = 0;

/* =========================
INITIALIZATION
========================= */
init();

async function init() {
    updateClock();
    setInterval(updateClock, 1000);

    await loadAllDataAndInsights();
    renderCurrentScreen();

    // Loop de transição de tela
    setInterval(nextScreen, SCREEN_TIME);

    // Loop de requisição ao Supabase
    setInterval(async () => {
        await loadAllDataAndInsights();
    }, REFRESH_TIME);
}

function updateClock() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

/* =========================
CORE DATA ENGINE & INSIGHTS
========================= */
async function loadAllDataAndInsights() {
    const { data: players } = await client.from("players").select("*");

    if (!players || players.length === 0) return;

    document.getElementById("lastUpdate").textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});

    // 📊 INSIGHTS GERAIS CALCULADOS NA HORA
    const totalStickersInGame = players.reduce((acc, p) => acc + (p.total_stickers || 0), 0);
    const totalTradesInGame = players.reduce((acc, p) => acc + (p.trade_count || 0), 0);
    const validCompletions = players.filter(p => (p.album_completion || 0) > 0);
    const avgCompletion = validCompletions.length > 0 
        ? (validCompletions.reduce((acc, p) => acc + Number(p.album_completion), 0) / validCompletions.length)
        : 0;

    // DEFINIÇÃO DOS PAINÉIS ROTATIVOS
    screens = [
        {
            type: "insights",
            title: "📊 ESTATÍSTICAS GERAIS DA ARENA",
            cards: [
                { icon: "🎫", val: totalStickersInGame, label: "Figurinhas Coladas" },
                { icon: "🔄", val: totalTradesInGame, label: "Trocas Feitas" },
                { icon: "📈", val: `${avgCompletion.toFixed(1)}%`, label: "Média deÁlbuns Completos" }
            ]
        },
        {
            type: "split",
            title: "🏆 ARTILHARIA GERAL: CAMISA 10",
            metric: "points",
            unit: "pts",
            data: [...players].sort((a, b) => (b.points || 0) - (a.points || 0))
        },
        {
            type: "split",
            title: "⚽ COLECIONADORES: ARTILHEIRO DAS FIGURINHAS",
            metric: "total_stickers",
            unit: "fig.",
            data: [...players].sort((a, b) => (b.total_stickers || 0) - (a.total_stickers || 0))
        },
        {
            type: "split",
            title: "⭐ CAÇADORES DE FIGURINHAS RARAS",
            metric: "shiny_count",
            unit: "⭐ Raras",
            data: [...players].sort((a, b) => (b.shiny_count || 0) - (a.shiny_count || 0))
        },
        {
            type: "split",
            title: "🤝 MERCADO DA BOLA: REI DAS SUBSTITUIÇÕES",
            metric: "trade_count",
            unit: "trocas",
            data: [...players].sort((a, b) => (b.trade_count || 0) - (a.trade_count || 0))
        },
        {
            type: "groups",
            title: "🏫 TAÇA DAS TURMAS (MÉDIA DE ÁLBUM)",
            data: buildGroupRanking(players, "student")
        },
        {
            type: "groups",
            title: "🏢 TAÇA DOS SETORES / FUNCIONÁRIOS",
            data: buildGroupRanking(players, "employee")
        }
    ];
}

/* =========================
BUILDERS DE CLASSIFICAÇÃO COLETIVA
========================= */
function buildGroupRanking(players, filterType) {
    const filtered = players.filter(p => p.type === filterType);
    const groups = {};

    filtered.forEach(p => {
        const area = p.turma_area || (filterType === "student" ? "Sem Turma" : "Sem Setor");
        if (!groups[area]) {
            groups[area] = { name: area, total: 0, count: 0 };
        }
        groups[area].total += Number(p.album_completion || 0);
        groups[area].count++;
    });

    return Object.values(groups)
        .map(g => ({ name: g.name, average: g.total / g.count }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 10); // Top 10 turmas/setores
}

/* =========================
ROTAÇÃO E RENDERIZADOR CONTROLLER
========================= */
function nextScreen() {
    currentScreen = (currentScreen + 1) % screens.length;
    renderCurrentScreen();
}

function renderCurrentScreen() {
    const screen = screens[currentScreen];
    if (!screen) return;

    document.getElementById("sectionTitle").textContent = screen.title;
    const container = document.getElementById("screenContainer");

    if (screen.type === "insights") {
        renderInsightsScreen(container, screen);
    } else if (screen.type === "groups") {
        renderGroupsScreen(container, screen);
    } else {
        renderSplitPlayerScreen(container, screen);
    }
}

/* RENDER 1: ESTATÍSTICAS GERAIS */
function renderInsightsScreen(container, screen) {
    container.innerHTML = `
        <div class="ranking-card">
            <div class="insights-grid">
                ${screen.cards.map(c => `
                    <div class="insight-box">
                        <div class="insight-icon">${c.icon}</div>
                        <div class="insight-val">${c.val}</div>
                        <div class="insight-label">${c.label}</div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

/* RENDER 2: SPLIT PRESTIGE (PÓDIO + TOP 4~10 LADO A LADO) */
function renderSplitPlayerScreen(container, screen) {
    const top3 = screen.data.slice(0, 3);
    const rest = screen.data.slice(3, 10);
    const m = screen.metric;
    const u = screen.unit;

    container.innerHTML = `
        <div class="ranking-card">
            <div class="split-layout">
                
                <div class="podium-side">
                    
                    <div class="podium-column second">
                        <div class="podium-badge">🥈</div>
                        <div class="podium-user-emoji">${top3[1]?.emoji || "👤"}</div>
                        <div class="podium-name">${top3[1]?.name || "Disponível"}</div>
                        <div class="podium-sub">${top3[1]?.turma_area || ""}</div>
                        <div class="podium-score">${top3[1] ? top3[1][m] : 0} <small>${u}</small></div>
                    </div>

                    <div class="podium-column first">
                        <div class="podium-badge">🥇</div>
                        <div class="podium-user-emoji">${top3[0]?.emoji || "👤"}</div>
                        <div class="podium-name">${top3[0]?.name || "Disponível"}</div>
                        <div class="podium-sub">${top3[0]?.turma_area || ""}</div>
                        <div class="podium-score">${top3[0] ? top3[0][m] : 0} <small>${u}</small></div>
                    </div>

                    <div class="podium-column third">
                        <div class="podium-badge">🥉</div>
                        <div class="podium-user-emoji">${top3[2]?.emoji || "👤"}</div>
                        <div class="podium-name">${top3[2]?.name || "Disponível"}</div>
                        <div class="podium-sub">${top3[2]?.turma_area || ""}</div>
                        <div class="podium-score">${top3[2] ? top3[2][m] : 0} <small>${u}</small></div>
                    </div>

                </div>

                <div class="list-side">
                    ${rest.map((p, idx) => `
                        <div class="tv-row">
                            <div class="tv-row-left">
                                <span class="tv-idx">#${idx + 4}</span>
                                <div>
                                    <span class="tv-name">${p.emoji || ""} ${p.name}</span>
                                    <span class="tv-sub"> • ${p.turma_area || "Geral"}</span>
                                </div>
                            </div>
                            <span class="tv-val">${p[m] || 0} ${u}</span>
                        </div>
                    `).join("")}
                </div>

            </div>
        </div>
    `;
}

/* RENDER 3: CLASSIFICAÇÃO DE GRUPOS EM DUAS COLUNAS */
function renderGroupsScreen(container, screen) {
    container.innerHTML = `
        <div class="ranking-card">
            <div class="groups-grid">
                ${screen.data.map((g, idx) => `
                    <div class="group-row top-${idx}">
                        <div class="group-name">#${idx + 1} - ${g.name}</div>
                        <div class="group-val">${g.average.toFixed(1)}%</div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}