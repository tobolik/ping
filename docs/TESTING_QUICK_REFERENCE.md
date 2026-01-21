# Rychlý referenční průvodce testováním

## Testovací režim

Aktivujte testovací režim přidáním `?test=true` do URL:
```
http://localhost/a/ping/index.html?test=true
```

V testovacím režimu:
- ✅ Modaly se automaticky zavírají po 500ms
- ✅ Alert modaly se automaticky potvrzují
- ✅ Confirm modaly se automaticky potvrzují (true)

## Nejrychlejší způsoby identifikace elementů

### 1. `data-test-id` atributy (NEJRYCHLEJŠÍ)
```javascript
// Přímé vyhledávání podle data-test-id
const button = document.querySelector('[data-test-id="new-tournament-button"]');
```

### 2. `data-action` atributy (RYCHLÉ)
```javascript
// Vyhledávání podle data-action
const button = document.querySelector('[data-action="create-tournament"]');
```

### 3. `data-player-names` atributy (PRO HRÁČE)
```javascript
// Vyhledávání score boxu podle jména hráče
const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
for (const box of scoreBoxes) {
  const names = box.getAttribute('data-player-names');
  if (names && names.split(',').some(name => name.trim() === 'Honza')) {
    return box; // Nalezeno!
  }
}
```

## Nejčastější data-test-id atributy

### Turnaje
- `new-tournament-button` - Tlačítko "+ Nový turnaj"
- `open-tournament-{id}` - Tlačítko "Start turnaje" pro turnaj s ID
- `tournament-card-{id}` - Karta turnaje
- `toggle-lock-{id}` - Tlačítko pro zamčení/odemčení turnaje

### Vytváření turnaje
- `new-tournament-modal` - Modal pro vytvoření turnaje
- `tournament-name-input` - Input pro název turnaje
- `tournament-type-single` - Tlačítko "Dvouhra"
- `tournament-type-double` - Tlačítko "Čtyřhra"
- `points-to-win-11` - Radio button "Malý set (11)"
- `points-to-win-21` - Radio button "Velký set (21)"
- `add-player-input` - Input pro přidání hráče
- `create-tournament-button` - Tlačítko "Vytvořit turnaj"

### Zápasy
- `play-match-{id}` - Tlačítko "Hrát zápas"
- `swap-sides-{id}` - Tlačítko "Prohodit strany"
- `score-box-{side}-{playerIds}` - Score box pro stranu
- `subtract-point-{side}` - Tlačítko "-1" pro odečtení bodu

### První podání
- `set-first-server-team-1` - Tlačítko pro výběr prvního týmu (čtyřhra)
- `set-first-server-team-2` - Tlačítko pro výběr druhého týmu (čtyřhra)
- `set-first-server-player-{id}` - Tlačítko pro výběr hráče (dvouhra)

### Navigace
- `back-to-main` - Tlačítko "Zpět" do hlavní obrazovky
- `back-to-tournament` - Tlačítko "Přerušit" / "Zpět" do turnaje

### Modaly
- `alert-modal` - Alert modal
- `confirm-modal` - Confirm modal
- `alert-modal-ok` - Tlačítko "OK" v alert modalu
- `confirm-modal-confirm` - Tlačítko "Potvrdit" v confirm modalu
- `confirm-modal-cancel` - Tlačítko "Zrušit" v confirm modalu

### Úprava výsledku zápasu
- `edit-score1` - Input pro skóre prvního hráče/týmu
- `edit-score2` - Input pro skóre druhého hráče/týmu
- `edit-match-save` - Tlačítko "Uložit" v modalu pro úpravu výsledku
- `edit-match-cancel` - Tlačítko "Zrušit" v modalu pro úpravu výsledku

## Helper funkce pro rychlé testování

### Zavření modalu
```javascript
async function closeModalIfPresent() {
  const modal = document.querySelector('.modal-backdrop');
  if (modal) {
    const buttons = Array.from(modal.querySelectorAll('button'));
    const okButton = buttons.find(btn => 
      btn.textContent.includes('OK') || 
      btn.getAttribute('data-action')?.includes('close')
    );
    if (okButton) {
      okButton.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    }
  }
  return false;
}
```

### Přidání bodů hráči
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
  
  if (!playerBox) return false;
  
  // Přidat body s Promise chain
  for (let i = 0; i < points; i++) {
    await new Promise(resolve => {
      playerBox.click();
      setTimeout(resolve, delay);
    });
  }
  
  return true;
}
```

### Vytvoření turnaje
```javascript
async function createTournament(name, players, pointsToWin = 11, type = 'single') {
  // Zavřít modal, pokud existuje
  await closeModalIfPresent();
  
  // Otevřít modal
  const newButton = document.querySelector('[data-test-id="new-tournament-button"]');
  if (newButton) {
    newButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Nastavit název
  const nameInput = document.querySelector('[data-test-id="tournament-name-input"]');
  if (nameInput) {
    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Vybrat typ turnaje
  if (type === 'double') {
    const doubleButton = document.querySelector('[data-test-id="tournament-type-double"]');
    if (doubleButton) doubleButton.click();
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Vybrat počet bodů
  const pointsRadio = document.querySelector(`[data-test-id="points-to-win-${pointsToWin}"]`);
  if (pointsRadio) pointsRadio.click();
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Přidat hráče
  const playerInput = document.querySelector('[data-test-id="add-player-input"]');
  if (playerInput) {
    for (const player of players) {
      playerInput.value = player;
      playerInput.dispatchEvent(new Event('input', { bubbles: true }));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
      playerInput.dispatchEvent(enterEvent);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // Vytvořit turnaj
  const createButton = document.querySelector('[data-test-id="create-tournament-button"]');
  if (createButton) {
    createButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  }
  
  return false;
}
```

## Příklad: Kompletní test scénář

```javascript
// Vytvořit turnaj, spustit zápas, přidat body
await browser_evaluate({
  function: async () => {
    // Helper funkce
    async function closeModalIfPresent() {
      const modal = document.querySelector('.modal-backdrop');
      if (modal) {
        const buttons = Array.from(modal.querySelectorAll('button'));
        const okButton = buttons.find(btn => btn.textContent.includes('OK'));
        if (okButton) {
          okButton.click();
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
    
    async function addPointsToPlayer(playerName, points) {
      const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
      let playerBox = null;
      for (const box of scoreBoxes) {
        const names = box.getAttribute('data-player-names');
        if (names && names.split(',').some(name => name.trim() === playerName)) {
          playerBox = box;
          break;
        }
      }
      if (!playerBox) return false;
      for (let i = 0; i < points; i++) {
        await new Promise(resolve => {
          playerBox.click();
          setTimeout(resolve, 300);
        });
      }
      return true;
    }
    
    // 1. Zavřít modal, pokud existuje
    await closeModalIfPresent();
    
    // 2. Otevřít modal pro nový turnaj
    const newButton = document.querySelector('[data-test-id="new-tournament-button"]');
    if (newButton) {
      newButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. Nastavit název a přidat hráče
    const nameInput = document.querySelector('[data-test-id="tournament-name-input"]');
    if (nameInput) {
      nameInput.value = 'Test Turnaj';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    const playerInput = document.querySelector('[data-test-id="add-player-input"]');
    if (playerInput) {
      for (const player of ['Honza', 'Ondra']) {
        playerInput.value = player;
        playerInput.dispatchEvent(new Event('input', { bubbles: true }));
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
        playerInput.dispatchEvent(enterEvent);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // 4. Vytvořit turnaj
    const createButton = document.querySelector('[data-test-id="create-tournament-button"]');
    if (createButton) {
      createButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 5. Otevřít turnaj
    const tournamentButton = document.querySelector('[data-test-id="open-tournament-24"]'); // Nahradit ID
    if (tournamentButton) {
      tournamentButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 6. Spustit zápas
    const playButton = document.querySelector('[data-test-id="play-match-84"]'); // Nahradit ID
    if (playButton) {
      playButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 7. Vybrat první podání
    const firstServerButton = document.querySelector('[data-test-id="set-first-server-player-1"]'); // Nahradit ID
    if (firstServerButton) {
      firstServerButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 8. Přidat body
    await addPointsToPlayer('Honza', 11);
    
    return true;
  }
});
```

## Checklist před testováním

- [ ] Aktivovat testovací režim (`?test=true` v URL)
- [ ] Zavřít všechny otevřené modaly
- [ ] Použít `data-test-id` atributy pro identifikaci elementů
- [ ] Použít helper funkce pro opakované akce
- [ ] Nastavit vhodné zpoždění mezi akcemi (300ms)
- [ ] Použít `browser_evaluate` pro komplexnější interakce

