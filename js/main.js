// Vstupní bod aplikace – inicializace a obsluha událostí

import { initUI, getModalsContainer, getScreens, closeModal, showConfirmModal, showAlertModal } from './ui.js';
import { loadState, apiCall } from './api.js';
import { renderMainScreen } from './render.js';
import { allActions, updateScore, undoLastPoint } from './actions.js';
import { state } from './state.js';
import { getTournament, getMatch } from './utils.js';
import { checkWinCondition } from './game-logic.js';
import { initializeAudio, speak } from './audio.js';
import { voiceInput } from './voice-input.js';
// APP_VERSION definujeme zde, abychom se vyhnuli problémům s cachováním constants.js
const APP_VERSION = '1.1.4';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    
    // Detekce prostředí pro vizuální odlišení testovací verze
    const hostname = window.location.hostname;
    const isProduction = hostname === 'ping.sensio.cz';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (!isProduction && !isLocal) {
        // Jsme na testovacím serveru (pravděpodobně Railway)
        const ribbon = document.createElement('div');
        ribbon.className = 'fixed top-0 left-0 w-full bg-orange-500 text-white text-center text-xs font-bold py-1 z-50 shadow-md pointer-events-none';
        ribbon.textContent = '🚧 TESTOVACÍ PROSTŘEDÍ 🚧';
        document.body.prepend(ribbon);
        
        // Posunout obsah dolů, aby nebyl překryt pruhem
        const app = document.getElementById('app');
        if (app) app.style.marginTop = '24px';
        
        document.title = '[TEST] ' + document.title;
    }
    
    // Znovu nastavíme verzi pro jistotu
    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.textContent = APP_VERSION;
    
    // Inicializace voice input s potřebnými akcemi
    voiceInput.init({
        updateScore,
        undoLastPoint,
        setFirstServer: (playerId) => {
             // Wrapper pro setFirstServer, který simuluje kliknutí nebo volá logiku
             // Protože allActions['set-first-server'] očekává target s datasetem,
             // musíme si pomoci nebo zavolat logiku přímo.
             // Pro jednoduchost zde zavoláme existující akci s fake targetem.
             allActions['set-first-server']({ dataset: { playerId: playerId } });
        },
        swapSides: () => {
             const t = getTournament();
             const m = getMatch(t, state.activeMatchId);
             if (m) allActions['swap-sides']({ dataset: { id: m.id } });
        },
        suspendMatch: () => allActions['suspend-match']()
    });

    const app = document.getElementById('app');
    const modalsContainer = getModalsContainer();
    const screens = getScreens();

    app.addEventListener('click', (e) => {
        initializeAudio();
        const target = e.target.closest('[data-action]');
        if (!e.target.closest('#settings-menu') && !e.target.closest('[data-action="toggle-settings-menu"]')) {
            document.getElementById('settings-menu').classList.add('hidden');
        }
        if (target && allActions[target.dataset.action]) allActions[target.dataset.action](target, e);
    });

    app.addEventListener('change', (e) => {
        const soundToggle = e.target.closest('[data-action="toggle-sound"]');
        if (soundToggle) {
            state.settings.soundsEnabled = soundToggle.checked;
            apiCall('saveSettings', { key: 'soundsEnabled', value: state.settings.soundsEnabled });
        }
        const voiceToggle = e.target.closest('[data-action="toggle-voice-assist"]');
        if (voiceToggle) {
            state.settings.voiceAssistEnabled = voiceToggle.checked;
            apiCall('saveSettings', { key: 'voiceAssistEnabled', value: state.settings.voiceAssistEnabled });
            if (state.settings.voiceAssistEnabled) {
                setTimeout(() => speak("Hlasový asistent zapnut."), 100);
            }
        }
        const showLockedToggle = e.target.closest('[data-action="toggle-show-locked"]');
        if (showLockedToggle) {
            state.settings.showLockedTournaments = showLockedToggle.checked;
            apiCall('saveSettings', { key: 'showLockedTournaments', value: state.settings.showLockedTournaments });
            renderMainScreen();
        }
        const motivationalPhrasesToggle = e.target.closest('[data-action="toggle-motivational-phrases"]');
        if (motivationalPhrasesToggle) {
            state.settings.motivationalPhrasesEnabled = motivationalPhrasesToggle.checked;
            apiCall('saveSettings', { key: 'motivationalPhrasesEnabled', value: state.settings.motivationalPhrasesEnabled });
        }
    });

    app.addEventListener('input', (e) => {
        const volumeSlider = e.target.closest('[data-action="change-voice-volume"]');
        if (volumeSlider) {
            const newVolume = parseFloat(volumeSlider.value);
            state.settings.voiceVolume = newVolume;
            apiCall('saveSettings', { key: 'voiceVolume', value: newVolume });
            speak(`Hlasitost ${Math.round(newVolume * 100)} procent`, true);
        }
    });

    document.getElementById('import-file').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if ((state.tournaments.length > 0 || state.playerDatabase.length > 0) && !(await showConfirmModal("Opravdu chcete importovat nová data? Všechna stávající data budou přepsána.", 'Import dat'))) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && (Array.isArray(importedData.tournaments) && Array.isArray(importedData.playerDatabase))) {
                    state.tournaments = importedData.tournaments;
                    state.playerDatabase = importedData.playerDatabase;
                    state.settings = importedData.settings || { soundsEnabled: true };
                    await showAlertModal("Import dat v databázové verzi není zatím podporován.", 'Upozornění');
                } else {
                    throw new Error("Invalid data format");
                }
            } catch (error) {
                await showAlertModal("Chyba: Soubor je poškozený nebo má nesprávný formát.", 'Chyba');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalsContainer.children.length > 0) {
            closeModal();
            return;
        }

        const activeElement = document.activeElement;
        const isInputActive = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
        if (isInputActive) return;

        if (screens.game.classList.contains('active') && modalsContainer.children.length === 0) {
            const t = getTournament();
            const m = getMatch(t, state.activeMatchId);
            if (m && !m.completed) {
                const winnerSide = checkWinCondition(m, t.pointsToWin);
                if (!winnerSide) {
                    const leftRawSide = m.sidesSwapped ? 2 : 1;
                    const rightRawSide = m.sidesSwapped ? 1 : 2;
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        updateScore(null, 1, leftRawSide);
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        updateScore(null, 1, rightRawSide);
                    }
                } else {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const undoBtn = document.querySelector('[data-action="undo-last-point"]:not([disabled])');
                        if (undoBtn) undoBtn.click();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        const saveBtn = document.querySelector('[data-action="save-match-result"]');
                        if (saveBtn) saveBtn.click();
                    }
                }
            }
            return;
        }

        if (modalsContainer.children.length > 0) {
            const modal = modalsContainer.lastElementChild;
            const firstServerBtns = modal.querySelectorAll('[data-action="set-first-server"]');
            if (firstServerBtns.length === 2) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    firstServerBtns[0].click();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    firstServerBtns[1].click();
                }
                return;
            }
            const continueBtn = modal.querySelector('[data-action="close-and-refresh"]');
            if (continueBtn && e.key === 'ArrowRight') {
                e.preventDefault();
                continueBtn.click();
                return;
            }
            const closeBtn = modal.querySelector('[data-action="close-and-home"]');
            const copyBtn = modal.querySelector('[data-action="copy-tournament"]');
            if (closeBtn && copyBtn) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    closeBtn.click();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    copyBtn.click();
                }
                return;
            }
        }

        if (screens.tournament.classList.contains('active')) {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const firstPlayBtn = document.querySelector('#upcoming-matches-container [data-action="play-match"]:not([disabled])');
                if (firstPlayBtn) {
                    firstPlayBtn.click();
                }
            }
            return;
        }

        if (screens.main.classList.contains('active')) {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const firstStartBtn = document.querySelector('#tournaments-list-container [data-action="open-tournament"]');
                if (firstStartBtn && firstStartBtn.textContent.includes('Start turnaje')) {
                    firstStartBtn.click();
                }
            }
        }
    });

    (async () => {
        await loadState();
        renderMainScreen();
    })();
});
