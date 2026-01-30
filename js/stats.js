// Statistics calculation functions
import { state } from './state.js';
import { getGlobalPlayer, getSidePlayerIds, formatPlayersLabel, getTeamKey, isDoubleTournament } from './utils.js';

export function calculateStats(t) {
    const statsMap = new Map();
    t.playerIds.forEach(id => {
        statsMap.set(id, { player: getGlobalPlayer(id), played: 0, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 });
    });
    t.matches.filter(m => m.completed).forEach(m => {
        const side1Players = getSidePlayerIds(t, m, 1);
        const side2Players = getSidePlayerIds(t, m, 2);
        const winnerSide = m.score1 === m.score2 ? null : (m.score1 > m.score2 ? 1 : 2);
        side1Players.forEach(id => {
            const stat = statsMap.get(id);
            if (!stat) return;
            stat.played++;
            stat.scoreFor += m.score1;
            stat.scoreAgainst += m.score2;
            if (winnerSide === 1) stat.wins++; else if (winnerSide === 2) stat.losses++;
        });
        side2Players.forEach(id => {
            const stat = statsMap.get(id);
            if (!stat) return;
            stat.played++;
            stat.scoreFor += m.score2;
            stat.scoreAgainst += m.score1;
            if (winnerSide === 2) stat.wins++; else if (winnerSide === 1) stat.losses++;
        });
    });
    return Array.from(statsMap.values())
        .filter(s => s.player)
        .sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            const scoreDiffA = a.scoreFor - a.scoreAgainst; 
            const scoreDiffB = b.scoreFor - b.scoreAgainst;
            if (scoreDiffB !== scoreDiffA) return scoreDiffB - scoreDiffA;
            return b.scoreFor - a.scoreFor;
        });
}

export function calculateTeamStats(t) {
    if (!isDoubleTournament(t)) return [];
    const statsMap = new Map();
    (t.teams || []).forEach(team => {
        statsMap.set(team.id, {
            team,
            label: formatPlayersLabel(team.playerIds),
            played: 0,
            wins: 0,
            losses: 0,
            scoreFor: 0,
            scoreAgainst: 0
        });
    });
    t.matches.filter(m => m.completed).forEach(m => {
        const team1 = statsMap.get(m.team1Id);
        const team2 = statsMap.get(m.team2Id);
        if (!team1 || !team2) return;
        team1.played++; 
        team2.played++;
        team1.scoreFor += m.score1; 
        team1.scoreAgainst += m.score2;
        team2.scoreFor += m.score2; 
        team2.scoreAgainst += m.score1;
        if (m.score1 > m.score2) { 
            team1.wins++; 
            team2.losses++; 
        } else { 
            team2.wins++; 
            team1.losses++; 
        }
    });
    return Array.from(statsMap.values()).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const diffA = a.scoreFor - a.scoreAgainst;
        const diffB = b.scoreFor - b.scoreAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.scoreFor - a.scoreFor;
    });
}

export function calculateOverallStats() {
    const overallStats = new Map();
    state.playerDatabase.forEach(p => {
        overallStats.set(p.id, { player: p, tournaments: 0, matches: 0, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0, places: { 1: 0, 2: 0, 3: 0 } });
    });
    state.tournaments.forEach(t => {
        const completedMatches = t.matches.filter(m => m.completed);
        const playerIdsInTournament = new Set();
        completedMatches.forEach(m => {
            const side1Players = getSidePlayerIds(t, m, 1);
            const side2Players = getSidePlayerIds(t, m, 2);
            side1Players.forEach(id => playerIdsInTournament.add(id));
            side2Players.forEach(id => playerIdsInTournament.add(id));
            const winnerSide = m.score1 === m.score2 ? null : (m.score1 > m.score2 ? 1 : 2);
            side1Players.forEach(id => {
                const stat = overallStats.get(id);
                if (!stat) return;
                stat.matches++;
                stat.scoreFor += m.score1;
                stat.scoreAgainst += m.score2;
                if (winnerSide === 1) stat.wins++; else if (winnerSide === 2) stat.losses++;
            });
            side2Players.forEach(id => {
                const stat = overallStats.get(id);
                if (!stat) return;
                stat.matches++;
                stat.scoreFor += m.score2;
                stat.scoreAgainst += m.score1;
                if (winnerSide === 2) stat.wins++; else if (winnerSide === 1) stat.losses++;
            });
        });
        playerIdsInTournament.forEach(id => { 
            const s = overallStats.get(id); 
            if(s) s.tournaments++; 
        });
        const isFinished = t.matches.length > 0 && completedMatches.length === t.matches.length;
        if (isFinished) {
            const ranking = calculateStats(t);
            ranking.slice(0, 3).forEach((stat, i) => {
                const s = overallStats.get(stat.player.id);
                if(s) s.places[i+1]++;
            });
        }
    });
    return Array.from(overallStats.values()).sort((a, b) => b.wins - a.wins || (b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst));
}

export function calculateOverallTeamStats() {
    const teamStatsMap = new Map();
    state.tournaments.filter(isDoubleTournament).forEach(t => {
        const completedMatches = t.matches.filter(m => m.completed);
        completedMatches.forEach(m => {
            const team1Players = getSidePlayerIds(t, m, 1);
            const team2Players = getSidePlayerIds(t, m, 2);
            const key1 = getTeamKey(team1Players);
            const key2 = getTeamKey(team2Players);
            if (!teamStatsMap.has(key1)) {
                teamStatsMap.set(key1, { players: team1Players.slice().sort((a, b) => a - b), label: formatPlayersLabel(team1Players), matches: 0, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0, tournaments: new Set([t.id]) });
            } else {
                teamStatsMap.get(key1).tournaments.add(t.id);
            }
            if (!teamStatsMap.has(key2)) {
                teamStatsMap.set(key2, { players: team2Players.slice().sort((a, b) => a - b), label: formatPlayersLabel(team2Players), matches: 0, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0, tournaments: new Set([t.id]) });
            } else {
                teamStatsMap.get(key2).tournaments.add(t.id);
            }
            const team1 = teamStatsMap.get(key1);
            const team2 = teamStatsMap.get(key2);
            team1.matches++; 
            team2.matches++;
            team1.scoreFor += m.score1; 
            team1.scoreAgainst += m.score2;
            team2.scoreFor += m.score2; 
            team2.scoreAgainst += m.score1;
            if (m.score1 > m.score2) { 
                team1.wins++; 
                team2.losses++; 
            } else { 
                team2.wins++; 
                team1.losses++; 
            }
        });
    });
    return Array.from(teamStatsMap.values()).map(stat => ({
        ...stat,
        tournaments: stat.tournaments.size
    })).sort((a, b) => b.wins - a.wins || (b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst));
}
