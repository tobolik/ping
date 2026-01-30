// Audio a voice funkce
import { state } from './state.js';

let audioContext;
let synth = window.speechSynthesis;

export function initializeAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

export function playSound(playerIndex) {
    if (!state.settings.soundsEnabled || !audioContext) return;
    if (audioContext.state === 'suspended') { audioContext.resume(); }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode); gainNode.connect(audioContext.destination);
    const frequency = playerIndex === 1 ? 880 : 659.25;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime); oscillator.stop(audioContext.currentTime + 0.1);
}

export function speak(text, force = false) {
    if ((!state.settings.voiceAssistEnabled && !force) || !synth) return;
    // Zrušíme předchozí výstup, pokud nějaký je, aby se zprávy nekumulovaly
    synth.cancel();
    let utterance = new SpeechSynthesisUtterance(text); // Vytvoříme novou instanci pro každou hlášku
    utterance.lang = 'cs-CZ';
    utterance.volume = state.settings.voiceVolume !== undefined ? state.settings.voiceVolume : 1;
    synth.speak(utterance);
}
