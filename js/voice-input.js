import { state } from './state.js';
import { getTournament, getMatch, getGlobalPlayer, getSidePlayerIds } from './utils.js';
import { showToast } from './ui.js';
import { speak } from './audio.js';

class VoiceInputManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.keywords = new Map(); // word -> playerId
        this.updateScoreFn = null;
        this.undoLastPointFn = null;
        this.lang = 'cs-CZ';
        this.restartTimer = null;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = this.lang;

            this.recognition.onresult = (event) => this.handleResult(event);
            this.recognition.onerror = (event) => this.handleError(event);
            this.recognition.onend = () => this.handleEnd();
        } else {
            console.warn('Web Speech API is not supported in this browser.');
        }
    }

    init(updateScoreFn, undoLastPointFn) {
        this.updateScoreFn = updateScoreFn;
        this.undoLastPointFn = undoLastPointFn;
    }

    isActive() {
        return this.isListening;
    }

    updateKeywords() {
        this.keywords.clear();
        const t = getTournament();
        const m = getMatch(t, state.activeMatchId);
        
        if (!t || !m) return;

        // Získáme všechny hráče v zápase
        const side1Ids = getSidePlayerIds(t, m, 1);
        const side2Ids = getSidePlayerIds(t, m, 2);
        const allIds = [...side1Ids, ...side2Ids];

        const tempMap = new Map(); // word -> Set(ids)

        allIds.forEach(id => {
            const player = getGlobalPlayer(id);
            if (!player) return;

            const terms = [];
            if (player.name) terms.push(player.name.toLowerCase());
            if (player.nickname) terms.push(player.nickname.toLowerCase());
            
            // Rozdělení jména na části (např. "Jan Novák" -> "jan", "novák")
            if (player.name) {
                 const parts = player.name.toLowerCase().split(/\s+/);
                 if (parts.length > 1) {
                     parts.forEach(p => {
                         if (p.length > 2) terms.push(p); // Ignorovat příliš krátké části
                     });
                 }
            }

            terms.forEach(term => {
                if (!tempMap.has(term)) {
                    tempMap.set(term, new Set());
                }
                tempMap.get(term).add(id);
            });
        });

        // Řešení kolizí - uložíme jen unikátní klíčová slova
        tempMap.forEach((ids, term) => {
            if (ids.size === 1) {
                this.keywords.set(term, [...ids][0]);
            } else {
                console.log(`VoiceInput: Nejednoznačný výraz '${term}' pro hráče IDs:`, [...ids]);
            }
        });
        
        console.log('VoiceInput keywords:', this.keywords);
    }

    handleResult(event) {
        if (!event.results || event.results.length === 0) return;
        
        const last = event.results.length - 1;
        const result = event.results[last];
        
        if (!result.isFinal) return; // Zpracováváme jen finální výsledky

        const text = result[0].transcript.trim().toLowerCase();
        console.log('VoiceInput received:', text);

        if (text.includes('zpět') || text.includes('opravit')) {
             if (this.undoLastPointFn) {
                 this.undoLastPointFn();
                 showToast('Akce vrácena (hlasem)', 'info');
                 speak('Opravuji');
             }
             return;
        }

        // Kontrola "bod [hráč]" nebo jen "[hráč]"
        let lookupTerm = text;
        if (text.startsWith('bod ')) {
            lookupTerm = text.substring(4).trim();
        }

        // 1. Zkusíme přesnou shodu
        let playerId = this.keywords.get(lookupTerm);
        
        // 2. Pokud není přesná shoda, zkusíme najít, zda text obsahuje klíčové slovo
        // Pozor: může být nebezpečné pro krátká slova, ale máme limit > 2 znaky
        if (!playerId) {
            for (const [key, id] of this.keywords.entries()) {
                 // Hledáme celé slovo v textu (aby 'jan' nenašlo 'jana')
                 const regex = new RegExp(`\\b${key}\\b`);
                 if (regex.test(lookupTerm)) {
                     playerId = id;
                     break; // Bereme první shodu
                 }
            }
        }

        if (playerId) {
            if (this.updateScoreFn) {
                this.updateScoreFn(playerId, 1);
                const player = getGlobalPlayer(playerId);
                const name = player.nickname || player.name;
                showToast(`Bod pro: ${name} (hlasem)`, 'success');
            }
        } else {
             console.log('VoiceInput: Žádná shoda pro', text);
        }
    }

    handleError(event) {
        console.error('VoiceInput error:', event.error);
        if (event.error === 'not-allowed') {
            this.stop();
            state.settings.voiceInputEnabled = false; // Vynutíme vypnutí v nastavení
            showToast('Přístup k mikrofonu odepřen', 'error');
            // Zde bychom ideálně měli aktualizovat i UI tlačítko, ale to se překreslí při dalším renderu
            // nebo musíme vyvolat překreslení. Pro teď stačí toast.
        }
    }

    handleEnd() {
        if (this.isListening) {
             // Pokud má poslouchat, ale API se zastavilo (např. ticho), restartujeme
             this.restartTimer = setTimeout(() => {
                 try {
                    if (this.isListening && this.recognition) this.recognition.start();
                 } catch(e) { console.error('VoiceInput restart failed', e); }
             }, 100);
        }
    }

    start() {
        if (!this.recognition) {
            showToast('Hlasové ovládání není podporováno', 'error');
            return;
        }
        if (this.isListening) return;
        
        this.updateKeywords();
        try {
            this.recognition.start();
            this.isListening = true;
            showToast('Hlasové ovládání aktivní', 'info');
        } catch (e) {
            console.error('VoiceInput start error', e);
            this.isListening = false;
        }
    }

    stop() {
        if (!this.recognition) return;
        this.isListening = false;
        if (this.restartTimer) clearTimeout(this.restartTimer);
        try {
            this.recognition.stop();
        } catch(e) { /* ignore */ }
        showToast('Hlasové ovládání vypnuto', 'info');
    }

    toggle() {
        if (this.isListening) this.stop(); else this.start();
    }
}

export const voiceInput = new VoiceInputManager();
