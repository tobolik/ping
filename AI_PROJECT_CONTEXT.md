# AI Project Context & System Prompt

Tento soubor slouží jako paměť a kontext pro AI asistenty pracující na tomto projektu. Obsahuje klíčová rozhodnutí, architekturu a specifika nasazení.

## 1. Architektura projektu
- **Frontend:** Vanilla JS, HTML5, TailwindCSS (CDN). Hlavní logika je v `index.html` (monolith) a nově extrahovaných modulech v `js/`.
- **Backend:** PHP (`api.php`), bez frameworku.
- **Databáze:** MySQL. Připojení přes `mysqli`.
- **Konfigurace:** `config/config.php` načítá proměnné prostředí (ENV) nebo vrací defaultní pole.

## 2. Deployment a Infrastruktura (KRITICKÉ)
**Hosting:** [Český hosting](https://www.cesky-hosting.cz/)
**Nasazení:** Projekt běží na **subdoméně**. K subdoméně se váže FTP účet; na Českém hostingu **subdomény nepodporují SFTP** (SFTP/SCP je jen pro hlavní prostor domény). Proto se používá **FTP** (port 21).
**CI/CD:** GitHub Actions

### Specifika nasazení:
1.  **Protokol:** Používá se **FTP** na portu **21**. Důvod: přístup do subdomén je pouze přes FTP. Viz [FTP, subdomény](https://www.cesky-hosting.cz/napoveda/webserver-ftp-subdomeny/).
2.  **GitHub Action:** Používá se `SamKirkland/FTP-Deploy-Action`.
    - Soubor: `.github/workflows/deploy.yml`.
    - Secrets: `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_TARGET_DIR`. V GitHubu (Settings → Secrets) nastavte host, uživatelské jméno, heslo a cílový adresář FTP účtu subdomény.
3.  **Filtrace souborů:**
    - Action verze 4.3.5 má specifika pro `exclude`.
    - **Řešení:** Ve workflow je krok `Remove excluded files`, který ručně smaže (`rm -rf`) složky `.git`, `node_modules`, `tests`, `docs` atd. *před* spuštěním uploadu. Toto je robustnější než spoléhat na parametry akce.

### Konfigurace na serveru:
- **.env soubor:** Na produkčním serveru **MUSÍ** existovat soubor `.env` v kořenovém adresáři.
- Tento soubor **není** v Gitu (je v `.gitignore`).
- Obsahuje produkční přihlašovací údaje k databázi.
- **Varování:** Při deployi nesmí dojít k přepsání produkčního configu lokálním, proto se spoléháme na `.env` na serveru.

## 3. Struktura a Konvence
- **Větev:** `master` je produkční větev. Deploy probíhá automaticky při pushi do `master`.
- **API:** Veškerá komunikace probíhá přes `api.php` pomocí POST requestů s `json` payloadem (`action`, `payload`).
- **Logování:** Backend loguje do `debug.log` (pokud je povoleno).

## 4. Nedávné změny (Leden 2026)
- Implementováno ovládání hlasitosti hlasového asistenta (slider v UI).
- Refaktoring: Vyčlenění `tournament-utils.js` a `style.css` z `index.html`.
- Oprava konfliktu při merge větve `chore/reorganize-docs`.
- Zprovoznění automatického deploye (FTP na subdoménu, Český hosting).

## 5. Instrukce pro AI
- Při úpravách workflow `deploy.yml` používat **FTP** (protocol: ftp, port: 21); projekt je na subdoméně, která SFTP nepodporuje.
- Při změnách v PHP kódu myslet na to, že produkce běží na Českém hostingu a konfiguraci bere z `.env`.
- Neměnit logiku mazání souborů v GitHub Actions, pokud to není nezbytně nutné (funguje to spolehlivě).
