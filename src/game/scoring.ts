import { config } from '../config';
import type { FoodKind } from './spawner';

export type Grade = (typeof config.grades)[number]['grade'];

export interface Counts {
  small: number;
  big: number;
  can: number;
  orange: number;
  chiliHits: number;
}

export const emptyCounts = (): Counts => ({ small: 0, big: 0, can: 0, orange: 0, chiliHits: 0 });

export function recordFood(counts: Counts, kind: FoodKind): number {
  if (kind === 'orange-small') counts.orange++;
  else counts[kind]++;
  return config.items.scores[kind];
}

export function gradeFor(score: number): Grade {
  return config.grades.find((entry) => score >= entry.minScore)?.grade ?? 'D';
}
