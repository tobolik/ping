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
is_locked (TINYINT, default 0)
valid_from (DATETIME)
valid_to (DATETIME, NULL = aktuální)
```

#### `matches`
```sql
id (PK, AUTO_INCREMENT)
entity_id (UNSIGNED INT)
tournament_id (INT, FK)
player1_id (INT, FK)
player2_id (INT, FK)
score1 (INT, default 0)
score2 (INT, default 0)
completed (TINYINT, default 0)
first_server (INT, nullable)
serving_player (INT, nullable)
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
  "playerIds": [1, 2, 3, 4]
}
```

**Chování:**
- Vytvoří turnaj s `entity_id = MAX(entity_id) + 1`
- Vytvoří vazby v `tournament_players`
- Vygeneruje všechny možné zápasy (každý s každým)

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
    "playerIds": [1, 2, 3]
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
    "score1": 11,
    "score2": 9,
    "completed": 1,
    "firstServer": 1,
    "servingPlayer": 1,
    "match_order": 0,
    "sidesSwapped": 0
  }
}
```

**DŮLEŽITÉ:** Vždy musí obsahovat `sidesSwapped`!

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

**Podporované zkratky:**
- `ArrowLeft` - Přidá bod levému hráči (respektuje `sidesSwapped`)
- `ArrowRight` - Přidá bod pravému hráči (respektuje `sidesSwapped`)

**Podmínky aktivace:**
- Hra musí být aktivní (`#game-screen` je viditelný)
- Žádný modal nesmí být otevřený
- Žádný input field nesmí být ve focusu

**Logika:**
```javascript
if (sidesSwapped) {
  ArrowLeft -> right player
  ArrowRight -> left player
} else {
  ArrowLeft -> left player
  ArrowRight -> right player
}
```

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

## 📝 Poznámky pro vývoj

### Přidávání nových funkcí

1. **Backend:** Přidej novou akci do `api.php` switch statement
2. **Frontend:** Přidej volání API v `index.html`
3. **Databáze:** Pokud potřebuješ nové sloupce, vytvoř migrační skript

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
- `zadání.txt` - Původní požadavky projektu (v češtině)

## ⚠️ Důležité upozornění

1. **Vždy používej `entity_id` s `valid_to IS NULL`** pro aktuální záznamy
2. **Sloupec `sides_swapped` je povinný** v tabulce `matches`
3. **Environment soubory necommitovat** - jsou v `.gitignore`
4. **Temporal versioning** - nikdy neměň `valid_to` na existujících záznamech přímo
5. **Formát data pro MySQL:** Používej `YYYY-MM-DD HH:MM:SS`, ne ISO 8601 (`toISOString()`)
6. **NULL hodnoty v `handleUpdateMatch`:** Vždy normalizuj NULL hodnoty před porovnáním
7. **`insert_id` v PHP:** Po `INSERT` vždy použij `$conn->insert_id` pro získání skutečného ID, ne `entity_id`

