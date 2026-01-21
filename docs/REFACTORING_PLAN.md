# 🏗️ Plán refaktoringu a testování

## 📊 Současný stav

### Problémy:
- **Monolitický kód**: Všechna logika v `index.html` (2300+ řádků)
- **Těžká testovatelnost**: Funkce jsou vázané na globální `state` a DOM
- **Riziko regresí**: Změny v jedné části mohou ovlivnit jiné části
- **Duplicitní logika**: Některé funkce se opakují nebo mají podobnou logiku

### Silné stránky:
- ✅ Cypress E2E testy už existují
- ✅ Vanilla JavaScript (žádné závislosti na frameworku)
- ✅ Jasně definované API (`api.php`)

## 🎯 Strategie refaktoringu

### Fáze 1: Příprava a izolace (1-2 týdny)

#### 1.1 Vytvoření testovací infrastruktury
```javascript
// Přidat do package.json:
{
  "scripts": {
    "test:unit": "vitest",
    "test:e2e": "cypress run",
    "test:watch": "vitest --watch"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

#### 1.2 Identifikace testovatelných funkcí
**Kritické funkce pro unit testy:**
- `generateUniqueTournamentName()` - generování unikátních názvů
- `calculateStats()` - výpočet statistik
- `recalculateServiceState()` - logika podání
- `getSidePlayerIds()` - získání hráčů strany
- `formatPlayersLabel()` - formátování názvů
- `updateStateWithApiData()` - normalizace dat z API

#### 1.3 Vytvoření mocků a testovacích utilit
```javascript
// tests/utils/mocks.js
export const mockState = { ... };
export const mockTournament = { ... };
export const mockMatch = { ... };
```

### Fáze 2: Postupné extrahování modulů (2-3 týdny)

#### 2.1 Pure functions (nejjednodušší začít)
**Soubor: `js/utils/tournament-utils.js`**
```javascript
// Funkce bez side effects - snadno testovatelné
export function generateUniqueTournamentName(baseName, existingNames, excludeId) { ... }
export function calculateStats(tournament, players) { ... }
export function formatPlayersLabel(playerIds, players) { ... }
```

**Soubor: `js/utils/match-utils.js`**
```javascript
export function recalculateServiceState(match, pointsToWin, isDouble) { ... }
export function getSidePlayerIds(tournament, match, side) { ... }
export function checkWinCondition(match, pointsToWin) { ... }
```

#### 2.2 State management
**Soubor: `js/state/state-manager.js`**
```javascript
class StateManager {
  constructor() { this.state = { ... }; }
  updateFromApi(data) { ... }
  getTournament(id) { ... }
  getPlayer(id) { ... }
}
export const stateManager = new StateManager();
```

#### 2.3 API layer
**Soubor: `js/api/api-client.js`**
```javascript
class ApiClient {
  async call(action, payload) { ... }
  async loadState() { ... }
}
export const apiClient = new ApiClient();
```

#### 2.4 UI komponenty
**Soubor: `js/ui/modal-manager.js`**
```javascript
class ModalManager {
  open(html) { ... }
  close() { ... }
}
export const modalManager = new ModalManager();
```

### Fáze 3: Testování extrahovaných modulů (1-2 týdny)

#### 3.1 Unit testy pro pure functions
```javascript
// tests/utils/tournament-utils.test.js
import { generateUniqueTournamentName } from '../../js/utils/tournament-utils.js';

describe('generateUniqueTournamentName', () => {
  it('should return base name if not exists', () => {
    const result = generateUniqueTournamentName('Turnaj', [], null);
    expect(result).toBe('Turnaj');
  });
  
  it('should add number if name exists', () => {
    const existing = ['Turnaj'];
    const result = generateUniqueTournamentName('Turnaj', existing, null);
    expect(result).toBe('Turnaj (2)');
  });
  
  it('should find next available number', () => {
    const existing = ['Turnaj', 'Turnaj (2)', 'Turnaj (3)'];
    const result = generateUniqueTournamentName('Turnaj', existing, null);
    expect(result).toBe('Turnaj (4)');
  });
});
```

#### 3.2 Integration testy pro state management
```javascript
// tests/state/state-manager.test.js
import { stateManager } from '../../js/state/state-manager.js';

describe('StateManager', () => {
  beforeEach(() => {
    stateManager.reset();
  });
  
  it('should update tournaments from API data', () => {
    const apiData = { tournaments: [{ id: 1, name: 'Test' }] };
    stateManager.updateFromApi(apiData);
    expect(stateManager.getTournament(1).name).toBe('Test');
  });
});
```

### Fáze 4: Refaktoring UI logiky (2-3 týdny)

#### 4.1 Rozdělení render funkcí
**Soubor: `js/ui/screens/main-screen.js`**
```javascript
export function renderMainScreen(state) { ... }
```

**Soubor: `js/ui/screens/tournament-screen.js`**
```javascript
export function renderTournamentScreen(state) { ... }
```

**Soubor: `js/ui/screens/game-screen.js`**
```javascript
export function renderGameBoard(state) { ... }
```

#### 4.2 Event handling
**Soubor: `js/events/action-handler.js`**
```javascript
class ActionHandler {
  register(action, handler) { ... }
  handle(event) { ... }
}
export const actionHandler = new ActionHandler();
```

### Fáze 5: Build systém (volitelné, 1 týden)

#### 5.1 Přidání bundleru (Vite/Webpack)
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  }
}
```

## 🧪 Testovací strategie

### Unit testy (Vitest)
- **Cíl**: 70-80% pokrytí pro kritické funkce
- **Fokus**: Business logika, utility funkce
- **Příklady**:
  - Generování názvů turnajů
  - Výpočet statistik
  - Logika podání
  - Validace dat

### Integration testy (Vitest)
- **Cíl**: Testování interakcí mezi moduly
- **Příklady**:
  - State management + API
  - UI rendering + state
  - Event handling

### E2E testy (Cypress) - již existují
- **Cíl**: Kritické user flows
- **Rozšířit o**:
  - Kopírování turnaje
  - Undo funkcionalita
  - Klávesové zkratky
  - Export funkcionalita

## 📋 Konkrétní postup

### Krok 1: Začít s nejjednoduššími funkcemi
1. Extrahovat `generateUniqueTournamentName()` do `js/utils/tournament-utils.js`
2. Napsat unit testy
3. Nahradit v `index.html` importem
4. Ověřit, že E2E testy stále procházejí

### Krok 2: Pokračovat s dalšími pure functions
1. `calculateStats()`
2. `formatPlayersLabel()`
3. `getSidePlayerIds()`
4. Postupně testovat a refaktorovat

### Krok 3: State management
1. Vytvořit `StateManager` třídu
2. Postupně přesunout logiku z globálního `state`
3. Testovat každý krok

### Krok 4: UI komponenty
1. Rozdělit render funkce do samostatných modulů
2. Přidat testy pro rendering (snapshot testy)

## ⚠️ Důležité zásady

1. **Postupně a opatrně**: Vždy refaktorovat malé části
2. **Testy před refaktoringem**: Napsat testy pro existující funkci před refaktoringem
3. **Zachovat E2E testy**: Jsou safety net pro regrese
4. **Commit po každém kroku**: Snadný rollback při problémech
5. **Code review**: Kontrola každé změny

## 🎯 Očekávané výhody

- ✅ Snadnější testování jednotlivých funkcí
- ✅ Menší riziko regresí
- ✅ Lepší čitelnost kódu
- ✅ Možnost reužití funkcí
- ✅ Jednodušší onboarding nových vývojářů
- ✅ Snadnější údržba

## 📝 Doporučené nástroje

- **Vitest**: Unit testy (rychlejší než Jest, kompatibilní s Vite)
- **@testing-library/dom**: Testování DOM interakcí
- **MSW (Mock Service Worker)**: Mockování API volání
- **Vite**: Build tool (volitelné, ale doporučené)

## 🚀 První kroky (doporučuji začít)

1. **Nainstalovat Vitest**:
   ```bash
   npm install -D vitest @vitest/ui
   ```

2. **Vytvořit první test** pro `generateUniqueTournamentName()`:
   ```javascript
   // tests/utils/tournament-utils.test.js
   ```

3. **Extrahovat funkci** do samostatného modulu

4. **Ověřit**, že vše funguje

5. **Postupně pokračovat** s dalšími funkcemi

