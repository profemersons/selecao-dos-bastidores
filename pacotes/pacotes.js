

const player =
    JSON.parse(
        localStorage.getItem("player")
    );

if (!player) {
    window.location.href =
        "../index.html";
}

let packsRemaining = 3;

init();

async function init() {

    await loadTodayStatus();

    document.getElementById(
        "loading"
    ).style.display = "none";

    document.getElementById(
        "app"
    ).style.display = "block";
    loadMissionPacks();
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

    document.getElementById(
        "remainingText"
    ).textContent =
        `📦 Pacotes disponíveis hoje: ${packsRemaining}/3`;

    const packs =
        document.querySelectorAll(
            ".pack"
        );

    packs.forEach(
        (pack, index) => {

            if (
                index >= packsRemaining
            ) {

                pack.classList.add(
                    "used"
                );

            } else {

                pack.classList.remove(
                    "used"
                );
            }
        }
    );
}

document
    .querySelectorAll(".pack")
    .forEach(pack => {

        pack.onclick =
            () => openPack();

    });

async function openPack() {

    const now = new Date();

    // =========================
    // 1. BLOQUEIO HORÁRIO 07:00
    // =========================
    if (now.getHours() < 7) {
        alert("Os pacotes só podem ser abertos após as 7h da manhã.");
        return;
    }

    // =========================
    // 2. VALIDAÇÃO REAL (BANCO)
    // =========================
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

    const MAX_PACKS = 3;

    if (todayCount >= MAX_PACKS) {
        alert("Você já abriu todos os 3 pacotes de hoje.");
        return;
    }

    // =========================
    // 3. BUSCAR FIGURINHAS
    // =========================
    const { data: commons, error: stickersError } = await client
        .from("stickers")
        .select("*")
        .eq("type", "common");

    if (stickersError || !commons || commons.length === 0) {
        alert("Erro ao carregar figurinhas.");
        return;
    }

    // =========================
    // 4. GERAR PACOTE (4 FIGURINHAS)
    // =========================
    const rewards = [];

    for (let i = 0; i < 4; i++) {

        const sticker =
            commons[Math.floor(Math.random() * commons.length)];

        const isShiny = Math.random() < 0.10;

        rewards.push({
            ...sticker,
            is_shiny: isShiny
        });

        await addToInventory(sticker.id, isShiny);
    }

    // =========================
    // 5. REGISTRAR ABERTURA
    // =========================
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

    // =========================
    // 6. STATS
    // =========================
    await recalculatePlayerStats(player.id);

    // =========================
    // 7. ATUALIZA UI VIA BANCO (NUNCA LOCAL)
    // =========================
    await loadTodayStatus();

    // =========================
    // 8. MOSTRA RECOMPENSAS
    // =========================
    showRewards(rewards);
}

async function addToInventory(
    stickerId,
    isShiny
) {

    const {
        data: existing
    } =
        await client
            .from(
                "inventory"
            )
            .select("*")
            .eq(
                "player_id",
                player.id
            )
            .eq(
                "sticker_id",
                stickerId
            )
            .eq(
                "is_shiny",
                isShiny
            )
            .maybeSingle();

    if (existing) {

        await client
            .from(
                "inventory"
            )
            .update({
                quantity:
                    existing.quantity +
                    1
            })
            .eq(
                "id",
                existing.id
            );

    } else {

        await client
            .from(
                "inventory"
            )
            .insert([
                {
                    player_id:
                        player.id,
                    sticker_id:
                        stickerId,
                    is_shiny:
                        isShiny,
                    quantity: 1
                }
            ]);
    }
}

function showRewards(rewards) {

    const modal =
        document.getElementById("modal");

    const container =
        document.getElementById("resultContainer");

    modal.classList.remove("hidden");
    document
        .getElementById("closeResult")
        .style.display = "none";

    let current = 0;

    renderSticker();

    function renderSticker() {

        const sticker =
            rewards[current];
        if (navigator.vibrate) {

            if (sticker.is_shiny) {

                navigator.vibrate([80, 40, 80]);

            } else {

                navigator.vibrate(40);
            }
        }

        container.innerHTML = `

            <div class="reward-card">

                ${sticker.is_shiny
                ? `
    <div class="reward-shiny-banner">
        ⭐ BRILHANTE ⭐
    </div>
    `
                : ""
            }

               <div class="sticker-flip">
               ${sticker.is_shiny
                ? `
<div class="shiny-particles">
    <span>✨</span>
    <span>⭐</span>
    <span>✨</span>
    <span>⭐</span>
    <span>✨</span>
    <span>⭐</span>
</div>
`
                : ""
            }

    <div class="sticker-inner">

        <div class="sticker-back">

            🏆

        </div>

        <div class="sticker-front">

            <img
                src="${getStickerImage(sticker.image_path)}"
                class="
                    reward-image
                    ${sticker.is_shiny
                ? "reward-image-shiny"
                : ""
            }
                "
            >

        </div>

    </div>

</div>

                <div class="reward-name">
                    ${sticker.profession}
                </div>

                <div class="reward-next">
                    👆 Toque para continuar
                </div>

            </div>
        `;

        container.onclick = () => {

            current++;

            if (
                current >= rewards.length
            ) {

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

        <h3>
            🎉 Pacote concluído
        </h3>

        <p>
            Você recebeu
            ${rewards.length}
            figurinhas.
        </p>

    </div>
`;

        document
            .getElementById("closeResult")
            .style.display = "block";
    }
}
function goAlbum() {

    window.location.href =
        "../album/album.html";
}

function goProfile() {

    window.location.href =
        "../perfil/perfil.html";
}

//talvez apagar aqui embaixo

function bindCloseButton() {
    const btn = document.getElementById("closeResult");

    if (!btn) return;

    btn.addEventListener("click", () => {
        document.getElementById("modal").classList.add("hidden");
    });
}
document
    .getElementById("closeResult")
    .onclick = () => {

        document
            .getElementById("modal")
            .classList.add("hidden");

        document
            .getElementById("resultContainer")
            .innerHTML = "";
    };
function getGameDayStart() {

    const now = new Date();

    const today7 = new Date();
    today7.setHours(7, 0, 0, 0);

    // se ainda não passou das 7h → usa ontem 7h
    if (now < today7) {
        today7.setDate(today7.getDate() - 1);
    }

    return today7;
}
async function loadMissionPacks() {

    const container = document.getElementById("missionPacks");
    container.innerHTML = "";

    // 1. buscar rewards liberadas mas não resgatadas
    const { data: rewards, error } = await client
        .from("mission_rewards")
        .select("*")
        .eq("player_id", player.id)
        .eq("claimed", false);

    if (error) {
        console.error(error);
        return;
    }

    if (!rewards || rewards.length === 0) {
        container.innerHTML = `
            <p style="text-align:center;opacity:.7;">
                Nenhum pacote de missão disponível
            </p>`;
        return;
    }

    // 2. render igual pacotes diários
    rewards.forEach(r => {

        const pack = document.createElement("div");
        pack.className = "pack mission";

        pack.innerHTML = `
            <div class="pack-emoji">🎯</div>
            <div class="pack-title">Missão Liberada</div>
            <div class="pack-info">
                Clique para resgatar
            </div>
        `;

        pack.onclick = () => openMissionPack(r);

        container.appendChild(pack);
    });
}
async function openMissionPack(reward) {

    // 🔒 trava imediata (evita clique duplo)
    const card = event?.currentTarget;
    if (card) {
        card.style.pointerEvents = "none";
        card.style.opacity = "0.5";
    }

    // 1. gerar pacote
    const { data: commons } = await client
        .from("stickers")
        .select("*")
        .eq("type", "common");

    const rewards = [];

    for (let i = 0; i < 4; i++) {

        const sticker =
            commons[Math.floor(Math.random() * commons.length)];

        const isShiny = Math.random() < 0.1;

        rewards.push({
            ...sticker,
            is_shiny: isShiny
        });

        await addToInventory(sticker.id, isShiny);
    }

    // 2. marcar como claimed
    const { error } = await client
        .from("mission_rewards")
        .update({ claimed: true })
        .eq("id", reward.id);

    if (error) {
        console.error(error);
        alert("Erro ao resgatar missão");
        return;
    }

    // 3. mostra reward
    showRewards(rewards);

    // 4. ATUALIZA UI SEM REFRESH (ESSENCIAL)
    await loadMissionPacks();
}