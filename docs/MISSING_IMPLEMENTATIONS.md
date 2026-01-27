# Chybějící implementace

Tento dokument obsahuje seznam funkcionalit, které jsou podporovány v API, ale chybí v UI, nebo které by měly být implementovány.

## 1. Změna počtu bodů k výhře v nastavení turnaje

**Status:** ❌ Chybí v UI  
**Priorita:** Střední  
**Test:** TC-7.2

**Popis:**
API podporuje změnu počtu bodů k výhře (`pointsToWin`) v `handleUpdateTournament` funkci v `api.php`, ale v UI chybí pole pro tuto změnu v dialogu nastavení turnaje.

**Současný stav:**
- API endpoint `updateTournament` podporuje `pointsToWin` v payload
- V `index.html` v akci `show-settings-modal` není pole pro změnu počtu bodů
- Počet bodů se zobrazuje pouze při vytváření turnaje (radio buttony pro 11 nebo 21 bodů)

**Požadovaná implementace:**
- Přidat pole pro změnu počtu bodů k výhře do dialogu nastavení turnaje
- Pole by mělo být podobné jako při vytváření turnaje (radio buttony nebo number input)
- Validace: minimálně 1, maximálně 99 (nebo jiná rozumná hodnota)
- Uložit změnu pomocí existujícího API endpointu `updateTournament`

**Soubor k úpravě:**
- `index.html` - akce `show-settings-modal` (řádek ~1314)
- `index.html` - akce `save-settings` (řádek ~1446)

**Poznámka:**
Při změně počtu bodů by mělo být zkontrolováno, zda již nejsou odehrány zápasy s body, a v takovém případě by změna neměla být povolena (podobně jako u změny typu turnaje).

---

## 2. Poznámky k testování

### TC-8.1: Export do CSV
**Status:** ✅ Funkční  
**Poznámka:** Export CSV funguje správně. Soubor se stáhne automaticky v prohlížeči s názvem ve formátu `turnaj_{název_turnaje}_{datum}.csv`. Obsahuje všechny potřebné informace o turnaji.

---

## Poznámky

Tento dokument bude aktualizován při zjištění dalších chybějících implementací během testování.

