# 📦 Instalace Node.js a npm

## Krok 1: Stažení Node.js

1. Otevřete prohlížeč a přejděte na: **https://nodejs.org/**
2. Stáhněte **LTS verzi** (doporučeno) - aktuálně je to verze s dlouhodobou podporou
3. Vyberte instalační balíček pro Windows (`.msi` soubor)

## Krok 2: Instalace

1. Spusťte stažený `.msi` soubor
2. Postupujte podle instalačního průvodce:
   - Klikněte "Next" na všech obrazovkách
   - **Důležité**: Zaškrtněte možnost **"Add to PATH"** (mělo by být zaškrtnuté automaticky)
   - Dokončete instalaci kliknutím na "Install"

## Krok 3: Ověření instalace

Po instalaci **zavřete a znovu otevřete PowerShell/Terminal** (aby se načetly nové proměnné prostředí).

Poté spusťte:

```powershell
node --version
npm --version
```

Měli byste vidět čísla verzí (např. `v20.10.0` a `10.2.3`).

## Krok 4: Instalace závislostí projektu

V adresáři projektu (`C:\wamp64\www\a\ping`) spusťte:

```powershell
npm install
```

Tím se nainstalují všechny závislosti definované v `package.json`:
- `vitest` - pro unit testy
- `@vitest/ui` - UI pro testy
- `@vitest/coverage-v8` - pokrytí kódu testy
- `jsdom` - DOM prostředí pro testy
- `cypress` - pro E2E testy (už nainstalováno)

## Krok 5: Spuštění testů

Po instalaci můžete spustit testy:

```powershell
# Unit testy
npm run test:unit

# Testy s watch mode (automaticky se spouští při změnách)
npm run test:watch

# Testy s UI
npm run test:ui

# E2E testy (Cypress)
npm run test:e2e

# Všechny testy
npm run test:all
```

## Řešení problémů

### Node.js není rozpoznán po instalaci

1. **Zavřete a znovu otevřete PowerShell/Terminal**
2. Pokud to nepomůže, zkontrolujte PATH:
   - Otevřete "Systémové proměnné prostředí"
   - V "Systémové proměnné" najděte "Path"
   - Měla by tam být cesta jako: `C:\Program Files\nodejs\`
   - Pokud tam není, přidejte ji

### npm install selže

- Zkuste spustit PowerShell jako **Administrator**
- Nebo použijte: `npm install --force`

## Alternativní instalace (volitelné)

Pokud chcete mít více verzí Node.js, můžete použít:
- **nvm-windows**: https://github.com/coreybutler/nvm-windows
- **Volta**: https://volta.sh/

---

**Poznámka**: Po instalaci Node.js budete mít k dispozici jak `node` (pro spouštění JavaScriptu), tak `npm` (správce balíčků).



