async function calculatePlayerStats(playerId) {

    const { data: inventory } =
        await client
            .from("inventory")
            .select("*")
            .eq(
                "player_id",
                playerId
            );

    const { data: stickers } =
        await client
            .from("stickers")
            .select("*");

    const uniqueOwned =
        inventory.length;

    const totalOwned =
        inventory.reduce(
            (sum, item) =>
                sum + item.quantity,
            0
        );

    const shinyOwned =
        inventory.filter(
            item => item.is_shiny
        ).length;

    const ownedStickerIds =
        inventory.map(
            item => item.sticker_id
        );

    const percent =
        Math.floor(
            (
                ownedStickerIds.length /
                stickers.length
            ) * 100
        );

    const areas =
        {};

    stickers.forEach(sticker => {

        if (
            sticker.type ===
            "legendary"
        ) return;

        if (
            !areas[
                sticker.area
            ]
        ) {

            areas[
                sticker.area
            ] = [];
        }

        areas[
            sticker.area
        ].push(
            sticker.id
        );
    });

    let completedAreas = 0;

    Object.values(
        areas
    ).forEach(areaIds => {

        const complete =
            areaIds.every(
                id =>
                    ownedStickerIds.includes(
                        id
                    )
            );

        if (complete) {
            completedAreas++;
        }
    });

    return {
        totalOwned,
        uniqueOwned,
        shinyOwned,
        completedAreas,
        percent
    };
}
async function calculatePlayerScore(
    playerId
) {

    const {
        data: inventory
    } =
        await client
            .from("inventory")
            .select("*")
            .eq(
                "player_id",
                playerId
            );

    let score = 0;

    inventory.forEach(item => {

        if (item.is_shiny) {

            score +=
                item.quantity * 3;

        } else {

            score +=
                item.quantity;
        }
    });

    const stats =
        await calculatePlayerStats(
            playerId
        );

    score +=
        stats.completedAreas * 10;

    return score;
}