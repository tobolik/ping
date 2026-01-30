// Autocomplete funkce
import { state } from './state.js';

let autocompleteIndex = -1;

export function setupAutocomplete(inputId, containerId, onSelect, currentIds, options = {}) {
    const { minPlayers = 0, getMinPlayers = () => minPlayers, getCurrentIds = () => currentIds, onPlayerAdded = null } = options;
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
        const currentPlayerIds = typeof getCurrentIds === 'function' ? getCurrentIds() : currentIds;
        // Filtrujeme hráče podle zadaného textu (pokud je prázdný, zobrazíme všechny dostupné)
        const filteredPlayers = state.playerDatabase
            .filter(p => !currentPlayerIds.includes(p.id))
            .filter(p => value === '' || p.name.toLowerCase().includes(value))
            .slice(0, 10); // Omezíme na 10 hráčů

        if (filteredPlayers.length > 0) {
            const suggestionsEl = document.createElement('div');
            suggestionsEl.className = 'autocomplete-suggestions';
            filteredPlayers.forEach((p, index) => {
                const suggestionEl = document.createElement('div');
                suggestionEl.className = 'autocomplete-suggestion';
                suggestionEl.textContent = p.name;
                suggestionEl.addEventListener('click', async () => {
                    await onSelect(p.id);
                    input.value = '';
                    const updatedIds = typeof getCurrentIds === 'function' ? getCurrentIds() : currentIds;
                    const currentMinPlayers = typeof getMinPlayers === 'function' ? getMinPlayers() : minPlayers;
                    const shouldKeepOpen = currentMinPlayers > 0 && updatedIds.length < currentMinPlayers;
                    if (!shouldKeepOpen) {
                        suggestionsContainer.innerHTML = '';
                    } else {
                        // Zobrazit seznam znovu po přidání hráče
                        setTimeout(() => showSuggestions(), 50);
                    }
                    input.focus();
                    if (onPlayerAdded) onPlayerAdded();
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
    input.addEventListener('click', () => {
        // Otevřít seznam při kliknutí, i když už je kurzor v poli
        if (suggestionsContainer.innerHTML === '') {
            showSuggestions();
        }
    });
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
                const existingPlayer = state.playerDatabase.find(p => p.name.toLowerCase() === name.toLowerCase());
                const currentPlayerIds = typeof getCurrentIds === 'function' ? getCurrentIds() : currentIds;
                if (existingPlayer) {
                    if (!currentPlayerIds.includes(existingPlayer.id)) await onSelect(existingPlayer.id);
                } else {
                    const { showConfirmModal } = await import('./ui.js');
                    if (await showConfirmModal(`Hráč "${name}" neexistuje. Chcete ho přidat do databáze a turnaje?`, 'Přidat nového hráče')) {
                        const newPlayer = { id: Date.now(), name, photoUrl: '', strengths: '', weaknesses: '' };
                        state.playerDatabase.push(newPlayer);
                        const { saveState } = await import('./state.js');
                        saveState();
                        await onSelect(newPlayer.id);
                    }
                }
                input.value = '';
                const updatedIds = typeof getCurrentIds === 'function' ? getCurrentIds() : currentIds;
                const currentMinPlayers = typeof getMinPlayers === 'function' ? getMinPlayers() : minPlayers;
                const shouldKeepOpen = currentMinPlayers > 0 && updatedIds.length < currentMinPlayers;
                if (!shouldKeepOpen) {
                    suggestionsContainer.innerHTML = '';
                } else {
                    setTimeout(() => showSuggestions(), 50);
                }
                if (onPlayerAdded) onPlayerAdded();
            }
        }
    });
    document.addEventListener('click', (e) => {
        if (suggestionsContainer && !suggestionsContainer.parentElement.contains(e.target)) {
            const currentPlayerIds = typeof getCurrentIds === 'function' ? getCurrentIds() : currentIds;
            const currentMinPlayers = typeof getMinPlayers === 'function' ? getMinPlayers() : minPlayers;
            const shouldKeepOpen = currentMinPlayers > 0 && currentPlayerIds.length < currentMinPlayers;
            if (!shouldKeepOpen) {
                suggestionsContainer.innerHTML = '';
            }
        }
    });
    // Zobrazit hráče hned po nastavení pouze pokud je potřeba minimální počet hráčů
    setTimeout(() => {
        if (input && input.value === '') {
            const currentPlayerIds = typeof getCurrentIds === 'function' ? getCurrentIds() : currentIds;
            const currentMinPlayers = typeof getMinPlayers === 'function' ? getMinPlayers() : minPlayers;
            const shouldShow = currentMinPlayers > 0 && currentPlayerIds.length < currentMinPlayers;
            if (shouldShow) {
                showSuggestions();
            }
        }
    }, 50);
    return showSuggestions;
}
