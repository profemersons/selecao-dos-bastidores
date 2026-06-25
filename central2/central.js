/* =========================
CONFIGURAÇÕES DA TV
========================= */
const SCREEN_TIME = 12000;   // 12 segundos por tela
const REFRESH_TIME = 180000; // Sincroniza com banco a cada 3 min

let screens = [];
let currentScreen = 0;

init();

async function init() {
    updateClock();
    setInterval(updateClock, 1000);
    await loadAllDataAndInsights();
    renderCurrentScreen();
    setInterval(nextScreen, SCREEN_TIME);
    setInterval(async () => { await loadAllDataAndInsights(); }, REFRESH_TIME);
}

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById("clock");
    if (clockEl) clockEl.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* Tradutor de Missões (Slugs -> Nomes Oficiais) */
function getMissionDetails(slug) {
    switch (slug) {
        case "embaixadinhas": return { name: "Missão Embaixadinha", emoji: "⚽" };
        case "coleta": return { name: "Missão de Coleta", emoji: "♻️" };
        case "conexao": return { name: "Missão Instrumentos de Trabalho", emoji: "🔧" };
        case "memoria": return { name: "Missão Sincronia", emoji: "🧠" };
        case "amigos1": return { name: "Missão Rede de Amigos", emoji: "🤝" };
        case "lanche-estadio": return { name: "Missão Lanchonete do Estádio", emoji: "🍔" };
        case "bancada": return { name: "Missão Bancada Organizada", emoji: "👨‍🏭" };
        case "corrida-estagiario": return { name: "Missão Corrida do Estagiário", emoji: "🏃‍♀️" };
        case "cade-profissional": return { name: "Onde está o Craque?", emoji: "🔍" };
        case "qrcode1": return { name: "Missão Brasil Campeão", emoji: "🔰" };
        default: return { name: slug.toUpperCase(), emoji: "🎯" };
    }
}

async function loadAllDataAndInsights() {
    try {
        // Buscas em paralelo. Trazemos apenas as colunas estritamente necessárias do inventário com o filtro de is_shiny igual a false
        const [playersRes, inventoryCountRes, missionsRes, inventoryDataRes] = await Promise.all([
            client.from("players").select("name, emoji, turma_area, type, points, total_stickers, friend_count, album_completion").limit(5000),
            client.from("inventory").select("*", { count: 'exact', head: true }),
            client.from("mission_rewards").select("mission_slug").limit(5000),
            client.from("inventory").select("sticker_id, quantity").eq("is_shiny", false).limit(5000)
        ]);

        const players = playersRes.data || [];
        const totalFigDistribuida = inventoryCountRes.count || 0;
        const missions = missionsRes.data || [];
        const inventoryItems = inventoryDataRes.data || [];

        // 🧠 CÁLCULO DAS RARIDADES EM MEMÓRIA (Rápido e sem travar o banco)
        let figComum = "---";
        let figRara = "---";

        if (inventoryItems.length > 0) {
            const stickerTotals = {};
            
            // Agrupa e soma as quantidades de cada figurinha na memória da TV
            inventoryItems.forEach(item => {
                const id = item.sticker_id;
                const qty = parseInt(item.quantity, 10) || 0;
                stickerTotals[id] = (stickerTotals[id] || 0) + qty;
            });

            // Transforma em array para ordenar e descobrir a real mais comum e mais rara
            const sortedStickers = Object.entries(stickerTotals).map(([id, total]) => ({
                id,
                total
            }));

            if (sortedStickers.length > 0) {
                // Ordena do maior total para o menor
                sortedStickers.sort((a, b) => b.total - a.total);
                
                const maisComum = sortedStickers[0];
                const maisRara = sortedStickers[sortedStickers.length - 1];

                figComum = `Nº ${maisComum.id} (${maisComum.total} un.)`;
                figRara = `Nº ${maisRara.id} (${maisRara.total} un.)`;
            }
        }

        if (players.length === 0) return;

        // Cálculos Básicos
        const totalJogadores = players.length;

        // Ranking de Missões com nomes padronizados
        const missionMap = {};
        missions.forEach(m => {
            if (m.mission_slug) {
                missionMap[m.mission_slug] = (missionMap[m.mission_slug] || 0) + 1;
            }
        });
        const missionRanking = Object.entries(missionMap).map(([slug, count]) => {
            const details = getMissionDetails(slug);
            return { name: details.name, emoji: details.emoji, total: count };
        }).sort((a, b) => b.total - a.total);

        // Definição das Telas
        screens = [
            {
                type: "insights",
                title: "📊 ARENA EM NÚMEROS",
                cards: [
                    { icon: "👥", val: totalJogadores, label: "Jogadores Inscritos" },
                    { icon: "🎫", val: totalFigDistribuida, label: "Figurinhas Distribuídas" },
                    { icon: "🃏", val: figComum, label: "Figurinha Regular Mais Comum" },
                    { icon: "👑", val: figRara, label: "Figurinha Regular Mais Rara" }
                ]
            },
            {
                type: "promo",
                title: "🎁 RECOMPENSA DA RODADA",
                msg: "Ontem o Brasil ganhou o jogo e hoje você ganha um pacote extra!",
                qrUrl: "https://profemersons.github.io/selecao-dos-bastidores/central2/brasil_campeao.svg"
            },
            {
                type: "missions",
                title: "🎯 RANKING COLETIVO DE MISSÕES",
                data: missionRanking
            },
            {
                type: "split",
                title: "🏆 CAMISA 10: MELHORES PONTUAÇÕES",
                metric: "points", unit: "pts",
                data: [...players].sort((a, b) => b.points - a.points)
            },
            {
                type: "split",
                title: "🤝 AMIGO DA TORCIDA: MAIS CONEXÕES",
                metric: "friend_count", unit: "amigos",
                data: [...players].sort((a, b) => b.friend_count - a.friend_count)
            },
            {
                type: "split",
                title: "⚽ COLECIONADORES: ÁLBUNS AVANÇADOS",
                metric: "total_stickers", unit: "fig.",
                data: [...players].sort((a, b) => b.total_stickers - a.total_stickers)
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

        document.getElementById("lastUpdate").textContent = "Sincronizado às " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

    } catch (e) {
        console.error("Erro na Central:", e);
    }
}
function buildGroupRanking(players, filterType) {
    const filtered = players.filter(p => p.type === filterType);
    const groups = {};

    filtered.forEach(p => {
        const area = p.turma_area || (filterType === "student" ? "Geral" : "Sem Setor");
        if (!groups[area]) groups[area] = { name: area, total: 0, count: 0 };
        groups[area].total += Number(p.album_completion || 0);
        groups[area].count++;
    });
    
    return Object.values(groups)
        .map(g => ({ name: g.name, average: g.total / g.count }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 10);
}

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
        container.innerHTML = `
            <div class="ranking-card">
                <div class="insights-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; height: 100%;">
                    ${screen.cards.map(c => `
                        <div class="insight-box" style="padding: 30px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div class="insight-icon" style="font-size: 50px; margin-bottom: 5px;">${c.icon}</div>
                            <div class="insight-val" style="font-size: 42px; font-weight: 900;">${c.val}</div>
                            <div class="insight-label" style="font-size: 18px; color: var(--text-muted);">${c.label}</div>
                        </div>
                    `).join("")}
                </div>
            </div>`;
    }
    else if (screen.type === "promo") {
        container.innerHTML = `
            <div class="ranking-card" style="background: linear-gradient(135deg, #009739 0%, #FEDD00 50%, #009739 100%); border: none; padding: 15px;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #000; gap: 15px;">
                    <div style="background: rgba(0,0,0,0.85); padding: 10px 30px; border-radius: 15px; color: #fff;">
                        <span style="font-size: 38px; font-weight: 900; letter-spacing: 3px;">BRASIL 3 x 0 ESCÓCIA</span>
                    </div>
                    
                    <div style="background: #fff; padding: 15px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                        <img src="${screen.qrUrl}" style="width: 260px; height: 260px; display: block;" alt="QR Code Brasil">
                    </div>

                    <div style="max-width: 800px; font-size: 22px; font-weight: 900; background: rgba(255,255,255,0.95); padding: 8px 25px; border-radius: 12px; border: 2px solid #000; text-align: center;">
                        ${screen.msg}
                    </div>
                </div>
            </div>`;
    }
    else if (screen.type === "missions") {
        container.innerHTML = `
            <div class="ranking-card">
                <div class="groups-grid" style="grid-template-columns: 1fr 1fr; gap: 15px;">
                    ${screen.data.map((m, idx) => `
                        <div class="group-row" style="border-left: 6px solid var(--purple-neon); background: rgba(255,255,255,0.05); padding: 15px 25px;">
                            <div class="group-name" style="font-size: 20px;">${m.emoji} ${m.name}</div>
                            <div class="group-val" style="color: var(--purple-neon); font-size: 28px;">${m.total}x</div>
                        </div>
                    `).join("")}
                </div>
            </div>`;
    }
    else if (screen.type === "groups") {
        container.innerHTML = `
            <div class="ranking-card">
                <div class="groups-grid" style="grid-template-columns: 1fr 1fr;">
                    ${screen.data.map((g, idx) => `
                        <div class="group-row top-${idx}">
                            <div class="group-name">#${idx + 1} - ${g.name}</div>
                            <div class="group-val">${g.average.toFixed(1)}%</div>
                        </div>
                    `).join("")}
            </div></div>`;
    }
    else {
        const t3 = screen.data.slice(0, 3);
        const rest = screen.data.slice(3, 10);
        container.innerHTML = `
            <div class="ranking-card"><div class="split-layout">
                <div class="podium-side">
                    <div class="podium-column second">
                        <div class="podium-badge">🥈</div>
                        <div class="podium-user-emoji">${t3[1]?.emoji || "👤"}</div>
                        <div class="podium-name">${t3[1]?.name || "---"}</div>
                        <div class="podium-sub">${t3[1]?.turma_area || "Geral"}</div>
                        <div class="podium-score">${t3[1] ? t3[1][screen.metric] : 0}</div>
                    </div>
                    <div class="podium-column first">
                        <div class="podium-badge">🥇</div>
                        <div class="podium-user-emoji">${t3[0]?.emoji || "👤"}</div>
                        <div class="podium-name">${t3[0]?.name || "---"}</div>
                        <div class="podium-sub">${t3[0]?.turma_area || "Geral"}</div>
                        <div class="podium-score" style="color:#fff">${t3[0] ? t3[0][screen.metric] : 0}</div>
                    </div>
                    <div class="podium-column third">
                        <div class="podium-badge">🥉</div>
                        <div class="podium-user-emoji">${t3[2]?.emoji || "👤"}</div>
                        <div class="podium-name">${t3[2]?.name || "---"}</div>
                        <div class="podium-sub">${t3[2]?.turma_area || "Geral"}</div>
                        <div class="podium-score">${t3[2] ? t3[2][screen.metric] : 0}</div>
                    </div>
                </div>
                <div class="list-side">
                    ${rest.map((p, i) => `
                        <div class="tv-row">
                            <div class="tv-row-left">
                                <span class="tv-idx">#${i+4}</span>
                                <div>
                                    <span class="tv-name">${p.emoji || ""} ${p.name.split(' ')[0]}</span>
                                    <span class="tv-sub"> • ${p.turma_area || "Geral"}</span>
                                </div>
                            </div>
                            <span class="tv-val">${p[screen.metric]}</span>
                        </div>
                    `).join("")}
                </div>
            </div></div>`;
    }
}