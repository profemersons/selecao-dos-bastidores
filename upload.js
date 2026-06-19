init();
let selectedSticker = null;
let allStickers = [];
let currentFilter = "all";
async function init() {

    const { data: stickers } =
        await client
            .from("stickers")
            .select("*")
            .order("global_number");

    allStickers = stickers;

    render(stickers);

    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";

    setInterval(async () => {

        const { data: stickers } =
            await client
                .from("stickers")
                .select("*")
                .order("global_number");

        allStickers = stickers;

        setFilter(currentFilter);

    }, 60000);
}
function getStickerImage(path) {

    return `https://wztykabslwojjlsgwtfc.supabase.co/storage/v1/object/public/stikers/${path}`;
}

function render(stickers) {

    const completed =
        stickers.filter(
            s => s.illustrator
        ).length;
    document.getElementById("stats").innerHTML =
        `
        <h2>
            ${completed} / ${stickers.length}
        </h2>

        <p>
            Figurinhas ilustradas
        </p>
        `;

    const grid =
        document.getElementById("stickersGrid");

    grid.innerHTML = "";

    stickers.forEach(sticker => {

        const done =
            !!sticker.illustrator;
        const card =
            document.createElement("div");

        card.className = "card";

        card.innerHTML =
            `
    ${done
                ? `
        <img
            src="${getStickerImage(sticker.image_path)}"
            class="thumb"
        >
        `
                : `
        <div class="placeholder">
            🎨
        </div>
        `
            }

    <h3>
        #${String(
                sticker.global_number
            ).padStart(3, "0")}
    </h3>

    <p>
        ${sticker.profession}
    </p>

    <p class="${done
                ? "status-ok"
                : "status-pending"
            }">

        ${done
                ? "✅ Concluída"
                : "🟡 Pendente"
            }

    </p>

    ${sticker.illustrator
                ? `
        <div class="author">
            por ${sticker.illustrator}
        </div>
        `
                : ""
            }
`;
        card.onclick = () => {

            selectedSticker = sticker;

            document.getElementById(
                "modalTitle"
            ).innerText =
                `#${String(
                    sticker.global_number
                ).padStart(3, "0")} - ${sticker.profession}`;

            document
                .getElementById("modal")
                .classList.remove("hidden");
        };

        grid.appendChild(card);
    });

}

document
    .getElementById("closeModal")
    .onclick = () => {

        document
            .getElementById("modal")
            .classList.add("hidden");
    };

document
    .getElementById("uploadButton")
    .onclick = uploadArtwork;

async function uploadArtwork() {

    if (!selectedSticker) {
        return;
    }

    const file =
        document
            .getElementById("imageFile")
            .files[0];

    if (!file) {

        alert(
            "Selecione uma imagem."
        );

        return;
    }

    const name =
        document
            .getElementById(
                "illustratorName"
            )
            .value
            .trim();

    const social =
        document
            .getElementById(
                "illustratorSocial"
            )
            .value
            .trim();

    const illustrator =
        social
            ? `${name} (${social})`
            : name;

    const fileName =
        `${selectedSticker.global_number}.png`;

    const result =
        await client.storage
            .from("stikers")
            .upload(
                fileName,
                file,
                {
                    upsert: true
                }
            );

    console.log("UPLOAD RESULT:");
    console.log(result);

    if (result.error) {

        console.error(result.error);

        alert(
            JSON.stringify(result.error)
        );

        return;
    }

    await client
        .from("stickers")
        .update({
            illustrator
        })
        .eq(
            "id",
            selectedSticker.id
        );

    alert(
        "Arte enviada com sucesso!"
    );

    await init();
}
function setFilter(filter) {

    currentFilter = filter;

    let filtered =
        [...allStickers];

    if (filter === "pending") {

        filtered =
            filtered.filter(
                s => !s.illustrator
            );
    }

    if (filter === "done") {

        filtered =
            filtered.filter(
                s => s.illustrator
            );
    }

    render(filtered);
}
function showToast(message) {

    const toast =
        document.createElement("div");

    toast.className =
        "toast";

    toast.innerText =
        message;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.remove();

    }, 3000);
}