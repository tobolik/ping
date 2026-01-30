// UI funkce - modals, toast, screens

let modalsContainer;
let screens;

export function initUI() {
    modalsContainer = document.getElementById('modals-container');
    screens = {
        main: document.getElementById('main-screen'),
        playerDb: document.getElementById('player-db-screen'),
        tournament: document.getElementById('tournament-screen'),
        game: document.getElementById('game-screen'),
        stats: document.getElementById('stats-screen'),
        overallStats: document.getElementById('overall-stats-screen')
    };
}

export function getModalsContainer() {
    return modalsContainer;
}

export function getScreens() {
    return screens;
}

export function showScreen(screenName) {
    const app = document.getElementById('app');
    const isGameScreen = screenName === 'game';
    if (!isGameScreen) {
        document.body.classList.remove('game-active');
        // Pro všechny obrazovky kromě game screen použijeme širší šířku
        app.classList.remove('max-w-xl');
        app.classList.add('max-w-3xl', 'mx-auto', 'p-4');
    }
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if(screens[screenName]) screens[screenName].classList.add('active');
    window.scrollTo(0,0);
}

export function openModal(html) {
    modalsContainer.innerHTML = html;
}

export function closeModal() {
    modalsContainer.innerHTML = '';
}

// Funkce pro zobrazení toast notifikace
export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[250px] max-w-md animate-slide-in-right`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span class="flex-grow">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animace vstupu
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Automatické odstranění
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Funkce pro zobrazení alert modalu místo alert()
export function showAlertModal(message, title = 'Upozornění', autoClose = false) {
    return new Promise((resolve) => {
        const autoCloseAttr = (autoClose || window.TESTING_MODE) ? 'data-test-auto-close="true"' : '';
        openModal(`
            <div class="modal-backdrop" ${autoCloseAttr} data-test-id="alert-modal">
                <div class="modal-content space-y-4">
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl font-bold">${title}</h2>
                        <button data-action="close-alert-modal" data-test-id="close-alert-modal" class="text-gray-400 text-2xl hover:text-gray-700">&times;</button>
                    </div>
                    <p class="text-gray-700">${message}</p>
                    <div class="flex justify-end">
                        <button data-action="close-alert-modal" data-test-id="alert-modal-ok" class="btn btn-primary">OK</button>
                    </div>
                </div>
            </div>
        `);
        // Přidáme event listenery
        const closeHandler = () => {
            closeModal();
            resolve();
        };
        document.querySelector('[data-action="close-alert-modal"]').addEventListener('click', closeHandler);
        // Zavření pomocí Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeHandler();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        // Automatické zavření v testovacím režimu nebo pokud je autoClose=true
        if (autoClose || window.TESTING_MODE) {
            setTimeout(() => {
                closeHandler();
            }, 500);
        }
    });
}

// Funkce pro zobrazení confirm modalu místo confirm()
export function showConfirmModal(message, title = 'Potvrzení', autoConfirm = false) {
    return new Promise((resolve) => {
        const autoCloseAttr = (autoConfirm || window.TESTING_MODE) ? 'data-test-auto-close="true"' : '';
        openModal(`
            <div class="modal-backdrop" ${autoCloseAttr} data-test-id="confirm-modal">
                <div class="modal-content space-y-4">
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl font-bold">${title}</h2>
                        <button data-action="close-confirm-modal" data-test-id="close-confirm-modal" class="text-gray-400 text-2xl hover:text-gray-700">&times;</button>
                    </div>
                    <p class="text-gray-700">${message}</p>
                    <div class="flex gap-2 justify-end">
                        <button data-action="cancel-confirm-modal" data-test-id="confirm-modal-cancel" class="btn btn-secondary">Zrušit</button>
                        <button data-action="confirm-confirm-modal" data-test-id="confirm-modal-confirm" class="btn btn-primary">Potvrdit</button>
                    </div>
                </div>
            </div>
        `);
        // Přidáme event listenery
        const confirmHandler = () => {
            closeModal();
            resolve(true);
        };
        const cancelHandler = () => {
            closeModal();
            resolve(false);
        };
        document.querySelector('[data-action="confirm-confirm-modal"]').addEventListener('click', confirmHandler);
        document.querySelector('[data-action="cancel-confirm-modal"]').addEventListener('click', cancelHandler);
        document.querySelector('[data-action="close-confirm-modal"]').addEventListener('click', cancelHandler);
        // Zavření pomocí Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cancelHandler();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        // Automatické potvrzení v testovacím režimu nebo pokud je autoConfirm=true
        if (autoConfirm || window.TESTING_MODE) {
            setTimeout(() => {
                confirmHandler();
            }, 500);
        }
    });
}

export function renderGameScreen(content) {
    const app = document.getElementById('app');
    document.body.classList.add('game-active');
    app.classList.remove('max-w-3xl', 'max-w-xl', 'mx-auto', 'p-4');
    screens.game.innerHTML = content;
    showScreen('game');
}

export { screens };
