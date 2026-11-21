import { config } from '../config';

export type OrangeCatState = 'idle' | 'entering' | 'holding' | 'leaving';

/** 純表演實體：不參與碰撞，也不影響分數、生命與計時（R6）。 */
export class OrangeCat {
  state: OrangeCatState = 'idle';
  /** 0＝完全藏在邊緣外，1＝完全跳出。 */
  shown = 0;
  /** 觸發位置（競技場 x 座標）；畫面據此決定從左邊或右邊探出來。 */
  x = 0;
  private holdTimer = 0;

  /**
   * 同場最多一隻：演出中再觸發只會重置停留時間或讓牠回到畫面上。
   * 回傳 true 表示這次是從畫面外新跳出來（該喵一聲）。
   */
  trigger(x: number): boolean {
    if (this.state === 'idle') {
      this.x = x;
      this.state = 'entering';
      return true;
    }
    if (this.state === 'leaving') this.state = 'entering';
    else if (this.state === 'holding') this.holdTimer = 0;
    return false;
  }

  advance(dt: number): void {
    const { enterSeconds, holdSeconds, leaveSeconds } = config.orangeCat;
    if (this.state === 'entering') {
      this.shown = Math.min(1, this.shown + dt / enterSeconds);
      if (this.shown === 1) {
        this.state = 'holding';
        this.holdTimer = 0;
      }
    } else if (this.state === 'holding') {
      this.holdTimer += dt;
      if (this.holdTimer >= holdSeconds) this.state = 'leaving';
    } else if (this.state === 'leaving') {
      this.shown = Math.max(0, this.shown - dt / leaveSeconds);
      if (this.shown === 0) this.state = 'idle';
    }
  }

  reset(): void {
    this.state = 'idle';
    this.shown = 0;
    this.holdTimer = 0;
  }
}
