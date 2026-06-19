const player = JSON.parse(
    localStorage.getItem("player")
);

if (!player) {
    window.location.href =
        "../index.html";
}

let selectedSticker = null;
let selectedInventory = null;
let friend = null;

const areasOrder = [
    "Tecnologia da Informação",
    "Gestão e Negócios",
    "Comunicação e Marketing",
    "Gastronomia e Alimentação",
    "Operações e Serviços",
    "Saúde",
    "Bem-estar",
    "Beleza e Estética",
    "Moda",
    "Educação",
    "Idiomas",
    "Turismo e Hospitalidade",
    "Desenvolvimento Social",
    "Meio Ambiente, Segurança e Saúde no Trabalho",
    "Design, Artes e Arquitetura",
    "Operações da Copa do Mundo"
];

init();

async function init() {

    await loadStickers();

    document.getElementById(
        "loading"
    ).style.display = "none";

    document.getElementById(
        "app"
    ).style.display = "block";
}

/* =========================
PASSO 1
FIGURINHAS
========================= */

async function loadStickers() {

    const { data: inventory } =
        await client
            .from("inventory")
            .select("*")
            .eq(
                "player_id",
                player.id
            );

    const { data: stickers } =
        await client
            .from("stickers")
            .select("*")
            .order(
                "global_number"
            );

    const container =
        document.getElementById(
            "albumContainer"
        );

    container.innerHTML = "";

    areasOrder.forEach(area => {

        const areaStickers =
            stickers.filter(
                sticker =>
                    sticker.area === area &&
                    sticker.type !== "legendary"
            );

        if (
            !areaStickers.length
        ) {
            return;
        }

        const section =
            document.createElement(
                "section"
            );

        section.className =
            "area";

        section.innerHTML = `
            <div class="area-title">
                ${area}
            </div>

            <div class="grid"></div>
        `;

        const grid =
            section.querySelector(
                ".grid"
            );

        areaStickers.forEach(
            sticker => {

                const normal =
                    inventory.find(
                        item =>
                            item.sticker_id === sticker.id &&
                            !item.is_shiny
                    );

                const shiny =
                    inventory.find(
                        item =>
                            item.sticker_id === sticker.id &&
                            item.is_shiny
                    );

                if (normal) {

                    createStickerCard(
                        grid,
                        sticker,
                        normal,
                        false
                    );
                }

                if (shiny) {

                    createStickerCard(
                        grid,
                        sticker,
                        shiny,
                        true
                    );
                }

            }
        );

        if (
            grid.children.length > 0
        ) {

            container.appendChild(
                section
            );
        }

    });

}

function createStickerCard(
    grid,
    sticker,
    inventoryItem,
    isShiny
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "card";

    if (isShiny) {
        card.classList.add(
            "shiny"
        );
    }

    card.innerHTML = `
    ${isShiny
            ? `
            <div class="shiny-badge">
                ⭐
            </div>
        `
            : ""
        }

    <img
        src="${getStickerImage(sticker.image_path)}"
        class="sticker-img"
    >

    <div class="number">
        #${String(
            sticker.global_number
        ).padStart(3, "0")}
    </div>

    ${inventoryItem.quantity > 1
            ? `
            <div class="quantity">
                x${inventoryItem.quantity}
            </div>
        `
            : ""
        }
`;

    card.onclick = () => {

        selectedSticker = {
            ...sticker,
            is_shiny: isShiny
        };

        selectedInventory =
            inventoryItem;

        goStep2();
    };

    grid.appendChild(card);
}

/* =========================
PASSO 2
BUSCAR DESTINATÁRIO
========================= */

function goStep2() {

    document.getElementById(
        "step1"
    ).style.display = "none";

    document.getElementById(
        "step2"
    ).style.display = "block";

    document.getElementById(
        "stepText"
    ).innerText =
        "2. Digite o código do jogador que receberá a figurinha";
    //
    document.getElementById(
        "selectedStickerPreview"
    ).innerHTML = `
    <img
        src="${getStickerImage(selectedSticker.image_path)}"
        class="preview-image
        ${selectedSticker.is_shiny ? "preview-shiny" : ""}"
    >

    <h3>
        ${selectedSticker.is_shiny ? "⭐ " : ""}
        ${selectedSticker.profession}
    </h3>

    <p>
        #${String(
        selectedSticker.global_number
    ).padStart(3, "0")}
    </p>
`;
    document.getElementById(
        "selectedStickerPreview"
    ).style.display = "block";
    //
}

async function searchFriend() {

    const code =
        document
            .getElementById(
                "friendCode"
            )
            .value
            .trim()
            .toUpperCase();

    if (!code) {

        alert(
            "Digite um código."
        );

        return;
    }

    if (
        code === player.code
    ) {

        alert(
            "Você não pode enviar para si mesmo."
        );

        return;
    }

    const { data } =
        await client
            .from("players")
            .select("*")
            .eq(
                "code",
                code
            )
            .single();

    if (!data) {

        alert(
            "Jogador não encontrado."
        );

        return;
    }

    friend = data;

    const result =
        document.getElementById(
            "friendResult"
        );

    result.style.display =
        "block";

    result.innerHTML = `
        <h3>
            ${data.emoji}
            ${data.name}
        </h3>

        <p>
            ${data.turma_area}
        </p>

        <button onclick="goStep3()">
            Continuar →
        </button>
    `;
}

/* =========================
PASSO 3
CONFIRMAÇÃO
========================= */

function goStep3() {

    document.getElementById(
        "step2"
    ).style.display = "none";

    document.getElementById(
        "step3"
    ).style.display = "block";

    document.getElementById(
        "stepText"
    ).innerText =
        "3. Confirme o envio";

    document.getElementById(
        "tradeSummary"
    ).innerHTML = `
        <p>
            Você está enviando:
        </p>

        <img
    src="${getStickerImage(selectedSticker.image_path)}"
    class="summary-image
    ${selectedSticker.is_shiny ? "preview-shiny" : ""}"
>

<h3>
    ${selectedSticker.is_shiny ? "⭐ " : ""}
    ${selectedSticker.profession}
</h3>

        <p>
            #${String(
        selectedSticker.global_number
    ).padStart(3, "0")}
        </p>

        <hr>

        <p>
            Para:
        </p>

        <h3>
            ${friend.emoji}
            ${friend.name}
        </h3>

        <p>
            ${friend.turma_area}
        </p>
    `;
    document.getElementById(
        "selectedStickerPreview"
    ).style.display = "none";
}
/* =========================
CONFIRMAR ENVIO
========================= */

async function confirmTrade() {

    if (selectedSticker.type === "legendary") {

        alert(
            "Figurinhas lendárias não podem ser enviadas."
        );

        return;
    }

    if (!selectedSticker) {

        alert(
            "Selecione uma figurinha."
        );

        return;
    }

    if (!friend) {

        alert(
            "Selecione um destinatário."
        );

        return;
    }

    const pin =
        document
            .getElementById(
                "pinInput"
            )
            .value
            .trim();

    if (!pin) {

        alert(
            "Digite seu PIN."
        );

        return;
    }

    const { data: me } =
        await client
            .from("players")
            .select("*")
            .eq(
                "id",
                player.id
            )
            .single();

    if (!me) {

        alert(
            "Erro ao validar jogador."
        );

        return;
    }

    if (pin !== me.pin) {

        alert(
            "PIN incorreto."
        );

        return;
    }

    await removeStickerFromPlayer();
    await addStickerToFriend();
    await registerTrade();

    /* =========================
    RECALCULAR STATS (CRÍTICO)
    ========================= */

    await recalculatePlayerStats(player.id);
    await recalculatePlayerStats(friend.id);

    showSuccessModal();
}

/* =========================
REMOVE DO INVENTÁRIO
========================= */

async function removeStickerFromPlayer() {

    if (
        selectedInventory.quantity > 1
    ) {

        await client
            .from("inventory")
            .update({
                quantity:
                    selectedInventory.quantity - 1
            })
            .eq(
                "id",
                selectedInventory.id
            );

    } else {

        await client
            .from("inventory")
            .delete()
            .eq(
                "id",
                selectedInventory.id
            );
    }

}

/* =========================
ADICIONA AO DESTINATÁRIO
========================= */

async function addStickerToFriend() {

    const {
        data: existing
    } =
        await client
            .from("inventory")
            .select("*")
            .eq(
                "player_id",
                friend.id
            )
            .eq(
                "sticker_id",
                selectedSticker.id
            )
            .eq(
                "is_shiny",
                selectedSticker.is_shiny
            )
            .maybeSingle();

    if (existing) {

        await client
            .from("inventory")
            .update({
                quantity:
                    existing.quantity + 1
            })
            .eq(
                "id",
                existing.id
            );

    } else {

        await client
            .from("inventory")
            .insert([
                {
                    player_id:
                        friend.id,

                    sticker_id:
                        selectedSticker.id,

                    is_shiny:
                        selectedSticker.is_shiny,

                    quantity: 1
                }
            ]);
    }

}

/* =========================
REGISTRA TROCA
========================= */

async function registerTrade() {

    await client
        .from("trades")
        .insert([
            {
                from_player:
                    player.id,

                to_player:
                    friend.id,

                sticker_id:
                    selectedSticker.id,

                is_shiny:
                    selectedSticker.is_shiny,

                quantity: 1,

                status:
                    "completed"
            }
        ]);

}

/* =========================
SUCESSO
========================= */

function showSuccessModal() {

    document
        .getElementById(
            "successContent"
        )
        .innerHTML = `
            <p>
                Bye Bye
            </p>

            <br>

           <img
    src="${getStickerImage(selectedSticker.image_path)}"
    class="success-image
    ${selectedSticker.is_shiny ? "preview-shiny" : ""}"
>

<h3>
    ${selectedSticker.is_shiny
            ? "⭐ "
            : ""
        }

    ${selectedSticker.profession}
</h3>

            <p>
                ➜
            </p>

            <h3>
                ${friend.emoji}

                ${friend.name}
            </h3>

            <br>

            <p>
                A figurinha já está viajando para o novo álbum.
            </p>
        `;

    document
        .getElementById(
            "successModal"
        )
        .classList.remove(
            "hidden"
        );

}

function closeSuccess() {

    location.reload();

}

/* =========================
NAVEGAÇÃO
========================= */

function goAlbum() {

    window.location.href =
        "../album/album.html";

}

function goPacks() {

    window.location.href =
        "../pacotes/pacotes.html";

}

function goMissions() {

    window.location.href =
        "../missions/missions.html";

}

function goTrades() {

    window.location.reload();

}

function goProfile() {

    window.location.href =
        "../perfil/perfil.html";

}
function backToStep1() {
    friend = null;

    document.getElementById(
        "friendCode"
    ).value = "";

    document.getElementById(
        "friendResult"
    ).style.display = "none";

    document.getElementById(
        "step2"
    ).style.display = "none";

    document.getElementById(
        "step1"
    ).style.display = "block";

    document.getElementById(
        "stepText"
    ).innerText =
        "1. Escolha uma figurinha";
}
function backToStep2() {
    document.getElementById(
        "pinInput"
    ).value = "";


    document.getElementById(
        "step3"
    ).style.display = "none";

    document.getElementById(
        "step2"
    ).style.display = "block";

    document.getElementById(
        "stepText"
    ).innerText =
        "2. Digite o código do jogador que receberá a figurinha";
}