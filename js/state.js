// State management
import { TOURNAMENT_TYPES } from './constants.js';

// Globální state
export let state = {
    settings: {
        soundsEnabled: true,
        voiceAssistEnabled: false,
        showLockedTournaments: false,
        motivationalPhrasesEnabled: true
    },
    playerDatabase: [],
    tournaments: [],
    activeTournamentId: null,
    activeMatchId: null,
    scoreHistory: []
};

export function updateStateWithApiData(data) {
    state.settings = {
        soundsEnabled: true,
        voiceAssistEnabled: false,
        showLockedTournaments: false,
        motivationalPhrasesEnabled: true,
        ...(data.settings || {})
    };
    state.playerDatabase = (data.playerDatabase || []).map(p => ({
        id: parseInt(p.id, 10),
        name: p.name,
        photoUrl: p.photo_url,
        strengths: p.strengths,
        weaknesses: p.weaknesses
    }));
    state.tournaments = (data.tournaments || []).map(raw => {
        const normalizedMatches = (raw.matches || []).map(m => {
            let parsedRotation = null;
            if (m.double_rotation_state) {
                try { parsedRotation = JSON.parse(m.double_rotation_state); } catch (e) { parsedRotation = null; }
            }
            return {
                id: parseInt(m.id, 10),
                player1Id: m.player1_id !== null ? parseInt(m.player1_id, 10) : null,
                player2Id: m.player2_id !== null ? parseInt(m.player2_id, 10) : null,
                team1Id: m.team1_id !== null ? parseInt(m.team1_id, 10) : null,
                team2Id: m.team2_id !== null ? parseInt(m.team2_id, 10) : null,
                score1: parseInt(m.score1, 10),
                score2: parseInt(m.score2, 10),
                completed: !!parseInt(m.completed, 10),
                firstServer: m.first_server !== null ? parseInt(m.first_server, 10) : null,
                servingPlayer: m.serving_player !== null ? parseInt(m.serving_player, 10) : null,
                sidesSwapped: !!parseInt(m.sides_swapped, 10),
                matchOrder: m.match_order !== null ? parseInt(m.match_order, 10) : 0,
                doubleRotationState: parsedRotation
            };
        });
        return {
            id: parseInt(raw.id, 10),
            name: raw.name,
            pointsToWin: parseInt(raw.points_to_win ?? raw.pointsToWin ?? 11, 10),
            type: raw.type || TOURNAMENT_TYPES.SINGLE,
            isLocked: !!parseInt(raw.is_locked ?? raw.isLocked ?? 0, 10),
            createdAt: raw.createdAt,
            playerIds: (raw.playerIds || []).map(id => parseInt(id, 10)),
            teams: (raw.teams || []).map(team => ({
                id: parseInt(team.id, 10),
                playerIds: (team.playerIds || []).map(id => parseInt(id, 10)),
                order: parseInt(team.order ?? team.team_order ?? 0, 10)
            })),
            matches: normalizedMatches
        };
    });
}

export function saveState() {
    // State se ukládá na serveru, lokální ukládání není potřeba
}
