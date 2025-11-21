# 🤖 Dokumentace pro AI Agenty

Tento dokument poskytuje AI agentům kompletní přehled o struktuře projektu, architektuře a konvencích používaných v aplikaci Ping Pong Turnaj.

## 📋 Přehled projektu

**Název:** Ping Pong Turnajová Aplikace  
**Typ:** Webová aplikace (Frontend + Backend API)  
**Stack:** PHP (Backend), HTML/JavaScript (Frontend), MySQL/MariaDB (Databáze)  
**Architektura:** RESTful API, Temporal Versioning Pattern

## 🏗️ Architektura

### Backend (PHP)

**Hlavní soubor:** `api.php`
- RESTful API endpoint
- Zpracovává GET a POST požadavky
- Používá MySQLi pro databázové operace
- Temporal versioning pattern (soft deletes pomocí `valid_to`)

**Konfigurace:** `config/config.php`
- Načítá environment proměnné z `.env` souborů
- Automatická detekce prostředí (localhost vs production)
- Fallback na výchozí hodnoty

### Frontend (JavaScript)

**Hlavní soubor:** `index.html`
- Vanilla JavaScript (žádný framework)
- Tailwind CSS pro styling
- Font Awesome pro ikony
- LocalStorage pro cache (volitelné)

### Databáze

**SQL soubor:** `ping3.sql`
- Kompletní schéma databáze
- Ukázková data
- Temporal versioning struktura

## 🗂️ Struktura databáze

### Temporal Versioning Pattern

Aplikace používá **temporal versioning** místo klasických UPDATE/DELETE:

- **Aktuální záznamy:** `valid_to = NULL`
- **Historické záznamy:** `valid_to = timestamp`
- **Nové záznamy:** INSERT s novým `entity_id` nebo stejným `entity_id` + zneplatnění starého

### Tabulky

#### `players`
```sql
id (PK, AUTO_INCREMENT)
entity_id (UNSIGNED INT) - pro temporal versioning
name (VARCHAR 255)
photo_url (TEXT)
strengths (TEXT)
weaknesses (TEXT)
updated_at (TIMESTAMP)
valid_from (DATETIME)
valid_to (DATETIME, NULL = aktuální)
```

#### `tournaments`
```sql
id (PK, AUTO_INCREMENT)
entity_id (UNSIGNED INT)
name (VARCHAR 255)
points_to_win (INT, default 11)
tournament_type ENUM('single','double') DEFAULT 'single'
is_locked (TINYINT, default 0)
valid_from (DATETIME)
valid_to (DATETIME, NULL = aktuální)
```

#### `matches`
```sql
id (PK, AUTO_INCREMENT)
entity_id (UNSIGNED INT)
tournament_id (INT, FK)
player1_id (INT, FK)   -- hlavní identifikátory pro singly (u čtyřhry reprezentují první hráče týmů)
player2_id (INT, FK)
team1_id (INT, FK na tournament_teams, NULL pro singly)
team2_id (INT, FK na tournament_teams, NULL pro singly)
score1 (INT, default 0)
score2 (INT, default 0)
completed (TINYINT, default 0)
first_server (INT, nullable)   -- 1 nebo 2 (strana), ne konkrétní hráč
serving_player (INT, nullable)
double_rotation_state (TEXT, JSON snapshot rotace podání ve čtyřhře)
sides_swapped (TINYINT, default 0) - důležité!
match_order (INT)
valid_from (DATETIME)
valid_to (DATETIME, NULL = aktuální)
```

**DŮLEŽITÉ:** Sloupec `sides_swapped` je kritický - používá se v API dotazech!

#### `tournament_players`
```sql
id (PK, AUTO_INCREMENT)
entity_id (BIGINT UNSIGNED)
tournament_id (INT, FK)
player_id (INT, FK)
player_order (INT)
valid_from (DATETIME)
valid_to (DATETIME, NULL = aktuální)
```

#### `tournament_teams`
```sql
id (PK, AUTO_INCREMENT)
entity_id (INT UNSIGNED)
tournament_id (INT, FK)
team_order (INT)        -- index dvojice (0 = první tým, 1 = druhý, …)
player1_id (INT, FK)
player2_id (INT, FK)
valid_from (DATETIME)
valid_to (DATETIME, NULL = aktuální)
```

#### `settings`
```sql
id (PK, BIGINT UNSIGNED AUTO_INCREMENT)
entity_id (BIGINT UNSIGNED)
setting_key (VARCHAR 100, UNIQUE s valid_to)
setting_value (TEXT)
valid_from (DATETIME)
valid_to (DATETIME, NULL = aktuální)
```

#### `sync_status`
```sql
id (PK, AUTO_INCREMENT)
table_name (VARCHAR 50, UNIQUE)
last_sync (TIMESTAMP)
```

## 🔌 API Reference

### Endpoint

**URL:** `api.php`  
**Content-Type:** `application/json`  
**CORS:** Povoleno pro všechny domény (`Access-Control-Allow-Origin: *`)

### GET Request

**URL:** `GET /api.php`

**Odpověď:**
```json
{
  "settings": {
    "soundsEnabled": true
  },
  "playerDatabase": [
    {
      "id": 1,
      "name": "Honza",
      "photo_url": "",
      "strengths": "",
      "weaknesses": ""
    }
  ],
  "tournaments": [
    {
      "id": 1,
      "name": "Turnaj I",
      "points_to_win": 11,
      "is_locked": 0,
      "createdAt": "2025-10-03 13:05:25",
      "playerIds": [1, 2, 3],
      "matches": [...]
    }
  ]
}
```

### POST Request

**Formát:**
```json
{
  "action": "název_akce",
  "payload": {
    // specifická data podle akce
  }
}
```

#### Akce: `createTournament`

**Payload:**
```json
{
  "name": "Název turnaje",
  "pointsToWin": 11,
  "createdAt": "2025-10-03 13:05:25",
  "playerIds": [1, 2, 3, 4],
  "type": "single" // nebo "double"
}
```

**Chování:**
- Vytvoří turnaj s `entity_id = MAX(entity_id) + 1`
- Vytvoří vazby v `tournament_players`
- Vygeneruje všechny možné zápasy (singl každý s každým, čtyřhra bere dvojice podle pořadí hráčů)
- Při čtyřhře vyžaduje sudý počet hráčů (4–16). Dvojice tvoří vždy dva po sobě jdoucí hráči v `playerIds`.

**Frontend implementace:**
- Akce `create-tournament` automaticky kontroluje unikátnost názvu pomocí `generateUniqueTournamentName()`
- Pokud název už existuje, automaticky se přidá číslo v závorce
- Formát data: `YYYY-MM-DD HH:MM:SS` (MySQL formát, ne ISO 8601)

#### Akce: `updateTournament`

**Payload:**
```json
{
  "id": 1,
  "data": {
    "name": "Nový název",
    "pointsToWin": 21,
    "isLocked": false,
    "createdAt": "2025-10-03 13:05:25",
    "playerIds": [1, 2, 3],
    "type": "single"
  }
}
```

**Chování:**
- Pokud se změnili hráči, zneplatní všechny zápasy a vytvoří nové
- Používá temporal versioning

#### Akce: `updateMatch`

**Payload:**
```json
{
  "id": 1,
  "data": {
    "tournament_id": 1,
    "player1Id": 1,
    "player2Id": 2,
    "team1Id": 10,
    "team2Id": 11,
    "score1": 11,
    "score2": 9,
    "completed": 1,
    "firstServer": 1,
    "servingPlayer": 1,
    "match_order": 0,
    "sidesSwapped": 0,
    "doubleRotationState": {
      "order": [
        { "playerId": 1, "side": 1 },
        { "playerId": 2, "side": 2 },
        { "playerId": 3, "side": 1 },
        { "playerId": 4, "side": 2 }
      ],
      "currentIndex": 2,
      "pointsServedThisTurn": 1
    }
  }
}
```

**DŮLEŽITÉ:** Vždy musí obsahovat `sidesSwapped`! U čtyřher navíc posílejte `team1Id`, `team2Id` a aktuální `doubleRotationState` (JSON).

#### Akce: `savePlayer`

**Payload (nový hráč):**
```json
{
  "data": {
    "name": "Jan Novák",
    "photoUrl": "",
    "strengths": "",
    "weaknesses": ""
  }
}
```

**Payload (aktualizace):**
```json
{
  "id": 1,
  "data": {
    "name": "Jan Novák",
    "photoUrl": "url",
    "strengths": "Silný úder",
    "weaknesses": "Pomalá reakce"
  }
}
```

#### Akce: `deletePlayer`

**Payload:**
```json
{
  "id": 1
}
```

**Chování:** Soft delete - nastaví `valid_to = NOW()`

#### Akce: `swapSides`

**Payload:**
```json
{
  "matchId": 1
}
```

**Chování:** Prohodí hodnotu `sides_swapped` v zápase

#### Akce: `copy-tournament` (Frontend akce)

**Chování:**
- Vytvoří nový turnaj se stejným názvem + číslo v závorce (např. "Turnaj (2)")
- Zkopíruje všechny hráče z původního turnaje
- Vytvoří nové zápasy s nulovými skóre
- Pro každý zápas nastaví `sidesSwapped: true` (prohodí strany hráčů)
- Používá `createTournament` API akci, poté `updateMatch` pro každý zápas

**Frontend implementace:**
- Akce je dostupná v `allActions['copy-tournament']`
- Zobrazuje se v nastavení turnaje a po ukončení turnaje
- Automaticky generuje číslo kopie na základě existujících turnajů se stejným názvem

## 🎮 Frontend funkcionality

### Kopírování turnaje

**Implementace:** `index.html`, akce `copy-tournament`

**Workflow:**
1. Najde základní název turnaje (bez čísla v závorce)
2. Vygeneruje nový název s číslem (např. "Turnaj (2)")
3. Vytvoří nový turnaj přes `createTournament` API
4. Načte nový stav z API
5. Pro každý zápas v novém turnaji nastaví `sidesSwapped: true` přes `updateMatch`

**Důležité:**
- Používá `$conn->insert_id` v PHP pro získání skutečného ID nového turnaje
- Formát data pro MySQL: `YYYY-MM-DD HH:MM:SS` (ne ISO 8601)
- **Inteligentní názvy:** Pokud turnaj obsahuje dnešní datum, použije se stávající logika s číslem. Pokud obsahuje starší datum, použije se dnešní datum v názvu
- Používá funkci `generateUniqueTournamentName()` pro generování unikátního názvu
- **Respektuje formát turnaje** – typ (`single`/`double`) a pořadí hráčů se kopíruje 1:1. U čtyřher jsou automaticky vytvořeny stejné dvojice a všechny nové zápasy mají `sidesSwapped = true`.

### Čtyřhry (doubles)

- Typ turnaje (`tournament_type`, také `type` v API) určuje, zda jde o singl nebo čtyřhru. Čtyřhra vyžaduje 4–16 hráčů a sudý počet hráčů.
- Dvojice se skládají podle pořadí hráčů v turnaji: [0,1] je tým A, [2,3] tým B atd. Dvojice jsou uloženy v tabulce `tournament_teams`.
- Zápasy ve čtyřhře odkazují na `team1_id`/`team2_id` a ukládají JSON `double_rotation_state` (stav podávací rotace).
- Oficiální střídání podání:
  - Po výběru strany (`firstServer` = 1/2) se automaticky nastaví pořadí A1 → B1 → A2 → B2.
  - Malý set (11 bodů): po úvodním podání se střídá každé 2 body; po dosažení 10:10 se střídá po jednom bodu.
  - Velký set (21 bodů): střídání každých 5 bodů, při 20:20 po jednom bodu.
- UI:
  - Vytváření turnaje nabízí přepínač singl/čtyřhra včetně validace počtu hráčů.
  - V nastavení turnaje se zobrazuje formát a limit hráčů (8 vs 16); při čtyřhře se aplikuje kontrola sudého počtu.
  - Scoreboard zobrazuje názvy týmů (`Honza + Petr`) a seznam jednotlivých hráčů pod názvem.
  - Modální okno „Kdo má první podání?“ u čtyřhry nabízí výběr týmu (ne konkrétního hráče).
  - Při kopírování turnaje se zachovají dvojice a pro každý zápas se automaticky nastaví `sidesSwapped = true`.
- Statistiky:
  - Detail turnaje (stats screen) obsahuje kromě hráčského žebříčku také týmovou tabulku (pokud je turnaj typu double).
  - Celkové statistiky (`overall-stats-screen`) zobrazují kromě hráčů i agregované výsledky týmů napříč všemi čtyřhrami (identifikace podle seřazené dvojice hráčů).

### Vrácení posledního bodu (Undo)

**Implementace:** `index.html`, funkce `undoLastPoint()`

**Workflow:**
1. Před každým přidáním bodu se uloží aktuální stav do `state.scoreHistory`
2. Stav obsahuje: `score1`, `score2`, `servingPlayer`, `firstServer`
3. Tlačítko "Vrátit poslední bod" je dostupné pouze pokud `state.scoreHistory.length > 0`
4. Po kliknutí se obnoví poslední stav z historie

**State management:**
```javascript
state.scoreHistory = []  // Pole objektů s historií stavů
```

### Klávesové zkratky

**Implementace:** `index.html`, event listener na `document.keydown`

**Kompletní workflow zkratky:**

#### Během aktivní hry
- `ArrowLeft` - Přidá bod levému hráči (respektuje `sidesSwapped`)
- `ArrowRight` - Přidá bod pravému hráči (respektuje `sidesSwapped`)

#### Po vítězství zápasu
- `ArrowLeft` - Vrátí poslední bod (Undo) - klikne na `[data-action="undo-last-point"]`
- `ArrowRight` - Uloží výsledek - klikne na `[data-action="save-match-result"]`

#### V modalu "Kdo má první podání"
- `ArrowLeft` - Vybere levého hráče - klikne na první `[data-action="set-first-server"]`
- `ArrowRight` - Vybere pravého hráče - klikne na druhý `[data-action="set-first-server"]`

#### V průběžném pořadí
- `ArrowRight` - Pokračuje v turnaji - klikne na `[data-action="close-and-refresh"]`

#### V konečných výsledcích
- `ArrowLeft` - Zavře modal - klikne na `[data-action="close-and-home"]`
- `ArrowRight` - Kopíruje turnaj - klikne na `[data-action="copy-tournament"]`

#### V nadcházejících zápasech (tournament screen)
- `ArrowRight` - Spustí první zápas - klikne na první `[data-action="play-match"]:not([disabled])`

#### Na hlavní obrazovce
- `ArrowRight` - Spustí první turnaj s "Start turnaje" - klikne na první `[data-action="open-tournament"]` obsahující text "Start turnaje"

**Podmínky aktivace:**
- Žádný input field nesmí být ve focusu (`INPUT`, `TEXTAREA`, `contentEditable`)
- Zkratky se aktivují podle aktuální obrazovky a stavu modalu

**Logika pro hru:**
```javascript
if (sidesSwapped) {
  ArrowLeft -> right player
  ArrowRight -> left player
} else {
  ArrowLeft -> left player
  ArrowRight -> right player
}
```

**Priorita zpracování:**
1. Escape pro zavření modalu
2. Aktivní hra (přidávání bodů nebo vítězství)
3. Modaly (podle typu modalu)
4. Tournament screen
5. Main screen

### Export dat

**Implementace:** `index.html`, funkce `exportToCSV()` a `exportToPDF()`

**CSV Export:**
- Používá `Blob` API pro vytvoření souboru
- UTF-8 s BOM (`\ufeff`) pro správné zobrazení českých znaků
- Oddělovače sekcí používají `---` místo `===` (aby Google Tabulky neinterpretovaly jako vzorce)
- Obsahuje: informace o turnaji, výsledkovou listinu, matici vzájemných zápasů, seznam zápasů

**PDF Export:**
- Používá `html2canvas` pro renderování HTML do canvasu
- Používá `jsPDF` pro vytvoření PDF z obrázku
- Element je vytvořen mimo obrazovku (`position: absolute`, `top: -9999px`)
- Automatické stránkování pro delší obsahy
- Správné zobrazení českých znaků díky renderování HTML jako obrázku

**Frontend akce:**
- `export-csv` - volá `exportToCSV()`
- `export-pdf` - volá `exportToPDF()`

**Důležité:**
- Element pro PDF musí být přidán do DOM před renderováním
- Používá se `setTimeout` pro zajištění načtení elementu
- html2canvas vyžaduje viditelný element (i když mimo obrazovku)

## 🔑 Klíčové konvence

### Temporal Versioning

**Při aktualizaci záznamu:**
1. Najdi aktuální záznam (`valid_to IS NULL`)
2. Nastav `valid_to = NOW()` na starém záznamu
3. Vlož nový záznam se stejným `entity_id` a novými hodnotami

**Příklad:**
```php
// 1. Zneplatni starý
UPDATE players SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL;

// 2. Vlož nový
INSERT INTO players (entity_id, name, ...) VALUES (?, ?, ...);
```

### Entity ID vs ID

- **`id`** - Primární klíč, auto-increment, unikátní
- **`entity_id`** - Logický identifikátor pro temporal versioning, může se opakovat

### Dotazy na aktuální záznamy

**VŽDY používej:**
```sql
WHERE entity_id = ? AND valid_to IS NULL
```

**NIKDY nepoužívej:**
```sql
WHERE id = ?  -- může vrátit historický záznam!
```

## 🐛 Časté problémy a řešení

### Problém: "Unknown column 'sides_swapped'"

**Řešení:** Spusť migraci:
```sql
ALTER TABLE `matches` ADD COLUMN `sides_swapped` tinyint(1) DEFAULT 0 AFTER `serving_player`;
```

### Problém: "Index column size too large"

**Řešení:** Použij prefix index:
```sql
KEY `idx_name` (`name`(191))
```

### Problém: Chyba připojení k databázi

**Kontrola:**
1. Zkontroluj `.env.localhost` nebo `.env.production`
2. Ověř, že databáze existuje
3. Zkontroluj oprávnění uživatele

### Problém: "Incorrect datetime value" při kopírování turnaje

**Řešení:** Použij formát MySQL datetime (`YYYY-MM-DD HH:MM:SS`), ne ISO 8601:
```javascript
const mysqlDate = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0') + ' ' + 
    String(now.getHours()).padStart(2, '0') + ':' + 
    String(now.getMinutes()).padStart(2, '0') + ':' + 
    String(now.getSeconds()).padStart(2, '0');
```

### Problém: Zápasy se nezkopírují při kopírování turnaje

**Kontrola:**
1. Ověř, že `handleCreateTournament` používá `$conn->insert_id` pro `tournament_id`
2. Zkontroluj, že `handleUpdateMatch` správně zpracovává NULL hodnoty
3. Ověř, že `sidesSwapped` je správně převedeno na integer (0/1)

## 🎨 Frontend funkcionality

### Generování unikátních názvů turnajů

**Funkce:** `generateUniqueTournamentName(baseName, excludeTournamentId = null)`

**Implementace:** `index.html`

**Chování:**
- Vezme základní název a odstraní případné číslo v závorce
- Zkontroluje, jestli název už existuje (s možností vyloučit konkrétní turnaj)
- Pokud existuje, přidá číslo v závorce a zvyšuje ho, dokud nenajde volný název

**Použití:**
- V `create-tournament` - automaticky upraví název, pokud už existuje
- V `copy-tournament` - používá stejnou logiku (s podporou pro datum)

**Příklad:**
```javascript
const uniqueName = generateUniqueTournamentName("Turnaj");
// Pokud "Turnaj" existuje, vrátí "Turnaj (2)", "Turnaj (3)", atd.
```

### Konzistentní barvy hráčů

**Implementace:** `index.html`, pole `playerColors`

**Chování:**
- Každý hráč má přiřazenou barvu podle svého pořadí v turnaji (`t.playerIds.indexOf(playerId)`)
- Barvy se určují pomocí: `playerColors[t.playerIds.indexOf(playerId) % playerColors.length]`
- Barvy jsou konzistentní napříč:
  - Nadcházející zápasy
  - Modal "Kdo má první podání"
  - Během zápasu (player-score-box)
  - Statistiky a výsledkové listiny

**Pole barev:**
```javascript
const playerColors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", 
                      "bg-yellow-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"];
```

**Důležité:**
- Barvy se určují podle pořadí v `t.playerIds`, ne podle pozice v zápase
- Respektuje se `sidesSwapped` pro zobrazení, ale barva zůstává stejná

## 📝 Poznámky pro vývoj

### Přidávání nových funkcí

1. **Backend:** Přidej novou akci do `api.php` switch statement
2. **Frontend:** Přidej volání API v `index.html`
3. **Databáze:** Pokud potřebuješ nové sloupce, vytvoř migrační skript
4. **Názvy turnajů:** Používej `generateUniqueTournamentName()` pro zajištění unikátnosti

### Testování

- Použij `check_db.php` pro diagnostiku databáze (pokud existuje)
- Cypress testy jsou v `cypress/e2e/`

### Bezpečnost

- **CORS:** V produkci změň `Access-Control-Allow-Origin` na konkrétní doménu
- **SQL Injection:** Všechny dotazy používají prepared statements
- **XSS:** Frontend používá `htmlspecialchars` nebo framework escape

## 🔍 Hledání v kódu

### Najít všechny použití entity_id
```bash
grep -r "entity_id" api.php
```

### Najít všechny temporal versioning operace
```bash
grep -r "valid_to" api.php
```

### Najít všechny API akce
```bash
grep -r "case '" api.php
```

## 📚 Související soubory

- `ping3.sql` - Kompletní databázové schéma
- `config/config.php` - Konfigurace a načítání .env
- `.env.example` - Šablona pro environment proměnné
- `STATUS_IMPLEMENTACE.md` - Přehled implementovaných funkcí

## ⚠️ Důležité upozornění

1. **Vždy používej `entity_id` s `valid_to IS NULL`** pro aktuální záznamy
2. **Sloupec `sides_swapped` je povinný** v tabulce `matches`
3. **Environment soubory necommitovat** - jsou v `.gitignore`
4. **Temporal versioning** - nikdy neměň `valid_to` na existujících záznamech přímo
5. **Formát data pro MySQL:** Používej `YYYY-MM-DD HH:MM:SS`, ne ISO 8601 (`toISOString()`)
6. **NULL hodnoty v `handleUpdateMatch`:** Vždy normalizuj NULL hodnoty před porovnáním
7. **`insert_id` v PHP:** Po `INSERT` vždy použij `$conn->insert_id` pro získání skutečného ID, ne `entity_id`
8. **Unikátní názvy turnajů:** Při vytváření turnaje vždy použij `generateUniqueTournamentName()` pro zajištění unikátnosti
9. **Barvy hráčů:** Vždy používej `playerColors[t.playerIds.indexOf(playerId) % playerColors.length]` pro konzistentní barvy
10. **Klávesové zkratky:** Při přidávání nových zkratek zkontroluj, že nejsou v konfliktu s existujícími a že respektují podmínky aktivace

