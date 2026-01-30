import { describe, it, expect } from 'vitest';
import { generateUniqueTournamentName } from '../../js/utils/tournament-utils.js';

/**
 * Testy pro generateUniqueTournamentName funkci
 * Funkce je pure function - přijímá existingNames jako parametr.
 */
describe('generateUniqueTournamentName', () => {
    describe('základní funkcionalita', () => {
        it('should return base name if not exists in empty list', () => {
            const result = generateUniqueTournamentName('Turnaj', []);
            expect(result).toBe('Turnaj');
        });
        
        it('should return base name if not exists', () => {
            const existing = ['Jiný turnaj', 'Další turnaj'];
            const result = generateUniqueTournamentName('Turnaj', existing);
            expect(result).toBe('Turnaj');
        });
        
        it('should add number if name exists', () => {
            const existing = ['Turnaj'];
            const result = generateUniqueTournamentName('Turnaj', existing);
            expect(result).toBe('Turnaj (2)');
        });
        
        it('should find next available number', () => {
            const existing = ['Turnaj', 'Turnaj (2)', 'Turnaj (3)'];
            const result = generateUniqueTournamentName('Turnaj', existing);
            expect(result).toBe('Turnaj (4)');
        });
        
        it('should find smallest available number (gap filling)', () => {
            const existing = ['Turnaj', 'Turnaj (3)', 'Turnaj (5)'];
            const result = generateUniqueTournamentName('Turnaj', existing);
            expect(result).toBe('Turnaj (2)');
        });
    });

    describe('čištění názvu s číslem', () => {
        it('should remove existing number from base name', () => {
            const existing = ['Turnaj', 'Turnaj (2)'];
            const result = generateUniqueTournamentName('Turnaj (2)', existing);
            expect(result).toBe('Turnaj (3)');
        });
        
        it('should handle name with number and find next', () => {
            const existing = ['Turnaj (2)'];
            const result = generateUniqueTournamentName('Turnaj (2)', existing);
            expect(result).toBe('Turnaj (3)');
        });
    });

    describe('vyloučení turnaje', () => {
        it('should exclude tournament by ID when using objects', () => {
            const existing = [
                { id: 1, name: 'Turnaj' },
                { id: 2, name: 'Turnaj (2)' }
            ];
            const result = generateUniqueTournamentName('Turnaj', existing, 1);
            expect(result).toBe('Turnaj'); // Protože 'Turnaj' s id=1 je vyloučen
        });
        
        it('should not exclude when excludeTournamentId is null', () => {
            const existing = ['Turnaj'];
            const result = generateUniqueTournamentName('Turnaj', existing, null);
            expect(result).toBe('Turnaj (2)');
        });
    });

    describe('speciální případy', () => {
        it('should handle date in name', () => {
            const existing = ['Turnaj 20. 11. 2025'];
            const result = generateUniqueTournamentName('Turnaj 20. 11. 2025', existing);
            expect(result).toBe('Turnaj 20. 11. 2025 (2)');
        });
        
        it('should handle special characters in name', () => {
            const existing = ['Turnaj (test)'];
            const result = generateUniqueTournamentName('Turnaj (test)', existing);
            expect(result).toBe('Turnaj (test) (2)');
        });
        
        it('should handle empty base name', () => {
            const existing = [];
            const result = generateUniqueTournamentName('', existing);
            expect(result).toBe('');
        });
        
        it('should handle whitespace in base name', () => {
            const existing = ['  Turnaj  '];
            const result = generateUniqueTournamentName('  Turnaj  ', existing);
            expect(result).toBe('Turnaj (2)');
        });
    });

    describe('edge cases', () => {
        it('should handle very large numbers', () => {
            const existing = Array.from({ length: 100 }, (_, i) => 
                i === 0 ? 'Turnaj' : `Turnaj (${i + 1})`
            );
            const result = generateUniqueTournamentName('Turnaj', existing);
            expect(result).toBe('Turnaj (101)');
        });
        
        it('should handle mixed string and object names', () => {
            const existing = [
                'Turnaj',
                { id: 2, name: 'Turnaj (2)' },
                'Turnaj (3)'
            ];
            const result = generateUniqueTournamentName('Turnaj', existing);
            expect(result).toBe('Turnaj (4)');
        });
    });
});
