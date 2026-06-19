/* =========================
RECALCULAR PLAYER
========================= */

async function recalculatePlayerStats(playerId) {

    const { data: inventory } =
        await client
            .from("inventory")
            .select("*")
            .eq("player_id", playerId);

    if (!inventory) return;

    const { data: stickers } =
        await client
            .from("stickers")
            .select("*");

    const stickerMap = new Map();

    stickers.forEach(sticker => {

        stickerMap.set(
            sticker.id,
            sticker
        );

    });

    let points = 0;

    let shinyCount = 0;

    let uniqueVariantCount = 0;

    let totalStickers = 0;

    const discoveredNumbers =
        new Set();

    inventory.forEach(item => {

        const sticker =
            stickerMap.get(
                item.sticker_id
            );

        if (!sticker) return;

        const qty =
            item.quantity || 0;

        totalStickers += qty;

        const isShiny =
            item.is_shiny === true;

        const isLegendary =
            sticker.rarity === "legendary";

        /* =====================
        ARTILHEIRO
        comum e brilhante contam separados
        ===================== */

        uniqueVariantCount++;

        /* =====================
        COMPLETUDE
        comum OU brilhante contam uma vez
        ===================== */

        discoveredNumbers.add(
            sticker.global_number
        );

        /* =====================
        BRILHANTE
        ===================== */

        if (isShiny) {

            shinyCount += qty;

            points += qty * 7;

            return;
        }

        /* =====================
        LENDÁRIA
        ===================== */

        if (isLegendary) {

            points += qty * 10;

            return;
        }

        /* =====================
        COMUM
        ===================== */

        points += 5;

        if (qty > 1) {

            points += (qty - 1);

        }

    });

    /* =========================
    COMPLETUDE
    ========================= */

    const totalAlbum =
        stickers.length;

    const albumCompletion =
        totalAlbum > 0
            ? (
                discoveredNumbers.size /
                totalAlbum
            ) * 100
            : 0;

    /* =========================
    TROCAS
    ========================= */

    const { data: trades } =
        await client
            .from("trades")
            .select(
                "from_player,to_player"
            );

    const tradeCount =
        (trades || []).filter(
            trade =>
                trade.from_player === playerId
                ||
                trade.to_player === playerId
        ).length;

    /* =========================
    AMIGOS
    ========================= */

    const { data: friends } =
        await client
            .from("friends")
            .select(
                "player_a,player_b"
            );

    const friendCount =
        (friends || []).filter(
            friend =>
                friend.player_a === playerId
                ||
                friend.player_b === playerId
        ).length;

    /* =========================
    UPDATE PLAYER
    ========================= */

    await client
    await client
        .from("players")
        .update({

            points,

            shiny_count:
                shinyCount,

            unique_count:
                uniqueVariantCount,

            total_stickers:
                totalStickers,

            album_completion:
                Number(
                    albumCompletion.toFixed(2)
                ),

            trade_count:
                tradeCount,

            friend_count:
                friendCount

        })
        .eq(
            "id",
            playerId
        );

    console.log(
        "Stats atualizadas:",
        playerId,
        {
            points,
            shinyCount,
            uniqueVariantCount,
            totalStickers,
            albumCompletion,
            tradeCount,
            friendCount
        }
    );
}

/* =========================
CALCULAR STATS
========================= */

async function calculatePlayerStats(playerId) {

    const { data: inventory } =
        await client
            .from("inventory")
            .select("*")
            .eq("player_id", playerId);

    const stats = {

        uniqueOwned: 0,

        totalOwned: 0,

        shinyOwned: 0,

        albumOwned: 0

    };

    if (!inventory) {
        return stats;
    }

    const { data: stickers } =
        await client
            .from("stickers")
            .select(
                "id,global_number"
            );

    const stickerMap =
        new Map();

    stickers.forEach(sticker => {

        stickerMap.set(
            sticker.id,
            sticker
        );

    });

    const discoveredNumbers =
        new Set();

    inventory.forEach(item => {

        stats.uniqueOwned++;

        stats.totalOwned +=
            item.quantity || 0;

        if (item.is_shiny) {

            stats.shinyOwned +=
                item.quantity || 0;

        }

        const sticker =
            stickerMap.get(
                item.sticker_id
            );

        if (sticker) {

            discoveredNumbers.add(
                sticker.global_number
            );

        }

    });

    stats.albumOwned =
        discoveredNumbers.size;

    return stats;
}

/* =========================
CALCULAR SCORE
========================= */

async function calculatePlayerScore(playerId) {

    const { data: inventory } =
        await client
            .from("inventory")
            .select("*")
            .eq("player_id", playerId);

    if (!inventory) {
        return 0;
    }

    const { data: stickers } =
        await client
            .from("stickers")
            .select("*");

    const stickerMap =
        new Map();

    stickers.forEach(sticker => {

        stickerMap.set(
            sticker.id,
            sticker
        );

    });

    let score = 0;

    inventory.forEach(item => {

        const sticker =
            stickerMap.get(
                item.sticker_id
            );

        if (!sticker) return;

        const qty =
            item.quantity || 0;

        if (item.is_shiny) {

            score += qty * 7;
            return;
        }

        if (
            sticker.rarity ===
            "legendary"
        ) {

            score += qty * 10;
            return;
        }

        score += 5;

        if (qty > 1) {

            score +=
                (qty - 1);

        }

    });

    return score;
}