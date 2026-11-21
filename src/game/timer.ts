import { config } from '../config';

export function remainingTime(elapsed: number): number {
  return Math.max(0, config.roundSeconds - elapsed);
}
