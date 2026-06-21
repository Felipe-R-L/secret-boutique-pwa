// Som de notificação sintetizado via Web Audio API — evita depender de um
// arquivo .mp3 e funciona offline. Navegadores bloqueiam áudio até haver uma
// interação do usuário, então `primeAudio()` deve ser chamado em um gesto
// (clique/toque) para "destravar" o AudioContext.

let audioCtx: AudioContext | null = null;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctor =
    window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

/** Chame dentro de um gesto do usuário para liberar o áudio. */
export function primeAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/** Toca um "ding" curto de dois tons. Seguro de chamar a qualquer momento. */
export function playNotificationSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  // Envelope suave para não estourar.
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

  const tones = [
    { freq: 880, start: 0, dur: 0.18 },
    { freq: 1320, start: 0.16, dur: 0.32 },
  ];

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = tone.freq;
    osc.connect(master);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.dur);
  }
}
