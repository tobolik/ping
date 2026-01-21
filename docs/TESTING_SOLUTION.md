# Řešení problému s dynamickými `aria-ref` atributy

## Problém
Dynamické `aria-ref` atributy komplikují automatizaci testování:
- `aria-ref` se mění po každé interakci s DOM
- Nutnost neustále aktualizovat refy zpomaluje testování
- Časté timeouty při čekání na elementy s neplatnými refy

## Řešení

### 1. Použití stabilních `data-*` atributů
Místo spoléhání se na dynamické `aria-ref` atributy používáme stabilní `data-action` a `data-side`/`data-player-id` atributy:

```javascript
// ❌ Špatně - spoléháme se na dynamický aria-ref
const element = document.querySelector('[aria-ref="e698"]');

// ✅ Správně - používáme stabilní data atributy
const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
```

### 2. Vyhledávání podle jména hráče (RYCHLEJŠÍ)
Score boxy mají nyní `data-player-names` atribut pro rychlé vyhledávání:

```javascript
// ✅ NEJRYCHLEJŠÍ - použití data-player-names atributu
function findPlayerScoreBox(playerName) {
  const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
  for (const box of scoreBoxes) {
    const names = box.getAttribute('data-player-names');
    if (names && names.split(',').some(name => name.trim() === playerName)) {
      return box;
    }
  }
  return null;
}

// ✅ ALTERNATIVA - vyhledávání podle textu (pomalejší, ale funguje vždy)
function findPlayerScoreBoxByText(playerName) {
  const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
  for (const box of scoreBoxes) {
    if (box.textContent.includes(playerName)) {
      return box;
    }
  }
  return null;
}
```

### 3. Helper funkce pro opakované akce
Pro opakované akce (např. přidávání bodů) vytváříme helper funkce:

```javascript
function addPointsToPlayer(playerName, points) {
  const playerBox = findPlayerScoreBox(playerName);
  if (playerBox) {
    for (let i = 0; i < points; i++) {
      setTimeout(() => {
        playerBox.click();
      }, i * 300);
    }
    return true;
  }
  return false;
}
```

## Výhody tohoto přístupu

1. **Stabilita**: `data-*` atributy se nemění při aktualizacích DOM
2. **Rychlost**: Není nutné čekat na aktualizaci `aria-ref` atributů
3. **Robustnost**: Funkce fungují i při změnách struktury DOM (pokud zůstanou `data-*` atributy)
4. **Čitelnost**: Kód je jasnější a snadněji udržovatelný

## Použití v testech

Tento přístup byl úspěšně použit v testu TC-17.1 (Dokončení zápasu - výhra na 11 bodů), kde bylo potřeba přidat 11 bodů hráči. Místo 11 samostatných kliků s neustálým aktualizováním `aria-ref` bylo použito jediné volání helper funkce.

**Viz také:** `TESTING_HELPERS.md` - kompletní sada helper funkcí pro testování

## Nové atributy v kódu (od verze s touto úpravou)

Score boxy nyní mají tyto atributy pro rychlejší testování:
- `data-action="add-point"` - identifikace klikatelného score boxu
- `data-side="1"` nebo `data-side="2"` - identifikace strany
- `data-player-ids="1,2"` - seznam ID hráčů (pro čtyřhru)
- `data-player-names="Honza,Ondra"` - seznam jmen hráčů (pro rychlé vyhledávání)

## Helper funkce pro testování

### Rychlé přidání bodů hráči
```javascript
async function addPointsToPlayer(playerName, points) {
  const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
  let playerBox = null;
  
  // Nejdříve zkusíme rychlé vyhledávání podle data-player-names
  for (const box of scoreBoxes) {
    const names = box.getAttribute('data-player-names');
    if (names && names.split(',').some(name => name.trim() === playerName)) {
      playerBox = box;
      break;
    }
  }
  
  // Pokud nenajdeme, zkusíme podle textu
  if (!playerBox) {
    for (const box of scoreBoxes) {
      if (box.textContent.includes(playerName)) {
        playerBox = box;
        break;
      }
    }
  }
  
  if (playerBox) {
    for (let i = 0; i < points; i++) {
      setTimeout(() => {
        playerBox.click();
      }, i * 300);
    }
    return true;
  }
  return false;
}
```

### Použití v browser_evaluate
```javascript
// Příklad: Přidat 11 bodů hráči "Honza"
await browser_evaluate({
  function: () => {
    const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
    let honzaBox = null;
    for (const box of scoreBoxes) {
      const names = box.getAttribute('data-player-names');
      if (names && names.split(',').some(name => name.trim() === 'Honza')) {
        honzaBox = box;
        break;
      }
    }
    if (honzaBox) {
      for (let i = 0; i < 11; i++) {
        setTimeout(() => honzaBox.click(), i * 300);
      }
      return true;
    }
    return false;
  }
});
```

## Nová vylepšení (implementováno)

### 1. Testovací režim
Aplikace nyní podporuje testovací režim aktivovaný pomocí `?test=true` v URL:
- Modaly se automaticky zavírají po 500ms
- Alert modaly se automaticky potvrzují
- Confirm modaly se automaticky potvrzují (true)

### 2. Zlepšené CSS pro modal backdrop
Modal backdrop již neblokuje kliky na pozadí - používá `pointer-events: none` na `::before` pseudo-elementu.

### 3. `data-test-id` atributy
Všechny důležité elementy nyní mají `data-test-id` atributy pro stabilní identifikaci:
- `new-tournament-button` - Tlačítko "+ Nový turnaj"
- `open-tournament-{id}` - Tlačítko "Start turnaje"
- `play-match-{id}` - Tlačítko "Hrát zápas"
- `score-box-{side}-{playerIds}` - Score boxy
- A mnoho dalších...

### 4. Zlepšené `data-player-names` atributy
Score boxy nyní VŽDY mají `data-player-names` atribut, i když je prázdný (nastaveno na "unknown" jako fallback).

### 5. Automatické zavírání modalu v testovacím režimu
`showAlertModal` a `showConfirmModal` nyní podporují automatické zavírání v testovacím režimu.

## Doporučení pro budoucí testy

1. **VŽDY aktivujte testovací režim** (`?test=true` v URL) - zrychlí testování
2. **Vždy preferujte `data-test-id` atributy** (nejrychlejší identifikace)
3. **Pro vyhledávání hráčů použijte `data-player-names`** (rychlé)
4. **Jako fallback použijte vyhledávání podle textu** (pomalejší, ale funguje vždy)
5. **Vytvářejte helper funkce pro opakované akce**
6. **Používejte `browser_evaluate` pro komplexnější interakce** místo jednotlivých kliků
7. **Pro přidávání více bodů použijte helper funkci s Promise chain** (300ms mezi kliky)
8. **Zavírejte modaly před dalšími akcemi** pomocí `closeModalIfPresent()`

## Viz také

- **[TESTING_HELPERS.md](TESTING_HELPERS.md)** - Kompletní sada helper funkcí
- **[TESTING_QUICK_REFERENCE.md](TESTING_QUICK_REFERENCE.md)** - Rychlý referenční průvodce
- **[TESTING_IMPROVEMENTS.md](TESTING_IMPROVEMENTS.md)** - Detailní návrhy na zlepšení

