/**
 * Difficulty configuration for Hex-Do-Cube
 * Single source of truth for all difficulty-related settings
 */

export type Difficulty = 'trivial' | 'simple' | 'challenging' | 'devious' | 'egotistical' | 'ludicrous' | 'herculean' | 'sisyphean';

export interface DifficultyConfig {
  /** Human-readable label for UI */
  label: string;
  /** Ratio of given cells (0-1), OR use cellsToRemove for trivial */
  givenCellsRatio?: number;
  /** Exact number of cells to remove (only for trivial) */
  cellsToRemove?: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  trivial: { label: 'Trivial (1 cell empty)', cellsToRemove: 1 },
  simple: { label: 'Simple (95% given)', givenCellsRatio: 0.95 },
  challenging: { label: 'Challenging (80% given)', givenCellsRatio: 0.8 },
  devious: { label: 'Devious (75% given)', givenCellsRatio: 0.75 },
  egotistical: { label: 'Egotistical (70% given)', givenCellsRatio: 0.7 },
  ludicrous: { label: 'Ludicrous (65% given)', givenCellsRatio: 0.65 },
  herculean: { label: 'Herculean (60% given)', givenCellsRatio: 0.6 },
  sisyphean: { label: 'Sisyphean (50% given)', givenCellsRatio: 0.5 },
};

export const DEFAULT_DIFFICULTY: Difficulty = 'simple';

/** Get all difficulty values in order */
export const DIFFICULTY_ORDER: Difficulty[] = ['trivial', 'simple', 'challenging', 'devious', 'egotistical', 'ludicrous', 'herculean', 'sisyphean'];
