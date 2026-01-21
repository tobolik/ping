-- ALTER TABLE příkazy pro tabulku matches
-- Přidání sloupců pro čtyřhru a úprava sides_swapped
-- POZOR: Pokud sloupce už existují, příkazy vyhodí chybu - to je v pořádku, můžete je přeskočit

-- 1. Přidání sloupců team1_id a team2_id
-- Pokud sloupec už existuje, příkaz selže - to je v pořádku, přeskočte ho
ALTER TABLE `matches` 
ADD COLUMN `team1_id` int(11) NULL AFTER `player2_id`;

ALTER TABLE `matches` 
ADD COLUMN `team2_id` int(11) NULL AFTER `team1_id`;

-- 2. Přidání sloupce double_rotation_state
-- Pokud sloupec už existuje, příkaz selže - to je v pořádku, přeskočte ho
ALTER TABLE `matches` 
ADD COLUMN `double_rotation_state` text NULL AFTER `serving_player`;

-- 3. Úprava sloupce sides_swapped: změna z NULL na NOT NULL DEFAULT 0
-- Nejdřív nastavíme DEFAULT hodnotu pro existující NULL záznamy
UPDATE `matches` SET `sides_swapped` = 0 WHERE `sides_swapped` IS NULL;

-- Pak změníme strukturu sloupce
ALTER TABLE `matches` 
MODIFY COLUMN `sides_swapped` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0 = default, 1 = swapped';

