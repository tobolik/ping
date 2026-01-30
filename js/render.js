// Render functions - všechny render funkce pro zobrazení obrazovek
import { state } from './state.js';
import { showScreen, renderGameScreen, openModal } from './ui.js';
import { 
    getGlobalPlayer, getTournament, getMatch, formatDate, isDoubleTournament, 
    getDisplaySides, getSidePlayerIds, formatPlayersLabel, getTeamKey,
    getTournamentTypeIcon, getTournamentTypeColor, getTournamentTypeLabel,
    getCzechPlayerDeclension, getMatchResultForPlayers
} from './utils.js';
import { playerColors, winningPhrases } from './constants.js';
import { calculateStats, calculateTeamStats, calculateOverallStats, calculateOverallTeamStats } from './stats.js';
import { checkWinCondition } from './game-logic.js';
import { speak } from './audio.js';
import { showAlertModal } from './ui.js';

export function getTournamentStatus(t) {
    const completedCount = t.matches.filter(m => m.completed).length;
    const totalMatches = t.matches.length;
    if (totalMatches > 0 && completedCount === totalMatches) {
        return { icon: 'fa-trophy', color: 'text-yellow-500', text: 'Dokončeno' };
    }
    if (completedCount > 0 || t.matches.some(m => m.score1 > 0 || m.score2 > 0)) {
        return { icon: 'fa-person-running', color: 'text-blue-500', text: 'Probíhá' };
    }
    return { icon: 'fa-play-circle', color: 'text-gray-400', text: 'Připraveno' };
}

export function renderPlayerDbScreen() {
    const container = document.getElementById('player-db-list-container');
    if(state.playerDatabase.length === 0) { 
        container.innerHTML = `<div class="text-center text-gray-500 p-8 bg-white rounded-xl">Databáze je prázdná. Přidejte prvního hráče.</div>`; 
    } else {
        container.innerHTML = state.playerDatabase.sort((a,b) => a.name.localeCompare(b.name)).map(p => {
            const photo = p.photoUrl || `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23e5e7eb%22%20rx%3D%2220%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22central%22%20text-anchor%3D%22middle%22%20font-family%3D%22Inter%22%20font-size%3D%2216%22%20fill%3D%22%239ca3af%22%3E${p.name.charAt(0).toUpperCase()}%3C%2Ftext%3E%3C%2Fsvg%3E`;
            return `<div class="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between"><div class="flex items-center gap-3"><img src="${photo}" class="w-10 h-10 rounded-full object-cover bg-gray-200"><span class="font-semibold">${p.name}</span></div><div><button data-action="show-edit-player-modal" data-id="${p.id}" class="btn btn-secondary !p-2 h-10 w-10" title="Upravit hráče"><i class="fa-solid fa-pencil"></i></button><button data-action="delete-player" data-id="${p.id}" class="btn btn-danger !p-2 h-10 w-10" title="Smazat hráče"><i class="fa-solid fa-trash"></i></button></div></div>`;
        }).join('');
    }
    showScreen('playerDb');
}

export function renderMainScreen() {
    const container = document.getElementById('tournaments-list-container');
    const showLocked = state.settings.showLockedTournaments || false;
    const visibleTournaments = showLocked ? state.tournaments : state.tournaments.filter(t => !t.isLocked);
    const lockedTournaments = state.tournaments.filter(t => t.isLocked);
    const hasLockedTournaments = lockedTournaments.length > 0;

    if (visibleTournaments.length === 0) {
        let emptyStateHTML = `<div class="text-center py-10 px-6 bg-white rounded-xl shadow-sm"><i class="fa-solid fa-trophy text-5xl text-gray-300"></i><h2 class="text-xl font-semibold text-gray-700 mt-4">Žádné turnaje`;

        if (hasLockedTournaments && !showLocked) {
            emptyStateHTML += ` k zobrazení</h2><p class="text-gray-500 mt-1">Existuje ${lockedTournaments.length} zamčen${lockedTournaments.length === 1 ? 'ý' : lockedTournaments.length < 5 ? 'é' : 'ých'} turnaj${lockedTournaments.length === 1 ? '' : lockedTournaments.length < 5 ? 'e' : 'ů'}, které se nezobrazují.</p><button data-action="show-locked-tournaments" class="btn btn-secondary mt-4"><i class="fa-solid fa-lock"></i> Zobrazit zamčené turnaje</button>`;
        } else {
            emptyStateHTML += `</h2><p class="text-gray-500 mt-1">Vytvořte svůj první ping pongový turnaj</p>`;
        }

        emptyStateHTML += `<button data-action="show-new-tournament-modal" class="btn btn-primary mt-4 flex items-center gap-2"><i class="fa-solid fa-plus"></i> Nový turnaj</button></div>`;
        container.innerHTML = emptyStateHTML;
    } else {
        container.innerHTML = visibleTournaments.sort((a,b) => b.id - a.id).map(t => {
            const completedCount = t.matches.filter(m => m.completed).length; 
            const totalMatches = t.matches.length;
            const isFinished = totalMatches > 0 && completedCount === totalMatches;
            let winnerInfo = '';
            if (isFinished) { 
                const stats = calculateStats(t); 
                const winnerId = stats.length > 0 && stats[0].wins > 0 ? stats[0].player.id : null; 
                const winner = winnerId ? getGlobalPlayer(winnerId) : null; 
                winnerInfo = `<p class="font-bold text-yellow-500"><i class="fa-solid fa-trophy"></i> Vítěz: ${winner ? winner.name : 'Remíza'}</p>`; 
            }
            const status = getTournamentStatus(t);
            const nameClass = t.isLocked ? 'text-gray-500' : '';

            let buttonText = "Zobrazit";
            let buttonClass = "btn-secondary";

            if (status.text === 'Připraveno') {
                buttonText = "Start turnaje";
                buttonClass = "btn-primary";
            } else if (status.text === 'Probíhá') {
                buttonText = "Pokračovat v turnaji";
                buttonClass = "bg-blue-500 hover:bg-blue-600 text-white";
            } else if (status.text === 'Dokončeno') {
                buttonText = "Zobrazit výsledky";
                buttonClass = "bg-yellow-400 hover:bg-yellow-500 text-black";
            }

            const typeIcon = getTournamentTypeIcon(t);
            const typeColor = getTournamentTypeColor(t);
            const typeLabel = getTournamentTypeLabel(t);
            return `<div class="bg-white p-4 rounded-xl shadow-sm space-y-3 ${isDoubleTournament(t) ? 'border-l-4 border-blue-500' : 'border-l-4 border-green-500'}" data-test-id="tournament-card-${t.id}"><div class="flex justify-between items-start"><div><h2 class="text-xl font-bold ${nameClass}">${t.name}</h2><p class="text-sm text-gray-500"><span class="${typeColor} font-semibold"><i class="fa-solid ${typeIcon}"></i> ${typeLabel}</span> &bull; ${t.playerIds.length} ${getCzechPlayerDeclension(t.playerIds.length)} &bull; ${completedCount}/${totalMatches} zápasů &bull; Vytvořeno: ${formatDate(t.createdAt)}</p>${winnerInfo}</div><div class="flex items-center gap-3 text-xl text-gray-400"><i class="fa-solid ${status.icon} ${status.color}" title="${status.text}"></i><button data-action="toggle-lock-main" data-id="${t.id}" data-test-id="toggle-lock-${t.id}" class="text-xl" title="${t.isLocked ? 'Odemknout turnaj' : 'Zamknout turnaj'}">${t.isLocked ? '🔒' : '🔓'}</button></div></div>${!t.isLocked ? `<button data-action="open-tournament" data-id="${t.id}" data-test-id="open-tournament-${t.id}" class="btn ${buttonClass} w-full">${buttonText}</button>`: ''}</div>`;
        }).join('');
    }
    showScreen('main');
}

export function renderTournamentScreen() {
    const t = getTournament(); 
    if (!t) { 
        renderMainScreen(); 
        return; 
    }
    document.getElementById('tournament-title').innerHTML = `<div class="flex items-center gap-2"><span id="tournament-name-text">${t.name}</span><button data-action="quick-edit-name" class="btn btn-secondary !p-0 w-8 h-8 text-xs flex-shrink-0" title="Rychlá úprava názvu"><i class="fa-solid fa-pencil"></i></button></div>`;
    document.getElementById('tournament-progress').textContent = `${t.matches.filter(m => m.completed).length}/${t.matches.length} zápasů dokončeno`;

    const renderMatch = (m, isCompleted, index) => {
        const sides = getDisplaySides(t, m);
        if (!sides.left.playerIds.length || !sides.right.playerIds.length) return '';
        const isSuspended = !isCompleted && m.firstServer !== null;
        const servingIndicator = ' <span class="text-base">🏓</span>';
        const servingPlayerId = m.servingPlayer;
        const serveBadge = (side) => (isSuspended && servingPlayerId && side.playerIds.includes(servingPlayerId)) ? servingIndicator : '';
        const makeBadge = (side, alignRight = false, highlight = false) => `
            <div class="flex ${alignRight ? 'justify-end text-right' : 'justify-start'} items-center gap-1 sm:gap-2 flex-1 min-w-0 ${highlight ? 'font-extrabold' : ''}">
                ${alignRight ? '' : `<div class="w-5 h-5 sm:w-6 sm:h-6 ${side.colorClass} rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">${side.label.charAt(0).toUpperCase()}</div>`}
                <div class="flex flex-col ${alignRight ? 'items-end' : 'items-start'} min-w-0 flex-1">
                    <span class="text-sm sm:text-base break-words">${side.label}${serveBadge(side)}</span>
                    ${isDoubleTournament(t) ? `<span class="text-xs text-gray-500 break-words">${side.playerIds.map(id => getGlobalPlayer(id)?.name || '???').join(' • ')}</span>` : ''}
                </div>
                ${alignRight ? `<div class="w-5 h-5 sm:w-6 sm:h-6 ${side.colorClass} rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">${side.label.charAt(0).toUpperCase()}</div>` : ''}
            </div>
        `;
        const upcomingMatches = t.matches.filter(x => !x.completed);
        if (isCompleted) {
            const winnerSide = m.score1 === m.score2 ? null : (m.score1 > m.score2 ? 1 : 2);
            const scoreDisplay = m.sidesSwapped ? `${m.score2} : ${m.score1}` : `${m.score1} : ${m.score2}`;
            const leftHighlight = (m.sidesSwapped ? winnerSide === 2 : winnerSide === 1);
            const rightHighlight = (m.sidesSwapped ? winnerSide === 1 : winnerSide === 2);
            return `<div class="bg-white p-2 sm:p-3 rounded-xl shadow-sm flex items-center justify-between mt-2 gap-1 sm:gap-2">
                <div class="flex items-center gap-1 sm:gap-2 flex-grow min-w-0">
                    ${makeBadge(sides.left, false, leftHighlight)}
                    <div class="font-bold text-sm sm:text-lg flex-shrink-0">${scoreDisplay}</div>
                    ${makeBadge(sides.right, true, rightHighlight)}
                </div>
                <button data-action="edit-match" data-id="${m.id}" class="btn bg-yellow-400 hover:bg-yellow-500 text-white aspect-square !p-0 w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" title="Upravit výsledek" ${t.isLocked ? 'disabled' : ''}>
                    <i class="fa-solid fa-pencil text-xs sm:text-base"></i>
                </button>
            </div>`;
        }

        const scoreOrVs = isSuspended
            ? `<div class="font-bold text-lg">${m.sidesSwapped ? m.score2 : m.score1} : ${m.sidesSwapped ? m.score1 : m.score2}</div>`
            : `<div class="text-gray-400">vs</div>`;

        return `<div class="bg-white p-2 sm:p-3 rounded-xl shadow-sm flex items-center justify-between mt-2 gap-1 sm:gap-2">
            <div class="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <button data-action="move-match" data-id="${m.id}" data-dir="up" class="btn btn-secondary !p-0 w-5 h-5 sm:w-6 sm:h-6 text-xs" ${index === 0 ? 'disabled' : ''} title="Posunout nahoru">▲</button>
                <button data-action="move-match" data-id="${m.id}" data-dir="down" class="btn btn-secondary !p-0 w-5 h-5 sm:w-6 sm:h-6 text-xs" ${index === upcomingMatches.length - 1 ? 'disabled' : ''} title="Posunout dolů">▼</button>
            </div>
            <button data-action="swap-sides" data-id="${m.id}" data-test-id="swap-sides-${m.id}" class="btn btn-secondary !p-0 w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 text-xs sm:text-sm" title="Prohodit strany"><i class="fa-solid fa-right-left"></i></button>
            <div class="flex items-center gap-1 sm:gap-2 flex-grow min-w-0">
                ${makeBadge(sides.left, false, false)}
                <div class="flex-shrink-0 text-sm sm:text-lg">${scoreOrVs}</div>
                ${makeBadge(sides.right, true, false)}
            </div>
            <button data-action="play-match" data-id="${m.id}" data-test-id="play-match-${m.id}" class="btn btn-primary aspect-square !p-0 w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-lg flex-shrink-0" title="${isSuspended ? 'Pokračovat v zápase' : 'Hrát zápas'}" ${t.isLocked ? 'disabled' : ''}>
                ${isSuspended ? '<i class="fa-solid fa-clock-rotate-left"></i>' : '<i class="fa-solid fa-play"></i>'}
            </button>
        </div>`;
    };

    const upcomingContainer = document.getElementById('upcoming-matches-container');
    const completedContainer = document.getElementById('completed-matches-container');
    const finalResultsContainer = document.getElementById('final-results-container');

    const completedCount = t.matches.filter(m => m.completed).length;
    const totalMatches = t.matches.length;
    const isFinished = totalMatches > 0 && completedCount === totalMatches;

    upcomingContainer.innerHTML = ''; 
    completedContainer.innerHTML = ''; 
    finalResultsContainer.innerHTML = '';

    if(isFinished) {
        const stats = calculateStats(t);
        const winner = stats.length > 0 && stats[0].wins > 0 ? stats[0].player : null;
        const trophyIcons = ['', '🥈', '🥉'];
        finalResultsContainer.innerHTML = `<div class="bg-white p-6 rounded-xl shadow-sm text-center"><h2 class="text-2xl font-bold mb-2">Turnaj skončil!</h2>${winner ? `<p class="text-gray-600">Celkovým vítězem je</p><p class="text-3xl font-bold my-2">🏆 ${winner.name}</p>` : ''}<ol class="space-y-3 mt-4 text-left inline-block">${stats.slice(1).map((s, i) => `<li class="flex items-center text-lg"><span class="font-bold w-10 text-center">${i + 1 < 3 ? trophyIcons[i+1] : `#${i+2}`}</span><span>${s.player.name}</span></li>`).join('')}</ol></div>`;
    } else {
        const upcoming = t.matches.filter(m => !m.completed);
        upcomingContainer.innerHTML = upcoming.length > 0 ? `<h2 class="text-xl font-bold">Nadcházející zápasy</h2>${upcoming.map((m,i) => renderMatch(m, false, i)).join('')}` : (t.matches.length > 0 ? '' : `<div class="text-center p-4 bg-white rounded-xl text-gray-500">Žádné zápasy. Přidejte hráče v nastavení.</div>`);
    }

    const completed = t.matches.filter(m => m.completed);
    completedContainer.innerHTML = completed.length > 0 ? `<h2 class="text-xl font-bold">Dokončené zápasy</h2>${completed.map(m => renderMatch(m, true, -1)).join('')}` : '';
    showScreen('tournament');
}

export const templates = {
    leaderboardTable: (stats, t) => `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b"><th class="p-2">Poz.</th><th class="p-2">Hráč</th><th class="p-2 text-center">Vítězství</th><th class="p-2 text-center">Porážky</th><th class="p-2 text-center">Odehráno</th><th class="p-2 text-center">Úspěšnost</th></tr></thead><tbody>${stats.map((s, i) => `<tr class="border-b last:border-none"><td class="p-2 font-bold">${i === 0 && s.wins > 0 ? '🏆' : `#${i+1}`}</td><td class="p-2 flex items-center gap-2"><div class="w-4 h-4 rounded-full ${playerColors[t.playerIds.indexOf(s.player.id) % playerColors.length]}"></div> ${s.player.name}</td><td class="p-2 text-center font-bold text-green-600">${s.wins}</td><td class="p-2 text-center text-red-500">${s.losses}</td><td class="p-2 text-center">${s.played}</td><td class="p-2 text-center font-semibold">${s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0}%</td></tr>`).join('')}</tbody></table></div>`,
    teamLeaderboard: (stats) => stats.length ? `<div class="mt-4"><h3 class="text-lg font-semibold mb-2">Týmy</h3><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="p-2">Poz.</th><th class="p-2">Tým</th><th class="p-2 text-center">V</th><th class="p-2 text-center">P</th><th class="p-2 text-center">Odehráno</th><th class="p-2 text-center">Skóre</th></tr></thead><tbody>${stats.map((s, i) => `<tr class="border-b last:border-none"><td class="p-2 font-bold">${i === 0 && s.wins > 0 ? '🥇' : `#${i+1}`}</td><td class="p-2">${s.label}</td><td class="p-2 text-center text-green-600 font-semibold">${s.wins}</td><td class="p-2 text-center text-red-500">${s.losses}</td><td class="p-2 text-center">${s.played}</td><td class="p-2 text-center">${s.scoreFor}:${s.scoreAgainst}</td></tr>`).join('')}</tbody></table></div></div>` : ''
};

export function renderStatsScreen() {
    const t = getTournament();
    document.getElementById('stats-tournament-name').textContent = t.name;
    const stats = calculateStats(t);
    document.getElementById('stats-leaderboard').innerHTML = templates.leaderboardTable(stats, t);

    // Team leaderboard pro čtyřhru
    const teamStats = calculateTeamStats(t);
    const teamLeaderboardEl = document.getElementById('stats-team-leaderboard');
    if (teamLeaderboardEl) {
        teamLeaderboardEl.innerHTML = teamStats.length > 0 ? templates.teamLeaderboard(teamStats) : '';
    }

    // Matrix vzájemných zápasů
    const matrixContainer = document.getElementById('stats-matrix');
    const players = t.playerIds.map(getGlobalPlayer).filter(Boolean);
    let matrixHTML = `<table class="w-full text-sm text-center border-collapse"><thead><tr class="bg-gray-50"><th class="border p-2"></th>${players.map(p => `<th class="border p-2"><div class="flex items-center justify-center gap-1"><div class="w-3 h-3 rounded-full ${playerColors[t.playerIds.indexOf(p.id) % playerColors.length]}"></div> ${p.name}</div></th>`).join('')}</tr></thead><tbody>`;
    players.forEach(p1 => {
        matrixHTML += `<tr><td class="border p-2 font-bold bg-gray-50"><div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full ${playerColors[t.playerIds.indexOf(p1.id) % playerColors.length]}"></div> ${p1.name}</div></td>`;
        players.forEach(p2 => {
            if (p1.id === p2.id) {
                matrixHTML += `<td class="border p-2 bg-gray-200"></td>`;
            } else {
                const match = t.matches.find(m => {
                    if (!m.completed) return false;
                    const side1Players = getSidePlayerIds(t, m, 1);
                    const side2Players = getSidePlayerIds(t, m, 2);
                    return (side1Players.includes(p1.id) && side2Players.includes(p2.id)) ||
                           (side1Players.includes(p2.id) && side2Players.includes(p1.id));
                });
                if (match) {
                    const side1Players = getSidePlayerIds(t, match, 1);
                    const p1Score = side1Players.includes(p1.id) ? match.score1 : match.score2;
                    const p2Score = side1Players.includes(p1.id) ? match.score2 : match.score1;
                    matrixHTML += `<td class="border p-2 font-bold ${p1Score > p2Score ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${p1Score}:${p2Score}</td>`;
                } else {
                    matrixHTML += `<td class="border p-2 text-gray-400">?</td>`;
                }
            }
        });
        matrixHTML += `</tr>`;
    });
    matrixHTML += `</tbody></table>`;
    matrixContainer.innerHTML = matrixHTML;
    showScreen('stats');
}

export function renderOverallStatsScreen() {
    const stats = calculateOverallStats();
    const teamStats = calculateOverallTeamStats();
    const container = document.getElementById('overall-stats-container');
    let html = `<table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
                <th class="px-2 py-3">Hráč</th><th class="px-2 py-3 text-center" title="Odehrané turnaje">T</th><th class="px-2 py-3 text-center" title="Odehrané zápasy">Z</th><th class="px-2 py-3 text-center" title="Výhry">V</th><th class="px-2 py-3 text-center" title="Prohry">P</th><th class="px-2 py-3 text-center" title="Celkové skóre">Skóre</th><th class="px-2 py-3 text-center">🏆</th><th class="px-2 py-3 text-center">🥈</th><th class="px-2 py-3 text-center">🥉</th>
            </tr>
        </thead>
        <tbody>${stats.map(s => `<tr class="bg-white border-b"><td class="px-2 py-4 font-semibold">${s.player.name}</td><td class="px-2 py-4 text-center">${s.tournaments}</td><td class="px-2 py-4 text-center">${s.matches}</td><td class="px-2 py-4 text-center text-green-600">${s.wins}</td><td class="px-2 py-4 text-center text-red-600">${s.losses}</td><td class="px-2 py-4 text-center">${s.scoreFor}:${s.scoreAgainst}</td><td class="px-2 py-4 text-center">${s.places[1]}</td><td class="px-2 py-4 text-center">${s.places[2]}</td><td class="px-2 py-4 text-center">${s.places[3]}</td></tr>`).join('')}</tbody>
    </table>`;
    if (teamStats.length) {
        html += `<div class="mt-6">
            <h2 class="text-lg font-semibold mb-2">Týmy (všechny turnaje)</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th class="px-2 py-3">Tým</th><th class="px-2 py-3 text-center">Turnaje</th><th class="px-2 py-3 text-center">Z</th><th class="px-2 py-3 text-center">V</th><th class="px-2 py-3 text-center">P</th><th class="px-2 py-3 text-center">Skóre</th>
                        </tr>
                    </thead>
                    <tbody>${teamStats.map(s => `<tr class="bg-white border-b"><td class="px-2 py-3 font-semibold">${s.label}</td><td class="px-2 py-3 text-center">${s.tournaments}</td><td class="px-2 py-3 text-center">${s.matches}</td><td class="px-2 py-3 text-center text-green-600">${s.wins}</td><td class="px-2 py-3 text-center text-red-500">${s.losses}</td><td class="px-2 py-3 text-center">${s.scoreFor}:${s.scoreAgainst}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;
    }
    container.innerHTML = html;
    showScreen('overallStats');
}

export function renderStartMatchModal(match) {
    const t = getTournament();
    const sides = getDisplaySides(t, match);
    const isDouble = isDoubleTournament(t);

    let modalContent = '';
    if (isDouble) {
        // Pro čtyřhru - výběr týmu
        modalContent = `
            <div class="modal-backdrop">
                <div class="modal-content space-y-6 text-center">
                    <h1 class="text-2xl font-bold">${sides.left.label} vs ${sides.right.label}</h1>
                    <p class="text-gray-500">Hraje se na ${t.pointsToWin} bodů</p>
                    <div>
                        <h2 class="text-lg font-semibold mb-3">Kdo má první podání?</h2>
                        <div class="grid grid-cols-2 gap-4">
                            <button data-action="set-first-server" data-team-side="1" data-test-id="set-first-server-team-1" class="p-4 rounded-lg font-bold text-white ${sides.left.colorClass}">
                                ${sides.left.label}
                            </button>
                            <button data-action="set-first-server" data-team-side="2" data-test-id="set-first-server-team-2" class="p-4 rounded-lg font-bold text-white ${sides.right.colorClass}">
                                ${sides.right.label}
                            </button>
                </div>
                </div>
                    <button data-action="back-to-tournament" data-test-id="back-to-tournament-from-first-server" class="btn btn-secondary w-full mt-4">Zpět</button>
                </div>
                </div>
        `;
    } else {
        // Pro dvouhru - výběr hráče
        const p1Id = sides.left.playerIds[0];
        const p2Id = sides.right.playerIds[0];
        const p1 = getGlobalPlayer(p1Id);
        const p2 = getGlobalPlayer(p2Id);
        const p1Color = playerColors[t.playerIds.indexOf(p1Id) % playerColors.length];
        const p2Color = playerColors[t.playerIds.indexOf(p2Id) % playerColors.length];

        modalContent = `
            <div class="modal-backdrop">
                <div class="modal-content space-y-6 text-center">
                    <h1 class="text-2xl font-bold">${p1.name} vs ${p2.name}</h1>
                    <p class="text-gray-500">Hraje se na ${t.pointsToWin} bodů</p>
                    <div>
                        <h2 class="text-lg font-semibold mb-3">Kdo má první podání?</h2>
                        <div class="grid grid-cols-2 gap-4">
                            <button data-action="set-first-server" data-player-id="${p1Id}" data-test-id="set-first-server-player-${p1Id}" class="p-4 rounded-lg font-bold text-white ${p1Color}">
                                ${p1.name}
                            </button>
                            <button data-action="set-first-server" data-player-id="${p2Id}" data-test-id="set-first-server-player-${p2Id}" class="p-4 rounded-lg font-bold text-white ${p2Color}">
                                ${p2.name}
                            </button>
            </div>
                    </div>
                    <button data-action="back-to-tournament" data-test-id="back-to-tournament-from-first-server-single" class="btn btn-secondary w-full mt-4">Zpět</button>
                </div>
            </div>
        `;
    }

    openModal(modalContent);
}

export function renderGameBoard() {
    const t = getTournament();
    const m = getMatch(t, state.activeMatchId);
    if (!m) {
        console.error("Match not found!", state.activeMatchId);
        renderTournamentScreen();
        return;
    }
    const sides = getDisplaySides(t, m);
    const rawSidePlayers = {
        1: getSidePlayerIds(t, m, 1),
        2: getSidePlayerIds(t, m, 2)
    };
    const leftRawSide = m.sidesSwapped ? 2 : 1;
    const rightRawSide = m.sidesSwapped ? 1 : 2;
    const leftScore = m.sidesSwapped ? m.score2 : m.score1;
    const rightScore = m.sidesSwapped ? m.score1 : m.score2;
    const winnerSide = checkWinCondition(m, t.pointsToWin);
    const canAddPoints = !winnerSide;
    const servingRawSide = rawSidePlayers[1].includes(m.servingPlayer) ? 1 : (rawSidePlayers[2].includes(m.servingPlayer) ? 2 : null);
    const servingLabel = m.servingPlayer
        ? (isDoubleTournament(t)
            ? (getGlobalPlayer(m.servingPlayer)?.name || '...')
            : (getGlobalPlayer(m.servingPlayer)?.name || '...'))
        : '...';

    const makeScoreBox = (sideDescriptor, currentScore, rawSide) => {
        const playerNames = sideDescriptor.playerIds.map(id => getGlobalPlayer(id)?.name || '???').filter(Boolean);
        const playerIdsStr = sideDescriptor.playerIds.join(',');
        const playerNamesStr = playerNames.length > 0 ? playerNames.join(',') : 'unknown';
        const testId = `score-box-${rawSide}-${playerIdsStr}`;
        const dataAttrs = canAddPoints 
            ? `data-action="add-point" data-side="${rawSide}" data-player-ids="${playerIdsStr}" data-player-names="${playerNamesStr}" data-test-id="${testId}"`
            : `data-test-id="${testId}"`;
        return `
        <div ${dataAttrs} class="player-score-box ${sideDescriptor.colorClass} p-2 md:p-4 text-white relative flex flex-col items-center justify-center flex-1 w-1/2 h-full ${canAddPoints ? 'active-pointer cursor-pointer' : ''}">
            ${sideDescriptor.playerIds.includes(m.servingPlayer) ? `<div class="absolute top-2 left-2 md:top-4 md:left-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-400/90 text-xl md:text-2xl flex items-center justify-center">🏓</div>` : ''}
            <button data-action="subtract-point" data-side="${rawSide}" data-test-id="subtract-point-${rawSide}" class="absolute top-2 right-2 md:top-4 md:right-4 w-10 h-10 md:w-12 md:h-12 bg-black/20 rounded-full text-xl md:text-2xl">-1</button>
            <div class="text-xl md:text-2xl lg:text-3xl font-bold text-center">${sideDescriptor.label}</div>
            ${isDoubleTournament(t) ? `<div class="text-xs md:text-sm opacity-90">${playerNames.join(' • ')}</div>` : ''}
            <div class="text-7xl md:text-8xl lg:text-9xl font-extrabold my-2 md:my-4">${currentScore}</div>
            <div class="text-xs md:text-sm opacity-80">${canAddPoints ? 'Klepněte pro bod' : '&nbsp;'}</div>
        </div>
    `;
    };

    renderGameScreen(`
        <div class="h-screen flex flex-col w-full">
            <header class="bg-white/90 backdrop-blur-sm p-2 md:p-3 shadow-sm text-center flex justify-between items-center w-full z-10 flex-shrink-0">
                <button data-action="back-to-tournament" data-test-id="back-to-tournament" class="btn btn-secondary !p-1 md:!p-2 text-sm md:text-base w-20 md:w-24">Přerušit</button>
                <div class="flex-grow px-2">
                    <p class="text-xs md:text-sm text-gray-500">Hraje se na ${t.pointsToWin} bodů</p>
                    <p class="text-sm md:text-base font-semibold">Podání: ${servingLabel}</p>
                </div>
                <div class="w-28 md:w-40 flex justify-end gap-1 md:gap-2">
                    <button data-action="toggle-voice-input-ingame" class="btn btn-secondary !p-0 h-8 w-8 md:h-10 md:w-10 text-base md:text-lg ${state.settings.voiceInputEnabled ? 'text-red-600' : 'text-gray-400'}" title="Hlasové zadávání bodů">${state.settings.voiceInputEnabled ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>'}</button>
                    <button data-action="toggle-voice-assist-ingame" class="btn btn-secondary !p-0 h-8 w-8 md:h-10 md:w-10 text-base md:text-lg" title="Zapnout/vypnout hlas">${state.settings.voiceAssistEnabled ? '<i class="fa-solid fa-comment-dots"></i>' : '<i class="fa-solid fa-comment-slash"></i>'}</button>
                    <button data-action="toggle-motivational-phrases-ingame" class="btn btn-secondary !p-0 h-8 w-8 md:h-10 md:w-10 text-base md:text-lg" title="Zapnout/vypnout motivační hlášky">${state.settings.motivationalPhrasesEnabled ? '<i class="fa-solid fa-comments"></i>' : '<i class="fa-solid fa-comment-slash"></i>'}</button>
                    <button data-action="toggle-sound-ingame" class="btn btn-secondary !p-0 h-8 w-8 md:h-10 md:w-10 text-base md:text-lg" title="Zapnout/vypnout zvuky">${state.settings.soundsEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>'}</button>
                </div>
            </header>
            <div class="flex-1 flex flex-row w-full min-h-0">
                ${makeScoreBox(sides.left, leftScore, leftRawSide)}
                ${makeScoreBox(sides.right, rightScore, rightRawSide)}
            </div>
            ${winnerSide ? `<div class="absolute bottom-4 left-4 right-4 bg-white p-6 rounded-xl shadow-lg text-center space-y-3 z-20"><div class="text-3xl">🏆</div><h2 class="text-2xl font-bold">Vítěz: ${formatPlayersLabel(winnerSide === 1 ? getSidePlayerIds(t, m, 1) : getSidePlayerIds(t, m, 2))}!</h2><p class="text-gray-500">Výsledek: ${m.score1} : ${m.score2}</p><div class="flex gap-2"><button data-action="undo-last-point" class="btn btn-secondary flex-1" ${state.scoreHistory.length === 0 ? 'disabled' : ''}>Zpět</button><button data-action="save-match-result" class="btn btn-primary flex-1">Uložit výsledek</button></div></div>` : ''}
        </div>`
    );

    if (winnerSide) {
        const winnerLabel = formatPlayersLabel(winnerSide === 1 ? getSidePlayerIds(t, m, 1) : getSidePlayerIds(t, m, 2));
        const winnerScore = Math.max(m.score1, m.score2);
        const loserScore = Math.min(m.score1, m.score2);
        const randomPhrase = winningPhrases[Math.floor(Math.random() * winningPhrases.length)];
        speak(`Konec zápasu. Vítěz je ${winnerLabel} s výsledkem ${winnerScore} : ${loserScore}, ${randomPhrase}`);
    }
}

function escapeCsv(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

export function exportToCSV() {
    const t = getTournament();
    const stats = calculateStats(t);
    const players = t.playerIds.map(getGlobalPlayer).filter(Boolean);

    let csv = `Turnaj: ${t.name}\n`;
    csv += `Datum vytvoření: ${t.createdAt ? formatDate(t.createdAt) : 'Neznámé'}\n`;
    csv += `Body k výhře: ${t.pointsToWin}\n`;
    csv += `\n--- VÝSLEDKOVÁ LISTINA ---\n`;
    csv += `Pozice,Jméno,Vítězství,Porážky,Odehráno,Úspěšnost (%)\n`;
    stats.forEach((s, i) => {
        csv += `${i + 1},${escapeCsv(s.player.name)},${s.wins},${s.losses},${s.played},${s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0}\n`;
    });

    csv += `\n--- VZÁJEMNÉ ZÁPASY ---\n`;
    csv += `Hráč,${players.map(p => escapeCsv(p.name)).join(',')}\n`;
    players.forEach(p1 => {
        const row = [escapeCsv(p1.name)];
        players.forEach(p2 => {
            if (p1.id === p2.id) {
                row.push('-');
            } else {
                const match = t.matches.find(m => {
                    const result = getMatchResultForPlayers(t, m, p1.id, p2.id);
                    return result && m.completed;
                });
                if (match) {
                    const result = getMatchResultForPlayers(t, match, p1.id, p2.id);
                    row.push(`${result.aScore}:${result.bScore}`);
                } else {
                    row.push('?');
                }
            }
        });
        csv += row.join(',') + '\n';
    });

    csv += `\n--- SEZNAM ZÁPASŮ ---\n`;
    csv += `Hráč 1,Hráč 2,Skóre 1,Skóre 2,Dokončeno\n`;
    t.matches.forEach(m => {
        const team1Label = formatPlayersLabel(getSidePlayerIds(t, m, 1));
        const team2Label = formatPlayersLabel(getSidePlayerIds(t, m, 2));
        csv += `${escapeCsv(team1Label)},${escapeCsv(team2Label)},${m.score1},${m.score2},${m.completed ? 'Ano' : 'Ne'}\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `turnaj_${t.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const t = getTournament();
    const stats = calculateStats(t);
    const players = t.playerIds.map(getGlobalPlayer).filter(Boolean);

    // Vytvoříme HTML element pro renderování
    const pdfContent = document.createElement('div');
    pdfContent.style.width = '210mm';
    pdfContent.style.padding = '20mm';
    pdfContent.style.fontFamily = 'Inter, sans-serif';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.color = 'black';
    pdfContent.style.position = 'absolute';
    pdfContent.style.top = '-9999px';
    pdfContent.style.left = '0';

    let html = `
        <h1 class="pdf-title">${t.name}</h1>
        <p class="pdf-meta">Datum vytvoření: ${t.createdAt ? formatDate(t.createdAt) : 'Neznámé'}</p>
        <p class="pdf-meta-last">Body k výhře: ${t.pointsToWin}</p>

        <h2 class="pdf-section-title">Výsledková listina</h2>
        <table class="pdf-table">
            <thead>
                <tr class="pdf-table-header">
                    <th>Poz.</th>
                    <th>Jméno</th>
                    <th class="pdf-table-cell-center">Vítězství</th>
                    <th class="pdf-table-cell-center">Porážky</th>
                    <th class="pdf-table-cell-center">Odehráno</th>
                    <th class="pdf-table-cell-center">Úspěšnost</th>
                </tr>
            </thead>
            <tbody>
    `;

    stats.forEach((s, i) => {
        html += `
            <tr class="pdf-table-row">
                <td class="pdf-table-cell">${i + 1}</td>
                <td class="pdf-table-cell" style="font-weight: ${i === 0 && s.wins > 0 ? 'bold' : 'normal'}">${s.player.name}</td>
                <td class="pdf-wins">${s.wins}</td>
                <td class="pdf-losses">${s.losses}</td>
                <td class="pdf-table-cell-center">${s.played}</td>
                <td class="pdf-success-rate">${s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0}%</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <h2 class="pdf-section-title">Vzájemné zápasy</h2>
        <table class="pdf-table-small">
            <thead>
                <tr class="pdf-matrix-header">
                    <th></th>
    `;

    players.forEach(p => {
        html += `<th>${p.name}</th>`;
    });

    html += `
                </tr>
            </thead>
            <tbody>
    `;

    players.forEach(p1 => {
        html += `<tr><td class="pdf-matrix-row-label">${p1.name}</td>`;
        players.forEach(p2 => {
            if (p1.id === p2.id) {
                html += `<td class="pdf-matrix-cell-empty">-</td>`;
            } else {
                const match = t.matches.find(m => m.completed && ((m.player1Id === p1.id && m.player2Id === p2.id) || (m.player1Id === p2.id && m.player2Id === p1.id)));
                if (match) {
                    const p1Score = match.player1Id === p1.id ? match.score1 : match.score2;
                    const p2Score = match.player1Id === p1.id ? match.score2 : match.score1;
                    const bgColor = p1Score > p2Score ? '#dcfce7' : '#fee2e2';
                    const textColor = p1Score > p2Score ? '#166534' : '#991b1b';
                    html += `<td class="pdf-matrix-cell" style="background-color: ${bgColor}; color: ${textColor}; font-weight: bold;">${p1Score}:${p2Score}</td>`;
                } else {
                    html += `<td class="pdf-matrix-cell-unknown">?</td>`;
                }
            }
        });
        html += `</tr>`;
    });

    html += `
            </tbody>
        </table>
    `;

    pdfContent.innerHTML = html;
    document.body.appendChild(pdfContent);

    // Použijeme html2canvas přímo a pak přidáme obrázek do PDF
    setTimeout(() => {
        html2canvas(pdfContent, {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
            width: pdfContent.scrollWidth,
            height: pdfContent.scrollHeight
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            let position = 0;

            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            doc.save(`turnaj_${t.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.removeChild(pdfContent);
        }).catch(async error => {
            console.error('❌ [PDF] Chyba při generování PDF:', error);
            document.body.removeChild(pdfContent);
            await showAlertModal('Chyba při generování PDF: ' + error.message, 'Chyba');
        });
    }, 500);
}
