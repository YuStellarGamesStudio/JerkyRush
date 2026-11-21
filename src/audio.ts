import { config } from './config';
import type { FoodKind } from './game/spawner';

let context: AudioContext | undefined;

/** 只能在使用者手勢（點擊、按鍵）的處理函式內呼叫，避免嘗試自動播放。 */
export function unlockAudio(): void {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch (error) {
    console.warn('無法啟用音訊，遊戲將靜音進行。', error);
  }
}

/** 以振盪器與共振峰濾波合成「喵～」，不需要外部音檔（R9）。 */
export function playMeow(): void {
  if (context?.state !== 'running') return;
  const { volume, seconds } = config.sound.meow;
  const now = context.currentTime;
  const end = now + seconds;

  const voice = context.createOscillator();
  voice.type = 'sawtooth';
  voice.frequency.setValueAtTime(560, now);
  voice.frequency.linearRampToValueAtTime(820, now + seconds * 0.3);
  voice.frequency.exponentialRampToValueAtTime(440, end);

  // 共振峰由「咪」張開到「喔」，聽起來像貓叫而不是蜂鳴。
  const mouth = context.createBiquadFilter();
  mouth.type = 'bandpass';
  mouth.Q.value = 3;
  mouth.frequency.setValueAtTime(900, now);
  mouth.frequency.linearRampToValueAtTime(1800, now + seconds * 0.35);
  mouth.frequency.exponentialRampToValueAtTime(700, end);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.05);
  gain.gain.setValueAtTime(volume, now + seconds * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  voice.connect(mouth).connect(gain).connect(context.destination);
  voice.start(now);
  voice.stop(end + 0.02);
}

/** 接到食物的「啵」聲；越值錢音越多、越高，一聽就知道接到什麼。 */
const CATCH_NOTES: Record<FoodKind, readonly number[]> = {
  small: [880],
  'orange-small': [988],
  big: [784, 1175],
  can: [784, 1175, 1568],
};

export function playCatch(kind: FoodKind): void {
  if (context?.state !== 'running') return;
  const { volume, noteSeconds } = config.sound.catch;
  const start = context.currentTime;
  CATCH_NOTES[kind].forEach((frequency, index) => {
    const at = start + index * noteSeconds * 0.6;
    const end = at + noteSeconds;
    const tone = context!.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(frequency, at);
    tone.frequency.exponentialRampToValueAtTime(frequency * 1.5, end);
    const gain = context!.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    tone.connect(gain).connect(context!.destination);
    tone.start(at);
    tone.stop(end + 0.02);
  });
}
