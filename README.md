# 🏓 Ping Pong Turnajová Aplikace

Aplikace pro správu a sledování ping pong turnajů s podporou více turnajů, statistik a detailního sledování zápasů.

## 📋 Obsah

- [Instalace](#instalace)
- [Konfigurace](#konfigurace)
- [Struktura projektu](#struktura-projektu)
- [Databáze](#databáze)
- [API](#api)
- [Vývoj](#vývoj)

## 🚀 Instalace

### Požadavky

- PHP 7.4 nebo vyšší
- MySQL/MariaDB 5.7 nebo vyšší
- Apache/Nginx web server
- Node.js (pro Cypress testy - volitelné)

### Kroky instalace

1. **Naklonujte repozitář**
   ```bash
   git clone https://github.com/ondrej-kratochvil/ping.git
   cd ping
   ```

2. **Vytvořte databázi**
   - Otevřete phpMyAdmin nebo MySQL klienta
   - Vytvořte novou databázi (např. `sensiocz02`)
   - Importujte soubor `ping3.sql` do databáze

3. **Nastavte konfiguraci**
   - Zkopírujte `.env.example` jako `.env.localhost` pro lokální vývoj
   - Upravte přihlašovací údaje k databázi v `.env.localhost`:
     ```
     DB_HOST=127.0.0.1
     DB_NAME=sensiocz02
     DB_USER=root
     DB_PASS=vertrigo
     DEBUG=true
     ```

4. **Nastavte web server**
   - Pro WAMP/XAMPP: Umístěte projekt do `www` složky
   - Pro Apache: Nakonfigurujte VirtualHost
   - Otevřete aplikaci v prohlížeči: `http://localhost/a/ping/`

## ⚙️ Konfigurace

### Environment soubory

Aplikace podporuje různé konfigurace pro různé prostředí:

- **`.env.localhost`** - Pro lokální vývoj (automaticky se používá na localhost)
- **`.env.production`** - Pro produkční server
- **`.env.example`** - Šablona pro dokumentaci

Konfigurační soubor `config/config.php` automaticky detekuje prostředí podle `HTTP_HOST` a načte příslušný `.env` soubor.

### Struktura .env souboru

```ini
DB_HOST=127.0.0.1          # Adresa databázového serveru
DB_NAME=sensiocz02          # Název databáze
DB_USER=root                # Uživatel databáze
DB_PASS=vertrigo            # Heslo databáze
DEBUG=true                   # Debug mód (true/false)
```

## 📁 Struktura projektu

```
ping/
├── api.php                  # Backend API endpoint
├── index.html              # Hlavní frontend aplikace
├── config/
│   └── config.php          # Konfigurace databáze a prostředí
├── cypress/                # Cypress E2E testy
├── data/                   # Data soubory (pokud jsou)
├── .env.localhost          # Lokální konfigurace (NEPŘIDÁVAT DO GIT)
├── .env.production         # Produkční konfigurace (NEPŘIDÁVAT DO GIT)
├── .env.example            # Šablona konfigurace
├── ping3.sql               # SQL skript pro vytvoření databáze
├── package.json            # Node.js závislosti
└── README.md               # Tento soubor
```

## 🗄️ Databáze

### Struktura tabulek

- **`players`** - Hráči (id, entity_id, name, photo_url, strengths, weaknesses, valid_from, valid_to)
- **`tournaments`** - Turnaje (id, entity_id, name, points_to_win, is_locked, valid_from, valid_to)
- **`tournament_players`** - Vazba hráčů na turnaje (id, entity_id, tournament_id, player_id, player_order, valid_from, valid_to)
- **`matches`** - Zápasy (id, entity_id, tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, sides_swapped, match_order, valid_from, valid_to)
- **`settings`** - Nastavení aplikace (id, entity_id, setting_key, setting_value, valid_from, valid_to)
- **`sync_status`** - Status synchronizace (id, table_name, last_sync)

### Temporal Versioning

Aplikace používá temporal versioning pattern - místo UPDATE se používají INSERT s `valid_to` timestampem. Aktuální záznamy mají `valid_to = NULL`.

### Migrace

Pro přidání nových sloupců nebo změny struktury použijte migrační skripty v SQL formátu.

## 🔌 API

### Endpoint

**URL:** `/api.php`

**Metody:**
- `GET` - Načtení všech dat (turnaje, hráči, nastavení)
- `POST` - Provádění akcí

### POST Akce

Všechny POST požadavky musí obsahovat JSON s `action` a `payload`:

```json
{
  "action": "savePlayer",
  "payload": {
    "data": {
      "name": "Jan Novák",
      "photoUrl": "",
      "strengths": "",
      "weaknesses": ""
    }
  }
}
```

#### Dostupné akce:

- `createTournament` - Vytvoření nového turnaje
- `updateTournament` - Aktualizace turnaje
- `updateMatch` - Aktualizace zápasu
- `savePlayer` - Uložení/aktualizace hráče
- `deletePlayer` - Smazání hráče (soft delete)
- `deleteTournament` - Smazání turnaje (soft delete)
- `saveSettings` - Uložení nastavení
- `reorderMatches` - Změna pořadí zápasů
- `swapSides` - Prohození stran hráčů
- `toggleTournamentLock` - Zamknutí/odemknutí turnaje

### Odpověď API

**Úspěšná odpověď:**
```json
{
  "settings": {...},
  "playerDatabase": [...],
  "tournaments": [...]
}
```

**Chybová odpověď:**
```json
{
  "error": "Chybová zpráva"
}
```

## 🧪 Vývoj

### Spuštění testů

```bash
npm install
npm run cypress:open
```

### Debug mód

Nastavte `DEBUG=true` v `.env.localhost` pro zobrazení detailních chybových hlášek.

## 📝 Poznámky

- Aplikace používá temporal versioning - historie změn je zachována
- Všechny `.env` soubory jsou v `.gitignore` - necommitovat citlivé údaje
- Pro produkci změňte `Access-Control-Allow-Origin` v `api.php` na konkrétní doménu

## 📄 Licence

ISC

## 👤 Autor

Ondřej Kratochvíl

