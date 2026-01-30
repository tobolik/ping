-- ALTER TABLE příkazy pro tabulku players
-- Přidání sloupce nickname pro hlasové ovládání

-- 1. Přidání sloupce nickname
-- Pokud sloupec už existuje, příkaz selže - to je v pořádku, přeskočte ho
ALTER TABLE `players`
ADD COLUMN `nickname` varchar(50) NULL AFTER `name`;
