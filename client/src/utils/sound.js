// Zero-dependency procedural sound generator using Web Audio API
// Produces authentic, warm tactile chess sounds without external audio assets.

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;

    try {
      const stored = localStorage.getItem('chess_sound_enabled');
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    } catch {
      this.enabled = true;
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('chess_sound_enabled', String(this.enabled));
    } catch {
      // Ignore storage errors
    }
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  playMove() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Primary piece thud (low-frequency resonance)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);

      // Subtle surface contact tap
      const tap = this.ctx.createOscillator();
      const tapGain = this.ctx.createGain();

      tap.type = 'sine';
      tap.frequency.setValueAtTime(320, now);
      tap.frequency.exponentialRampToValueAtTime(80, now + 0.04);

      tapGain.gain.setValueAtTime(0.18, now);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      tap.connect(tapGain);
      tapGain.connect(this.ctx.destination);

      tap.start(now);
      tap.stop(now + 0.04);
    } catch {
      // Fallback silently if audio fails
    }
  }

  playCapture() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Snappier, higher-impact capture click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);

      // Wood click transient
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();

      click.type = 'square';
      click.frequency.setValueAtTime(480, now);
      click.frequency.exponentialRampToValueAtTime(120, now + 0.03);

      clickGain.gain.setValueAtTime(0.12, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      click.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      click.start(now);
      click.stop(now + 0.03);
    } catch {
      // Fallback silently
    }
  }

  playCheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Two-tone bell warning
      [587.33, 880].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + i * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {
      // Fallback silently
    }
  }

  playGameEnd(isWin) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = isWin ? [523.25, 659.25, 783.99, 1046.5] : [440, 392, 349.23, 293.66];

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch {
      // Fallback silently
    }
  }
}

export const sound = new SoundManager();
