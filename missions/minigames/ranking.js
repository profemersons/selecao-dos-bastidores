async function saveBestScore(playerId, missionSlug, score) {

    const { data } = await GameDB
        .from("mission_scores")
        .select("*")
        .eq("player_id", playerId)
        .eq("mission_slug", missionSlug)
        .order("score", { ascending: false })
        .limit(1);

    const best = data?.[0];

    if (!best || score > best.score) {

        await GameDB
            .from("mission_scores")
            .insert([{
                player_id: playerId,
                mission_slug: missionSlug,
                score
            }]);
    }
}