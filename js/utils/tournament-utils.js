/**
 * Utility funkce pro práci s turnaji
 * 
 * @module tournament-utils
 */

/**
 * Generuje unikátní název turnaje
 * 
 * Pokud název již existuje, přidá číslo v závorce (např. "Turnaj (2)").
 * Pokud existuje více variant, najde nejmenší volné číslo.
 * 
 * @param {string} baseName - Základní název turnaje
 * @param {Array<string|Object>} existingNames - Seznam existujících názvů turnajů
 *   Může být pole stringů nebo objektů s vlastností `name` (a volitelně `id`)
 * @param {number|null} excludeTournamentId - ID turnaje, který má být vyloučen z kontroly
 *   Použije se, pokud existingNames obsahuje objekty s vlastností `id`
 * @returns {string} Unikátní název turnaje
 * 
 * @example
 * generateUniqueTournamentName('Turnaj', ['Turnaj']) // 'Turnaj (2)'
 * generateUniqueTournamentName('Turnaj', ['Turnaj', 'Turnaj (2)']) // 'Turnaj (3)'
 * generateUniqueTournamentName('Turnaj (2)', ['Turnaj', 'Turnaj (2)']) // 'Turnaj (3)'
 */
export function generateUniqueTournamentName(baseName, existingNames = [], excludeTournamentId = null) {
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
            // Pokud jsou názvy objekty s id, filtrujeme podle id
            if (typeof name === 'object' && name.id) {
                return name.id != excludeTournamentId;
            }
            // Pokud jsou to stringy, zahrneme všechny (filtrování podle id není možné)
            return true;
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



