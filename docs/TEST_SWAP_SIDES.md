# Manuální testovací scénáře - Prohození stran zápasů

## Testovací scénáře pro opravu chyby s prohozením stran

### TC-1: Základní prohození stran u prvního zápasu
**Cíl:** Ověřit, že prohození stran funguje u prvního zápasu v turnaji.

**Kroky:**
1. Otevřít aplikaci na http://localhost/a/ping/index.html
2. **Vytvořit nový turnaj:**
   - Kliknout na tlačítko "+ Nový turnaj"
   - Vybrat typ turnaje (Dvouhra)
   - Přidat alespoň 2 hráče (např. "Honza" a "Ondra")
   - Potvrdit vytvoření turnaje
3. **Spustit turnaj:**
   - Kliknout na tlačítko "Start turnaje"
4. **Prohodit strany u prvního zápasu:**
   - U prvního zápasu kliknout na tlačítko pro prohození stran (šipky ↔)
   - Ověřit, že se strany prohodily vizuálně
5. **Spustit zápas:**
   - Kliknout na "Hrát zápas"
   - Ověřit, že se zápas spustil bez chyb

**Očekávaný výsledek:**
- Turnaj byl úspěšně vytvořen
- Strany se prohodily
- Zápas se spustil bez chyb v konzoli
- V databázi existuje nový záznam se stejným entity_id a prohozenými stranami

---

### TC-2: Prohození stran u druhého zápasu
**Cíl:** Ověřit, že prohození stran funguje u druhého zápasu v turnaji.

**Kroky:**
1. Otevřít aplikaci na http://localhost/a/ping/index.html
2. **Vytvořit nový turnaj:**
   - Kliknout na tlačítko "+ Nový turnaj"
   - Vybrat typ turnaje (Dvouhra)
   - Přidat alespoň 3 hráče (např. "Honza", "Ondra", "Martin D")
   - Potvrdit vytvoření turnaje
3. **Spustit turnaj:**
   - Kliknout na tlačítko "Start turnaje"
4. **Prohodit strany u druhého zápasu:**
   - U druhého zápasu kliknout na tlačítko pro prohození stran
   - Ověřit, že se strany prohodily
5. **Spustit zápas:**
   - Kliknout na "Hrát zápas"
   - Ověřit, že se zápas spustil bez chyb

**Očekávaný výsledek:**
- Turnaj byl úspěšně vytvořen
- Strany se prohodily
- Zápas se spustil bez chyb v konzoli
- V databázi existuje nový záznam se stejným entity_id

---

### TC-3: Prohození stran u třetího zápasu
**Cíl:** Ověřit, že prohození stran funguje u třetího zápasu v turnaji.

**Kroky:**
1. Otevřít aplikaci na http://localhost/a/ping/index.html
2. **Vytvořit nový turnaj:**
   - Kliknout na tlačítko "+ Nový turnaj"
   - Vybrat typ turnaje (Dvouhra)
   - Přidat alespoň 4 hráče (např. "Honza", "Ondra", "Martin D", "Martin K")
   - Potvrdit vytvoření turnaje
3. **Spustit turnaj:**
   - Kliknout na tlačítko "Start turnaje"
4. **Prohodit strany u třetího zápasu:**
   - U třetího zápasu kliknout na tlačítko pro prohození stran
   - Ověřit, že se strany prohodily
5. **Spustit zápas:**
   - Kliknout na "Hrát zápas"
   - Ověřit, že se zápas spustil bez chyb

**Očekávaný výsledek:**
- Turnaj byl úspěšně vytvořen
- Strany se prohodily
- Zápas se spustil bez chyb v konzoli
- V databázi existuje nový záznam se stejným entity_id

---

### TC-4: Vícenásobné prohození stran
**Cíl:** Ověřit, že lze prohodit strany u více zápasů za sebou.

**Kroky:**
1. Otevřít aplikaci na http://localhost/a/ping/index.html
2. **Vytvořit nový turnaj:**
   - Kliknout na tlačítko "+ Nový turnaj"
   - Vybrat typ turnaje (Dvouhra)
   - Přidat alespoň 4 hráče (např. "Honza", "Ondra", "Martin D", "Martin K")
   - Potvrdit vytvoření turnaje
3. **Spustit turnaj:**
   - Kliknout na tlačítko "Start turnaje"
4. **Prohodit strany u více zápasů:**
   - Prohodit strany u prvního zápasu
   - Prohodit strany u druhého zápasu
   - Prohodit strany u třetího zápasu
   - Ověřit, že všechny zápasy mají správně prohozené strany
5. **Spustit jeden z prohozených zápasů:**
   - Kliknout na "Hrát zápas" u jednoho z prohozených zápasů
   - Ověřit, že se zápas spustil bez chyb

**Očekávaný výsledek:**
- Turnaj byl úspěšně vytvořen
- Všechny zápasy mají správně prohozené strany
- Zápas se spustil bez chyb v konzoli
- V databázi existují nové záznamy pro všechny prohozené zápasy

---

### TC-5: Prohození stran a následné spuštění zápasu
**Cíl:** Ověřit, že po prohození stran lze zápas spustit a nastavit první podání.

**Kroky:**
1. Otevřít aplikaci na http://localhost/a/ping/index.html
2. **Vytvořit nový turnaj:**
   - Kliknout na tlačítko "+ Nový turnaj"
   - Vybrat typ turnaje (Dvouhra)
   - Přidat alespoň 2 hráče (např. "Honza" a "Ondra")
   - Potvrdit vytvoření turnaje
3. **Spustit turnaj:**
   - Kliknout na tlačítko "Start turnaje"
4. **Prohodit strany a spustit zápas:**
   - Prohodit strany u prvního zápasu
   - Kliknout na "Hrát zápas"
   - Vybrat hráče pro první podání
   - Ověřit, že se zápas spustil správně s prohozenými stranami

**Očekávaný výsledek:**
- Turnaj byl úspěšně vytvořen
- Zápas se spustil bez chyb
- Strany jsou správně prohozené
- První podání je nastaveno správně

---

### TC-6: Kontrola databáze po prohození stran
**Cíl:** Ověřit, že v databázi jsou správně uloženy změny.

**Kroky:**
1. Otevřít aplikaci na http://localhost/a/ping/index.html
2. **Vytvořit nový turnaj:**
   - Kliknout na tlačítko "+ Nový turnaj"
   - Vybrat typ turnaje (Dvouhra)
   - Přidat alespoň 2 hráče (např. "Honza" a "Ondra")
   - Potvrdit vytvoření turnaje
3. **Spustit turnaj:**
   - Kliknout na tlačítko "Start turnaje"
4. **Zaznamenat entity_id a prohodit strany:**
   - Zaznamenat entity_id prvního zápasu (z konzole nebo databáze)
   - Prohodit strany u prvního zápasu
5. **Zkontrolovat v databázi:**
   - Starý záznam má nastaveno valid_to
   - Nový záznam má stejné entity_id
   - Nový záznam má prohozené sides_swapped (0 → 1 nebo 1 → 0)
   - Nový záznam má valid_to = NULL

**Očekávaný výsledek:**
- Turnaj byl úspěšně vytvořen
- Starý záznam má valid_to nastaveno
- Nový záznam existuje se stejným entity_id
- sides_swapped je správně prohozené

---

### TC-7: Prohození stran u zamčeného turnaje
**Cíl:** Ověřit, že nelze prohodit strany u zamčeného turnaje.

**Kroky:**
1. Otevřít aplikaci na http://localhost/a/ping/index.html
2. **Vytvořit nový turnaj:**
   - Kliknout na tlačítko "+ Nový turnaj"
   - Vybrat typ turnaje (Dvouhra)
   - Přidat alespoň 2 hráče (např. "Honza" a "Ondra")
   - Potvrdit vytvoření turnaje
3. **Spustit turnaj:**
   - Kliknout na tlačítko "Start turnaje"
4. **Zamknout turnaj:**
   - Kliknout na ikonu zámku u turnaje
   - Ověřit, že turnaj je zamčený
5. **Pokusit se prohodit strany:**
   - Pokusit se prohodit strany u zápasu
   - Ověřit, že tlačítko pro prohození stran je deaktivované nebo nefunguje

**Očekávaný výsledek:**
- Turnaj byl úspěšně vytvořen
- Turnaj je zamčený
- Nelze prohodit strany u zamčeného turnaje
- Tlačítko je deaktivované nebo nefunguje

---

## Kontrolní seznam

- [x] TC-1: Základní prohození stran u prvního zápasu ✅ **PROŠLO**
- [ ] TC-2: Prohození stran u druhého zápasu
- [x] TC-3: Prohození stran u třetího zápasu ✅ **PROŠLO**
- [ ] TC-4: Vícenásobné prohození stran
- [x] TC-5: Prohození stran a následné spuštění zápasu ✅ **PROŠLO** (součást TC-1 a TC-3)
- [ ] TC-6: Kontrola databáze po prohození stran
- [ ] TC-7: Prohození stran u zamčeného turnaje

## Výsledky testování

### TC-1: Základní prohození stran u prvního zápasu ✅
**Datum testování:** 13. 1. 2026  
**Výsledek:** PROŠLO  
**Poznámky:**
- Prohození stran funguje správně
- Zápas se spustil bez chyb v konzoli
- Strany jsou správně prohozené v UI

### TC-3: Prohození stran u třetího zápasu ✅
**Datum testování:** 13. 1. 2026  
**Výsledek:** PROŠLO  
**Poznámky:**
- Prohození stran funguje správně i u třetího zápasu
- Zápas se spustil bez chyb v konzoli
- Modální okno pro výběr prvního podání se zobrazilo správně

## Poznámky k testování

- Při testování kontrolujte konzoli prohlížeče (F12) pro případné chyby
- Kontrolujte PHP error log pro případné chyby na serveru
- Ověřte, že se data správně ukládají do databáze
- Ověřte, že se data správně načítají z databáze po obnovení stránky

