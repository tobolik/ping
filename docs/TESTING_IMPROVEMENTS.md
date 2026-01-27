# Návrhy na zlepšení testování

## Identifikované problémy

### 1. Modal backdrop blokuje kliky
**Problém:** Modal backdrop (`modal-backdrop`) blokuje všechny kliky na pozadí, což způsobuje timeouty při testování.

**Řešení:**
- Přidat `data-test-close="true"` atribut na modaly, které lze automaticky zavřít
- Upravit CSS pro modal backdrop, aby neblokoval kliky na pozadí (pouze na samotný modal)
- Přidat helper funkci pro automatické zavření modalu v testech

### 2. Chybějící `data-player-names` v některých případech
**Problém:** V některých případech (např. při načítání) nemusí být `data-player-names` atribut dostupný okamžitě.

**Řešení:**
- Zajistit, že `data-player-names` je vždy nastaven při renderování score boxů
- Přidat fallback mechanismus pro vyhledávání podle textu
- Přidat `data-test-id` atributy pro stabilní identifikaci

### 3. Pomalé testování kvůli čekání na modaly
**Problém:** Testování je pomalé kvůli nutnosti čekat na zavření modalu a aktualizaci DOM.

**Řešení:**
- Přidat možnost automatického zavření modalu po určité době (pouze v testovacím režimu)
- Vytvořit helper funkce pro práci s modaly, které automaticky čekají na zavření
- Používat `browser_evaluate` pro komplexnější interakce místo jednotlivých kliků

### 4. Dynamické `aria-ref` atributy
**Problém:** `aria-ref` atributy se mění po každé interakci, což způsobuje timeouty.

**Řešení:**
- Vždy používat `data-*` atributy místo `aria-ref`
- Přidat `data-test-id` atributy pro stabilní identifikaci elementů
- Vytvořit helper funkce pro vyhledávání elementů podle `data-*` atributů

## Konkrétní návrhy na implementaci

### 1. Zlepšení modal systému

#### A. Přidat `data-test-auto-close` atribut
```javascript
// V showAlertModal a showConfirmModal
const showAlertModal = (message, title = 'Upozornění', autoClose = false) => {
    return new Promise((resolve) => {
        const autoCloseAttr = autoClose ? 'data-test-auto-close="true"' : '';
        openModal(`
            <div class="modal-backdrop" ${autoCloseAttr}>
                ...
            </div>
        `);
        // Automatické zavření po 1 sekundě v testovacím režimu
        if (autoClose || window.TESTING_MODE) {
            setTimeout(() => {
                closeModal();
                resolve();
            }, 1000);
        }
    });
};
```

#### B. Upravit CSS pro modal backdrop
```css
.modal-backdrop {
    pointer-events: auto;
}

.modal-backdrop:not(:has(.modal-content:hover)) {
    /* Backdrop neblokuje kliky, pokud není kurzor nad modalem */
}

/* Nebo jednodušeji - backdrop neblokuje kliky na pozadí */
.modal-backdrop::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.modal-content {
    pointer-events: auto;
}
```

#### C. Helper funkce pro práci s modaly
```javascript
// V browser_evaluate
async function closeModalIfPresent() {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
        const closeButton = modal.querySelector('[data-action="close-alert-modal"], [data-action="close-confirm-modal"], [data-action="close-modal"]');
        if (closeButton) {
            closeButton.click();
            // Počkáme na zavření
            await new Promise(resolve => setTimeout(resolve, 300));
            return true;
        }
    }
    return false;
}
```

### 2. Zlepšení data atributů

#### A. Zajistit, že `data-player-names` je vždy nastaven
```javascript
// V makeScoreBox funkci
const makeScoreBox = (sideDescriptor, currentScore, rawSide) => {
    const playerNames = sideDescriptor.playerIds
        .map(id => getGlobalPlayer(id)?.name || '???')
        .filter(Boolean);
    const playerIdsStr = sideDescriptor.playerIds.join(',');
    const playerNamesStr = playerNames.join(',');
    
    // VŽDY nastavit data-player-names, i když je prázdný
    const dataAttrs = canAddPoints 
        ? `data-action="add-point" data-side="${rawSide}" data-player-ids="${playerIdsStr}" data-player-names="${playerNamesStr || 'unknown'}" data-test-id="score-box-${rawSide}"`
        : '';
    
    return `
        <div ${dataAttrs} class="player-score-box ...">
            ...
        </div>
    `;
};
```

#### B. Přidat `data-test-id` atributy pro stabilní identifikaci
```javascript
// Pro všechny důležité elementy
<button data-action="play-match" data-test-id="play-match-${matchId}">▶</button>
<input data-test-id="tournament-name-input" ...>
<button data-action="create-tournament" data-test-id="create-tournament-btn">...</button>
```

### 3. Helper funkce pro testování

#### A. Univerzální helper pro vyhledávání elementů
```javascript
function findElement(selector, options = {}) {
    // 1. Zkusit podle data-test-id
    if (options.testId) {
        const element = document.querySelector(`[data-test-id="${options.testId}"]`);
        if (element) return element;
    }
    
    // 2. Zkusit podle data-action
    if (options.action) {
        const element = document.querySelector(`[data-action="${options.action}"]`);
        if (element) return element;
    }
    
    // 3. Zkusit podle textu
    if (options.text) {
        const elements = Array.from(document.querySelectorAll(selector || '*'));
        const element = elements.find(el => el.textContent.includes(options.text));
        if (element) return element;
    }
    
    // 4. Fallback na standardní selektor
    return document.querySelector(selector);
}
```

#### B. Helper pro automatické zavření modalu
```javascript
async function autoCloseModal(timeout = 1000) {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
        // Zkusit najít tlačítko OK nebo Zavřít
        const buttons = Array.from(modal.querySelectorAll('button'));
        const closeButton = buttons.find(btn => 
            btn.textContent.includes('OK') || 
            btn.textContent.includes('Zavřít') ||
            btn.getAttribute('data-action')?.includes('close')
        );
        
        if (closeButton) {
            setTimeout(() => {
                closeButton.click();
            }, timeout);
            return true;
        }
    }
    return false;
}
```

#### C. Helper pro přidání bodů s automatickým čekáním
```javascript
async function addPointsToPlayer(playerName, points, delay = 300) {
    const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
    let playerBox = null;
    
    // Nejdříve zkusit podle data-player-names
    for (const box of scoreBoxes) {
        const names = box.getAttribute('data-player-names');
        if (names && names.split(',').some(name => name.trim() === playerName)) {
            playerBox = box;
            break;
        }
    }
    
    // Fallback - podle textu
    if (!playerBox) {
        for (const box of scoreBoxes) {
            if (box.textContent.includes(playerName)) {
                playerBox = box;
                break;
            }
        }
    }
    
    if (!playerBox) {
        console.error(`Score box pro hráče ${playerName} nenalezen.`);
        return false;
    }
    
    // Přidat body s Promise chain pro správné čekání
    for (let i = 0; i < points; i++) {
        await new Promise(resolve => {
            playerBox.click();
            setTimeout(resolve, delay);
        });
    }
    
    return true;
}
```

### 4. Testovací režim

#### A. Přidat testovací režim do aplikace
```javascript
// Na začátku aplikace
window.TESTING_MODE = window.location.search.includes('test=true');

// V showAlertModal a showConfirmModal
if (window.TESTING_MODE) {
    // Automaticky zavřít modal po 500ms
    setTimeout(() => {
        closeModal();
        resolve();
    }, 500);
}
```

#### B. Helper funkce pro testování
```javascript
// V browser_evaluate
async function waitForModalClose() {
    return new Promise((resolve) => {
        const checkModal = () => {
            const modal = document.querySelector('.modal-backdrop');
            if (!modal) {
                resolve();
            } else {
                setTimeout(checkModal, 100);
            }
        };
        checkModal();
    });
}
```

## Prioritizace implementace

### Vysoká priorita (okamžité zlepšení)
1. ✅ **Helper funkce pro automatické zavření modalu** - okamžitě zrychlí testování
2. ✅ **Zlepšení `data-player-names` atributů** - zajistí stabilní vyhledávání
3. ✅ **Helper funkce pro přidání bodů** - zjednoduší opakované akce

### Střední priorita (postupné zlepšení)
4. **Testovací režim** - umožní automatické zavírání modalu
5. **`data-test-id` atributy** - přidat pro všechny důležité elementy
6. **Zlepšení CSS pro modal backdrop** - sníží problémy s blokováním kliků

### Nízká priorita (dlouhodobé zlepšení)
7. **Automatické dokumentování testů** - generování testovacích skriptů
8. **Testovací API** - speciální endpointy pro testování

## Doporučení pro okamžité použití

1. **Vždy používat `browser_evaluate` pro práci s modaly** - umožní přímou manipulaci s DOM
2. **Vytvářet helper funkce pro opakované akce** - zrychlí testování
3. **Používat `data-*` atributy místo `aria-ref`** - stabilnější identifikace
4. **Přidat automatické čekání na zavření modalu** - sníží timeouty

## Příklad použití

```javascript
// Příklad: Otevřít turnaj a automaticky zavřít modal
await browser_evaluate({
    function: async () => {
        // Zavřít modal, pokud existuje
        await closeModalIfPresent();
        
        // Najít a kliknout na tlačítko "Start turnaje"
        const button = findElement(null, { 
            action: 'open-tournament',
            text: 'Test Turnaj 2 - Čtyřhra'
        });
        if (button) {
            button.click();
            // Počkat na načtení
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        }
        return false;
    }
});
```

