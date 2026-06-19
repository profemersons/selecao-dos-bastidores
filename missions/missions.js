const player = JSON.parse(localStorage.getItem("player"));

if (!player) {
    window.location.href = "../index.html";
}

init();

async function init() {
    await loadMissions();

    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";
}

async function loadMissions() {

    const container = document.getElementById("missionsContainer");
    container.innerHTML = "Carregando...";

    const { data: missions, error } = await client
        .from("missions")
        .select("*")
        .order("id");

    if (error) {
        container.innerHTML = "Erro ao carregar missões";
        console.error(error);
        return;
    }

    if (!missions || missions.length === 0) {
        container.innerHTML = "Nenhuma missão disponível";
        return;
    }

    container.innerHTML = "";

    for (const mission of missions) {

        const { data: done } = await client
            .from("mission_completions")
            .select("*")
            .eq("player_id", player.id)
            .eq("mission_id", mission.id)
            .maybeSingle();

        const completed = !!done;

        const div = document.createElement("div");
        div.className = "mission";

        div.innerHTML = `
            <h3>${mission.title}</h3>

            <p>
                Recompensa: figurinha #${mission.reward_value}
            </p>

            <button ${completed ? "disabled" : ""}>
                ${completed ? "Concluída ✔" : "Concluir"}
            </button>
        `;

        if (!completed) {
            div.querySelector("button").onclick = () => {
                completeMission(mission);
            };
        }

        container.appendChild(div);
    }
}

async function completeMission(mission) {

    // 1. evita duplicação
    const { data: already } = await client
        .from("mission_completions")
        .select("*")
        .eq("player_id", player.id)
        .eq("mission_id", mission.id)
        .maybeSingle();

    if (already) {
        alert("Você já concluiu essa missão.");
        return;
    }

    // 2. salva conclusão
    const { error } = await client
        .from("mission_completions")
        .insert([{
            player_id: player.id,
            mission_id: mission.id,
            reward_claimed: true
        }]);

    if (error) {
        console.error(error);
        alert("Erro ao concluir missão.");
        return;
    }

    // 3. dá recompensa
    await giveSticker(mission.reward_value);

    alert("Missão concluída! 🎉");

    // 4. recarrega UI
    await loadMissions();
}

async function giveSticker(stickerId) {

    const { data: existing } = await client
        .from("inventory")
        .select("*")
        .eq("player_id", player.id)
        .eq("sticker_id", stickerId)
        .maybeSingle();

    if (existing) {

        await client
            .from("inventory")
            .update({
                quantity: existing.quantity + 1
            })
            .eq("id", existing.id);

    } else {

        await client
            .from("inventory")
            .insert([{
                player_id: player.id,
                sticker_id: stickerId,
                quantity: 1
            }]);
    }
}

/* NAV */

function goAlbum() {
    window.location.href = "../album/album.html";
}

function goPacks() {
    window.location.href = "../pacotes/pacotes.html";
}

function goProfile() {
    window.location.href = "../perfil/perfil.html";
}