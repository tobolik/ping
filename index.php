<?php
// Zákaz cachování
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
?>
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏓 Ping pong turnaje</title>
    
    <script type="importmap">
    {
        "imports": {
            "./js/actions.js": "./js/actions.js?v=1.1.5",
            "./js/api.js": "./js/api.js?v=1.1.5",
            "./js/audio.js": "./js/audio.js?v=1.1.5",
            "./js/autocomplete.js": "./js/autocomplete.js?v=1.1.5",
            "./js/constants.js": "./js/constants.js?v=1.1.5",
            "./js/game-logic.js": "./js/game-logic.js?v=1.1.5",
            "./js/main.js": "./js/main.js?v=1.1.5",
            "./js/render.js": "./js/render.js?v=1.1.5",
            "./js/state.js": "./js/state.js?v=1.1.5",
            "./js/stats.js": "./js/stats.js?v=1.1.5",
            "./js/ui.js": "./js/ui.js?v=1.1.5",
            "./js/utils.js": "./js/utils.js?v=1.1.5",
            "./js/voice-input.js": "./js/voice-input.js?v=1.1.5",
            "./js/utils/tournament-utils.js": "./js/utils/tournament-utils.js?v=1.1.5"
        }
    }
    </script>
    <script>
        // Potlačení varování a chyb o produkčním použití Tailwind CSS CDN a CSP - MUSÍ být před načtením Tailwind CDN
        (function() {
            const shouldSuppress = (message) => {
                if (!message || typeof message !== 'string') return false;
                return message.includes('cdn.tailwindcss.com should not be used in production') ||
                       message.includes("Content Security Policy of your site blocks the use of 'eval'") ||
                       (message.includes("Content Security Policy") && message.includes("blocks the use of 'eval'")) ||
                       message.includes("Executing inline script violates the following Content Security Policy directive") ||
                       (message.includes("Loading the font") && message.includes("violates the following Content Security Policy directive"));
            };

            if (typeof console !== 'undefined') {
                if (console.warn) {
                    const originalWarn = console.warn;
                    console.warn = function(...args) {
                        if (!shouldSuppress(args[0])) {
                            originalWarn.apply(console, args);
                        }
                    };
                }
                if (console.error) {
                    const originalError = console.error;
                    console.error = function(...args) {
                        if (!shouldSuppress(args[0])) {
                            originalError.apply(console, args);
                        }
                    };
                }
            }
        })();
    </script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            corePlugins: {
                preflight: true,
            }
        };
    </script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <link rel="stylesheet" type="text/css" href="style.css">
    <!-- Import modulů a zpřístupnění do window, aby stávající inline kód postupně fungoval přes moduly -->
    <script type="module">
        // Zpřístupnění modulů do window pro přechodné období refaktoringu
        import * as Constants from './js/constants.js';
        import { state } from './js/state.js';
        import * as Api from './js/api.js';
        import * as Utils from './js/utils.js';
        import * as Audio from './js/audio.js';
        import * as UI from './js/ui.js';
        import * as Render from './js/render.js';
        import * as Stats from './js/stats.js';
        import * as GameLogic from './js/game-logic.js';
        import * as Actions from './js/actions.js';
        import { setupAutocomplete } from './js/autocomplete.js';
        import { generateUniqueTournamentName } from './js/utils/tournament-utils.js';

        // Explicitně nastavíme verzi zde, pokud by main.js selhal
        document.getElementById('app-version').textContent = '1.1.5';

        Object.assign(window, {
            // konstanty a state
            ...Constants,
            state,
            // API
            apiCall: Api.apiCall,
            loadState: Api.loadState,
            // util / UI / další moduly
            ...Utils,
            ...Audio,
            ...UI,
            ...Render,
            ...Stats,
            ...GameLogic,
            ...Actions,
            // speciální utilita
            generateUniqueTournamentName,
            setupAutocomplete,
        });
    </script>
    <script>
        // Testovací režim - aktivuje se pomocí ?test=true v URL
        window.TESTING_MODE = window.location.search.includes('test=true');
    </script>
</head>
<body class="text-gray-800">
    <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>
    <div id="app" class="max-w-3xl mx-auto p-4">
        <div id="main-screen" class="screen space-y-6">
            <header class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h1 class="text-3xl font-bold flex items-center gap-3"><i class="fa-solid fa-trophy text-yellow-400"></i>Ping pong turnaje</h1>
                <div class="flex items-center gap-2 flex-wrap justify-end md:justify-start">
                    <button data-action="show-new-tournament-modal" data-test-id="new-tournament-button" class="btn btn-primary flex items-center gap-2"><i class="fa-solid fa-plus"></i> Nový turnaj</button>
                    <div class="relative">
                        <button data-action="toggle-settings-menu" class="btn btn-secondary !p-0 h-12 w-12 flex items-center justify-center text-xl" title="Nastavení aplikace"><i class="fa-solid fa-gear"></i></button>
                        <div id="settings-menu" class="settings-menu hidden">
                            <button data-action="show-player-db"><i class="fa-solid fa-database w-6 mr-2"></i>Správa hráčů</button>
                            <button data-action="show-overall-stats"><i class="fa-solid fa-chart-line w-6 mr-2"></i>Celkové statistiky</button>
                            <button data-action="export-data"><i class="fa-solid fa-file-export w-6 mr-2"></i>Exportovat data</button>
                            <label for="import-file" class="cursor-pointer inline-flex items-center"><i class="fa-solid fa-file-import w-6 mr-2"></i>Importovat data</label>
                            <input type="file" id="import-file" class="hidden" accept=".json">
                            <label for="sound-toggle" class="cursor-pointer flex items-center justify-between">
                                <span class="flex items-center"><i class="fa-solid fa-volume-high w-6 mr-2"></i>Zvuky</span>
                                <input type="checkbox" id="sound-toggle" data-action="toggle-sound" class="sr-only">
                                <div class="relative w-10 h-5 bg-gray-300 rounded-full transition-colors toggle-checkbox">
                                    <div class="absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform transition-transform toggle-label"></div>
                                </div>
                            </label>
                            <label for="voice-assist-toggle" class="cursor-pointer flex items-center justify-between">
                                <span class="flex items-center"><i class="fa-solid fa-comment-dots w-6 mr-2"></i>Hlas</span>
                                <input type="checkbox" id="voice-assist-toggle" data-action="toggle-voice-assist" class="sr-only">
                                <div class="relative w-10 h-5 bg-gray-300 rounded-full transition-colors toggle-checkbox">
                                    <div class="absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform transition-transform toggle-label"></div>
                                </div>
                            </label>
                            <label class="cursor-pointer flex flex-col gap-2">
                                <span class="flex items-center text-sm text-gray-700"><i class="fa-solid fa-volume-low w-6 mr-2"></i>Hlasitost asistenta</span>
                                <input type="range" min="0" max="1" step="0.1" value="1" data-action="change-voice-volume" class="w-full">
                            </label>
                            <label for="motivational-phrases-toggle" class="cursor-pointer flex items-center justify-between">
                                <span class="flex items-center"><i class="fa-solid fa-comments w-6 mr-2"></i>Motivační hlášky</span>
                                <input type="checkbox" id="motivational-phrases-toggle" data-action="toggle-motivational-phrases" class="sr-only">
                                <div class="relative w-10 h-5 bg-gray-300 rounded-full transition-colors toggle-checkbox">
                                    <div class="absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform transition-transform toggle-label"></div>
                                </div>
                            </label>
                            <label for="show-locked-toggle" class="cursor-pointer flex items-center justify-between">
                                <span class="flex items-center"><i class="fa-solid fa-lock w-6 mr-2"></i>Zobrazit zamčené turnaje</span>
                                <input type="checkbox" id="show-locked-toggle" data-action="toggle-show-locked" class="sr-only">
                                <div class="relative w-10 h-5 bg-gray-300 rounded-full transition-colors toggle-checkbox">
                                    <div class="absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform transition-transform toggle-label"></div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </header>
            <main id="tournaments-list-container" class="space-y-4"></main>
        </div>

        <div id="player-db-screen" class="screen space-y-6">
             <header><h1 class="text-3xl font-bold">Databáze hráčů</h1><p class="text-gray-500">Zde spravujete centrální seznam všech hráčů.</p></header>
            <div class="flex gap-2"><button data-action="show-edit-player-modal" data-id="new" class="btn btn-primary w-full"><i class="fa-solid fa-plus mr-2"></i>Přidat nového hráče</button><button data-action="back-to-main" class="btn btn-secondary w-full">Zpět</button></div>
            <main id="player-db-list-container" class="space-y-2"></main>
        </div>
        <div id="tournament-screen" class="screen space-y-6">
            <header><div id="tournament-title" class="text-3xl font-bold"></div><p id="tournament-progress" class="text-gray-500"></p></header>
            <div class="flex items-center gap-2 flex-wrap"><button data-action="back-to-main" class="btn btn-secondary flex items-center justify-center gap-2"><i class="fa-solid fa-list-ul"></i> Turnaje</button><button data-action="show-stats" class="btn btn-secondary flex items-center justify-center gap-2"><i class="fa-solid fa-chart-simple"></i> Statistiky</button><button data-action="show-settings-modal" class="btn btn-secondary flex items-center justify-center gap-2 md:ml-auto"><i class="fa-solid fa-gear"></i> Nastavení</button></div>
            <main class="space-y-6"><div id="final-results-container"></div><div id="upcoming-matches-container"></div><div id="completed-matches-container"></div></main>
        </div>
        <div id="game-screen" class="screen"></div>
        <div id="stats-screen" class="screen space-y-6">
            <header><h1 class="text-3xl font-bold">Výsledková listina</h1><p id="stats-tournament-name" class="text-gray-500"></p></header>
            <div class="flex gap-2">
                <button data-action="back-to-tournament" class="btn btn-secondary flex-1">Zpět</button>
                <button data-action="export-csv" class="btn btn-primary flex-1"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
                <button data-action="export-pdf" class="btn btn-primary flex-1"><i class="fa-solid fa-file-pdf"></i> Export PDF</button>
            </div>
            <div id="stats-leaderboard" class="bg-white p-4 rounded-xl shadow-sm"></div>
            <div id="stats-team-leaderboard" class="bg-white p-4 rounded-xl shadow-sm"></div>
            <div class="space-y-2"><h2 class="text-xl font-bold">Vzájemné zápasy</h2><div id="stats-matrix" class="bg-white p-4 rounded-xl shadow-sm overflow-x-auto"></div></div>
        </div>
        <div id="overall-stats-screen" class="screen space-y-6">
            <header><h1 class="text-3xl font-bold">Celkové statistiky hráčů</h1></header>
            <button data-action="back-to-main" data-test-id="back-to-main" class="btn btn-secondary w-full">Zpět</button>
            <div id="overall-stats-container" class="bg-white p-4 rounded-xl shadow-sm overflow-x-auto"></div>
        </div>
        <div id="modals-container"></div>
        <footer class="text-center text-xs text-gray-400 py-4 mt-8 border-t border-gray-100">
            Verze: v<span id="app-version"></span>
        </footer>
    </div>

<script type="module" src="js/main.js?v=1.1.5"></script>
</body>
</html>
