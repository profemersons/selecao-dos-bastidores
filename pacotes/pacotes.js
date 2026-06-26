const player = JSON.parse(localStorage.getItem("player"));

if (!player) {
    window.location.href = "../index.html";
}

const LISTA_MISSOES = [
    { slug: "genius", nome: "Jogo Genius", emoji: "🧠" },
    { slug: "embaixadinhas", nome: "Embaixadinhas", emoji: "⚽" }
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

    const dailyPacks = document.querySelectorAll("main > .packs > .pack");
    dailyPacks.forEach((pack, index) => {
        if (index >= packsRemaining) {
            pack.classList.add("used");
        } else {
            pack.classList.remove("used");
        }
    });
}

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
   SISTEMA DE PACOTES DE MISSÃO (SEGURO E ORDENADO)
======================================================== */
async function loadMissionPacks() {
    const container = document.getElementById("missionPacks");
    if (!container) return;

    container.innerHTML = "";
    const playerIdBusca = isNaN(player.id) ? player.id : Number(player.id);

    // 1. Busca as recompensas ordenando diretamente no banco (falses primeiro)
    const { data: userRewards, error } = await client
        .from("mission_rewards")
        .select("*")
        .eq("player_id", playerIdBusca)
        .order("claimed", { ascending: true }); // false vem antes de true no PostgreSQL

    if (error) {
        console.error("❌ Erro ao buscar missões:", error);
        container.innerHTML = `<p style="text-align:center;color:#ef4444;font-size:12px;">Erro ao carregar pacotes de missão.</p>`;
        return;
    }

    if (!userRewards || userRewards.length === 0) {
        container.innerHTML = `
            <p style="text-align:center; opacity:.6; padding: 20px; font-size: 14px; width: 100%;">
                Nenhum pacote de missão liberado no momento. Complete os desafios!
            </p>`;
        return;
    }

    userRewards.forEach(registro => {
        const packCard = document.createElement("div");
        let nomeMissao = "Pacote de Missão";
        let emojiMissao = "🎯";

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
            case "qrcode1":
                nomeMissao = "Missão Brasil Campeão";
                emojiMissao = "🔰";
                break;
            case "cade-profissional":
                nomeMissao = "Onde está o Profissional?";
                emojiMissao = "🔍";
                break;
            case "quarto-andar":
                nomeMissao = "Missão Retorno do Intervalo";
                emojiMissao = "🏃‍♂️";
                break;
            case "snake-profissao":
                nomeMissao = "Missão Serpente da Carreira";
                emojiMissao = "🐍";
                break;
            default:
                if (registro.mission_slug) {
                    nomeMissao = `Missão ${registro.mission_slug.toUpperCase()}`;
                }
                break;
        }

        // Validação estrita do estado boleano
        const isClaimed = registro.claimed === true || registro.claimed === "true";

        if (!isClaimed) {
            packCard.className = "pack mission";
            packCard.innerHTML = `
                <div class="pack-emoji">${emojiMissao}</div>
                <div class="pack-title">${nomeMissao}</div>
                <div class="pack-info">Clique para resgatar suas 4 figurinhas</div>
                <span class="pack-status-badge badge-available">🎁 Disponível</span>
            `;
            packCard.onclick = () => openMissionPack(registro, packCard);
        } else {
            packCard.className = "pack mission used";
            packCard.innerHTML = `
                <div class="pack-emoji">${emojiMissao}</div>
                <div class="pack-title">${nomeMissao}</div>
                <div class="pack-info">Você já abriu este pacote de recompensa</div>
                <span class="pack-status-badge badge-claimed">✔️ Já Coletado</span>
            `;
        }

        container.appendChild(packCard);
    });
}

async function openMissionPack(reward, cardElement) {
    if (!cardElement || cardElement.style.pointerEvents === "none") return;

    // Trava de interface imediata (Front-end blocking)
    cardElement.style.pointerEvents = "none";

    try {
        // [VERIFICAÇÃO DE SEGURANÇA SEVERA]: Reconsultar direto na tabela antes de rodar a lógica
        const { data: doubleCheck, error: errCheck } = await client
            .from("mission_rewards")
            .select("claimed")
            .eq("id", reward.id)
            .single();

        if (errCheck || !doubleCheck || doubleCheck.claimed === true || doubleCheck.claimed === "true") {
            alert("Este pacote já foi resgatado!");
            await loadMissionPacks();
            return;
        }

        // [MUDANÇA DE ESTADO IMEDIATA]: Marca como coletado antes de rodar os laços assíncronos do inventário
        const { error: errUpdate } = await client
            .from("mission_rewards")
            .update({ claimed: true })
            .eq("id", reward.id);

        if (errUpdate) {
            console.error(errUpdate);
            alert("Erro ao processar a segurança do pacote.");
            cardElement.style.pointerEvents = "auto";
            return;
        }

        // Busca figurinhas válidas
        const { data: commons } = await client
            .from("stickers")
            .select("*")
            .eq("type", "common");

        if (!commons || commons.length === 0) {
            alert("Erro ao carregar figurinhas do banco.");
            return;
        }

        // Sorteio seguro
        const rewards = [];
        for (let i = 0; i < 4; i++) {
            const sticker = commons[Math.floor(Math.random() * commons.length)];
            const isShiny = Math.random() < 0.1;

            rewards.push({ ...sticker, is_shiny: isShiny });
            await addToInventory(sticker.id, isShiny);
        }

        await recalculatePlayerStats(player.id);
        showRewards(rewards);
        await loadMissionPacks();

    } catch (err) {
        console.error("Erro crítico na transação:", err);
        cardElement.style.pointerEvents = "auto";
    }
}