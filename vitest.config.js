import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testovací prostředí
    environment: 'jsdom', // Pro testování DOM API
    
    // Globální setup
    setupFiles: ['./tests/setup.js'],
    
    // Pokrytí kódu
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'cypress/',
        '*.config.js',
        'api.php',
        'config/'
      ]
    },
    
    // Globální proměnné
    globals: true,
    
    // Ignorovat soubory
    exclude: [
      '**/node_modules/**',
      '**/cypress/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**'
    ]
  }
});

