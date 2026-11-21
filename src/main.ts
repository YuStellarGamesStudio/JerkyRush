import { playMeow, unlockAudio } from './audio';
import { config } from './config';
import { startEngine } from './engine-adapter';
import { gradeFor, type Counts } from './game/scoring';
import { Round, type Mode } from './game/state';
import { loadSave, recordRound } from './save';
import './style.css';

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#game');
const panel = $<HTMLElement>('.panel');
const panelTitle = $('#panel-title');
const rules = $('#rules');
const result = $('#result');
const record = $('#record');
const button = $<HTMLButtonElement>('.panel button');
const hud = { score: $('#score'), lives: $('#lives'), time: $('#time'), counts: $('#counts') };

const round = new Round({ onOrangePickup: playMeow });
const keys = new Set<string>();
const movementKeys: Record<string, true> = {
  KeyW: true, KeyA: true, KeyS: true, KeyD: true,
  ArrowUp: true, ArrowDown: true, ArrowLeft: true, ArrowRight: true,
};
const { scores } = config.items;
let saved = loadSave();
let displayedMode: Mode | undefined;
let displayedHud = '';

rules.innerHTML = [
  `小魚干 ${scores.small}・大魚干 ${scores.big}・魚罐頭 ${scores.can} 分`,
  `${config.roundSeconds} 秒、${config.lives} 條命；辣椒會讓任一隻貓扣一條命`,
  `灰貓會幫忙撿小魚干，橘色小魚干會叫出橘貓`,
].map((line) => `<li>${line}</li>`).join('');

function renderCounts(target: HTMLElement, counts: Counts): void {
  target.innerHTML = [
    ['小魚干', counts.small], ['大魚干', counts.big], ['魚罐頭', counts.can],
    ['橘色小魚干', counts.orange], ['碰到辣椒', counts.chiliHits],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function renderRecord(newBest = false): void {
  record.textContent = `${newBest ? '新紀錄！' : ''}最佳分數 ${saved.bestScore}・已玩 ${saved.totalRounds} 回合`;
}

function renderPanel(): void {
  panel.hidden = round.mode === 'playing';
  rules.hidden = round.mode !== 'menu';
  result.hidden = round.mode !== 'result' && round.mode !== 'fail';
  record.hidden = round.mode === 'paused';

  if (round.mode === 'menu') {
    renderRecord();
  } else if (round.mode === 'paused') {
    panelTitle.textContent = '已暫停';
    button.textContent = '繼續';
  } else if (round.mode === 'result' || round.mode === 'fail') {
    const previousBest = saved.bestScore;
    saved = recordRound(round.score);
    panelTitle.textContent = round.mode === 'fail' ? '生命耗盡' : '時間到！';
    $('#final-score').textContent = String(round.score);
    $('#grade').textContent = gradeFor(round.score);
    renderCounts($('#result-counts'), round.counts);
    renderRecord(round.score > previousBest);
    button.textContent = '再玩一次';
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
    hud.lives.setAttribute('aria-label', `剩 ${round.lives} 條命`);
    hud.time.textContent = `${Math.ceil(round.timeLeft)} 秒`;
    renderCounts(hud.counts, counts);
  }
  if (round.mode !== displayedMode) {
    displayedMode = round.mode;
    renderPanel();
  }
}

function isDown(primary: string, alternate: string): number {
  return Number(keys.has(primary) || keys.has(alternate));
}

function advance(dt: number): void {
  round.advance(dt,
    isDown('KeyD', 'ArrowRight') - isDown('KeyA', 'ArrowLeft'),
    isDown('KeyS', 'ArrowDown') - isDown('KeyW', 'ArrowUp'));
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

renderHud();
void startEngine(canvas, round, advance).then(() => {
  button.disabled = false;
  button.focus();
}).catch((error: unknown) => {
  panelTitle.textContent = '無法啟動遊戲，請重新整理。';
  console.error(error);
});
