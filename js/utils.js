// Utility funkce
import { state } from './state.js';
import { TOURNAMENT_TYPES, playerColors } from './constants.js';

export const getGlobalPlayer = (id) => state.playerDatabase.find(p => p.id === id);
export const getTournament = (id = state.activeTournamentId) => state.tournaments.find(t => t.id === id);
export const getMatch = (tournament, matchId) => tournament.matches.find(m => m.id == matchId);
export const formatDate = (iso) => new Date(iso).toLocaleDateString('cs-CZ');
export const cloneState = (value) => value ? JSON.parse(JSON.stringify(value)) : null;
export const isDoubleTournament = (t) => (t?.type || TOURNAMENT_TYPES.SINGLE) === TOURNAMENT_TYPES.DOUBLE;
export const getPlayerColor = (tournament, playerId) => {
    const index = tournament.playerIds.indexOf(playerId);
    return playerColors[(index >= 0 ? index : 0) % playerColors.length];
};
export const getTeamById = (t, teamId) => (t?.teams || []).find(team => team.id === teamId);
export const getTeamPlayerIds = (t, teamId) => {
    const team = getTeamById(t, teamId);
    return team ? [...team.playerIds] : [];
};
export const getSidePlayerIds = (t, match, side) => {
    if (isDoubleTournament(t)) {
        const teamId = side === 1 ? match.team1Id : match.team2Id;
        const players = getTeamPlayerIds(t, teamId);
        if (players.length > 0) {
            return players;
        }
    }
    const playerId = side === 1 ? match.player1Id : match.player2Id;
    return playerId ? [playerId] : [];
};
export const formatPlayersLabel = (playerIds) => {
    const names = playerIds
        .map(id => getGlobalPlayer(id)?.name)
        .filter(Boolean);
    return names.length ? names.join(' + ') : 'Neznámý tým';
};
export const buildSideDescriptor = (t, playerIds, teamId) => {
    const primaryPlayerId = playerIds[0] ?? null;
    return {
        teamId,
        playerIds,
        label: formatPlayersLabel(playerIds),
        colorClass: primaryPlayerId !== null ? getPlayerColor(t, primaryPlayerId) : playerColors[0]
    };
};
export const getDisplaySides = (t, match) => {
    const leftSideIndex = match.sidesSwapped ? 2 : 1;
    const rightSideIndex = match.sidesSwapped ? 1 : 2;
    const leftPlayers = getSidePlayerIds(t, match, leftSideIndex);
    const rightPlayers = getSidePlayerIds(t, match, rightSideIndex);
    const rawLeftPlayers = getSidePlayerIds(t, match, 1);
    const rawRightPlayers = getSidePlayerIds(t, match, 2);
    return {
        left: buildSideDescriptor(t, leftPlayers, leftSideIndex === 1 ? match.team1Id : match.team2Id),
        right: buildSideDescriptor(t, rightPlayers, rightSideIndex === 1 ? match.team1Id : match.team2Id),
        raw: {
            side1: buildSideDescriptor(t, rawLeftPlayers, match.team1Id),
            side2: buildSideDescriptor(t, rawRightPlayers, match.team2Id)
        }
    };
};
export const getTournamentTypeLabel = (t) => isDoubleTournament(t) ? 'Čtyřhra' : 'Dvouhra';
export const getTournamentTypeIcon = (t) => isDoubleTournament(t) ? 'fa-users' : 'fa-user';
export const getTournamentTypeColor = (t) => isDoubleTournament(t) ? 'text-blue-600' : 'text-green-600';
export const getPlayerLimitForType = (type) => type === TOURNAMENT_TYPES.DOUBLE ? 16 : 8;
export const getMinPlayersForType = (type) => type === TOURNAMENT_TYPES.DOUBLE ? 4 : 2;
export const getTeamKey = (playerIds) => [...playerIds].sort((a, b) => a - b).join('-');
export const getMatchResultForPlayers = (t, match, playerAId, playerBId) => {
    const side1 = getSidePlayerIds(t, match, 1);
    const side2 = getSidePlayerIds(t, match, 2);
    const aOnSide1 = side1.includes(playerAId);
    const aOnSide2 = side2.includes(playerAId);
    const bOnSide1 = side1.includes(playerBId);
    const bOnSide2 = side2.includes(playerBId);
    if ((aOnSide1 && bOnSide2) || (aOnSide2 && bOnSide1)) {
        const aScore = aOnSide1 ? match.score1 : match.score2;
        const bScore = bOnSide1 ? match.score1 : match.score2;
        return { aScore, bScore };
    }
    return null;
};
export const getCzechPlayerDeclension = (count) => {
    if (count === 1) return 'hráč';
    if (count >= 2 && count <= 4) return 'hráči';
    return 'hráčů';
};
