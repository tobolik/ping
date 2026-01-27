# Helper funkce pro testování

Tento dokument obsahuje helper funkce, které lze použít při automatizovaném testování aplikace.

## Funkce pro práci se score boxy

### `findPlayerScoreBox(playerName)`
Najde score box pro daného hráče.

```javascript
function findPlayerScoreBox(playerName) {
  const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
  
  // Nejdříve zkusíme rychlé vyhledávání podle data-player-names
  for (const box of scoreBoxes) {
    const names = box.getAttribute('data-player-names');
    if (names && names.split(',').some(name => name.trim() === playerName)) {
      return box;
    }
  }
  
  // Pokud nenajdeme, zkusíme podle textu (fallback)
  for (const box of scoreBoxes) {
    if (box.textContent.includes(playerName)) {
      return box;
    }
  }
  
  return null;
}
```

### `addPointsToPlayer(playerName, points, delay = 300)`
Přidá body hráči s automatickým zpožděním mezi kliky (používá Promise chain pro správné čekání).

```javascript
async function addPointsToPlayer(playerName, points, delay = 300) {
  const playerBox = findPlayerScoreBox(playerName);
  if (!playerBox) {
    console.error(`Hráč "${playerName}" nebyl nalezen`);
    return false;
  }
  
  // Použít Promise chain pro správné čekání
  for (let i = 0; i < points; i++) {
    await new Promise(resolve => {
      playerBox.click();
      setTimeout(resolve, delay);
    });
  }
  
  return true;
}
```

### `getPlayerScore(playerName)`
Získá aktuální skóre hráče.

```javascript
function getPlayerScore(playerName) {
  const playerBox = findPlayerScoreBox(playerName);
  if (!playerBox) {
    return null;
  }
  
  // Najdeme element se skóre (velké číslo)
  const scoreElement = playerBox.querySelector('.text-7xl, .text-8xl, .text-9xl');
  if (scoreElement) {
    return parseInt(scoreElement.textContent.trim(), 10);
  }
  
  return null;
}
```

## Funkce pro práci s turnaji

### `findTournamentByName(tournamentName)`
Najde turnaj podle názvu.

```javascript
function findTournamentByName(tournamentName) {
  const headings = Array.from(document.querySelectorAll('h2'));
  const tournamentHeading = headings.find(h2 => h2.textContent === tournamentName);
  
  if (tournamentHeading) {
    return tournamentHeading.closest('div[class*="space-y"]').parentElement;
  }
  
  return null;
}
```

### `clickTournamentButton(tournamentName, buttonText)`
Klikne na tlačítko u turnaje.

```javascript
function clickTournamentButton(tournamentName, buttonText) {
  const tournamentCard = findTournamentByName(tournamentName);
  if (!tournamentCard) {
    return false;
  }
  
  const buttons = tournamentCard.querySelectorAll('button');
  const button = Array.from(buttons).find(btn => btn.textContent.includes(buttonText));
  
  if (button) {
    button.click();
    return true;
  }
  
  return false;
}
```

## Funkce pro práci s modaly

### `closeModalIfPresent()`
Zavře aktuálně otevřený modal, pokud existuje.

```javascript
async function closeModalIfPresent() {
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
      closeButton.click();
      // Počkat na zavření
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    }
  }
  return false;
}
```

### `waitForModalClose(timeout = 5000)`
Počká na zavření modalu.

```javascript
async function waitForModalClose(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkModal = () => {
      const modal = document.querySelector('.modal-backdrop');
      if (!modal) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Modal nebyl zavřen během ${timeout}ms`));
      } else {
        setTimeout(checkModal, 100);
      }
    };
    checkModal();
  });
}
```

### `closeModal()`
Zavře aktuálně otevřený modal (starší verze, zachována pro kompatibilitu).

```javascript
function closeModal() {
  const closeButton = document.querySelector('button[data-action="close-modal"]');
  if (closeButton) {
    closeButton.click();
    return true;
  }
  return false;
}
```

### `waitForElement(selector, timeout = 5000)`
Počká na zobrazení elementu.

```javascript
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(checkInterval);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error(`Element ${selector} nebyl nalezen během ${timeout}ms`));
      }
    }, 100);
  });
}
```

## Funkce pro vyhledávání elementů pomocí data-test-id

### `findElementByTestId(testId)`
Najde element podle `data-test-id` atributu.

```javascript
function findElementByTestId(testId) {
  return document.querySelector(`[data-test-id="${testId}"]`);
}
```

### `findElement(selector, options = {})`
Univerzální funkce pro vyhledávání elementů s fallback mechanismy.

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

## Příklad použití v browser_evaluate

```javascript
// Příklad 1: Přidat 11 bodů hráči "Honza" s Promise chain
await browser_evaluate({
  function: async () => {
    function findPlayerScoreBox(playerName) {
      const scoreBoxes = document.querySelectorAll('[data-action="add-point"]');
      // Nejdříve zkusit podle data-player-names
      for (const box of scoreBoxes) {
        const names = box.getAttribute('data-player-names');
        if (names && names.split(',').some(name => name.trim() === playerName)) {
          return box;
        }
      }
      // Fallback - podle textu
      for (const box of scoreBoxes) {
        if (box.textContent.includes(playerName)) {
          return box;
        }
      }
      return null;
    }
    
    async function addPointsToPlayer(playerName, points, delay = 300) {
      const playerBox = findPlayerScoreBox(playerName);
      if (!playerBox) return false;
      
      // Použít Promise chain pro správné čekání
      for (let i = 0; i < points; i++) {
        await new Promise(resolve => {
          playerBox.click();
          setTimeout(resolve, delay);
        });
      }
      return true;
    }
    
    return await addPointsToPlayer('Honza', 11);
  }
});

// Příklad 2: Zavřít modal a otevřít turnaj
await browser_evaluate({
  function: async () => {
    // Zavřít modal, pokud existuje
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
      const buttons = Array.from(modal.querySelectorAll('button'));
      const okButton = buttons.find(btn => btn.textContent.trim() === 'OK');
      if (okButton) {
        okButton.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Najít turnaj podle data-test-id
    const tournamentButton = document.querySelector('[data-test-id="open-tournament-24"]');
    if (tournamentButton) {
      tournamentButton.click();
      return true;
    }
    return false;
  }
});

// Příklad 3: Vytvořit turnaj pomocí data-test-id
await browser_evaluate({
  function: async () => {
    // Zavřít modal, pokud existuje
    await closeModalIfPresent();
    
    // Otevřít modal pro nový turnaj
    const newTournamentButton = document.querySelector('[data-test-id="new-tournament-button"]');
    if (newTournamentButton) {
      newTournamentButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Nastavit název turnaje
    const nameInput = document.querySelector('[data-test-id="tournament-name-input"]');
    if (nameInput) {
      nameInput.value = 'Test Turnaj';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Přidat hráče
    const playerInput = document.querySelector('[data-test-id="add-player-input"]');
    if (playerInput) {
      playerInput.value = 'Honza';
      playerInput.dispatchEvent(new Event('input', { bubbles: true }));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
      playerInput.dispatchEvent(enterEvent);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Vytvořit turnaj
    const createButton = document.querySelector('[data-test-id="create-tournament-button"]');
    if (createButton) {
      createButton.click();
      return true;
    }
    return false;
  }
});
```

## Tipy pro rychlejší testování

1. **Vždy používejte `data-test-id` atributy** pro stabilní identifikaci elementů (nejrychlejší)
2. **Používejte `data-player-names` atribut** pro vyhledávání hráčů (rychlé)
3. **Pro opakované akce použijte helper funkce** místo jednotlivých kliků
4. **Používejte `browser_evaluate`** pro komplexnější interakce
5. **Nastavte vhodné zpoždění** mezi akcemi (300ms je obvykle dostačující)
6. **Kombinujte helper funkce** pro složitější scénáře
7. **V testovacím režimu (`?test=true`)** se modaly automaticky zavírají po 500ms
8. **Zavírejte modaly před dalšími akcemi** pomocí `closeModalIfPresent()`

## Testovací režim

Aplikace podporuje testovací režim, který se aktivuje pomocí `?test=true` v URL:
- Modaly se automaticky zavírají po 500ms
- Alert modaly se automaticky potvrzují
- Confirm modaly se automaticky potvrzují (true)

Příklad: `http://localhost/a/ping/index.html?test=true`

