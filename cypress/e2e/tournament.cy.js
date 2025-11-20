describe('Základní testy aplikace', () => {
  beforeEach(() => {
    // Intercept a GET request to api.php and respond with mock data from a fixture
    cy.intercept('GET', 'api.php', { fixture: 'initialData.json' }).as('getData');
    cy.visit('index.html');
    cy.wait('@getData'); // Wait for the mocked request to be hit
  });

  it('úspěšně načte hlavní stránku a zobrazí nadpis', () => {
    cy.contains('h1', 'Ping pong turnaje').should('be.visible');
  });

  it('dokáže vytvořit nový turnaj a zobrazí ho na hlavní obrazovce', () => {
    // We use the data from our fixture to run the test
    cy.fixture('initialData.json').then((initialData) => {
      const playersToSelect = initialData.playerDatabase.slice(0, 2);
      const tournamentName = `Testovací Turnaj ${new Date().getTime()}`;

      // Prepare a mocked response for the POST request that will be sent
      const newTournamentData = {
        ...initialData,
        tournaments: [
          {
            id: 1, // Mock ID
            name: tournamentName,
            points_to_win: 11,
            is_locked: '0',
            createdAt: new Date().toISOString(),
            playerIds: playersToSelect.map(p => parseInt(p.id)),
            matches: [
              { id: '1-2-mock', player1_id: '1', player2_id: '2', score1: '0', score2: '0', completed: '0', first_server: null, serving_player: null }
            ]
          }
        ]
      };

      // Intercept the POST request and respond with our prepared data
      cy.intercept('POST', 'api.php', newTournamentData).as('postData');

      // --- Test Steps ---
      cy.get('button').contains('Nový Turnaj').click();
      cy.get('#new-tournament-name').type(tournamentName);
      
      playersToSelect.forEach(player => {
        cy.get('#add-player-input').type(player.name);
        cy.get('.autocomplete-suggestion').contains(player.name).click();
      });

      cy.get('button').contains('Vytvořit Turnaj').click();
      cy.wait('@postData'); // Wait for the POST to happen

      // Assert that the new tournament appears on the main screen
      cy.get('#tournaments-list-container').should('contain.text', tournamentName);
    });
  });
});

describe('Správa databáze hráčů', () => {
  beforeEach(() => {
    // Mock the initial data load
    cy.intercept('GET', 'api.php', { fixture: 'initialData.json' }).as('getData');
    cy.visit('index.html');
    cy.wait('@getData');
    // Navigate to the player database screen
    cy.get('[data-action="toggle-settings-menu"]').click();
    cy.get('[data-action="show-player-db"]').click();
  });

  it('dokáže přidat nového hráče', () => {
    const newPlayerName = `Hráč ${Date.now()}`;

    // Mock the POST request for saving a new player
    cy.intercept('POST', 'api.php', (req) => {
      if (req.body.action === 'savePlayer') {
        req.reply({
          // We don't need a complex response, just success
          success: true 
        });
      }
    }).as('savePlayer');
    
    // Test steps
    cy.get('[data-action="show-edit-player-modal"][data-id="new"]').click();
    cy.get('#player-name').type(newPlayerName);
    cy.get('[data-action="save-player"]').click();
    cy.wait('@savePlayer');

    // For the test, we'll just check if the modal closes, 
    // as the UI update depends on a fresh data load which we are not mocking here.
    cy.get('#edit-player-modal').should('not.exist');
  });

  it('dokáže upravit existujícího hráče', () => {
    const editedPlayerName = 'Honza Novotný';
    
    cy.intercept('POST', 'api.php', { success: true }).as('savePlayer');
    
    // Click edit on the first player ('Honza')
    cy.get('[data-action="show-edit-player-modal"][data-id="1"]').click();
    
    cy.get('#player-name').clear().type(editedPlayerName);
    cy.get('[data-action="save-player"]').click();
    cy.wait('@savePlayer');

    cy.get('#edit-player-modal').should('not.exist');
  });

  it('dokáže smazat hráče', () => {
    cy.intercept('POST', 'api.php', { success: true }).as('deletePlayer');
    
    // Click delete on the second player ('Pavel')
    cy.get('[data-action="delete-player"][data-id="2"]').click();
    
    // Cypress automatically handles the confirm dialog
    cy.wait('@deletePlayer').its('request.body').should('deep.include', {
      action: 'deletePlayer',
      payload: { id: 2 }
    });
  });
});

describe('Průběh turnaje', () => {
  it('lze odehrát zápas, zadat skóre a uložit výsledek', () => {
    // We combine mocking from previous tests
    cy.fixture('initialData.json').then((initialData) => {
      const players = initialData.playerDatabase.slice(0, 2);
      const tournamentName = 'Turnaj k rozehrání';
      const tournamentData = {
        ...initialData,
        tournaments: [{
            id: 1, name: tournamentName, points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
            playerIds: players.map(p => parseInt(p.id)),
            matches: [{ id: '1-2-mock', player1_id: '1', player2_id: '2', score1: '0', score2: '0', completed: '0' }]
        }]
      };
      
      // Mock initial load with a pre-existing tournament
      cy.intercept('GET', 'api.php', tournamentData).as('getData');
      
      // Mock all subsequent POST updates for the match
      cy.intercept('POST', 'api.php', { success: true }).as('updateMatch');

      cy.visit('index.html');
      cy.wait('@getData');

      // --- Test Steps ---
      // 1. Open the tournament
      cy.contains('#tournaments-list-container .bg-white', tournamentName).find('[data-action="open-tournament"]').click();

      // 2. Start the first match
      cy.get('[data-action="play-match"]').click();

      // 3. Select first server
      cy.get('[data-action="set-first-server"][data-player="1"]').click();
      cy.wait('@updateMatch');

      // 4. Play the match - click 11 times for player 1 to win
      for (let i = 0; i < 11; i++) {
        cy.get('[data-action="add-point"][data-player="1"]').click();
      }
      cy.wait('@updateMatch'); // Wait for the final score update

      // 5. Check winner announcement and save
      cy.contains('Vítěz: Honza!').should('be.visible');
      cy.get('[data-action="save-match-result"]').click();
      cy.wait('@updateMatch');

      // 6. Close the results modal
      cy.get('[data-action="close-and-home"]').click(); 
      
      // 7. Verify the main screen shows the winner
      cy.get('#tournaments-list-container').should('contain.text', 'Vítěz: Honza');
    });
  });
});

describe('Správa existujícího turnaje', () => {
  it('umožňuje upravit výsledek dokončeného zápasu', () => {
    // 1. Setup: Prepare two versions of data: "before" and "after" the edit.
    cy.fixture('initialData.json').then((initialData) => {
      const dataBeforeEdit = {
        ...initialData,
        tournaments: [{
          id: 1, name: 'Dokončený turnaj', points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
          playerIds: [1, 2],
          matches: [{ id: '1-2-mock', player1_id: '1', player2_id: '2', score1: '11', score2: '5', completed: '1' }]
        }]
      };
      const dataAfterEdit = {
        ...initialData,
        tournaments: [{
          id: 1, name: 'Dokončený turnaj', points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
          playerIds: [1, 2],
          matches: [{ id: '1-2-mock', player1_id: '1', player2_id: '2', score1: '11', score2: '9', completed: '1' }]
        }]
      };
      
      // 2. Intercept the initial GET with "before" data
      cy.intercept('GET', 'api.php', dataBeforeEdit).as('getData');
      
      // 3. Intercept the POST and reply with "after" data
      cy.intercept('POST', 'api.php', (req) => {
        if (req.body.action === 'updateMatch') {
          req.reply(dataAfterEdit);
        }
      }).as('updateMatch');

      cy.visit('index.html');
      cy.wait('@getData');

      // 4. Open the tournament
      cy.get('[data-action="open-tournament"]').click();

      // 5. Click the edit button and change the score
      cy.get('#completed-matches-container [data-action="edit-match"]').click();
      cy.get('input#edit-score2').clear().type('9');
      cy.get('[data-action="save-edited-match"]').click();
      cy.wait('@updateMatch');

      // 6. Assert that the new score is visible on the page
      cy.get('#completed-matches-container').should('contain.text', '11 : 9');
    });
  });

  it('umožňuje zamknout a odemknout turnaj z hlavní obrazovky', () => {
    // 1. Setup: Load a single, unlocked tournament
    cy.fixture('initialData.json').then((initialData) => {
      const tournamentData = {
        ...initialData,
        tournaments: [{
          id: 1, name: 'Testovací turnaj', points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
          playerIds: [1, 2],
          matches: []
        }]
      };
      
      cy.intercept('GET', 'api.php', tournamentData).as('getData');
      cy.intercept('POST', 'api.php', { success: true }).as('toggleLock');

      cy.visit('index.html');
      cy.wait('@getData');

      // 2. Assert the tournament is initially unlocked (action button is visible)
      cy.get('[data-action="open-tournament"]').should('be.visible');
      cy.get('[data-action="toggle-lock-main"]').should('contain.text', '🔓');

      // 3. Lock the tournament
      cy.get('[data-action="toggle-lock-main"]').click();
      cy.wait('@toggleLock');

      // 4. Assert the tournament is locked (action button is gone, icon changed)
      cy.get('[data-action="open-tournament"]').should('not.exist');
      cy.get('[data-action="toggle-lock-main"]').should('contain.text', '🔒');
      
      // 5. Unlock the tournament
      cy.get('[data-action="toggle-lock-main"]').click();
      cy.wait('@toggleLock');

      // 6. Assert the tournament is unlocked again
      cy.get('[data-action="open-tournament"]').should('be.visible');
      cy.get('[data-action="toggle-lock-main"]').should('contain.text', '🔓');
    });
  });
});

describe('Přerušení a pokračování v zápase', () => {
  it('umožňuje přerušit zápas a později v něm pokračovat se správným skóre', () => {
    // 1. Setup: A tournament with one match ready to be played
    cy.fixture('initialData.json').then((initialData) => {
      const tournamentData = {
        ...initialData,
        tournaments: [{
          id: 1, name: 'Rozehraný turnaj', points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
          playerIds: [1, 2],
          matches: [{ id: '1-2-mock', player1_id: '1', player2_id: '2', score1: '0', score2: '0', completed: '0' }]
        }]
      };
      
      cy.intercept('GET', 'api.php', tournamentData).as('getData');
      cy.intercept('POST', 'api.php', { success: true }).as('updateMatch');

      cy.visit('index.html');
      cy.wait('@getData');

      // 2. Start the match and set a score
      cy.get('[data-action="open-tournament"]').click();
      cy.get('[data-action="play-match"]').click();
      cy.get('[data-action="set-first-server"][data-player="1"]').click();
      
      // Click multiple times, re-querying the element each time
      for (let i = 0; i < 3; i++) {
        cy.get('[data-action="add-point"][data-player="1"]').click();
      }
      for (let i = 0; i < 2; i++) {
        cy.get('[data-action="add-point"][data-player="2"]').click();
      }
      cy.wait('@updateMatch');

      // 3. Suspend the match - be specific about which button to click
      cy.get('#game-screen [data-action="back-to-tournament"]').click();

      // 4. Verify the score is visible on the tournament screen
      cy.get('#upcoming-matches-container').should('contain.text', '3 : 2');
      cy.get('[data-action="play-match"] .fa-clock-rotate-left').should('be.visible');

      // 5. Resume the match
      cy.get('[data-action="play-match"]').click();

      // 6. Verify the game board shows the correct score
      cy.get('.player-score-box').first().should('contain.text', '3');
      cy.get('.player-score-box').last().should('contain.text', '2');
    });
  });
});

describe('Přidání hráče do existujícího turnaje', () => {
  it('správně přidá hráče a přegeneruje zápasy', () => {
    // 1. Setup: A tournament with two players
    cy.fixture('initialData.json').then((initialData) => {
      const tournamentData = {
        ...initialData,
        tournaments: [{
          id: 1, name: 'Turnaj pro rozšíření', points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
          playerIds: [1, 2],
          matches: [{ id: '1-2-mock', player1_id: '1', player2_id: '2', score1: '0', score2: '0', completed: '0' }]
        }]
      };
      
      const playerToAdd = initialData.playerDatabase[2]; // Tomáš

      // Prepare the data that the app should receive *after* the update
      const dataAfterUpdate = {
         ...tournamentData,
         tournaments: [{
            ...tournamentData.tournaments[0],
            playerIds: [1, 2, 3], // Added Tomáš
            // The app will regenerate matches, let's simulate that
            matches: [
              { id: '1-2-mock', player1_id: '1', player2_id: '2', score1: '0', score2: '0', completed: '0' },
              { id: '1-3-mock', player1_id: '1', player2_id: '3', score1: '0', score2: '0', completed: '0' },
              { id: '2-3-mock', player1_id: '2', player2_id: '3', score1: '0', score2: '0', completed: '0' }
            ]
         }]
      };
      
      cy.intercept('GET', 'api.php', tournamentData).as('getData');
      cy.intercept('POST', 'api.php', dataAfterUpdate).as('updateTournament');

      cy.visit('index.html');
      cy.wait('@getData');
      
      // 2. Open the tournament and go to settings
      cy.get('[data-action="open-tournament"]').click();
      cy.get('[data-action="show-settings-modal"]').click();

      // 3. Add the new player
      cy.get('#add-player-input-settings').type(playerToAdd.name);
      cy.get('#autocomplete-container-settings .autocomplete-suggestion').contains(playerToAdd.name).click();
      
      // 4. Save settings
      cy.get('[data-action="save-settings"]').click();
      cy.wait('@updateTournament');

      // 5. Verify new matches with the added player are now displayed
      cy.get('#upcoming-matches-container').should('contain.text', playerToAdd.name);
      cy.get('#upcoming-matches-container').should('contain.text', 'Honza'); // Check one of the original players too
    });
  });
});

describe('Prohození stran', () => {
  it('umožňuje prohodit strany hráčů v nadcházejícím zápase', () => {
    // 1. Setup: A tournament with one match
    cy.fixture('initialData.json').then((initialData) => {
      const tournamentData = {
        ...initialData,
        tournaments: [{
          id: 1, name: 'Turnaj pro prohození', points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
          playerIds: [1, 2],
          matches: [{ id: 10, entity_id: 10, player1_id: '1', player2_id: '2', score1: '0', score2: '0', completed: '0', match_order: 0, sides_swapped: 0 }]
        }]
      };
      
      cy.intercept('GET', 'api.php', tournamentData).as('getData');
      cy.intercept('POST', 'api.php', { success: true }).as('swapSides');

      cy.visit('index.html');
      cy.wait('@getData');
      
      // 2. Open the tournament
      cy.get('[data-action="open-tournament"]').click();

      // 3. Verify initial state (Honza is on the left)
      cy.get('#upcoming-matches-container .w-2\\/5').first().should('contain.text', 'Honza');

      // 4. Click the swap button
      cy.get('[data-action="swap-sides"]').click();
      
      // 5. Verify the API call was made
      cy.wait('@swapSides').its('request.body.payload').should('deep.equal', { matchId: 10 });

      // 6. Verify visual swap (Pavel is now on the left)
      cy.get('#upcoming-matches-container .w-2\\/5').first().should('contain.text', 'Pavel');
    });
  });
});

describe('Řazení zápasů', () => {
  it('umožňuje změnit pořadí nadcházejících zápasů', () => {
    // 1. Setup: A tournament with 3 players (3 matches)
    cy.fixture('initialData.json').then((initialData) => {
      const tournamentData = {
        ...initialData,
        tournaments: [{
          id: 1, name: 'Turnaj pro řazení', points_to_win: 11, is_locked: '0', createdAt: new Date().toISOString(),
          playerIds: [1, 2, 3],
          matches: [
            { id: 10, entity_id: 10, player1_id: '1', player2_id: '2', score1: '0', score2: '0', completed: '0', match_order: 0 },
            { id: 11, entity_id: 11, player1_id: '1', player2_id: '3', score1: '0', score2: '0', completed: '0', match_order: 1 },
            { id: 12, entity_id: 12, player1_id: '2', player2_id: '3', score1: '0', score2: '0', completed: '0', match_order: 2 }
          ]
        }]
      };
      
      cy.intercept('GET', 'api.php', tournamentData).as('getData');
      cy.intercept('POST', 'api.php', { success: true }).as('reorderMatches');

      cy.visit('index.html');
      cy.wait('@getData');
      
      // 2. Open the tournament
      cy.get('[data-action="open-tournament"]').click();

      // 3. Check initial order - check for player names individually
      cy.get('#upcoming-matches-container .bg-white').first().within(() => {
        cy.contains('Honza');
        cy.contains('Pavel');
      });

      // 4. Move the first match down
      cy.get('#upcoming-matches-container .bg-white').first().find('[data-action="move-match"][data-dir="down"]').click();
      
      // 5. Verify the API call was made with the correct new order
      cy.wait('@reorderMatches').its('request.body.payload.matchIds').should('deep.equal', [11, 10, 12]);

      // 6. Verify the visual order has changed
      cy.get('#upcoming-matches-container .bg-white').first().within(() => {
        cy.contains('Honza');
        cy.contains('Tomáš');
      });
    });
  });
});