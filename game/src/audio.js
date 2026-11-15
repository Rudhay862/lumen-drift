// Synthesised sound, no audio files: a tiny WebAudio voice that blips on pickup, thuds on
// a hit, sweeps on a pulse and plays a short fanfare on a win. Created lazily on the first
// user gesture, so a silent screenshot run never touches the audio hardware.

export function createAudio() {
  let context = null;
  let master = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq, freqEnd, duration, type, volume, when = 0 }) {
    if (!ensure()) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function pickup(multiplier) {
    const base = 520 * (1 + (multiplier - 1) * 0.09);
    tone({ freq: base, freqEnd: base * 1.5, duration: 0.12, type: 'sine', volume: 0.5 });
    tone({ freq: base * 2, duration: 0.08, type: 'triangle', volume: 0.18, when: 0.02 });
  }

  function golden() {
    [660, 880, 1320].forEach((freq, i) => {
      tone({ freq, duration: 0.16, type: 'triangle', volume: 0.35, when: i * 0.06 });
    });
  }

  function hit() {
    tone({ freq: 160, freqEnd: 45, duration: 0.28, type: 'sawtooth', volume: 0.5 });
    tone({ freq: 70, freqEnd: 30, duration: 0.3, type: 'square', volume: 0.25 });
  }

  function pulse() {
    tone({ freq: 300, freqEnd: 900, duration: 0.22, type: 'sine', volume: 0.35 });
  }

  function win() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      tone({ freq, duration: 0.3, type: 'triangle', volume: 0.4, when: i * 0.11 });
    });
  }

  function lose() {
    [392, 330, 262].forEach((freq, i) => {
      tone({ freq, freqEnd: freq * 0.9, duration: 0.3, type: 'sine', volume: 0.35, when: i * 0.14 });
    });
  }

  return { ensure, pickup, golden, hit, pulse, win, lose };
}
