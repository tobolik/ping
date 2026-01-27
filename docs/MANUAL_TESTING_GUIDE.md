# 🖱️ Průvodce rychlým manuálním testováním

## 🚀 Testovací režim - hlavní zrychlení

**Aktivujte testovací režim přidáním `?test=true` do URL:**
```
http://localhost/a/ping/index.html?test=true
```

### Co testovací režim dělá:

1. **Automatické zavírání alert modalu** - Po 500ms se automaticky zavře
2. **Automatické potvrzování confirm modalu** - Po 500ms se automaticky potvrdí (true)
3. **Žádné čekání na kliknutí** - Nemusíte ručně zavírat modaly

### Příklad:
- Při vytváření turnaje bez hráčů se zobrazí alert "Pro tento formát je potřeba alespoň 2 hráčů."
- **Bez testovacího režimu:** Musíte kliknout na "OK" a čekat
- **S testovacím režimem:** Alert se automaticky zavře po 500ms, můžete pokračovat

---

## 🎯 Jak rychle najít elementy při manuálním testování

### 1. Použití DevTools Console

Otevřete DevTools (F12) a použijte `data-test-id` atributy:

```javascript
// Najít tlačítko "Nový turnaj"
document.querySelector('[data-test-id="new-tournament-button"]')

// Najít input pro název turnaje
document.querySelector('[data-test-id="tournament-name-input"]')

// Najít score box pro hráče "Honza"
document.querySelectorAll('[data-action="add-point"]').forEach(box => {
  if (box.getAttribute('data-player-names')?.includes('Honza')) {
    console.log('Nalezeno!', box);
  }
})
```

### 2. Rychlé ověření stavu

```javascript
// Zkontrolovat, zda je modal otevřený
document.querySelector('.modal-backdrop') ? 'Modal je otevřený' : 'Modal není otevřený'

// Zkontrolovat počet zápasů
document.querySelectorAll('[data-action="play-match"]').length

// Zkontrolovat aktuální skóre hráče
document.querySelectorAll('[data-action="add-point"]').forEach(box => {
  const names = box.getAttribute('data-player-names');
  const score = box.querySelector('.text-7xl, .text-8xl, .text-9xl')?.textContent;
  if (names) console.log(names, ':', score);
})
```

---

## ⚡ Tipy pro rychlejší manuální testování

### 1. Používejte klávesové zkratky
- **Enter** - Potvrdit input (např. při přidávání hráče)
- **Escape** - Zavřít modal (i v testovacím režimu)
- **Ctrl+Enter** - Rychlé vytvoření turnaje (pokud je implementováno)

### 2. Využijte automatické zavírání modalu
- V testovacím režimu nemusíte čekat na zavření alertu
- Můžete okamžitě pokračovat v další akci
- Modaly se zavřou automaticky po 500ms

### 3. Použijte DevTools pro rychlé ověření
- Otevřete Console (F12)
- Zkontrolujte stav pomocí `data-test-id` atributů
- Rychle najděte elementy pomocí `querySelector`

### 4. Využijte stabilní atributy
- `data-player-names` - Pro rychlé vyhledávání hráčů
- `data-test-id` - Pro spolehlivou identifikaci elementů
- `data-action` - Pro nalezení akčních tlačítek

---

## 📋 Nejčastější scénáře manuálního testování

### Scénář 1: Vytvoření turnaje

1. **Klikněte na** `[data-test-id="new-tournament-button"]` (tlačítko "+ Nový turnaj")
2. **Zadejte název** do `[data-test-id="tournament-name-input"]`
3. **Vyberte typ** kliknutím na `[data-test-id="tournament-type-single"]` nebo `tournament-type-double`
4. **Přidejte hráče** do `[data-test-id="add-player-input"]` a stiskněte Enter
5. **Klikněte na** `[data-test-id="create-tournament-button"]`
6. **V testovacím režimu:** Alert se automaticky zavře, pokud je nějaká chyba

### Scénář 2: Spuštění zápasu

1. **Klikněte na** `[data-test-id="open-tournament-{id}"]` (tlačítko "Start turnaje")
2. **Klikněte na** `[data-test-id="play-match-{id}"]` (tlačítko "Hrát zápas")
3. **Vyberte prvního servírujícího** kliknutím na `[data-test-id="set-first-server-player-{id}"]`
4. **Klikněte na score box** hráče pro přidání bodu (použijte `data-player-names` pro identifikaci)

### Scénář 3: Přidání bodů

1. **Najděte score box** hráče pomocí `data-player-names`:
   ```javascript
   // V DevTools Console:
   document.querySelectorAll('[data-action="add-point"]').forEach(box => {
     if (box.getAttribute('data-player-names')?.includes('Honza')) {
       box.click(); // Přidá bod
     }
   })
   ```
2. **Nebo jednoduše klikněte** na score box hráče na obrazovce
3. **Pro odečtení bodu** klikněte na tlačítko `[data-test-id="subtract-point-{side}"]`

---

## 🔍 Rychlé ověření pomocí DevTools

### Zkontrolovat, zda je turnaj dokončen
```javascript
document.body.textContent.includes('Turnaj skončil') || 
document.body.textContent.includes('Dokončeno')
```

### Zkontrolovat počet dokončených zápasů
```javascript
const match = document.body.textContent.match(/(\d+)\/(\d+)\s+zápasů\s+dokončeno/);
if (match) {
  console.log(`Dokončeno: ${match[1]}/${match[2]}`);
}
```

### Zkontrolovat aktuální skóre
```javascript
document.querySelectorAll('[data-action="add-point"]').forEach(box => {
  const names = box.getAttribute('data-player-names');
  const score = box.querySelector('.text-7xl, .text-8xl, .text-9xl')?.textContent;
  console.log(`${names}: ${score}`);
});
```

---

## ✅ Checklist pro rychlé manuální testování

- [ ] **Aktivovat testovací režim** - Přidat `?test=true` do URL
- [ ] **Otevřít DevTools** (F12) pro rychlé ověření
- [ ] **Použít `data-test-id` atributy** pro identifikaci elementů
- [ ] **Využít automatické zavírání modalu** v testovacím režimu
- [ ] **Použít klávesové zkratky** (Enter, Escape)
- [ ] **Ověřit stav pomocí Console** před pokračováním

---

## 💡 Příklad: Rychlé testování vytvoření turnaje

1. **Otevřete aplikaci s `?test=true`**
2. **Klikněte na "+ Nový turnaj"** (automaticky se otevře modal)
3. **Zadejte název** "Test Turnaj"
4. **Přidejte hráče** "Honza" a stiskněte Enter
5. **Přidejte hráče** "Ondra" a stiskněte Enter
6. **Klikněte na "Vytvořit turnaj"**
7. **Pokud se zobrazí alert** (např. "Pro tento formát je potřeba alespoň 2 hráčů"), **automaticky se zavře po 500ms**
8. **Pokud je vše v pořádku**, turnaj se vytvoří a zobrazí se v seznamu

**Celkový čas:** ~10 sekund (místo ~30 sekund bez testovacího režimu)

---

## 🎯 Shrnutí výhod pro manuální testování

1. **Testovací režim (`?test=true`):**
   - ✅ Automatické zavírání alert modalu (500ms)
   - ✅ Automatické potvrzování confirm modalu (500ms)
   - ✅ Žádné čekání na kliknutí

2. **`data-test-id` atributy:**
   - ✅ Rychlé vyhledávání elementů v DevTools
   - ✅ Spolehlivá identifikace elementů
   - ✅ Snadné ověření stavu aplikace

3. **Stabilní atributy (`data-player-names`, `data-action`):**
   - ✅ Rychlé vyhledávání hráčů
   - ✅ Spolehlivá identifikace akčních tlačítek
   - ✅ Snadné ověření skóre

**Výsledek:** Manuální testování je **2-3x rychlejší** díky automatickému zavírání modalu a snadnému vyhledávání elementů pomocí `data-test-id` atributů.

