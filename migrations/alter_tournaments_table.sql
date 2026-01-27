-- ALTER TABLE příkazy pro tabulku tournaments
-- Přidání sloupce tournament_type pro rozlišení dvouhry a čtyřhry

-- Přidání sloupce tournament_type
-- Pokud sloupec už existuje, příkaz selže - to je v pořádku, přeskočte ho
ALTER TABLE `tournaments`
ADD COLUMN `tournament_type` enum('single','double') NOT NULL DEFAULT 'single' AFTER `points_to_win`;

-- Pokud už máte nějaké turnaje v databázi, můžete nastavit jejich typ podle počtu hráčů
-- (volitelné - pouze pokud chcete automaticky nastavit typ podle existujících dat)
-- UPDATE tournaments t
-- SET tournament_type = 'double'
-- WHERE tournament_type = 'single'
-- AND EXISTS (
--     SELECT 1 FROM tournament_players tp
--     WHERE tp.tournament_id = t.entity_id
--     AND valid_to IS NULL
--     GROUP BY tp.tournament_id
--     HAVING COUNT(*) >= 4
-- );

