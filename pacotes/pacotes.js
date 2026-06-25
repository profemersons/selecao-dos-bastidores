const player = JSON.parse(localStorage.getItem("player"));

if (!player) {
    window.location.href = "../index.html";
}

// Definição estática das missões da sua plataforma para o feedback visual completo
const LISTA_MISSOES = [
    { slug: "genius", nome: "Jogo Genius", emoji: "🧠" },
    { slug: "embaixadinhas", nome: "Embaixadinhas", emoji: "⚽" }
    // Adicione novas missões aqui se houver mais futuramente
];

let packsRemaining = 3;

init();

async function init() {
    await loadTodayStatus();
    await loadMissionPacks();

    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";
}

async function loadTodayStatus() {
    const startOfDay = getGameDayStart();

    const { data } = await client
        .from("pack_openings")
        .select("*")
        .eq("player_id", player.id)
        .gte("created_at", startOfDay.toISOString());

    const todayOpenings = data || [];
    const MAX_PACKS = 3;

    packsRemaining = Math.max(0, MAX_PACKS - todayOpenings.length);
    updateUI();
}

function updateUI() {
    document.getElementById("remainingText").textContent = `📦 Pacotes disponíveis hoje: ${packsRemaining}/3`;

    // Atualiza os 3 pacotes diários padrões do topo
    const dailyPacks = document.querySelectorAll("main > .packs > .pack");
    dailyPacks.forEach((pack, index) => {
        if (index >= packsRemaining) {
            pack.classList.add("used");
        } else {
            pack.classList.remove("used");
        }
    });
}

// Vincula o clique apenas nos pacotes diários normais do topo
document.querySelectorAll("main > .packs > .pack").forEach(pack => {
    pack.onclick = () => openPack();
});

async function openPack() {
    const now = new Date();
    if (now.getHours() < 7) {
        alert("Os pacotes só podem ser abertos após as 7h da manhã.");
        return;
    }

    const startOfDay = getGameDayStart();
    const { data: openings, error } = await client
        .from("pack_openings")
        .select("id")
        .eq("player_id", player.id)
        .gte("created_at", startOfDay.toISOString());

    if (error) {
        console.error(error);
        alert("Erro ao validar pacotes do dia.");
        return;
    }

    const todayCount = openings?.length || 0;
    if (todayCount >= 3) {
        alert("Você já abriu todos os 3 pacotes de hoje.");
        return;
    }

    const { data: commons, error: stickersError } = await client
        .from("stickers")
        .select("*")
        .eq("type", "common");

    if (stickersError || !commons || commons.length === 0) {
        alert("Erro ao carregar figurinhas.");
        return;
    }

    const rewards = [];
    for (let i = 0; i < 4; i++) {
        const sticker = commons[Math.floor(Math.random() * commons.length)];
        const isShiny = Math.random() < 0.10;

        rewards.push({ ...sticker, is_shiny: isShiny });
        await addToInventory(sticker.id, isShiny);
    }

    const { error: insertError } = await client
        .from("pack_openings")
        .insert([{
            player_id: player.id,
            pack_size: 4,
            opened_at: new Date().toISOString()
        }]);

    if (insertError) {
        console.error(insertError);
        alert("Erro ao registrar abertura do pacote.");
        return;
    }

    await recalculatePlayerStats(player.id);
    await loadTodayStatus();
    showRewards(rewards);
}

async function addToInventory(stickerId, isShiny) {
    const { data: existing } = await client
        .from("inventory")
        .select("*")
        .eq("player_id", player.id)
        .eq("sticker_id", stickerId)
        .eq("is_shiny", isShiny)
        .maybeSingle();

    if (existing) {
        await client
            .from("inventory")
            .update({ quantity: existing.quantity + 1 })
            .eq("id", existing.id);
    } else {
        await client
            .from("inventory")
            .insert([{
                player_id: player.id,
                sticker_id: stickerId,
                is_shiny: isShiny,
                quantity: 1
            }]);
    }
}

function showRewards(rewards) {
    const modal = document.getElementById("modal");
    const container = document.getElementById("resultContainer");

    modal.classList.remove("hidden");
    document.getElementById("closeResult").style.display = "none";

    let current = 0;
    renderSticker();

    function renderSticker() {
        const sticker = rewards[current];
        if (navigator.vibrate) {
            if (sticker.is_shiny) {
                navigator.vibrate([80, 40, 80]);
            } else {
                navigator.vibrate(40);
            }
        }

        container.innerHTML = `
            <div class="reward-card">
                ${sticker.is_shiny ? `<div class="reward-shiny-banner">⭐ BRILHANTE ⭐</div>` : ""}
                <div class="sticker-flip">
                    ${sticker.is_shiny ? `
                    <div class="shiny-particles">
                        <span>✨</span><span>⭐</span><span>✨</span><span>⭐</span><span>✨</span><span>⭐</span>
                    </div>` : ""}
                    <div class="sticker-inner">
                        <div class="sticker-back">🏆</div>
                        <div class="sticker-front">
                            <img src="${getStickerImage(sticker.image_path)}" class="reward-image ${sticker.is_shiny ? "reward-image-shiny" : ""}">
                        </div>
                    </div>
                </div>
                <div class="reward-name">${sticker.profession}</div>
                <div class="reward-next">👆 Toque para continuar</div>
            </div>
        `;

        container.onclick = () => {
            current++;
            if (current >= rewards.length) {
                finishPack();
                return;
            }
            renderSticker();
        };
    }

    function finishPack() {
        container.onclick = null;
        container.innerHTML = `
            <div class="pack-finished">
                <h3>🎉 Pacote concluído</h3>
                <p>Você recebeu ${rewards.length} figurinhas.</p>
            </div>
        `;
        document.getElementById("closeResult").style.display = "block";
    }
}

document.getElementById("closeResult").onclick = () => {
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("resultContainer").innerHTML = "";
};

function getGameDayStart() {
    const now = new Date();
    const today7 = new Date();
    today7.setHours(7, 0, 0, 0);

    if (now < today7) {
        today7.setDate(today7.getDate() - 1);
    }
    return today7;
}

/* ========================================================
   SISTEMA DE PACOTES DE MISSÃO (COM NOMES E EMOJIS DINÂMICOS)
======================================================== */
async function loadMissionPacks() {
    const container = document.getElementById("missionPacks");
    if (!container) return;

    container.innerHTML = "";

    // Garantia de conversão de tipo para o ID do jogador
    const playerIdBusca = isNaN(player.id) ? player.id : Number(player.id);

    console.log("🔍 Buscando pacotes de missão para o jogador ID:", playerIdBusca);

    // 1. Busca TODAS as recompensas deste jogador no banco
    const { data: userRewards, error } = await client
        .from("mission_rewards")
        .select("*")
        .eq("player_id", playerIdBusca);

    if (error) {
        console.error("❌ Erro do Supabase ao buscar missões:", error);
        container.innerHTML = `<p style="text-align:center;color:#ef4444;font-size:12px;">Erro ao carregar pacotes de missão.</p>`;
        return;
    }

    console.log("📊 Dados retornados do banco de dados:", userRewards);

    // Se o array vier vazio, o aluno realmente não tem linhas associadas ao ID dele
    if (!userRewards || userRewards.length === 0) {
        container.innerHTML = `
            <p style="text-align:center; opacity:.6; padding: 20px; font-size: 14px; width: 100%;">
                Nenhum pacote de missão liberado no momento. Complete os desafios!
            </p>`;
        return;
    }

    // 2. Renderiza os cards baseados nas linhas existentes com personalização por slug
    userRewards.forEach(registro => {
        const packCard = document.createElement("div");

        // Configuração padrão caso venha um slug mapeado diferente
        let nomeMissao = "Pacote de Missão";
        let emojiMissao = "🎯";

        // Personalização dinâmica baseada no mission_slug
        switch (registro.mission_slug) {
            case "embaixadinhas":
                nomeMissao = "Missão Embaixadinha";
                emojiMissao = "⚽";
                break;
            case "coleta":
                nomeMissao = "Missão de Coleta";
                emojiMissao = "♻️";
                break;
            case "conexao":
                nomeMissao = "Missão Instrumentos de Trabalho";
                emojiMissao = "🔧";
                break;
            case "memoria":
                nomeMissao = "Missão Sincronia";
                emojiMissao = "🧠";
                break;
            case "amigos1":
                nomeMissao = "Missão Rede de Amigos";
                emojiMissao = "🤝";
                break;
            case "lanche-estadio":
                nomeMissao = "Missão Lanchonete do Estádio";
                emojiMissao = "🍔";
                break;
            case "bancada":
                nomeMissao = "Missão Bancada Organizada";
                emojiMissao = "👨‍🏭";
                break;
            case "corrida-estagiario":
                nomeMissao = "Missão Corrida do Estagiário";
                emojiMissao = "🏃‍♀️";
                break;
            case "cade-profissional":
                nomeMissao = "Onde está o Craque?";
                emojiMissao = "🔍";
                break;
            default:
                // Fallback amigável caso tenha algum outro slug no banco futuramente
                if (registro.mission_slug) {
                    nomeMissao = `Missão ${registro.mission_slug.toUpperCase()}`;
                }
                break;
        }

        let badgeHTML = "";

        // Lógica estrita baseada na coluna 'claimed'
        if (registro.claimed === false || registro.claimed === "false") {
            // ESTADO: DISPONÍVEL PARA ABRIR
            packCard.className = "pack mission";
            badgeHTML = `<span class="pack-status-badge badge-available">🎁 Disponível</span>`;
            packCard.innerHTML = `
                <div class="pack-emoji">${emojiMissao}</div>
                <div class="pack-title">${nomeMissao}</div>
                <div class="pack-info">Clique para resgatar suas 4 figurinhas</div>
                ${badgeHTML}
            `;
            // Passa o objeto completo e o card para manipulação segura
            packCard.onclick = () => openMissionPack(registro, packCard);
        } else {
            // ESTADO: JÁ COLETADO / BLOQUEADO (FEEDBACK VISUAL)
            packCard.className = "pack mission used";
            badgeHTML = `<span class="pack-status-badge badge-claimed">✔️ Já Coletado</span>`;
            packCard.innerHTML = `
                <div class="pack-emoji">${emojiMissao}</div>
                <div class="pack-title">${nomeMissao}</div>
                <div class="pack-info">Você já abriu este pacote de recompensa</div>
                ${badgeHTML}
            `;
        }

        container.appendChild(packCard);
    });
}

async function openMissionPack(reward, event) {
    // Trava o clique visual instantaneamente para evitar bugs de clique duplo
    const card = event.currentTarget;
    if (card) {
        card.style.pointerEvents = "none";
    }

    // 1. Busca as figurinhas comuns para gerar o pacote
    const { data: commons } = await client
        .from("stickers")
        .select("*")
        .eq("type", "common");

    if (!commons || commons.length === 0) {
        alert("Erro ao carregar figurinhas do banco.");
        if (card) card.style.pointerEvents = "auto";
        return;
    }

    // 2. Sorteia as 4 figurinhas
    const rewards = [];
    for (let i = 0; i < 4; i++) {
        const sticker = commons[Math.floor(Math.random() * commons.length)];
        const isShiny = Math.random() < 0.1; // 10% de chance de brilhante

        rewards.push({ ...sticker, is_shiny: isShiny });
        await addToInventory(sticker.id, isShiny);
    }

    // 3. Atualiza no banco: muda claimed para TRUE
    const { error } = await client
        .from("mission_rewards")
        .update({ claimed: true })
        .eq("id", reward.id);

    if (error) {
        console.error(error);
        alert("Erro ao registrar o resgate no banco de dados.");
        if (card) card.style.pointerEvents = "auto";
        return;
    }

    // 4. Recalcula os status globais do perfil e abre a animação na tela
    await recalculatePlayerStats(player.id);
    showRewards(rewards);

    // 5. Atualiza a interface local (o card que era 'Disponível' vira 'Já Coletado' na hora)
    await loadMissionPacks();
}