// rewards.js

const MIN_SCORE = 120;

async function grantMissionReward(playerId, missionId, score, missionSlug) {

    if (score < MIN_SCORE) return false;

    const { data: existing } = await GameDB
        .from("mission_rewards")
        .select("*")
        .eq("player_id", playerId)
        .eq("mission_id", missionId)
        .maybeSingle();

    if (existing) return false;

    const { error } = await GameDB
        .from("mission_rewards")
        .insert([{
            player_id: playerId,
            mission_id: missionId,
            reward_type: "extra_pack",
            reward_value: 1,
            unlocked: true,
            claimed: false
        }]);

    if (error) {
        console.error("Erro reward:", error);
        return false;
    }

    return true;
}