// API komunikace
import { API_URL, TOURNAMENT_TYPES } from './constants.js';
import { showAlertModal } from './ui.js';
import { updateStateWithApiData } from './state.js';

export async function apiCall(action, payload) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Chyba při volání akce '${action}':`, errorData.error);
            await showAlertModal(`Chyba při operaci: ${errorData.error}`, 'Chyba');
        } else {
            const freshData = await response.json();
            if (freshData.tournaments) { // Aktualizujeme stav jen pokud přišel celý datový objekt
                updateStateWithApiData(freshData);
            }
        }
    } catch (error) {
        console.error(`Došlo k chybě sítě při volání akce '${action}':`, error);
        await showAlertModal('Nepodařilo se provést operaci. Zkontrolujte připojení.', 'Chyba připojení');
    }
}

export async function loadState() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateStateWithApiData(data);
    } catch (error) {
        console.error('Error loading data from API:', error);
        await showAlertModal('Nepodařilo se načíst data ze serveru. Aplikace nemusí fungovat správně.', 'Chyba načítání');
    }
}
