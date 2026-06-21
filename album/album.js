const player = JSON.parse(
    localStorage.getItem("player")
);

if (!player) {
    window.location.href = "../index.html";
}

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

    fillPlayer();

    const stickers = await loadStickers();
    const inventory = await loadInventory();

    buildAlbum(stickers, inventory);

    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";
}

function fillPlayer() {

    document.getElementById("playerName").textContent =
        player.name;

    document.getElementById("playerCourse").textContent =
        player.turma_area;

    document.getElementById("playerEmoji").textContent =
        player.emoji;
}

async function loadStickers() {

    const { data } = await client
        .from("stickers")
        .select("*")
        .order("global_number");

    return data || [];
}

async function loadInventory() {

    const { data } = await client
        .from("inventory")
        .select("*")
        .eq("player_id", player.id);

    return data || [];
}

function buildAlbum(stickers, inventory) {
    document.getElementById("albumContainer").innerHTML = "";

    // =========================
    // 1. MAPA CORRETO (NORMAL + SHINY)
    // =========================
    const ownedMap = {};

    inventory.forEach(item => {
        if (!ownedMap[item.sticker_id]) {
            ownedMap[item.sticker_id] = {
                normal: 0,
                shiny: 0
            };
        }

        if (item.is_shiny) {
            ownedMap[item.sticker_id].shiny += item.quantity;
        } else {
            ownedMap[item.sticker_id].normal += item.quantity;
        }
    });

    // =========================
    // 2. PROGRESSO (1 versão já conta)
    // =========================
    const discovered = stickers.filter(s => {
        const data = ownedMap[s.id];
        return data && (data.normal > 0 || data.shiny > 0);
    }).length;

    document.getElementById("progressText").textContent =
        `${discovered} / ${stickers.length} Figurinhas`;

    const percent = (discovered / stickers.length) * 100;

    document.getElementById("progressFill").style.width = percent + "%";

    document.getElementById("progressPercent").textContent =
        `${Math.round(percent)}% da Escalação Completa`;

    // =========================
    // 3. RENDER POR ÁREA
    // =========================
    const container = document.getElementById("albumContainer");

    areasOrder.forEach(area => {

        const areaStickers = stickers.filter(s => s.area === area);
        if (!areaStickers.length) return;

        const section = document.createElement("section");
        section.className = "area";

        section.innerHTML = `
            <div class="area-title">${area}</div>
            <div class="grid"></div>
        `;

        const grid = section.querySelector(".grid");

        areaStickers.forEach(sticker => {

            const data = ownedMap[sticker.id] || {
                normal: 0,
                shiny: 0
            };

            const total = data.normal + data.shiny;
            const hasAny = total > 0;
            const hasShiny = data.shiny > 0;

            const card = document.createElement("div");

            // =========================
            // 4. CLASSES VISUAIS
            // =========================
            card.className = "card";

            if (!hasAny) {
                card.classList.add("locked");
            }

            if (sticker.type === "legendary") {
                card.classList.add("legendary");
            }

            if (hasShiny) {
                card.classList.add("shiny");
            }

            // =========================
            // 5. CONTEÚDO DO CARD
            // =========================
            if (hasAny) {
                card.innerHTML = `
                    ${hasShiny ? `<div class="shiny-badge">⭐</div>` : ""}

                    <img 
                        src="${getStickerImage(sticker.image_path)}" 
                        class="sticker-img"
                    />

                    <div class="number">
                        #${String(sticker.global_number).padStart(3, "0")}
                    </div>

                    ${total > 1
                        ? `<div class="quantity">x${total}</div>`
                        : ""
                    }
                `;
                /*
                TROCAR <DIV> PARA MOSTRR NORMAL E SHINY
                ${(data.normal > 0 || data.shiny > 0) ? `
                    <div class="quantity">
                        ${data.normal > 0 ? `C:${data.normal}` : ""}
                        ${data.shiny > 0 ? ` S:${data.shiny}` : ""}
                    </div>
                ` : ""} 
                */

            } else {
                card.innerHTML = `
                    <div class="emoji">🔒</div>

                    <div class="number">
                        #${String(sticker.global_number).padStart(3, "0")}
                    </div>
                `;
            }

            // =========================
            // 6. CLICK MODAL
            // =========================
            card.onclick = () => openSticker(sticker, hasAny);

            grid.appendChild(card);
        });

        container.appendChild(section);
    });
}

function openSticker(
    sticker,
    discovered
) {

    const modal =
        document.getElementById("modal");

    const body =
        document.getElementById("modalBody");

    if (!discovered) {

        body.innerHTML = `
      <h2>❓ Figurinha não descoberta</h2>

      <p>
        Número:
        #${String(
            sticker.global_number
        ).padStart(3, "0")}
      </p>

      <p>
        Área:
        ${sticker.area}
      </p>
    `;

    } else {

        body.innerHTML = `
      <div class="modal-image-wrapper">
      <img src="${getStickerImage(sticker.image_path)}" />
  </div>
      <h2>
        ${sticker.profession}
      </h2>

      <p>
        <b>Área:</b>
        ${sticker.area}
      </p>

      <p>
        <b>Curso:</b>
        ${sticker.course}
      </p>

      <p>
        <b>Na Copa:</b><br>
        ${sticker.copa_description}
      </p>

      <p>
        <b>No Dia a Dia:</b><br>
        ${sticker.real_description}
      </p>

      <p class="illustrator">
    🎨 Ilustrada por ${sticker.illustrator || "desconhecido"}
</p> <br> 
    `;
    }

    modal.classList.remove("hidden");
}

document
    .getElementById("closeModal")
    .onclick =
    () =>
        document
            .getElementById("modal")
            .classList.add("hidden");
