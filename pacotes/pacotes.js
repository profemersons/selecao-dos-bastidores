// ⚠️ REMOVER ANTES DA COPA
const DEV_MODE = true;


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
}

async function loadTodayStatus() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    const { data } =
        await client
            .from("pack_openings")
            .select("*")
            .eq(
                "player_id",
                player.id
            );

    const todayOpenings =
        (data || []).filter(
            p =>
                p.created_at &&
                p.created_at.startsWith(today)
        );
    //APAGAR DEPOIS TESTE
    packsRemaining = DEV_MODE
        ? 9999
        : 3 - todayOpenings.length;
    //APAGAR DEPOIS TESTE
    /*
        packsRemaining =
            3 - todayOpenings.length;
    
        if (packsRemaining < 0) {
            packsRemaining = 0;
        }
    */
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

    const hour =
        now.getHours();

    if (hour < 7) {

        alert(
            "Os pacotes só podem ser abertos após as 7h da manhã."
        );

        return;
    }

    if (
        packsRemaining <= 0
    ) {

        alert(
            "Você já abriu todos os pacotes de hoje."
        );

        return;
    }

    const { data: commons } =
        await client
            .from("stickers")
            .select("*")
            .eq(
                "type",
                "common"
            );

    const rewards = [];

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const sticker =
            commons[
            Math.floor(
                Math.random() *
                commons.length
            )
            ];

        const isShiny =
            Math.random() < 0.10; // TESTE

        rewards.push({
            ...sticker,
            is_shiny: isShiny
        });

        await addToInventory(
            sticker.id,
            isShiny
        );


    }

    await client
        .from("pack_openings")
        .insert([
            {
                player_id:
                    player.id,
                pack_size: 4
            }
        ]);

    /* =========================
    ATUALIZA STATS
    ========================= */

    await recalculatePlayerStats(
        player.id
    );

    packsRemaining--;

    updateUI();

    showRewards(
        rewards
    );
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