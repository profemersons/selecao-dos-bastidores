const player = JSON.parse(
    localStorage.getItem("player")
);

if (!player) {
    window.location.href = "../index.html";
}

init();

/* =========================
INIT
========================= */

async function init() {

    fillPlayer();
    generateQr();
    await loadStats();

    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";
}

/* =========================
PLAYER
========================= */

function fillPlayer() {

    document.getElementById("playerName").textContent =
        player.name;

    document.getElementById("playerCourse").textContent =
        player.turma_area;

    document.getElementById("playerEmoji").textContent =
        player.emoji;

    document.getElementById("playerCode").textContent =
        player.code;

    document.getElementById("pointsCount").textContent =
        "...";
}

function generateQr() {

    new QRCode(
        document.getElementById("qrcode"),
        {
            text: player.code,
            width: 180,
            height: 180
        }
    );
}

/* =========================
STATS PRINCIPAL
========================= */

/* =========================
STATS PRINCIPAL
========================= */

async function loadStats() {

    const { data: currentPlayer } =
        await client
            .from("players")
            .select(`
                points,
                unique_count,
                shiny_count,
                trade_count,
                friend_count
            `)
            .eq("id", player.id)
            .single();

    if (!currentPlayer) return;

    document.getElementById(
        "pointsCount"
    ).textContent =
        currentPlayer.points || 0;

    document.getElementById(
        "uniqueStickers"
    ).textContent =
        currentPlayer.unique_count || 0;

    document.getElementById(
        "shinyStickers"
    ).textContent =
        currentPlayer.shiny_count || 0;

    document.getElementById(
        "friendsCount"
    ).textContent =
        currentPlayer.friend_count || 0;

    document.getElementById(
        "friendsCountCard"
    ).textContent =
        currentPlayer.friend_count || 0;

    document.getElementById(
        "tradesCount"
    ).textContent =
        currentPlayer.trade_count || 0;
}

/* =========================
MODAIS
========================= */

document.getElementById("addFriendBtn").onclick = () => {
    document.getElementById("friendModal").classList.remove("hidden");
};

function closeFriendModal() {
    document.getElementById("friendModal").classList.add("hidden");
}

document.getElementById("logoutBtn").onclick = () => {

    localStorage.removeItem("player");

    window.location.href = "../index.html";
};

function goAlbum() {
    window.location.href = "../album/album.html";
}

function goPacks() {
    window.location.href = "../pacotes/pacotes.html";
}

/* =========================
AMIGOS
========================= */

async function addFriend() {

    const code =
        document.getElementById("friendCode").value.trim().toUpperCase();

    if (!code) {
        alert("Digite um código.");
        return;
    }

    if (code === player.code) {
        alert("Você não pode adicionar a si mesmo.");
        return;
    }

    const { data: friend } =
        await client
            .from("players")
            .select("*")
            .eq("code", code)
            .single();

    if (!friend) {
        alert("Jogador não encontrado.");
        return;
    }

    const { data: existing } =
        await client
            .from("friends")
            .select("*");

    const already =
        existing.some(f =>
            (f.player_a === player.id && f.player_b === friend.id) ||
            (f.player_a === friend.id && f.player_b === player.id)
        );

    if (already) {
        alert("Esse amigo já foi adicionado.");
        return;
    }

    await client
        .from("friends")
        .insert([
            {
                player_a: player.id,
                player_b: friend.id
            }
        ]);

    await updateFriendCount(player.id);
    await updateFriendCount(friend.id);

    alert(`Agora você é amigo de ${friend.name}!`);
}

/* =========================
LISTA DE AMIGOS
========================= */

document.getElementById("viewFriendsBtn").onclick = async () => {

    await loadFriendsList();

    document.getElementById("friendsListModal").classList.remove("hidden");
};

function closeFriendsList() {
    document.getElementById("friendsListModal").classList.add("hidden");
}

async function loadFriendsList() {

    const container = document.getElementById("friendsList");

    container.innerHTML = "Carregando...";

    // 1. busca só amizades do usuário
    const { data: friendships } = await client
        .from("friends")
        .select("id, player_a, player_b")
        .or(`player_a.eq.${player.id},player_b.eq.${player.id}`);

    if (!friendships || friendships.length === 0) {
        container.innerHTML = "<p>Você ainda não possui amigos cadastrados.</p>";
        return;
    }

    // 2. extrai IDs dos amigos
    const friendIds = friendships.map(f =>
        f.player_a === player.id ? f.player_b : f.player_a
    );

    // 3. busca todos os amigos de UMA vez (IMPORTANTE)
    const { data: friendsData } = await client
        .from("players")
        .select(`
    id,
    name,
    emoji,
    turma_area,
    points,
    unique_count,
    shiny_count,
    friend_count
`)
        .in("id", friendIds);

    container.innerHTML = "";

    for (const item of friendships) {

        const friendId =
            item.player_a === player.id
                ? item.player_b
                : item.player_a;

        const friend = friendsData.find(f => f.id === friendId);

        if (!friend) continue;

        const div = document.createElement("div");

        div.className = "friend-item";

        div.innerHTML = `
            <h4>${friend.emoji} ${friend.name}</h4>
            <p>${friend.turma_area}</p>

            <div class="friend-stats">
                📖 ${friend.unique_count || 0} figurinhas únicas<br>
                ⭐ ${friend.shiny_count || 0} brilhantes<br>
                🏆 ${friend.points || 0} pontos<br>
                👥 ${friend.friend_count || 0} amigos
            </div>

            <button onclick="removeFriend('${item.id}')">
                ❌ Remover amigo
            </button>
        `;

        container.appendChild(div);
    }
}

/* =========================
REMOVER AMIGO
========================= */

async function removeFriend(friendshipId) {

    const confirmDelete =
        confirm("Deseja realmente remover este amigo?");

    if (!confirmDelete) return;

    // buscar amizade antes de deletar (precisamos dos 2 players)
    const { data: friendship } =
        await client
            .from("friends")
            .select("player_a, player_b")
            .eq("id", friendshipId)
            .single();

    if (!friendship) {
        alert("Amizade não encontrada.");
        return;
    }

    const { error } =
        await client
            .from("friends")
            .delete()
            .eq("id", friendshipId);

    if (error) {
        alert("Erro ao remover amigo.");
        return;
    }

    // 🔁 recalcular stats dos dois jogadores
    await updateFriendCount(friendship.player_a);
    await updateFriendCount(friendship.player_b);

    alert("Amizade removida.");

    await loadStats();
    await loadFriendsList();
}

async function updateFriendCount(playerId) {

    const { data } = await client
        .from("friends")
        .select("player_a, player_b");

    const count = (data || []).filter(f =>
        f.player_a === playerId ||
        f.player_b === playerId
    ).length;

    await client
        .from("players")
        .update({
            friend_count: count
        })
        .eq("id", playerId);
}