// Globální setup pro testy
import { vi } from 'vitest';

// Mock pro SpeechSynthesis API
global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [])
};

// Mock pro AudioContext
global.AudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0 }
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 0 }
  })),
  destination: {}
}));

// Mock pro fetch API
global.fetch = vi.fn();

// Mock pro window.location
delete window.location;
window.location = { href: 'http://localhost' };

