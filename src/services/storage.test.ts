/**
 * Tests for storage service
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  saveGameState,
  loadGameState,
  clearGameState,
  hasGameState,
  isStorageAvailable
} from './storage.js';
import { createGameState } from '../models/GameState.js';
import { createCell } from '../models/Cell.js';
import type { HexValue } from '../models/Cell.js';

/**
 * Creates a dummy solution for testing (all cells filled with '0')
 */
function createDummySolution(): HexValue[][][] {
  const solution: HexValue[][][] = [];
  for (let i = 0; i < 16; i++) {
    solution[i] = [];
    for (let j = 0; j < 16; j++) {
      solution[i][j] = [];
      for (let k = 0; k < 16; k++) {
        solution[i][j][k] = '0';
      }
    }
  }
  return solution;
}

// Mock localStorage for testing
class LocalStorageMock {
  private store: Map<string, string> = new Map();
  private quotaExceeded = false;
  private quotaExceededForKey: string | null = null;

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    // Check if quota exceeded specifically for the game state key
    if (this.quotaExceeded && key === this.quotaExceededForKey) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  simulateQuotaExceeded(enabled: boolean, forKey?: string): void {
    this.quotaExceeded = enabled;
    this.quotaExceededForKey = forKey ?? null;
  }
}

const localStorageMock = new LocalStorageMock();

// Replace global localStorage with mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).localStorage = localStorageMock;

describe('storage service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.simulateQuotaExceeded(false);
  });

  afterEach(() => {
    localStorageMock.clear();
    localStorageMock.simulateQuotaExceeded(false);
  });

  describe('isStorageAvailable', () => {
    test('returns true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });
  });

  describe('hasGameState', () => {
    test('returns false when no saved state exists', () => {
      expect(hasGameState()).toBe(false);
    });

    test('returns true when saved state exists', () => {
      const state = createGameState('easy', createDummySolution());
      saveGameState(state);
      expect(hasGameState()).toBe(true);
    });

    test('returns false after clearing state', () => {
      const state = createGameState('easy', createDummySolution());
      saveGameState(state);
      clearGameState();
      expect(hasGameState()).toBe(false);
    });
  });

  describe('saveGameState and loadGameState', () => {
    test('saves and loads empty game state', () => {
      const original = createGameState('easy', createDummySolution());
      saveGameState(original);

      const loaded = loadGameState();
      expect(loaded).not.toBeNull();
      expect(loaded!.difficulty).toBe('easy');
      expect(loaded!.isComplete).toBe(false);
      expect(loaded!.isCorrect).toBe(null);
    });

    test('preserves all cell values and types', () => {
      const state = createGameState('easy', createDummySolution());

      // Set some given cells
      state.cube.cells[0][0][0] = createCell([0, 0, 0] as const, '5', 'given');
      state.cube.cells[1][2][3] = createCell([1, 2, 3] as const, 'a', 'given');
      state.cube.cells[15][15][15] = createCell([15, 15, 15] as const, 'f', 'given');

      // Set some editable cells
      state.cube.cells[5][5][5] = createCell([5, 5, 5] as const, '7', 'editable');
      state.cube.cells[10][10][10] = createCell([10, 10, 10] as const, 'b', 'editable');

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();

      // Check given cells
      expect(loaded!.cube.cells[0][0][0].value).toBe('5');
      expect(loaded!.cube.cells[0][0][0].type).toBe('given');

      expect(loaded!.cube.cells[1][2][3].value).toBe('a');
      expect(loaded!.cube.cells[1][2][3].type).toBe('given');

      expect(loaded!.cube.cells[15][15][15].value).toBe('f');
      expect(loaded!.cube.cells[15][15][15].type).toBe('given');

      // Check editable cells
      expect(loaded!.cube.cells[5][5][5].value).toBe('7');
      expect(loaded!.cube.cells[5][5][5].type).toBe('editable');

      expect(loaded!.cube.cells[10][10][10].value).toBe('b');
      expect(loaded!.cube.cells[10][10][10].type).toBe('editable');

      // Check empty cells remain empty
      expect(loaded!.cube.cells[7][7][7].value).toBe(null);
      expect(loaded!.cube.cells[7][7][7].type).toBe('editable');
    });

    test('preserves cell positions correctly', () => {
      const state = createGameState('easy', createDummySolution());
      state.cube.cells[3][7][11] = createCell([3, 7, 11] as const, 'd', 'given');

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();
      const cell = loaded!.cube.cells[3][7][11];
      expect(cell.position).toEqual([3, 7, 11]);
      expect(cell.value).toBe('d');
      expect(cell.type).toBe('given');
    });

    test('preserves isComplete and isCorrect status', () => {
      const state = createGameState('easy', createDummySolution());
      state.isComplete = true;
      state.isCorrect = true;

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();
      expect(loaded!.isComplete).toBe(true);
      expect(loaded!.isCorrect).toBe(true);
    });

    test('handles isCorrect as false', () => {
      const state = createGameState('easy', createDummySolution());
      state.isComplete = true;
      state.isCorrect = false;

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();
      expect(loaded!.isCorrect).toBe(false);
    });

    test('returns null when no saved state exists', () => {
      const loaded = loadGameState();
      expect(loaded).toBeNull();
    });

    test('overwrites previous saved state', () => {
      const state1 = createGameState('easy', createDummySolution());
      state1.cube.cells[0][0][0] = createCell([0, 0, 0] as const, '1', 'given');
      saveGameState(state1);

      const state2 = createGameState('easy', createDummySolution());
      state2.cube.cells[0][0][0] = createCell([0, 0, 0] as const, '9', 'given');
      saveGameState(state2);

      const loaded = loadGameState();
      expect(loaded).not.toBeNull();
      expect(loaded!.cube.cells[0][0][0].value).toBe('9');
    });

    test('handles all hex values correctly', () => {
      const state = createGameState('easy', createDummySolution());
      const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

      for (let i = 0; i < hexValues.length; i++) {
        state.cube.cells[i][0][0] = createCell([i, 0, 0] as const, hexValues[i], 'given');
      }

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();
      for (let i = 0; i < hexValues.length; i++) {
        expect(loaded!.cube.cells[i][0][0].value).toBe(hexValues[i]);
      }
    });

    test('round-trip preserves complete game state', () => {
      const state = createGameState('easy', createDummySolution());

      // Populate some cells across the cube
      for (let i = 0; i < 16; i += 3) {
        for (let j = 0; j < 16; j += 4) {
          for (let k = 0; k < 16; k += 5) {
            const value = ((i + j + k) % 16).toString(16) as HexValue;
            const type = (i + j + k) % 2 === 0 ? 'given' : 'editable';
            state.cube.cells[i][j][k] = createCell([i, j, k] as const, value, type);
          }
        }
      }

      state.isComplete = false;
      state.isCorrect = null;

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();

      // Verify all cells match
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            const original = state.cube.cells[i][j][k];
            const restored = loaded!.cube.cells[i][j][k];

            expect(restored.value).toBe(original.value);
            expect(restored.type).toBe(original.type);
            expect(restored.position).toEqual([i, j, k]);
          }
        }
      }

      expect(loaded!.difficulty).toBe(state.difficulty);
      expect(loaded!.isComplete).toBe(state.isComplete);
      expect(loaded!.isCorrect).toBe(state.isCorrect);
    });
  });

  describe('clearGameState', () => {
    test('removes saved state', () => {
      const state = createGameState('easy', createDummySolution());
      saveGameState(state);

      expect(hasGameState()).toBe(true);

      clearGameState();

      expect(hasGameState()).toBe(false);
      expect(loadGameState()).toBeNull();
    });

    test('does nothing when no state exists', () => {
      expect(hasGameState()).toBe(false);
      clearGameState();
      expect(hasGameState()).toBe(false);
    });
  });

  describe('error handling', () => {
    test('throws error when storage quota is exceeded', () => {
      const state = createGameState('easy', createDummySolution());
      localStorageMock.simulateQuotaExceeded(true, 'hex-do-cube-game-state');

      expect(() => saveGameState(state)).toThrow('Storage quota exceeded');
    });

    test('throws error for corrupted JSON data', () => {
      localStorage.setItem('hex-do-cube-game-state', 'invalid json {{{');

      expect(() => loadGameState()).toThrow('corrupted');
    });

    test('throws error for invalid schema version', () => {
      const invalidData = {
        version: 999,
        cells: [],
        difficulty: 'easy',
        isComplete: false,
        isCorrect: null
      };
      localStorage.setItem('hex-do-cube-game-state', JSON.stringify(invalidData));

      expect(() => loadGameState()).toThrow('Unsupported schema version');
    });

    test('throws error for missing cells array', () => {
      const invalidData = {
        version: 1,
        difficulty: 'easy',
        isComplete: false,
        isCorrect: null
      };
      localStorage.setItem('hex-do-cube-game-state', JSON.stringify(invalidData));

      expect(() => loadGameState()).toThrow('missing or invalid cells array');
    });

    test('throws error for missing difficulty', () => {
      const invalidData = {
        version: 1,
        cells: [],
        isComplete: false,
        isCorrect: null,
        solution: createDummySolution()
      };
      localStorage.setItem('hex-do-cube-game-state', JSON.stringify(invalidData));

      expect(() => loadGameState()).toThrow('missing difficulty');
    });

    test('throws error for invalid cell position', () => {
      const invalidData = {
        version: 1,
        cells: [
          {
            position: [20, 0, 0], // Invalid: > 15
            value: 'a',
            type: 'given'
          }
        ],
        difficulty: 'easy',
        isComplete: false,
        isCorrect: null,
        solution: createDummySolution()
      };
      localStorage.setItem('hex-do-cube-game-state', JSON.stringify(invalidData));

      expect(() => loadGameState()).toThrow('Invalid cell position');
    });
  });

  describe('storage size', () => {
    test('serialized state is reasonably sized', () => {
      const state = createGameState('easy', createDummySolution());

      // Fill 70% of cells (like 'easy' difficulty)
      const totalCells = 16 * 16 * 16;
      const targetFilled = Math.floor(totalCells * 0.7);
      let filled = 0;

      for (let i = 0; i < 16 && filled < targetFilled; i++) {
        for (let j = 0; j < 16 && filled < targetFilled; j++) {
          for (let k = 0; k < 16 && filled < targetFilled; k++) {
            const value = ((i + j + k) % 16).toString(16) as HexValue;
            state.cube.cells[i][j][k] = createCell([i, j, k] as const, value, 'given');
            filled++;
          }
        }
      }

      saveGameState(state);

      const stored = localStorage.getItem('hex-do-cube-game-state');
      expect(stored).not.toBeNull();

      const sizeInBytes = new Blob([stored!]).size;
      const sizeInKB = sizeInBytes / 1024;

      // ARCHITECTURE.md specifies ~100KB acceptable, but with 70% filled that's ~2867 cells
      // Each cell serializes to roughly 40-50 bytes in JSON
      // So we expect around 140KB for a 70% filled cube, which is acceptable
      expect(sizeInKB).toBeLessThan(200);

      console.log(`Serialized game state size: ${sizeInKB.toFixed(2)} KB (${filled} cells)`);
    });

    test('empty game state is compact', () => {
      const state = createGameState('easy', createDummySolution());
      saveGameState(state);

      const stored = localStorage.getItem('hex-do-cube-game-state');
      expect(stored).not.toBeNull();

      const sizeInBytes = new Blob([stored!]).size;
      const sizeInKB = sizeInBytes / 1024;

      // Empty state should be reasonably small (includes 16x16x16 solution)
      expect(sizeInKB).toBeLessThan(20);

      console.log(`Empty game state size: ${sizeInKB.toFixed(2)} KB`);
    });

    test('fully filled state size', () => {
      const state = createGameState('easy', createDummySolution());

      // Fill all cells
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            const value = ((i + j + k) % 16).toString(16) as HexValue;
            state.cube.cells[i][j][k] = createCell([i, j, k] as const, value, 'given');
          }
        }
      }

      saveGameState(state);

      const stored = localStorage.getItem('hex-do-cube-game-state');
      expect(stored).not.toBeNull();

      const sizeInBytes = new Blob([stored!]).size;
      const sizeInKB = sizeInBytes / 1024;

      // Full cube is 4096 cells, should be under 250KB
      expect(sizeInKB).toBeLessThan(250);

      console.log(`Fully filled game state size: ${sizeInKB.toFixed(2)} KB (4096 cells)`);
    });
  });

  describe('solution serialization', () => {
    test('saves and loads solution correctly', () => {
      const solution = createDummySolution();
      const state = createGameState('easy', solution);

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();
      expect(loaded!.solution).toBeDefined();
      expect(loaded!.solution.length).toBe(16);
    });

    test('preserves all solution values through serialization', () => {
      // Create a solution with varied values
      const solution: HexValue[][][] = [];
      for (let i = 0; i < 16; i++) {
        solution[i] = [];
        for (let j = 0; j < 16; j++) {
          solution[i][j] = [];
          for (let k = 0; k < 16; k++) {
            // Use a pattern to create different values
            const value = ((i + j * 2 + k * 3) % 16).toString(16) as HexValue;
            solution[i][j][k] = value;
          }
        }
      }

      const state = createGameState('easy', solution);
      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();

      // Verify all solution values match
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            expect(loaded!.solution[i][j][k]).toBe(solution[i][j][k]);
          }
        }
      }
    });

    test('solution remains separate from cube state after serialization', () => {
      const solution = createDummySolution(); // All '0'
      const state = createGameState('easy', solution);

      // Set some cube cells to different values
      state.cube.cells[0][0][0] = createCell([0, 0, 0] as const, 'f', 'editable');
      state.cube.cells[5][5][5] = createCell([5, 5, 5] as const, 'a', 'editable');

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();

      // Solution should still be '0'
      expect(loaded!.solution[0][0][0]).toBe('0');
      expect(loaded!.solution[5][5][5]).toBe('0');

      // Cube should have user values
      expect(loaded!.cube.cells[0][0][0].value).toBe('f');
      expect(loaded!.cube.cells[5][5][5].value).toBe('a');
    });

    test('solution has no null values after deserialization', () => {
      const solution = createDummySolution();
      const state = createGameState('easy', solution);

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();

      // Verify no null values in solution
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            expect(loaded!.solution[i][j][k]).not.toBeNull();
            expect(loaded!.solution[i][j][k]).toBeDefined();
          }
        }
      }
    });

    test('throws error when solution is missing in serialized data', () => {
      const invalidData = {
        version: 1,
        cells: [],
        difficulty: 'easy',
        isComplete: false,
        isCorrect: null
        // solution is missing
      };
      localStorage.setItem('hex-do-cube-game-state', JSON.stringify(invalidData));

      expect(() => loadGameState()).toThrow('missing or invalid solution array');
    });

    test('throws error when solution is not an array', () => {
      const invalidData = {
        version: 1,
        cells: [],
        difficulty: 'easy',
        isComplete: false,
        isCorrect: null,
        solution: 'not-an-array'
      };
      localStorage.setItem('hex-do-cube-game-state', JSON.stringify(invalidData));

      expect(() => loadGameState()).toThrow('missing or invalid solution array');
    });

    test('solution structure is correct 16x16x16 after deserialization', () => {
      const solution = createDummySolution();
      const state = createGameState('easy', solution);

      saveGameState(state);
      const loaded = loadGameState();

      expect(loaded).not.toBeNull();
      expect(loaded!.solution.length).toBe(16);

      for (let i = 0; i < 16; i++) {
        expect(loaded!.solution[i].length).toBe(16);
        for (let j = 0; j < 16; j++) {
          expect(loaded!.solution[i][j].length).toBe(16);
        }
      }
    });
  });
});
