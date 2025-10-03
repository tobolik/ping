const API_URL = 'api.php';

const api = {
    async call(action, method = 'GET', data = null) {
        showLoading();
        try {
            const url = `${API_URL}?action=${action}${method === 'GET' && data ? '&' + new URLSearchParams(data) : ''}`;
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (method !== 'GET' && data) options.body = JSON.stringify(data);
            
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                if (result.error && result.details) {
                    throw new Error(`${result.error}: ${result.details.join(', ')}`);
                } else if (result.error) {
                    throw new Error(result.error);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            const errorMessage = error.message || 'Chyba komunikace se serverem';
            showError(errorMessage);
            throw error;
        } finally {
            hideLoading();
        }
    },
    players: {
        getAll: () => api.call('get_players'),
        get: (id) => api.call('get_player', 'GET', { id }),
        create: (data) => api.call('create_player', 'POST', data),
        update: (data) => api.call('update_player', 'POST', data),
        delete: (id) => api.call('delete_player', 'DELETE', { id })
    },
    tournaments: {
        getAll: () => api.call('get_tournaments'),
        get: (id) => api.call('get_tournament', 'GET', { id }),
        create: (data) => api.call('create_tournament', 'POST', data),
        update: (data) => api.call('update_tournament', 'POST', data),
        delete: (id) => api.call('delete_tournament', 'DELETE', { id }),
        toggleLock: (id) => api.call('toggle_lock', 'POST', { id })
    },
    matches: {
        update: (data) => api.call('update_match', 'POST', data),
        reorder: (matches) => api.call('reorder_matches', 'POST', { matches }),
        add: (tournamentId, matches) => api.call('add_matches', 'POST', { tournamentId, matches })
    },
    settings: {
        getAll: () => api.call('get_settings'),
        update: (key, value) => api.call('update_setting', 'POST', { key, value })
    }
};

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    alert('Chyba: ' + message);
}

document.addEventListener('DOMContentLoaded', async () => {
    let state = {
        settings: { soundsEnabled: true },
        playerDatabase: [],
        tournaments: [],
        activeTournamentId: null,
        activeMatchId: null,
        currentTournament: null,
        currentMatch: null
    };

    const playerColors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-yellow-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"];
    const app = document.getElementById('app');
    const screens = {
        main: document.getElementById('main-screen'),
        playerDb: document.getElementById('player-db-screen'),
        tournament: document.getElementById('tournament-screen'),
        game: document.getElementById('game-screen'),
        stats: document.getElementById('stats-screen'),
        overallStats: document.getElementById('overall-stats-screen')
    };
    const modalsContainer = document.getElementById('modals-container');
    let audioContext;
    let tempPlayerIds = [];
    let autocompleteIndex = -1;

    async function loadData() {
        try {
            const [players, tournaments, settings] = await Promise.all([
                api.players.getAll(),
                api.tournaments.getAll(),
                api.settings.getAll()
            ]);
            state.playerDatabase = players;
            state.tournaments = tournaments;
            state.settings.soundsEnabled = settings.sounds_enabled === 'true';
            document.getElementById('sound-toggle').checked = state.settings.soundsEnabled;
            console.log('Data načtena:', { players: players.length, tournaments: tournaments.length });
        } catch (error) {
            console.error('Chyba načítání dat:', error);
            showError('Nepodařilo se načíst data: ' + error.message);
            // Zobrazit uživateli chybu, ale pokračovat v běhu aplikace
            if (state.playerDatabase.length === 0) {
                state.playerDatabase = [];
            }
            if (state.tournaments.length === 0) {
                state.tournaments = [];
            }
        }
    }

    async function loadTournament(id) {
        try {
            const tournament = await api.tournaments.get(id);
            state.currentTournament = tournament;
            return tournament;
        } catch (error) {
            console.error('Chyba načítání turnaje:', error);
            // Zobrazit uživateli chybu
            alert('Nepodařilo se načíst turnaj. Zkuste to prosím znovu.');
            return null;
        }
    }

    function playSound(playerIndex) {
        if (!state.settings.soundsEnabled || !audioContext) return;
        if (audioContext.state === 'suspended') audioContext.resume();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        const frequency = playerIndex === 1 ? 880 : 659.25;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    function initializeAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    const getGlobalPlayer = (id) => state.playerDatabase.find(p => p.id === parseInt(id));
    const getTournament = () => state.currentTournament;
    const getMatch = (tournament, matchId) => tournament.matches.find(m => m.id === parseInt(matchId));
    const formatDate = (iso) => new Date(iso).toLocaleDateString('cs-CZ');
    const showScreen = (screenName) => {
        document.body.classList.remove('game-active');
        Object.values(screens).forEach(s => s.classList.remove('active'));
        if (screens[screenName]) screens[screenName].classList.add('active');
        window.scrollTo(0, 0);
    };
    const openModal = (html) => { modalsContainer.innerHTML = html; };
    const closeModal = () => { modalsContainer.innerHTML = ''; };
    const getCzechPlayerDeclension = (count) => {
        if (count === 1) return 'hráč';
        if (count >= 2 && count <= 4) return 'hráči';
        return 'hráčů';
    };
    const renderGameScreen = (content) => {
        document.body.classList.add('game-active');
        screens.game.innerHTML = content;
        showScreen('game');
    };

    const templates = {
        leaderboardTable: (stats, t) => `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b"><th class="p-2">Poz.</th><th class="p-2">Hráč</th><th class="p-2 text-center">Vítězství</th><th class="p-2 text-center">Porážky</th><th class="p-2 text-center">Odehráno</th><th class="p-2 text-center">Úspěšnost</th></tr></thead><tbody>${stats.map((s, i) => `<tr class="border-b last:border-none"><td class="p-2 font-bold">${i === 0 && s.wins > 0 ? '🏆' : `#${i + 1}`}</td><td class="p-2 flex items-center gap-2"><div class="w-4 h-4 rounded-full ${playerColors[t.playerIds.indexOf(s.player.id) % playerColors.length]}"></div> ${s.player.name}</td><td class="p-2 text-center font-bold text-green-600">${s.wins}</td><td class="p-2 text-center text-red-500">${s.losses}</td><td class="p-2 text-center">${s.played}</td><td class="p-2 text-center font-semibold">${s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0}%</td></tr>`).join('')}</tbody></table></div>`
    };

    function generateMatchesForTournament(playerIds) {
        const matches = [];
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                matches.push({
                    player1Id: playerIds[i],
                    player2Id: playerIds[j],
                    order: matches.length
                });
            }
        }
        return smartShuffleMatches(matches);
    }

    function smartShuffleMatches(matches) {
        if (matches.length < 3) return matches.sort(() => Math.random() - 0.5);
        let remaining = [...matches];
        let shuffled = [];
        let lastPlayers = [];

        if (remaining.length > 0) {
            const firstMatchIndex = Math.floor(Math.random() * remaining.length);
            const firstMatch = remaining.splice(firstMatchIndex, 1)[0];
            shuffled.push(firstMatch);
            lastPlayers = [firstMatch.player1Id, firstMatch.player2Id];
        }

        while (remaining.length > 0) {
            let possibleNext = remaining.filter(match =>
                !lastPlayers.includes(match.player1Id) &&
                !lastPlayers.includes(match.player2Id)
            );

            if (possibleNext.length === 0) possibleNext = remaining;

            const nextMatchIndex = Math.floor(Math.random() * possibleNext.length);
            const nextMatch = possibleNext[nextMatchIndex];
            shuffled.push(nextMatch);
            lastPlayers = [nextMatch.player1Id, nextMatch.player2Id];
            remaining = remaining.filter(m => m !== nextMatch);
        }

        return shuffled.map((m, i) => ({ ...m, order: i }));
    }

    const renderPlayerDbScreen = async () => {
        await loadData();
        const container = document.getElementById('player-db-list-container');

        if (state.playerDatabase.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 p-8 bg-white rounded-xl">Databáze je prázdná. Přidejte prvního hráče.</div>`;
        } else {
            container.innerHTML = state.playerDatabase.sort((a, b) => a.name.localeCompare(b.name)).map(p => {
                const photo = p.photo_url || `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23e5e7eb%22%20rx%3D%2220%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22central%22%20text-anchor%3D%22middle%22%20font-family%3D%22Inter%22%20font-size%3D%2216%22%20fill%3D%22%239ca3af%22%3E${p.name.charAt(0).toUpperCase()}%3C%2Ftext%3E%3C%2Fsvg%3E`;
                return `<div class="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between"><div class="flex items-center gap-3"><img src="${photo}" class="w-10 h-10 rounded-full object-cover bg-gray-200"><span class="font-semibold">${p.name}</span></div><div><button data-action="show-edit-player-modal" data-id="${p.id}" class="btn btn-secondary !p-2 h-10 w-10"><i class="fa-solid fa-pencil"></i></button><button data-action="delete-player" data-id="${p.id}" class="btn btn-danger !p-2 h-10 w-10"><i class="fa-solid fa-trash"></i></button></div></div>`;
            }).join('');
        }
        showScreen('playerDb');
    };

    const getTournamentStatus = (t) => {
        const completedCount = parseInt(t.completed_matches) || 0;
        const totalMatches = parseInt(t.total_matches) || 0;

        if (totalMatches > 0 && completedCount === totalMatches) {
            return { icon: 'fa-trophy', color: 'text-yellow-500', text: 'Dokončeno' };
        }
        if (completedCount > 0) {
            return { icon: 'fa-person-running', color: 'text-blue-500', text: 'Probíhá' };
        }
        return { icon: 'fa-play-circle', color: 'text-gray-400', text: 'Připraveno' };
    };

    const renderMainScreen = async () => {
        await loadData();
        const container = document.getElementById('tournaments-list-container');

        if (state.tournaments.length === 0) {
            container.innerHTML = `<div class="text-center py-10 px-6 bg-white rounded-xl shadow-sm"><i class="fa-solid fa-trophy text-5xl text-gray-300"></i><h2 class="text-xl font-semibold text-gray-700 mt-4">Žádné turnaje</h2><p class="text-gray-500 mt-1">Vytvořte svůj první ping pongový turnaj</p><button data-action="show-new-tournament-modal" class="btn btn-primary mt-4">Vytvořit turnaj</button></div>`;
        } else {
            container.innerHTML = state.tournaments.map(t => {
                const completedCount = parseInt(t.completed_matches) || 0;
                const totalMatches = parseInt(t.total_matches) || 0;
                const isLocked = parseInt(t.is_locked) === 1;
                const status = getTournamentStatus(t);
                const nameClass = isLocked ? 'text-gray-500' : '';

                let buttonText = "Zobrazit";
                let buttonClass = "bg-blue-500 hover:bg-blue-600 text-white";

                if (status.text === 'Připraveno') {
                    buttonText = "Start turnaje";
                    buttonClass = "btn-primary";
                } else if (status.text === 'Dokončeno') {
                    buttonText = "Zobrazit";
                    buttonClass = "bg-yellow-400 hover:bg-yellow-500 text-black";
                }

                return `<div class="bg-white p-4 rounded-xl shadow-sm space-y-3"><div class="flex justify-between items-start"><div><h2 class="text-xl font-bold ${nameClass}">${t.name}</h2><p class="text-sm text-gray-500">${t.playerIds.length} ${getCzechPlayerDeclension(t.playerIds.length)} &bull; ${completedCount}/${totalMatches} zápasů &bull; Vytvořeno: ${formatDate(t.created_at)}</p></div><div class="flex items-center gap-3 text-xl text-gray-400"><i class="fa-solid ${status.icon} ${status.color}" title="${status.text}"></i><button data-action="toggle-lock-main" data-id="${t.id}" class="text-xl" title="${isLocked ? 'Odemknout turnaj' : 'Zamknout turnaj'}">${isLocked ? '🔒' : '🔓'}</button></div></div>${!isLocked ? `<button data-action="open-tournament" data-id="${t.id}" class="btn ${buttonClass} w-full">${buttonText}</button>` : ''}</div>`;
            }).join('');
        }
        showScreen('main');
    };

    const renderTournamentScreen = async () => {
        const t = getTournament();
        if (!t) {
            await renderMainScreen();
            return;
        }

        document.getElementById('tournament-title').innerHTML = `<span>${t.name}</span>`;
        document.getElementById('tournament-progress').textContent = `${t.matches.filter(m => m.completed).length}/${t.matches.length} zápasů dokončeno`;

        const renderMatch = (m, isCompleted) => {
            const p1 = getGlobalPlayer(m.player1_id);
            const p2 = getGlobalPlayer(m.player2_id);
            if (!p1 || !p2) return '';

            const isSuspended = !isCompleted && (m.score1 > 0 || m.score2 > 0);
            const p1Color = playerColors[t.playerIds.indexOf(parseInt(m.player1_id)) % playerColors.length];
            const p2Color = playerColors[t.playerIds.indexOf(parseInt(m.player2_id)) % playerColors.length];
            const playerIcon = (player, color) => `<div class="w-6 h-6 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">${player.name.charAt(0).toUpperCase()}</div>`;
            const servingIndicator = ' <span class="text-base">🏓</span>';

            let content;
            if (isCompleted) {
                const p1Won = m.score1 > m.score2;
                content = `<div class="flex items-center gap-2 flex-grow"><div class="flex items-center gap-2 w-2/5 ${p1Won ? 'font-extrabold' : ''}">${playerIcon(p1, p1Color)}<span>${p1.name}</span></div><div class="font-bold text-lg">${m.score1} : ${m.score2}</div><div class="flex items-center gap-2 w-2/5 justify-end ${!p1Won ? 'font-extrabold' : ''}"><span class="text-right">${p2.name}</span>${playerIcon(p2, p2Color)}</div></div>`;
            } else {
                let p1ServeHTML = isSuspended && m.serving_player === 1 ? servingIndicator : '';
                let p2ServeHTML = isSuspended && m.serving_player === 2 ? servingIndicator : '';
                const scoreOrVs = isSuspended ? `<div class="font-bold text-lg">${m.score1} : ${m.score2}</div>` : `<div class="text-gray-400">vs</div>`;
                content = `<div class="flex items-center gap-2 flex-grow"><div class="flex items-center gap-2 w-2/5">${playerIcon(p1, p1Color)}<span>${p1.name}${p1ServeHTML}</span></div>${scoreOrVs}<div class="flex items-center gap-2 w-2/5 justify-end"><span class="text-right">${p2.name}${p2ServeHTML}</span>${playerIcon(p2, p2Color)}</div></div><button data-action="play-match" data-id="${m.id}" class="btn btn-primary aspect-square !p-0 w-10 h-10 text-lg" title="${isSuspended ? 'Pokračovat v zápase' : 'Hrát zápas'}" ${t.is_locked ? 'disabled' : ''}>${isSuspended ? '<i class="fa-solid fa-clock-rotate-left"></i>' : '<i class="fa-solid fa-play"></i>'}</button>`;
            }
            return `<div class="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between mt-2 gap-2">${content}</div>`;
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

        if (isFinished) {
            const stats = calculateStats(t);
            const winner = stats.length > 0 && stats[0].wins > 0 ? stats[0].player : null;
            const trophyIcons = ['', '🥈', '🥉'];
            finalResultsContainer.innerHTML = `<div class="bg-white p-6 rounded-xl shadow-sm text-center"><h2 class="text-2xl font-bold mb-2">Turnaj skončil!</h2>${winner ? `<p class="text-gray-600">Celkovým vítězem je</p><p class="text-3xl font-bold my-2">🏆 ${winner.name}</p>` : ''}<ol class="space-y-3 mt-4 text-left inline-block">${stats.slice(1).map((s, i) => `<li class="flex items-center text-lg"><span class="font-bold w-10 text-center">${i + 1 < 3 ? trophyIcons[i + 1] : `#${i + 2}`}</span><span>${s.player.name}</span></li>`).join('')}</ol></div>`;
        } else {
            const upcoming = t.matches.filter(m => !m.completed);
            upcomingContainer.innerHTML = upcoming.length > 0 ? `<h2 class="text-xl font-bold">Nadcházející zápasy</h2>${upcoming.map(m => renderMatch(m, false)).join('')}` : (t.matches.length > 0 ? '' : `<div class="text-center p-4 bg-white rounded-xl text-gray-500">Žádné zápasy.</div>`);
        }

        const completed = t.matches.filter(m => m.completed);
        completedContainer.innerHTML = completed.length > 0 ? `<h2 class="text-xl font-bold">Dokončené zápasy</h2>${completed.map(m => renderMatch(m, true)).join('')}` : '';
        showScreen('tournament');
    };

    function setupAutocomplete(inputId, containerId, onSelect, currentIds) {
        const input = document.getElementById(inputId);
        const suggestionsContainer = document.getElementById(containerId);

        const updateHighlight = () => {
            const items = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
            items.forEach((item, index) => item.classList.toggle('highlighted', index === autocompleteIndex));
        };

        const showSuggestions = () => {
            const value = input.value.toLowerCase();
            suggestionsContainer.innerHTML = '';
            autocompleteIndex = -1;

            const filteredPlayers = state.playerDatabase.filter(p =>
                p.name.toLowerCase().includes(value) && !currentIds.includes(p.id)
            );

            if (filteredPlayers.length > 0) {
                const suggestionsEl = document.createElement('div');
                suggestionsEl.className = 'autocomplete-suggestions';
                filteredPlayers.forEach((p, index) => {
                    const suggestionEl = document.createElement('div');
                    suggestionEl.className = 'autocomplete-suggestion';
                    suggestionEl.textContent = p.name;
                    suggestionEl.addEventListener('click', () => {
                        onSelect(p.id);
                        input.value = '';
                        suggestionsContainer.innerHTML = '';
                        input.focus();
                    });
                    suggestionEl.addEventListener('mouseover', () => {
                        autocompleteIndex = index;
                        updateHighlight();
                    });
                    suggestionsEl.appendChild(suggestionEl);
                });
                suggestionsContainer.appendChild(suggestionsEl);
            }
        };

        input.addEventListener('input', showSuggestions);
        input.addEventListener('focus', showSuggestions);
        input.addEventListener('keydown', async (e) => {
            const items = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (autocompleteIndex < items.length - 1) autocompleteIndex++;
                updateHighlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (autocompleteIndex > 0) autocompleteIndex--;
                updateHighlight();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (autocompleteIndex > -1 && items[autocompleteIndex]) {
                    items[autocompleteIndex].click();
                } else if (input.value.trim() !== '') {
                    const name = input.value.trim();
                    const existingPlayer = state.playerDatabase.find(p =>
                        p.name.toLowerCase() === name.toLowerCase()
                    );

                    if (existingPlayer) {
                        if (!currentIds.includes(existingPlayer.id)) onSelect(existingPlayer.id);
                    } else {
                        if (confirm(`Hráč "${name}" neexistuje. Chcete ho přidat do databáze?`)) {
                            const result = await api.players.create({
                                name,
                                photoUrl: '',
                                strengths: '',
                                weaknesses: ''
                            });
                            await loadData();
                            onSelect(result.id);
                        }
                    }
                    input.value = '';
                    suggestionsContainer.innerHTML = '';
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (suggestionsContainer && !suggestionsContainer.parentElement.contains(e.target))
                suggestionsContainer.innerHTML = '';
        });
    }

    const calculateStats = (t) => {
        const stats = t.playerIds.map(id => ({
            player: getGlobalPlayer(id),
            played: 0,
            wins: 0,
            losses: 0,
            scoreFor: 0,
            scoreAgainst: 0
        }));

        t.matches.filter(m => m.completed).forEach(m => {
            const s1 = stats.find(s => s.player && s.player.id === parseInt(m.player1_id));
            const s2 = stats.find(s => s.player && s.player.id === parseInt(m.player2_id));
            if (!s1 || !s2) return;

            s1.played++;
            s2.played++;
            s1.scoreFor += m.score1;
            s1.scoreAgainst += m.score2;
            s2.scoreFor += m.score2;
            s2.scoreAgainst += m.score1;

            if (m.score1 > m.score2) {
                s1.wins++;
                s2.losses++;
            } else {
                s2.wins++;
                s1.losses++;
            }
        });

        return stats.filter(s => s.player).sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            const scoreDiffA = a.scoreFor - a.scoreAgainst;
            const scoreDiffB = b.scoreFor - b.scoreAgainst;
            if (scoreDiffB !== scoreDiffA) return scoreDiffB - scoreDiffA;
            return b.scoreFor - a.scoreFor;
        });
    };

    const checkWinCondition = (match, pointsToWin) => {
        if (match.score1 >= pointsToWin && match.score1 >= match.score2 + 2) return 1;
        if (match.score2 >= pointsToWin && match.score2 >= match.score1 + 2) return 2;
        return null;
    };

    const recalculateServiceState = (match, pointsToWin) => {
        const totalScore = match.score1 + match.score2;
        if (!match.first_server) {
            match.serving_player = null;
            return;
        }

        if (pointsToWin === 11 && match.score1 >= 10 && match.score2 >= 10) {
            const pointsInDeuce = (match.score1 - 10) + (match.score2 - 10);
            if (Math.floor(pointsInDeuce / 1) % 2 === 0) {
                match.serving_player = (match.first_server === 1) ? 1 : 2;
            } else {
                match.serving_player = (match.first_server === 1) ? 2 : 1;
            }
            return;
        }

        if (totalScore === 0) {
            match.serving_player = match.first_server;
            return;
        }

        const pointsAfterFirst = totalScore - 1;
        const serviceBlockIndex = Math.floor(pointsAfterFirst / 2);

        if (serviceBlockIndex % 2 === 0) {
            match.serving_player = (match.first_server === 1 ? 2 : 1);
        } else {
            match.serving_player = match.first_server;
        }
    };

    const updateScore = async (playerIndex, delta) => {
        const t = getTournament();
        const m = state.currentMatch;
        if (delta > 0 && checkWinCondition(m, t.points_to_win)) return;

        const currentScore = m[`score${playerIndex}`];
        if (currentScore + delta >= 0) {
            m[`score${playerIndex}`] += delta;

            recalculateServiceState(m, t.points_to_win);
            playSound(playerIndex);

            await api.matches.update({
                id: m.id,
                score1: m.score1,
                score2: m.score2,
                completed: m.completed,
                firstServer: m.first_server,
                servingPlayer: m.serving_player
            });

            renderGameBoard();
        }
    };

    const calculateOverallStats = () => {
        const overallStats = new Map();
        state.playerDatabase.forEach(p => {
            overallStats.set(p.id, {
                player: p,
                tournaments: 0,
                matches: 0,
                wins: 0,
                losses: 0,
                scoreFor: 0,
                scoreAgainst: 0
            });
        });

        state.tournaments.forEach(t => {
            const playerIdsInTournament = new Set(t.playerIds);
            playerIdsInTournament.forEach(id => {
                const s = overallStats.get(id);
                if (s) s.tournaments++;
            });
        });

        return Array.from(overallStats.values()).sort((a, b) =>
            b.tournaments - a.tournaments || b.wins - a.wins
        );
    };

    const renderOverallStatsScreen = async () => {
        await loadData();
        const stats = calculateOverallStats();
        const container = document.getElementById('overall-stats-container');
        container.innerHTML = `<table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                    <th class="px-2 py-3">Hráč</th>
                    <th class="px-2 py-3 text-center">Turnaje</th>
                </tr>
            </thead>
            <tbody>${stats.map(s => `<tr class="bg-white border-b">
                <td class="px-2 py-4 font-semibold">${s.player.name}</td>
                <td class="px-2 py-4 text-center">${s.tournaments}</td>
            </tr>`).join('')}</tbody>
        </table>`;
        showScreen('overallStats');
    };

    const allActions = {
        'show-player-db': renderPlayerDbScreen,
        'show-edit-player-modal': (target) => {
            const playerId = target.dataset.id === 'new' ? null : parseInt(target.dataset.id);
            const p = playerId ? getGlobalPlayer(playerId) : { name: '', photo_url: '', strengths: '', weaknesses: '' };

            openModal(`<div class="modal-backdrop"><div class="modal-content space-y-4"><div class="flex justify-between items-center"><h2 class="text-xl font-bold">${playerId ? 'Upravit hráče' : 'Nový hráč'}</h2><button data-action="close-modal" class="text-gray-400 text-2xl hover:text-gray-700">&times;</button></div><div><label class="text-sm font-medium">Jméno</label><input id="player-name" value="${p.name}" class="w-full mt-1 p-2 border rounded-md"></div><div><label class="text-sm font-medium">URL fotografie</label><input id="player-photo" value="${p.photo_url || ''}" placeholder="https://..." class="w-full mt-1 p-2 border rounded-md"></div><div class="flex gap-2"><button data-action="close-modal" class="btn btn-secondary w-full">Zrušit</button><button data-action="save-player" data-id="${playerId || ''}" class="btn btn-primary w-full">Uložit</button></div></div></div>`);

            document.getElementById('player-name').focus();
        },
        'save-player': async (target) => {
            const playerId = target.dataset.id ? parseInt(target.dataset.id) : null;
            const name = document.getElementById('player-name').value.trim();

            if (!name) {
                alert('Jméno je povinné.');
                return;
            }

            const playerData = {
                name,
                photoUrl: document.getElementById('player-photo').value.trim()
            };

            if (playerId) {
                await api.players.update({ id: playerId, ...playerData });
            } else {
                await api.players.create(playerData);
            }

            closeModal();
            renderPlayerDbScreen();
        },
        'delete-player': async (target) => {
            const playerId = parseInt(target.dataset.id);

            if (confirm('Opravdu chcete smazat tohoto hráče z databáze?')) {
                try {
                    await api.players.delete(playerId);
                    renderPlayerDbScreen();
                } catch (error) {
                    // Chyba již byla zobrazena v api.call
                }
            }
        },
        'show-new-tournament-modal': async () => {
            await loadData();
            tempPlayerIds = [];
            const defaultName = `Turnaj ${new Date().toLocaleDateString('cs-CZ')}`;

            const renderAddedPlayers = () => {
                document.getElementById('new-players-list').innerHTML = tempPlayerIds.map((id, index) => {
                    const player = getGlobalPlayer(id);
                    return `<div class="flex items-center gap-2 bg-gray-100 p-2 rounded-md"><div class="w-5 h-5 rounded-full ${playerColors[index % playerColors.length]}"></div><span class="flex-grow">${player.name}</span><button data-action="remove-temp-player" data-id="${id}" class="text-red-500 font-bold">&times;</button></div>`;
                }).join('') || `<div class="text-sm text-gray-500 text-center p-2">Zatím žádní hráči</div>`;
                document.getElementById('player-count-text').textContent = `Hráči (${tempPlayerIds.length}/8)`;
            };

            openModal(`<div class="modal-backdrop"><div class="modal-content space-y-4"><div class="flex justify-between items-center"><h2 class="text-xl font-bold">Nový Turnaj</h2><button data-action="close-modal" class="text-gray-400 text-2xl hover:text-gray-700">&times;</button></div><div><label class="text-sm font-medium">Název turnaje</label><input id="new-tournament-name" type="text" value="${defaultName}" class="w-full mt-1 p-2 border rounded-md"></div><div><label class="text-sm font-medium">Typ setu</label><div class="flex gap-2 mt-1"><label class="flex-1 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 text-center"><input type="radio" name="points-to-win" value="11" class="sr-only" checked><span>Malý set (11)</span></label><label class="flex-1 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 text-center"><input type="radio" name="points-to-win" value="21" class="sr-only"><span>Velký set (21)</span></label></div></div><div><label id="player-count-text" class="text-sm font-medium">Hráči (0/8)</label><div id="new-players-list" class="space-y-2 my-2"></div><div class="relative"><input id="add-player-input" type="text" placeholder="Napište jméno..." class="w-full p-2 border rounded-md"><div id="autocomplete-container"></div></div></div><button data-action="create-tournament" class="btn btn-primary w-full">Vytvořit Turnaj</button></div></div>`);

            setupAutocomplete('add-player-input', 'autocomplete-container', (id) => {
                if (tempPlayerIds.length < 8 && !tempPlayerIds.includes(id)) {
                    tempPlayerIds.push(id);
                    renderAddedPlayers();
                }
            }, tempPlayerIds);

            document.getElementById('add-player-input').focus();
        },
        'remove-temp-player': (target) => {
            const idToRemove = parseInt(target.dataset.id);
            tempPlayerIds = tempPlayerIds.filter(id => id !== idToRemove);
            const list = document.getElementById('new-players-list');
            list.innerHTML = tempPlayerIds.map((id, index) => {
                const player = getGlobalPlayer(id);
                return `<div class="flex items-center gap-2 bg-gray-100 p-2 rounded-md"><div class="w-5 h-5 rounded-full ${playerColors[index % playerColors.length]}"></div><span class="flex-grow">${player.name}</span><button data-action="remove-temp-player" data-id="${id}" class="text-red-500 font-bold">&times;</button></div>`;
            }).join('') || `<div class="text-sm text-gray-500 text-center p-2">Zatím žádní hráči</div>`;
            document.getElementById('player-count-text').textContent = `Hráči (${tempPlayerIds.length}/8)`;
        },
        'create-tournament': async () => {
            const name = document.getElementById('new-tournament-name').value.trim();

            if (!name || tempPlayerIds.length < 2) {
                alert('Zadejte název a alespoň 2 hráče.');
                return;
            }

            const matches = generateMatchesForTournament(tempPlayerIds);

            try {
                console.log('Vytvářím turnaj:', { name, playerIds: tempPlayerIds, matches: matches.length });
                const result = await api.tournaments.create({
                    name,
                    pointsToWin: parseInt(document.querySelector('input[name="points-to-win"]:checked').value),
                    playerIds: tempPlayerIds,
                    matches
                });
                console.log('Turnaj vytvořen:', result);
                closeModal();
                renderMainScreen(); // renderMainScreen už volá loadData()
            } catch (error) {
                console.error('Chyba při vytváření turnaje:', error);
                showError('Nepodařilo se vytvořit turnaj: ' + error.message);
            }
        },
        'toggle-lock-main': async (target) => {
            await api.tournaments.toggleLock(parseInt(target.dataset.id));
            renderMainScreen();
        },
        'open-tournament': async (target) => {
            state.activeTournamentId = parseInt(target.dataset.id);
            await loadTournament(state.activeTournamentId);
            renderTournamentScreen();
        },
        'back-to-main': renderMainScreen,
        'back-to-tournament': renderTournamentScreen,
        'show-stats': () => renderStatsScreen(),
        'show-overall-stats': renderOverallStatsScreen,
        'play-match': async (target) => {
            state.activeMatchId = parseInt(target.dataset.id);
            const t = getTournament();
            const m = getMatch(t, state.activeMatchId);
            state.currentMatch = m;

            if (!m.first_server) {
                const p1 = getGlobalPlayer(m.player1_id);
                const p2 = getGlobalPlayer(m.player2_id);
                renderGameScreen(`<div class="bg-white p-6 rounded-xl shadow-sm space-y-6 text-center"><h1 class="text-2xl font-bold">${p1.name} vs ${p2.name}</h1><p class="text-gray-500">Hraje se na ${t.points_to_win} bodů</p><div><h2 class="text-lg font-semibold mb-3">Kdo má první podání?</h2><div class="grid grid-cols-2 gap-4"><button data-action="set-first-server" data-player="1" class="p-4 rounded-lg font-bold text-white ${playerColors[t.playerIds.indexOf(parseInt(m.player1_id)) % playerColors.length]}">${p1.name}</button><button data-action="set-first-server" data-player="2" class="p-4 rounded-lg font-bold text-white ${playerColors[t.playerIds.indexOf(parseInt(m.player2_id)) % playerColors.length]}">${p2.name}</button></div></div><button data-action="back-to-tournament" class="btn btn-secondary w-full mt-4">Zpět</button></div>`);
            } else {
                renderGameBoard();
            }
        },
        'set-first-server': async (target) => {
            const m = state.currentMatch;
            m.first_server = parseInt(target.dataset.player);
            recalculateServiceState(m, getTournament().points_to_win);

            await api.matches.update({
                id: m.id,
                score1: m.score1,
                score2: m.score2,
                completed: m.completed,
                firstServer: m.first_server,
                servingPlayer: m.serving_player
            });

            renderGameBoard();
        },
        'add-point': (target) => updateScore(parseInt(target.dataset.player), 1),
        'subtract-point': (target) => {
            const event = window.event || arguments[0];
            if (event) event.stopPropagation();
            updateScore(parseInt(target.dataset.player), -1);
        },
        'save-match-result': async () => {
            const m = state.currentMatch;
            m.completed = true;

            await api.matches.update({
                id: m.id,
                score1: m.score1,
                score2: m.score2,
                completed: true,
                firstServer: m.first_server,
                servingPlayer: m.serving_player
            });

            await loadTournament(state.activeTournamentId);
            const t = getTournament();
            const completedCount = t.matches.filter(m => m.completed).length;

            if (completedCount === t.matches.length) {
                openModal(`<div class="modal-backdrop"><div class="modal-content modal-lg space-y-4"><h2 class="text-2xl font-bold text-center">Konečné výsledky</h2>${templates.leaderboardTable(calculateStats(t), t)}<button data-action="close-and-home" class="btn btn-primary w-full">Zavřít</button></div></div>`);
            } else {
                openModal(`<div class="modal-backdrop"><div class="modal-content modal-lg space-y-4"><h2 class="text-xl font-bold text-center">Průběžné pořadí</h2>${templates.leaderboardTable(calculateStats(t), t)}<button data-action="close-and-refresh" class="btn btn-primary w-full">Pokračovat</button></div></div>`);
            }
        },
        'close-and-refresh': () => {
            closeModal();
            renderTournamentScreen();
        },
        'close-and-home': () => {
            closeModal();
            renderMainScreen();
        },
        'close-modal': closeModal,
        'toggle-settings-menu': () => {
            const menu = document.getElementById('settings-menu');
            menu.classList.toggle('hidden');
        },
        'toggle-sound-ingame': () => {
            state.settings.soundsEnabled = !state.settings.soundsEnabled;
            api.settings.update('sounds_enabled', state.settings.soundsEnabled.toString());
            renderGameBoard();
        }
    };

    function renderGameBoard() {
        const t = getTournament();
        const m = state.currentMatch;
        const p1 = getGlobalPlayer(m.player1_id);
        const p2 = getGlobalPlayer(m.player2_id);
        const winner = checkWinCondition(m, t.points_to_win);
        const canAddPoints = !winner;
        const p1Color = playerColors[t.playerIds.indexOf(parseInt(p1.id)) % playerColors.length];
        const p2Color = playerColors[t.playerIds.indexOf(parseInt(p2.id)) % playerColors.length];

        renderGameScreen(`<div class="h-full flex flex-col"><header class="bg-white/90 backdrop-blur-sm p-3 shadow-sm text-center flex justify-between items-center w-full z-10 flex-shrink-0"><button data-action="back-to-tournament" class="btn btn-secondary !p-2 w-24">Přerušit</button><div class="flex-grow"><p class="text-sm text-gray-500">Hraje se na ${t.points_to_win} bodů</p><p class="font-semibold">Podání: ${m.serving_player ? (m.serving_player === 1 ? p1.name : p2.name) : '...'}</p></div><div class="w-24 flex justify-end"><button data-action="toggle-sound-ingame" class="btn btn-secondary !p-0 h-10 w-10 text-lg">${state.settings.soundsEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>'}</button></div></header><div class="flex-grow flex flex-col md:flex-row"><div ${canAddPoints ? `data-action="add-point" data-player="1"` : ''} class="player-score-box ${p1Color} p-4 text-white relative flex flex-col items-center justify-center flex-grow ${canAddPoints ? 'active-pointer cursor-pointer' : ''}">${m.serving_player === 1 ? `<div class="absolute top-4 left-4 w-10 h-10 rounded-full bg-yellow-400/90 text-2xl flex items-center justify-center">🏓</div>` : ''}<button data-action="subtract-point" data-player="1" class="absolute top-4 right-4 w-12 h-12 bg-black/20 rounded-full text-2xl">-1</button><div class="text-2xl md:text-3xl font-bold">${p1.name}</div><div class="text-8xl md:text-9xl font-extrabold my-4">${m.score1}</div><div class="text-sm opacity-80">${canAddPoints ? 'Klepněte pro bod' : '&nbsp;'}</div></div><div ${canAddPoints ? `data-action="add-point" data-player="2"` : ''} class="player-score-box ${p2Color} p-4 text-white relative flex flex-col items-center justify-center flex-grow ${canAddPoints ? 'active-pointer cursor-pointer' : ''}">${m.serving_player === 2 ? `<div class="absolute top-4 left-4 w-10 h-10 rounded-full bg-yellow-400/90 text-2xl flex items-center justify-center">🏓</div>` : ''}<button data-action="subtract-point" data-player="2" class="absolute top-4 right-4 w-12 h-12 bg-black/20 rounded-full text-2xl">-1</button><div class="text-2xl md:text-3xl font-bold">${p2.name}</div><div class="text-8xl md:text-9xl font-extrabold my-4">${m.score2}</div><div class="text-sm opacity-80">${canAddPoints ? 'Klepněte pro bod' : '&nbsp;'}</div></div></div>${winner ? `<div class="absolute bottom-4 left-4 right-4 bg-white p-6 rounded-xl shadow-lg text-center space-y-3 z-20"><div class="text-3xl">🏆</div><h2 class="text-2xl font-bold">Vítěz: ${winner === 1 ? p1.name : p2.name}!</h2><p class="text-gray-500">Výsledek: ${m.score1} : ${m.score2}</p><button data-action="save-match-result" class="btn btn-primary w-full">Uložit výsledek</button></div>` : ''}</div>`);
    }

    function renderStatsScreen() {
        const t = getTournament();
        document.getElementById('stats-tournament-name').textContent = t.name;
        const stats = calculateStats(t);
        document.getElementById('stats-leaderboard').innerHTML = templates.leaderboardTable(stats, t);

        const matrixContainer = document.getElementById('stats-matrix');
        const players = t.playerIds.map(getGlobalPlayer).filter(Boolean);
        let matrixHTML = `<table class="w-full text-sm text-center border-collapse"><thead><tr class="bg-gray-50"><th class="border p-2"></th>${players.map(p => `<th class="border p-2"><div class="flex items-center justify-center gap-1"><div class="w-3 h-3 rounded-full ${playerColors[t.playerIds.indexOf(p.id) % playerColors.length]}"></div> ${p.name}</div></th>`).join('')}</tr></thead><tbody>`;

        players.forEach(p1 => {
            matrixHTML += `<tr><td class="border p-2 font-bold bg-gray-50"><div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full ${playerColors[t.playerIds.indexOf(p1.id) % playerColors.length]}"></div> ${p1.name}</div></td>`;
            players.forEach(p2 => {
                if (p1.id === p2.id) {
                    matrixHTML += `<td class="border p-2 bg-gray-200"></td>`;
                } else {
                    const match = t.matches.find(m => m.completed && ((parseInt(m.player1_id) === p1.id && parseInt(m.player2_id) === p2.id) || (parseInt(m.player1_id) === p2.id && parseInt(m.player2_id) === p1.id)));
                    if (match) {
                        const p1Score = parseInt(match.player1_id) === p1.id ? match.score1 : match.score2;
                        const p2Score = parseInt(match.player1_id) === p1.id ? match.score2 : match.score1;
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

    app.addEventListener('click', (e) => {
        initializeAudio();
        const target = e.target.closest('[data-action]');
        if (!e.target.closest('#settings-menu') && !e.target.closest('[data-action="toggle-settings-menu"]')) {
            document.getElementById('settings-menu').classList.add('hidden');
        }
        if (target && allActions[target.dataset.action]) allActions[target.dataset.action](target);
    });

    app.addEventListener('change', async (e) => {
        const target = e.target.closest('[data-action="toggle-sound"]');
        if (target) {
            state.settings.soundsEnabled = target.checked;
            await api.settings.update('sounds_enabled', target.checked.toString());
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalsContainer.children.length > 0) {
            closeModal();
        }
    });

    await loadData();
    renderMainScreen();
});