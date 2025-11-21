/*
SQLyog Ultimate v12.09 (64 bit)
MySQL - 10.11.14-MariaDB-0+deb12u2-log : Database - sensiocz02
*********************************************************************
*/


/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`sensiocz02` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `sensiocz02`;

/*Table structure for table `matches` */

DROP TABLE IF EXISTS `matches`;

CREATE TABLE `matches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_id` int(10) unsigned NOT NULL,
  `tournament_id` int(11) NOT NULL,
  `player1_id` int(11) NOT NULL,
  `player2_id` int(11) NOT NULL,
  `team1_id` int(11) DEFAULT NULL,
  `team2_id` int(11) DEFAULT NULL,
  `score1` int(11) DEFAULT 0,
  `score2` int(11) DEFAULT 0,
  `completed` tinyint(1) DEFAULT 0,
  `first_server` int(11) DEFAULT NULL,
  `serving_player` int(11) DEFAULT NULL,
  `double_rotation_state` text DEFAULT NULL,
  `sides_swapped` tinyint(1) DEFAULT 0,
  `match_order` int(11) NOT NULL,
  `valid_from` datetime NOT NULL DEFAULT current_timestamp(),
  `valid_to` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `player1_id` (`player1_id`),
  KEY `player2_id` (`player2_id`),
  KEY `team1_id` (`team1_id`),
  KEY `team2_id` (`team2_id`),
  KEY `idx_tournament` (`tournament_id`),
  KEY `idx_completed` (`completed`),
  KEY `idx_matches_entity_id` (`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `matches` */

insert  into `matches`(`id`,`entity_id`,`tournament_id`,`player1_id`,`player2_id`,`team1_id`,`team2_id`,`score1`,`score2`,`completed`,`first_server`,`serving_player`,`double_rotation_state`,`sides_swapped`,`match_order`,`valid_from`,`valid_to`) values (1,1,1,1,3,NULL,NULL,11,6,1,1,1,NULL,0,0,'2025-10-03 13:05:25',NULL),(2,2,1,5,3,NULL,NULL,11,4,1,1,2,NULL,0,1,'2025-10-03 13:05:25',NULL),(3,3,1,3,4,NULL,NULL,11,8,1,2,1,NULL,0,2,'2025-10-03 13:05:25',NULL),(4,4,1,5,4,NULL,NULL,11,6,1,1,1,NULL,0,3,'2025-10-03 13:05:25',NULL),(5,5,1,1,5,NULL,NULL,11,9,1,1,1,NULL,0,4,'2025-10-03 13:05:25',NULL),(6,6,1,1,4,NULL,NULL,11,5,1,2,2,NULL,0,5,'2025-10-03 13:05:25',NULL),(7,7,2,1,3,NULL,NULL,9,11,1,1,1,NULL,0,0,'2025-10-03 13:05:25',NULL),(8,8,2,5,3,NULL,NULL,11,5,1,1,1,NULL,0,1,'2025-10-03 13:05:25',NULL),(9,9,2,1,5,NULL,NULL,8,11,1,2,1,NULL,0,2,'2025-10-03 13:05:25',NULL),(10,10,2,1,4,NULL,NULL,11,1,1,2,2,NULL,0,3,'2025-10-03 13:05:25',NULL),(11,11,2,5,4,NULL,NULL,11,9,1,1,1,NULL,0,4,'2025-10-03 13:05:25',NULL),(12,12,2,4,3,NULL,NULL,7,11,1,2,1,NULL,0,5,'2025-10-03 13:05:25',NULL),(13,13,3,1,5,NULL,NULL,0,0,0,NULL,NULL,NULL,0,0,'2025-10-03 13:05:51',NULL),(14,14,3,5,2,NULL,NULL,0,0,0,NULL,NULL,NULL,0,0,'2025-10-03 13:05:51',NULL),(15,15,3,1,2,NULL,NULL,0,0,0,NULL,NULL,NULL,0,0,'2025-10-03 13:05:51',NULL),(16,13,3,1,5,NULL,NULL,0,0,0,1,1,NULL,0,0,'2025-10-03 13:05:54',NULL);
/*Table structure for table `tournament_teams` */

DROP TABLE IF EXISTS `tournament_teams`;

CREATE TABLE `tournament_teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_id` int(10) unsigned NOT NULL,
  `tournament_id` int(11) NOT NULL,
  `team_order` int(11) NOT NULL,
  `player1_id` int(11) NOT NULL,
  `player2_id` int(11) NOT NULL,
  `valid_from` datetime NOT NULL DEFAULT current_timestamp(),
  `valid_to` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tournament_teams_tournament` (`tournament_id`),
  KEY `idx_tournament_teams_entity_id` (`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


/*Table structure for table `players` */

DROP TABLE IF EXISTS `players`;

CREATE TABLE `players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `photo_url` text DEFAULT NULL,
  `strengths` text DEFAULT NULL,
  `weaknesses` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `valid_from` datetime NOT NULL DEFAULT current_timestamp(),
  `valid_to` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`(191)),
  KEY `idx_players_entity_id` (`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `players` */

insert  into `players`(`id`,`entity_id`,`name`,`photo_url`,`strengths`,`weaknesses`,`updated_at`,`valid_from`,`valid_to`) values (1,1,'Honza','','','','2025-10-03 13:05:25','2025-10-03 13:05:25',NULL),(2,2,'Martin','','','','2025-10-03 13:05:25','2025-10-03 13:05:25',NULL),(3,3,'Martin D','','','','2025-10-03 13:05:25','2025-10-03 13:05:25',NULL),(4,4,'Martin K','','','','2025-10-03 13:05:25','2025-10-03 13:05:25',NULL),(5,5,'Ondra','','','','2025-10-03 13:05:25','2025-10-03 13:05:25',NULL);

/*Table structure for table `settings` */

DROP TABLE IF EXISTS `settings`;

CREATE TABLE `settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `entity_id` bigint(20) unsigned NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `valid_from` datetime NOT NULL DEFAULT current_timestamp(),
  `valid_to` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_setting_key_valid_to` (`setting_key`,`valid_to`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `settings` */

insert  into `settings`(`id`,`entity_id`,`setting_key`,`setting_value`,`valid_from`,`valid_to`) values (1,1,'soundsEnabled','true','2025-10-03 13:05:25',NULL);

/*Table structure for table `sync_status` */

DROP TABLE IF EXISTS `sync_status`;

CREATE TABLE `sync_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(50) NOT NULL,
  `last_sync` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_table` (`table_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `sync_status` */

/*Table structure for table `tournament_players` */

DROP TABLE IF EXISTS `tournament_players`;

CREATE TABLE `tournament_players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_id` bigint(20) unsigned NOT NULL,
  `tournament_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `player_order` int(11) NOT NULL,
  `valid_from` datetime NOT NULL DEFAULT current_timestamp(),
  `valid_to` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `idx_tournament` (`tournament_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `tournament_players` */

insert  into `tournament_players`(`id`,`entity_id`,`tournament_id`,`player_id`,`player_order`,`valid_from`,`valid_to`) values (1,1,1,1,0,'2025-10-03 13:05:25',NULL),(2,2,1,5,1,'2025-10-03 13:05:25',NULL),(3,3,1,3,2,'2025-10-03 13:05:25',NULL),(4,4,1,4,3,'2025-10-03 13:05:25',NULL),(5,5,2,1,0,'2025-10-03 13:05:25',NULL),(6,6,2,5,1,'2025-10-03 13:05:25',NULL),(7,7,2,3,2,'2025-10-03 13:05:25',NULL),(8,8,2,4,3,'2025-10-03 13:05:25',NULL),(9,9,3,1,0,'2025-10-03 13:05:51',NULL),(10,10,3,5,1,'2025-10-03 13:05:51',NULL),(11,11,3,2,2,'2025-10-03 13:05:51',NULL);

/*Table structure for table `tournaments` */

DROP TABLE IF EXISTS `tournaments`;

CREATE TABLE `tournaments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `points_to_win` int(11) NOT NULL DEFAULT 11,
  `tournament_type` enum('single','double') NOT NULL DEFAULT 'single',
  `is_locked` tinyint(1) DEFAULT 0,
  `valid_from` datetime NOT NULL DEFAULT current_timestamp(),
  `valid_to` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_created` (`valid_from`),
  KEY `idx_tournaments_entity_id` (`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `tournaments` */

insert  into `tournaments`(`id`,`entity_id`,`name`,`points_to_win`,`tournament_type`,`is_locked`,`valid_from`,`valid_to`) values (1,1,'Turnaj II. 24. 9. 2025',11,'single',1,'2025-09-24 12:40:18',NULL),(2,2,'Turnaj I. 24. 9. 2025',11,'single',1,'2025-09-24 12:20:27',NULL),(3,3,'Turnaj 3. 10. 2025',11,'single',0,'2025-10-03 13:05:51',NULL);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
