import { config } from './config';

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
  const { volume, seconds } = config.meow;
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
