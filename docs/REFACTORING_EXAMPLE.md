# 📝 Příklad: První krok refaktoringu

## Extrahování `generateUniqueTournamentName()`

### Krok 1: Vytvoření modulu

**Soubor: `js/utils/tournament-utils.js`**
```javascript
/**
 * Generuje unikátní název turnaje
 * @param {string} baseName - Základní název turnaje
 * @param {Array<string>} existingNames - Seznam existujících názvů
 * @param {number|null} excludeTournamentId - ID turnaje, který má být vyloučen z kontroly
 * @returns {string} Unikátní název turnaje
 */
export function generateUniqueTournamentName(baseName, existingNames, excludeTournamentId = null) {
    // Odstraníme případné číslo na konci (např. "Turnaj (2)" -> "Turnaj")
    let cleanBaseName = baseName;
    const nameMatch = cleanBaseName.match(/^(.+?)\s*\(\d+\)\s*$/);
    if (nameMatch) {
        cleanBaseName = nameMatch[1].trim();
    }

    // Filtrujeme existující názvy (vyloučíme původní turnaj)
    const filteredNames = excludeTournamentId === null 
        ? existingNames 
        : existingNames.filter((name, index) => {
            // Předpokládáme, že existingNames jsou objekty s id, nebo jen stringy
            if (typeof name === 'object' && name.id) {
                return name.id != excludeTournamentId;
            }
            return true; // Pokud nemáme id, zahrneme všechny
        });

    // Zkontrolujeme, jestli základní název (bez závorky) existuje
    const baseNameExists = filteredNames.some(name => {
        const nameStr = typeof name === 'string' ? name : name.name;
        return nameStr === cleanBaseName;
    });
    
    // Zjistíme všechna čísla v závorkách, která už existují pro tento základní název
    const existingNumbers = new Set();
    filteredNames.forEach(name => {
        const nameStr = typeof name === 'string' ? name : name.name;
        // Pokud je název přesně základní název, přidáme 0 (žádná závorka)
        if (nameStr === cleanBaseName) {
            existingNumbers.add(0);
        }
        // Pokud má název závorku s číslem, extrahujeme číslo
        const match = nameStr.match(new RegExp(`^${cleanBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\((\\d+)\\)\\s*$`));
        if (match) {
            existingNumbers.add(parseInt(match[1], 10));
        }
    });

    // Pokud základní název neexistuje a žádná varianta se závorkou neexistuje, vrátíme základní název
    if (!baseNameExists && existingNumbers.size === 0) {
        return cleanBaseName;
    }

    // Najdeme nejmenší volné číslo pro závorku
    let copyNumber = 2;
    while (existingNumbers.has(copyNumber)) {
        copyNumber++;
    }

    return `${cleanBaseName} (${copyNumber})`;
}
```

### Krok 2: Vytvoření unit testů

**Soubor: `tests/utils/tournament-utils.test.js`**
```javascript
import { describe, it, expect } from 'vitest';
import { generateUniqueTournamentName } from '../../../js/utils/tournament-utils.js';

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
    
    it('should handle name with existing number', () => {
        const existing = ['Turnaj', 'Turnaj (2)'];
        const result = generateUniqueTournamentName('Turnaj (2)', existing, null);
        expect(result).toBe('Turnaj (3)');
    });
    
    it('should exclude tournament by ID', () => {
        const existing = [
            { id: 1, name: 'Turnaj' },
            { id: 2, name: 'Turnaj (2)' }
        ];
        const result = generateUniqueTournamentName('Turnaj', existing, 1);
        expect(result).toBe('Turnaj'); // Protože 'Turnaj' s id=1 je vyloučen
    });
    
    it('should handle date in name', () => {
        const existing = ['Turnaj 20. 11. 2025'];
        const result = generateUniqueTournamentName('Turnaj 20. 11. 2025', existing, null);
        expect(result).toBe('Turnaj 20. 11. 2025 (2)');
    });
});
```

### Krok 3: Aktualizace `index.html`

**Před:**
```javascript
function generateUniqueTournamentName(baseName, excludeTournamentId = null) {
    // ... kód funkce ...
}
```

**Po:**
```html
<script type="module">
import { generateUniqueTournamentName } from './js/utils/tournament-utils.js';
// ... zbytek kódu ...
</script>
```

**Nebo pro kompatibilitu bez modulů:**
```html
<script src="js/utils/tournament-utils.js"></script>
<script>
// Funkce je dostupná jako window.generateUniqueTournamentName
// nebo přes namespace
</script>
```

### Krok 4: Ověření

1. Spustit unit testy: `npm run test:unit`
2. Spustit E2E testy: `npm run test:e2e`
3. Manuálně otestovat v prohlížeči

## 🎯 Výhody tohoto přístupu

- ✅ Funkce je izolovaná a snadno testovatelná
- ✅ Testy pokrývají různé scénáře
- ✅ E2E testy zůstávají jako safety net
- ✅ Snadný rollback, pokud něco nefunguje

## 📊 Metrika úspěchu

- Všechny unit testy procházejí ✅
- Všechny E2E testy procházejí ✅
- Aplikace funguje stejně jako před refaktoringem ✅

