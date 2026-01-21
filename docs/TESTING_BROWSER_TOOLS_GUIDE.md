# 🛠️ Průvodce používáním Browser nástrojů bez aria-ref

## ❌ Problém: Chyby s `browser_type` a `aria-ref`

### Proč se chyby objevují:
1. **`aria-ref` se dynamicky mění** - Po každé interakci se může změnit
2. **`browser_type` je nestabilní** - Často selhává kvůli změnám DOM
3. **Timeouty** - Elementy s `aria-ref` mohou být nedostupné

## ✅ Řešení: Používat `browser_evaluate` místo `browser_type`

### Pravidlo č. 1: NIKDY nepoužívat `browser_type` s `aria-ref`

❌ **ŠPATNĚ:**
```javascript
browser_type(element="Input field", ref="e1234", text="Honza")
```

✅ **SPRÁVNĚ:**
```javascript
browser_evaluate({
  function: () => {
    const input = document.querySelector('[data-test-id="add-player-input"]');
    if (input) {
      input.value = 'Honza';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Pro Enter klávesu:
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter', 
        keyCode: 13, 
        bubbles: true 
      });
      input.dispatchEvent(enterEvent);
      return true;
    }
    return false;
  }
})
```

### Pravidlo č. 2: Používat `data-test-id` místo `aria-ref`

❌ **ŠPATNĚ:**
```javascript
browser_click(element="Button", ref="e1234")
```

✅ **SPRÁVNĚ:**
```javascript
browser_evaluate({
  function: () => {
    const button = document.querySelector('[data-test-id="create-tournament-button"]');
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
})
```

NEBO použít CSS selektor přímo v `browser_click` (pokud je element stabilní):
```javascript
browser_evaluate({
  function: () => {
    const button = document.querySelector('button[data-action="create-tournament"]');
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
})
```

## 📝 Praktické příklady

### 1. Psaní do input pole

```javascript
// ❌ ŠPATNĚ - používá aria-ref
browser_type(element="Tournament name input", ref="e1234", text="Můj turnaj")

// ✅ SPRÁVNĚ - používá browser_evaluate
browser_evaluate({
  function: () => {
    const input = document.querySelector('[data-test-id="tournament-name-input"]');
    if (!input) return false;
    input.value = 'Můj turnaj';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
})
```

### 2. Přidání hráče přes autocomplete

```javascript
// ✅ SPRÁVNĚ - kompletní řešení
browser_evaluate({
  function: async () => {
    const input = document.querySelector('[data-test-id="add-player-input"]');
    if (!input) return false;
    
    // Nastavit hodnotu
    input.value = 'Martin';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Počkat na autocomplete (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Kliknout na první návrh (pokud existuje)
    const suggestion = document.querySelector('.autocomplete-suggestion');
    if (suggestion) {
      suggestion.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    }
    
    // Nebo stisknout Enter
    const enterEvent = new KeyboardEvent('keydown', { 
      key: 'Enter', 
      code: 'Enter', 
      keyCode: 13, 
      bubbles: true 
    });
    input.dispatchEvent(enterEvent);
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }
})
```

### 3. Kliknutí na tlačítko

```javascript
// ❌ ŠPATNĚ - používá aria-ref
browser_click(element="Create tournament button", ref="e1234")

// ✅ SPRÁVNĚ - používá browser_evaluate
browser_evaluate({
  function: () => {
    const button = document.querySelector('[data-test-id="create-tournament-button"]');
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
})
```

### 4. Změna hodnoty v number input

```javascript
// ✅ SPRÁVNĚ - pro editaci skóre
browser_evaluate({
  function: () => {
    const score1Input = document.getElementById('edit-score1');
    const score2Input = document.getElementById('edit-score2');
    
    if (score1Input && score2Input) {
      score1Input.value = '15';
      score1Input.dispatchEvent(new Event('input', { bubbles: true }));
      score1Input.dispatchEvent(new Event('change', { bubbles: true }));
      
      score2Input.value = '11';
      score2Input.dispatchEvent(new Event('input', { bubbles: true }));
      score2Input.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    }
    return false;
  }
})
```

## 🎯 Helper funkce pro opakované akce

### Funkce pro psaní do inputu

```javascript
async function typeIntoInput(testId, value) {
  return await browser_evaluate({
    function: (testId, value) => {
      const input = document.querySelector(`[data-test-id="${testId}"]`);
      if (!input) return false;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    testId,
    value
  });
}
```

### Funkce pro kliknutí na tlačítko

```javascript
async function clickButton(testId) {
  return await browser_evaluate({
    function: (testId) => {
      const button = document.querySelector(`[data-test-id="${testId}"]`);
      if (button) {
        button.click();
        return true;
      }
      return false;
    },
    testId
  });
}
```

### Funkce pro přidání hráče

```javascript
async function addPlayer(playerName) {
  return await browser_evaluate({
    function: async (playerName) => {
      const input = document.querySelector('[data-test-id="add-player-input"]');
      if (!input) return false;
      
      input.value = playerName;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Zkusit kliknout na autocomplete návrh
      const suggestion = document.querySelector('.autocomplete-suggestion');
      if (suggestion) {
        suggestion.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
      
      // Nebo stisknout Enter
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter', 
        keyCode: 13, 
        bubbles: true 
      });
      input.dispatchEvent(enterEvent);
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    },
    playerName
  });
}
```

## 📋 Checklist před každým testem

- [ ] **NIKDY nepoužívat `browser_type` s `aria-ref`**
- [ ] **Vždy používat `browser_evaluate` pro psaní do inputů**
- [ ] **Vždy používat `data-test-id` atributy**
- [ ] **Pokud `data-test-id` není k dispozici, použít CSS selektory**
- [ ] **Přidat `await` a `setTimeout` pro čekání na DOM aktualizace**
- [ ] **Používat `dispatchEvent` pro simulaci uživatelských akcí**

## 🔍 Jak najít správný selektor

### 1. Použít DevTools
```javascript
// V konzoli prohlížeče:
document.querySelector('[data-test-id="tournament-name-input"]')
```

### 2. Použít `data-action` atribut
```javascript
document.querySelector('[data-action="create-tournament"]')
```

### 3. Použít ID elementu
```javascript
document.getElementById('new-tournament-name')
```

### 4. Použít CSS třídy (jako poslední možnost)
```javascript
document.querySelector('.btn.btn-primary')
```

## ⚠️ Důležité poznámky

1. **`aria-ref` se mění** - Nikdy ho nepoužívat pro identifikaci
2. **`browser_type` je nestabilní** - Vždy použít `browser_evaluate`
3. **Čekat na DOM aktualizace** - Vždy použít `setTimeout` po změnách
4. **Simulovat události** - Použít `dispatchEvent` pro `input`, `change`, `keydown`
5. **Testovat selektory** - Vždy ověřit, že selektor najde element

## 🚀 Rychlý start

```javascript
// 1. Psaní do inputu
browser_evaluate({
  function: () => {
    const input = document.querySelector('[data-test-id="tournament-name-input"]');
    if (input) {
      input.value = 'Můj turnaj';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }
})

// 2. Kliknutí na tlačítko
browser_evaluate({
  function: () => {
    const button = document.querySelector('[data-test-id="create-tournament-button"]');
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
})

// 3. Čekání
browser_wait_for({ time: 1 })
```

