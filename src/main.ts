import { playCatch, playMeow, unlockAudio } from './audio';
import { config } from './config';
import { startEngine, type EngineView } from './engine-adapter';
import { gradeFor, type Counts } from './game/scoring';
import { Round, type Mode } from './game/state';
import { detectLocale, isLocale, localeNames, locales, messages, type Messages } from './i18n';
import { loadLocale, loadSave, recordRound, saveLocale } from './save';
import './style.css';

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#game');
const panel = $<HTMLElement>('.panel');
const panelTitle = $('#panel-title');
const rules = $('#rules');
const result = $('#result');
const record = $('#record');
const button = $<HTMLButtonElement>('.panel button');
const languageSelect = $<HTMLSelectElement>('#language');
const hud = { score: $('#score'), lives: $('#lives'), time: $('#time'), counts: $('#counts') };

const round = new Round({
  onCatch: playCatch,
  onOrangeCatAppear: playMeow,
});
const keys = new Set<string>();
const movementKeys: Record<string, true> = { KeyA: true, KeyD: true, ArrowLeft: true, ArrowRight: true };
const { scores } = config.items;
let locale = loadLocale() ?? detectLocale(navigator.languages);
let t: Messages = messages[locale];
let engine: EngineView | undefined;
let saved = loadSave();
let newBest = false;
let displayedMode: Mode | undefined;
let displayedHud = '';

function renderCounts(target: HTMLElement, counts: Counts): void {
  target.innerHTML = [
    [t.countSmall, counts.small], [t.countBig, counts.big], [t.countCan, counts.can],
    [t.countOrange, counts.orange], [t.countChili, counts.chiliHits],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function renderPanel(): void {
  panel.hidden = round.mode === 'playing';
  rules.hidden = round.mode !== 'menu';
  result.hidden = round.mode !== 'result' && round.mode !== 'fail';
  record.hidden = round.mode === 'paused';
  record.textContent = (newBest && !result.hidden ? t.newRecord : '') + t.record(saved.bestScore, saved.totalRounds);

  if (round.mode === 'menu') {
    panelTitle.textContent = t.ready;
    button.textContent = t.start;
  } else if (round.mode === 'paused') {
    panelTitle.textContent = t.paused;
    button.textContent = t.resume;
  } else if (round.mode === 'result' || round.mode === 'fail') {
    panelTitle.textContent = round.mode === 'fail' ? t.outOfLives : t.timeUp;
    $('#final-score').textContent = String(round.score);
    $('#grade').textContent = gradeFor(round.score);
    renderCounts($('#result-counts'), round.counts);
    button.textContent = t.playAgain;
  }
}

function renderHud(): void {
  const { counts } = round;
  const state = [round.score, round.lives, Math.ceil(round.timeLeft),
    counts.small, counts.big, counts.can, counts.orange, counts.chiliHits].join();
  if (state !== displayedHud) {
    displayedHud = state;
    hud.score.textContent = String(round.score);
    hud.lives.textContent = '♥'.repeat(round.lives) + '♡'.repeat(config.lives - round.lives);
    hud.lives.setAttribute('aria-label', t.livesLeft(round.lives));
    hud.time.textContent = t.seconds(Math.ceil(round.timeLeft));
    renderCounts(hud.counts, counts);
  }
  if (round.mode !== displayedMode) {
    displayedMode = round.mode;
    if (round.mode === 'result' || round.mode === 'fail') {
      const previousBest = saved.bestScore;
      saved = recordRound(round.score);
      newBest = round.score > previousBest;
    }
    renderPanel();
  }
}

/** 套用目前語言到所有靜態與動態文字。 */
function applyLocale(): void {
  document.documentElement.lang = locale;
  document.title = t.documentTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.description);
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const text = t[element.dataset.i18n as keyof Messages];
    if (typeof text === 'string') element.textContent = text;
  }
  canvas.setAttribute('aria-label', t.canvasLabel);
  rules.innerHTML = [
    t.rulePoints(scores.small, scores.big, scores.can),
    t.ruleRound(config.roundSeconds, config.lives),
    t.ruleHelpers,
  ].map((line) => `<li>${line}</li>`).join('');
  languageSelect.value = locale;
  displayedHud = '';
  renderHud();
  renderPanel();
}

languageSelect.innerHTML = locales
  .map((code) => `<option value="${code}" lang="${code}">${localeNames[code]}</option>`).join('');
languageSelect.addEventListener('change', () => {
  if (!isLocale(languageSelect.value)) return;
  locale = languageSelect.value;
  t = messages[locale];
  saveLocale(locale);
  applyLocale();
  void engine?.setMeowText(t.meow);
  // 交還焦點，避免方向鍵繼續切換選單。
  languageSelect.blur();
});

function isDown(primary: string, alternate: string): number {
  return Number(keys.has(primary) || keys.has(alternate));
}

function advance(dt: number): void {
  round.advance(dt, isDown('KeyD', 'ArrowRight') - isDown('KeyA', 'ArrowLeft'));
  renderHud();
}

button.addEventListener('click', () => {
  // 使用者手勢內才建立音訊（安全規則 3）。
  unlockAudio();
  keys.clear();
  if (round.mode === 'paused') round.togglePause();
  else round.start();
  renderHud();
});

window.addEventListener('keydown', (event) => {
  // 語言選單有焦點時保留原生鍵盤操作。
  if (event.target === languageSelect) return;
  if (movementKeys[event.code]) {
    event.preventDefault();
    if (round.mode === 'playing') keys.add(event.code);
  } else if (event.code === 'KeyP' || event.code === 'Escape') {
    if (round.mode !== 'playing' && round.mode !== 'paused') return;
    event.preventDefault();
    if (event.repeat) return;
    keys.clear();
    round.togglePause();
    renderHud();
    if (round.mode === 'paused') button.focus();
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => {
  keys.clear();
  if (round.mode === 'playing') {
    round.togglePause();
    renderHud();
  }
});

applyLocale();
const startupMeow = t.meow;
void startEngine(canvas, round, advance, startupMeow).then((view) => {
  engine = view;
  if (t.meow !== startupMeow) void view.setMeowText(t.meow);
  button.disabled = false;
  button.focus();
}).catch((error: unknown) => {
  panelTitle.textContent = t.startupFailed;
  console.error(error);
});
