/**
 * Paytm Soundbox Audio Synthesizer
 * 
 * Generates the iconic dual-frequency chime using the Web Audio API
 * followed by a natural Hindi/Indian speech synthesis announcement.
 * Works 100% in-browser with zero external audio assets required.
 */

export function playPaytmSoundboxChime(announcementText?: string) {
  if (typeof window === 'undefined') return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Soundbox iconic two-tone chime
    const now = ctx.currentTime;
    
    // Tone 1: 784 Hz (G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: 1046.5 Hz (C6) - Higher affirmative tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.15);
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);

    // Speech announcement after chime
    if (announcementText && window.speechSynthesis) {
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(announcementText);
          const voices = window.speechSynthesis.getVoices();
          const inVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN'));
          if (inVoice) utterance.voice = inVoice;
          utterance.rate = 1.0;
          utterance.pitch = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech error:', e);
        }
      }, 400);
    }
  } catch (err) {
    console.warn('Soundbox audio error:', err);
  }
}

export function playPaytmPaymentReceived(rupees: number) {
  playPaytmSoundboxChime(`Paytm par ${Math.round(rupees)} rupaye prapt hue`);
}

export function playPaytmPayoutSent(rupees: number, recipient: string) {
  playPaytmSoundboxChime(`Paytm payouts dwara ${recipient} ko ${Math.round(rupees)} rupaye safaltapoorvak bheje gaye`);
}

export function playPaytmSettlementCompleted(rupees: number) {
  playPaytmSoundboxChime(`Paytm instant settlement safal raha, ${Math.round(rupees)} rupaye purchasing budget me jama hue`);
}
