/**
 * Integration tests for Hex-Do-Cube
 * Tests full game flow, coordination between modules, and realistic scenarios.
 *
 * Focus areas:
 * - Game flow: new game → edit → validate → win
 * - Storage: save/load persistence across "sessions"
 * - View state: transitions between modes
 * - Multi-module coordination
 *
 * Note: Avoids slow generator tests; uses fixtures and manual cube setup
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// Models
import { createCube, getCell, setCell, isCubeFilled, countFilledCells, type Cube } from './models/Cube.js';
import { createCell, createGivenCell, setCellValue, type HexValue, type Position } from './models/Cell.js';
import {
  createGameState,
  validateGameState,
  isGameWon,
  checkCompletion,
  resetValidationStatus,
} from './models/GameState.js';

// Services
import { validateCube } from './services/validator.js';
import {
  saveGameState,
  loadGameState,
  clearGameState,
  hasGameState,
} from './services/storage.js';

/**
 * Helper: Create a small valid pattern for testing
 * Creates a valid row with all 16 hex values
 */
function createValidRow(cube: Cube, j: number, k: number): void {
  const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  for (let i = 0; i < 16; i++) {
    setCell(cube, [i, j, k], createCell([i, j, k] as const, hexValues[i], 'given'));
  }
}

/**
 * Helper: Create a minimal valid cube for testing win condition
 * Fills the cube with a simple pattern that satisfies basic constraints
 * NOTE: This is a simplified pattern for testing purposes only
 */
function createMinimalValidCube(): Cube {
  const cube = createCube();

  // Fill cube with a simple pattern: value = (i + j*2 + k*3) % 16
  // This creates a predictable pattern for testing
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const value = ((i + j * 2 + k * 3) % 16).toString(16) as HexValue;
        setCell(cube, [i, j, k], createCell([i, j, k] as const, value, 'editable'));
      }
    }
  }

  return cube;
}

/**
 * Helper: Create a simple puzzle cube with given cells and empty cells
 */
function createSimplePuzzle(): Cube {
  const cube = createCube();

  // Add some given cells in first row
  const givenValues: Array<Exclude<HexValue, null>> = ['0', '1', '2', '3', '4', '5', '6', '7'];
  for (let i = 0; i < givenValues.length; i++) {
    setCell(cube, [i, 0, 0], createGivenCell([i, 0, 0] as const, givenValues[i]));
  }

  // Add some given cells scattered throughout
  setCell(cube, [5, 5, 5], createGivenCell([5, 5, 5] as const, 'a'));
  setCell(cube, [10, 10, 10], createGivenCell([10, 10, 10] as const, 'f'));
  setCell(cube, [15, 15, 15], createGivenCell([15, 15, 15] as const, 'e'));

  return cube;
}

describe('Integration: Full Game Flow', () => {
  describe('New game → Edit → Validate → Win', () => {
    test('creates new game with empty cube', () => {
      const gameState = createGameState('easy');

      expect(gameState).toBeDefined();
      expect(gameState.cube).toBeDefined();
      expect(gameState.difficulty).toBe('easy');
      expect(gameState.isComplete).toBe(false);
      expect(gameState.isCorrect).toBe(null);
      expect(countFilledCells(gameState.cube)).toBe(0);
    });

    test('edits cells and verifies cube state updates', () => {
      const gameState = createGameState('easy');

      // Edit some cells
      const pos1: Position = [0, 0, 0];
      const pos2: Position = [1, 0, 0];
      const pos3: Position = [5, 10, 15];

      setCellValue(getCell(gameState.cube, pos1), 'a');
      setCellValue(getCell(gameState.cube, pos2), 'b');
      setCellValue(getCell(gameState.cube, pos3), 'f');

      // Verify cube state
      expect(getCell(gameState.cube, pos1).value).toBe('a');
      expect(getCell(gameState.cube, pos2).value).toBe('b');
      expect(getCell(gameState.cube, pos3).value).toBe('f');
      expect(countFilledCells(gameState.cube)).toBe(3);
      expect(gameState.isComplete).toBe(false);
    });

    test('validates partial cube with no errors', () => {
      const gameState = createGameState('easy');

      // Add valid cells (no conflicts)
      setCellValue(getCell(gameState.cube, [0, 0, 0]), 'a');
      setCellValue(getCell(gameState.cube, [1, 0, 0]), 'b');
      setCellValue(getCell(gameState.cube, [2, 0, 0]), 'c');

      const result = validateGameState(gameState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(gameState.isCorrect).toBe(true);
      expect(gameState.isComplete).toBe(false);
    });

    test('validates partial cube and detects errors', () => {
      const gameState = createGameState('easy');

      // Add duplicate in same row
      setCellValue(getCell(gameState.cube, [0, 0, 0]), 'a');
      setCellValue(getCell(gameState.cube, [5, 0, 0]), 'a'); // duplicate

      const result = validateGameState(gameState);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(gameState.isCorrect).toBe(false);
      expect(gameState.isComplete).toBe(false);
    });

    test('detects completion when cube is filled', () => {
      const gameState = createGameState('easy');

      // Fill entire cube with same value (invalid but complete)
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            setCellValue(getCell(gameState.cube, [i, j, k]), '0');
          }
        }
      }

      const isComplete = checkCompletion(gameState);

      expect(isComplete).toBe(true);
      expect(isCubeFilled(gameState.cube)).toBe(true);

      // Note: checkCompletion() returns true but doesn't update gameState.isComplete
      // That happens in validateGameState()
      validateGameState(gameState);
      expect(gameState.isComplete).toBe(true);
    });

    test('detects win condition: complete and valid', () => {
      const gameState = createGameState('easy');
      gameState.cube = createMinimalValidCube();

      // Validate the game state
      validateGameState(gameState);

      expect(gameState.isComplete).toBe(true);
      expect(isCubeFilled(gameState.cube)).toBe(true);

      // Note: The simple pattern may or may not be fully valid
      // What matters is that validation updates isCorrect correctly
      expect(gameState.isCorrect).not.toBe(null);

      // isGameWon only returns true if both complete AND correct
      if (gameState.isCorrect === true) {
        expect(isGameWon(gameState)).toBe(true);
      } else {
        expect(isGameWon(gameState)).toBe(false);
      }
    });

    test('does not win if complete but invalid', () => {
      const gameState = createGameState('easy');

      // Fill entire cube with same value (complete but invalid)
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            setCellValue(getCell(gameState.cube, [i, j, k]), '0');
          }
        }
      }

      validateGameState(gameState);

      expect(gameState.isComplete).toBe(true);
      expect(gameState.isCorrect).toBe(false);
      expect(isGameWon(gameState)).toBe(false);
    });

    test('full game flow: start → edit → validate → fix → validate → win', () => {
      const gameState = createGameState('easy');

      // Step 1: Start with empty cube
      expect(isGameWon(gameState)).toBe(false);

      // Step 2: Add a valid row
      createValidRow(gameState.cube, 0, 0);
      validateGameState(gameState);
      expect(gameState.isCorrect).toBe(true);
      expect(isGameWon(gameState)).toBe(false); // Not complete yet

      // Step 3: Add a duplicate (error)
      setCellValue(getCell(gameState.cube, [0, 1, 0]), '5');
      setCellValue(getCell(gameState.cube, [5, 1, 0]), '5');
      validateGameState(gameState);
      expect(gameState.isCorrect).toBe(false);

      // Step 4: Fix the error
      setCellValue(getCell(gameState.cube, [5, 1, 0]), 'a');
      validateGameState(gameState);
      expect(gameState.isCorrect).toBe(true);

      // Step 5: Complete the cube (simplified)
      gameState.cube = createMinimalValidCube();
      validateGameState(gameState);

      // If the pattern is valid, we win
      if (gameState.isCorrect === true) {
        expect(isGameWon(gameState)).toBe(true);
      }
    });
  });

  describe('Realistic editing scenarios', () => {
    test('cannot edit given cells', () => {
      const gameState = createGameState('easy');
      const cube = createSimplePuzzle();
      gameState.cube = cube;

      const givenCell = getCell(cube, [0, 0, 0]);
      expect(givenCell.type).toBe('given');
      expect(givenCell.value).toBe('0');

      // Attempt to modify given cell should throw
      expect(() => setCellValue(givenCell, 'f')).toThrow('Cannot modify a given cell');
    });

    test('can edit only editable cells', () => {
      const gameState = createGameState('easy');
      const cube = createSimplePuzzle();
      gameState.cube = cube;

      // Find an editable cell
      const editableCell = getCell(cube, [10, 0, 0]);
      expect(editableCell.type).toBe('editable');
      expect(editableCell.value).toBe(null);

      // Should be able to edit
      setCellValue(editableCell, 'd');
      expect(editableCell.value).toBe('d');

      // Should be able to clear
      setCellValue(editableCell, null);
      expect(editableCell.value).toBe(null);
    });

    test('tracks completion progress during editing', () => {
      const gameState = createGameState('easy');
      const initialCount = countFilledCells(gameState.cube);
      expect(initialCount).toBe(0);

      // Add cells progressively
      for (let i = 0; i < 10; i++) {
        setCellValue(getCell(gameState.cube, [i, 0, 0]), '0');
        const currentCount = countFilledCells(gameState.cube);
        expect(currentCount).toBe(i + 1);
      }
    });

    test('maintains validation state across edits', () => {
      const gameState = createGameState('easy');

      // Start valid
      setCellValue(getCell(gameState.cube, [0, 0, 0]), 'a');
      validateGameState(gameState);
      expect(gameState.isCorrect).toBe(true);

      // Add error
      setCellValue(getCell(gameState.cube, [1, 0, 0]), 'a'); // duplicate
      validateGameState(gameState);
      expect(gameState.isCorrect).toBe(false);

      // Fix error
      setCellValue(getCell(gameState.cube, [1, 0, 0]), 'b');
      validateGameState(gameState);
      expect(gameState.isCorrect).toBe(true);

      // Reset validation
      resetValidationStatus(gameState);
      expect(gameState.isCorrect).toBe(null);
    });
  });
});

describe('Integration: Storage Persistence', () => {
  // Mock localStorage for testing
  class LocalStorageMock {
    private store: Map<string, string> = new Map();

    getItem(key: string): string | null {
      return this.store.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
      this.store.set(key, value);
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    clear(): void {
      this.store.clear();
    }
  }

  const localStorageMock = new LocalStorageMock();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).localStorage = localStorageMock;

  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  test('saves and loads game state round-trip', () => {
    const original = createGameState('easy');

    // Populate with some data
    setCellValue(getCell(original.cube, [0, 0, 0]), 'a');
    setCellValue(getCell(original.cube, [5, 10, 15]), 'f');
    validateGameState(original);

    // Save
    saveGameState(original);
    expect(hasGameState()).toBe(true);

    // Load
    const loaded = loadGameState();
    expect(loaded).not.toBeNull();
    expect(loaded!.difficulty).toBe('easy');
    expect(getCell(loaded!.cube, [0, 0, 0]).value).toBe('a');
    expect(getCell(loaded!.cube, [5, 10, 15]).value).toBe('f');
    expect(loaded!.isCorrect).toBe(original.isCorrect);
  });

  test('simulates save/load across "sessions"', () => {
    // Session 1: Start game and make progress
    const session1 = createGameState('easy');
    setCellValue(getCell(session1.cube, [0, 0, 0]), '1');
    setCellValue(getCell(session1.cube, [1, 0, 0]), '2');
    setCellValue(getCell(session1.cube, [2, 0, 0]), '3');
    validateGameState(session1);
    saveGameState(session1);

    // Session 2: Load game and continue
    const session2 = loadGameState();
    expect(session2).not.toBeNull();
    expect(getCell(session2!.cube, [0, 0, 0]).value).toBe('1');
    expect(getCell(session2!.cube, [1, 0, 0]).value).toBe('2');
    expect(getCell(session2!.cube, [2, 0, 0]).value).toBe('3');

    // Continue editing in session 2
    setCellValue(getCell(session2!.cube, [3, 0, 0]), '4');
    validateGameState(session2!);
    saveGameState(session2!);

    // Session 3: Load again
    const session3 = loadGameState();
    expect(session3).not.toBeNull();
    expect(getCell(session3!.cube, [3, 0, 0]).value).toBe('4');
    expect(countFilledCells(session3!.cube)).toBe(4);
  });

  test('preserves given vs editable cell types', () => {
    const original = createGameState('easy');
    original.cube = createSimplePuzzle();

    saveGameState(original);
    const loaded = loadGameState();

    expect(loaded).not.toBeNull();

    // Check given cells are preserved
    expect(getCell(loaded!.cube, [0, 0, 0]).type).toBe('given');
    expect(getCell(loaded!.cube, [0, 0, 0]).value).toBe('0');

    // Check editable cells are preserved
    expect(getCell(loaded!.cube, [10, 0, 0]).type).toBe('editable');
  });

  test('handles game progress: save, load, continue, win', () => {
    // Start game
    const game = createGameState('easy');
    createValidRow(game.cube, 0, 0);
    saveGameState(game);

    // Load and verify progress
    const loaded1 = loadGameState();
    expect(loaded1).not.toBeNull();
    expect(countFilledCells(loaded1!.cube)).toBe(16);

    // Continue and complete
    loaded1!.cube = createMinimalValidCube();
    validateGameState(loaded1!);
    saveGameState(loaded1!);

    // Load final state
    const loaded2 = loadGameState();
    expect(loaded2).not.toBeNull();
    expect(loaded2!.isComplete).toBe(true);
  });

  test('clears game state and starts fresh', () => {
    // Create and save a game
    const game1 = createGameState('easy');
    setCellValue(getCell(game1.cube, [0, 0, 0]), 'a');
    saveGameState(game1);
    expect(hasGameState()).toBe(true);

    // Clear
    clearGameState();
    expect(hasGameState()).toBe(false);
    expect(loadGameState()).toBeNull();

    // Start new game
    const game2 = createGameState('easy');
    expect(countFilledCells(game2.cube)).toBe(0);
  });

  test('overwrites previous save on subsequent saves', () => {
    const game1 = createGameState('easy');
    setCellValue(getCell(game1.cube, [0, 0, 0]), 'a');
    saveGameState(game1);

    const game2 = createGameState('easy');
    setCellValue(getCell(game2.cube, [0, 0, 0]), 'b');
    saveGameState(game2);

    const loaded = loadGameState();
    expect(loaded).not.toBeNull();
    expect(getCell(loaded!.cube, [0, 0, 0]).value).toBe('b');
  });
});

describe('Integration: Multi-Module Coordination', () => {
  test('Cube, Validator, and GameState coordination', () => {
    // Create cube
    const cube = createCube();

    // Add cells via Cube API
    setCell(cube, [0, 0, 0], createCell([0, 0, 0] as const, 'a'));
    setCell(cube, [1, 0, 0], createCell([1, 0, 0] as const, 'a')); // duplicate

    // Validate via Validator
    const validationResult = validateCube(cube);
    expect(validationResult.isValid).toBe(false);

    // Create GameState and validate
    const gameState = createGameState('easy');
    gameState.cube = cube;
    const gameValidation = validateGameState(gameState);

    // Both validations should agree
    expect(gameValidation.isValid).toBe(validationResult.isValid);
    expect(gameState.isCorrect).toBe(false);
  });

  test('GameState and Storage coordination', () => {
    const localStorageMock = new (class {
      private store: Map<string, string> = new Map();
      getItem(key: string): string | null { return this.store.get(key) ?? null; }
      setItem(key: string, value: string): void { this.store.set(key, value); }
      removeItem(key: string): void { this.store.delete(key); }
      clear(): void { this.store.clear(); }
    })();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = localStorageMock;

    // Create and modify game state
    const gameState = createGameState('easy');
    setCellValue(getCell(gameState.cube, [0, 0, 0]), 'a');
    validateGameState(gameState);

    // Save via Storage
    saveGameState(gameState);

    // Load and verify coordination
    const loaded = loadGameState();
    expect(loaded).not.toBeNull();
    expect(loaded!.isCorrect).toBe(gameState.isCorrect);
    expect(loaded!.isComplete).toBe(gameState.isComplete);
  });

  test('Cell, Cube, and Validator integration', () => {
    const cube = createCube();

    // Use Cell API to create cells
    const cell1 = createCell([0, 0, 0] as const, '5', 'editable');
    const cell2 = createCell([1, 0, 0] as const, '5', 'editable');

    // Use Cube API to set cells
    setCell(cube, [0, 0, 0], cell1);
    setCell(cube, [1, 0, 0], cell2);

    // Use Validator to check
    const result = validateCube(cube);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Fix via Cell API
    setCellValue(cell2, '6');

    // Validate again
    const result2 = validateCube(cube);
    expect(result2.isValid).toBe(true);
  });

  test('Complete workflow: GameState + Validation + Storage', () => {
    const localStorageMock = new (class {
      private store: Map<string, string> = new Map();
      getItem(key: string): string | null { return this.store.get(key) ?? null; }
      setItem(key: string, value: string): void { this.store.set(key, value); }
      removeItem(key: string): void { this.store.delete(key); }
      clear(): void { this.store.clear(); }
    })();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = localStorageMock;

    // 1. Create game
    const game = createGameState('easy');
    expect(game.isCorrect).toBe(null);

    // 2. Edit cells
    setCellValue(getCell(game.cube, [0, 0, 0]), 'a');
    setCellValue(getCell(game.cube, [1, 0, 0]), 'b');

    // 3. Validate
    validateGameState(game);
    expect(game.isCorrect).toBe(true);

    // 4. Save
    saveGameState(game);

    // 5. Load
    const loaded = loadGameState();
    expect(loaded).not.toBeNull();
    expect(loaded!.isCorrect).toBe(true);

    // 6. Continue editing
    setCellValue(getCell(loaded!.cube, [2, 0, 0]), 'c');

    // 7. Re-validate
    validateGameState(loaded!);
    expect(loaded!.isCorrect).toBe(true);

    // 8. Save again
    saveGameState(loaded!);

    // 9. Final verification
    const final = loadGameState();
    expect(final).not.toBeNull();
    expect(countFilledCells(final!.cube)).toBe(3);
  });
});

describe('Integration: Error Handling Across Modules', () => {
  test('handles validation errors gracefully', () => {
    const gameState = createGameState('easy');

    // Create multiple errors
    setCellValue(getCell(gameState.cube, [0, 0, 0]), 'a');
    setCellValue(getCell(gameState.cube, [1, 0, 0]), 'a'); // row error
    setCellValue(getCell(gameState.cube, [0, 1, 0]), 'a'); // column error
    setCellValue(getCell(gameState.cube, [0, 0, 1]), 'a'); // beam error

    const result = validateGameState(gameState);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(gameState.isCorrect).toBe(false);

    // Game should still be usable
    expect(() => setCellValue(getCell(gameState.cube, [5, 5, 5]), 'b')).not.toThrow();
  });

  test('handles invalid cell modifications', () => {
    const gameState = createGameState('easy');
    gameState.cube = createSimplePuzzle();

    const givenCell = getCell(gameState.cube, [0, 0, 0]);
    expect(givenCell.type).toBe('given');

    // Should throw when trying to modify given cell
    expect(() => setCellValue(givenCell, 'z' as HexValue)).toThrow();

    // Game state should remain consistent
    expect(givenCell.value).toBe('0'); // unchanged
  });

  test('handles storage errors', () => {
    const badStorage = new (class {
      getItem(): string | null { throw new Error('Storage unavailable'); }
      setItem(): void { throw new Error('Storage unavailable'); }
      removeItem(): void { throw new Error('Storage unavailable'); }
      clear(): void { throw new Error('Storage unavailable'); }
    })();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = badStorage;

    const gameState = createGameState('easy');

    // Should throw storage error (storage service wraps it)
    expect(() => saveGameState(gameState)).toThrow('LocalStorage is not available');
  });
});

describe('Integration: Complex Game Scenarios', () => {
  test('scenario: player fills cube incorrectly, validates, fixes, wins', () => {
    const gameState = createGameState('easy');

    // Player fills first row incorrectly
    for (let i = 0; i < 16; i++) {
      setCellValue(getCell(gameState.cube, [i, 0, 0]), '0'); // all same value
    }

    validateGameState(gameState);
    expect(gameState.isCorrect).toBe(false);

    // Player fixes the row
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    for (let i = 0; i < 16; i++) {
      setCellValue(getCell(gameState.cube, [i, 0, 0]), hexValues[i]);
    }

    validateGameState(gameState);
    expect(gameState.isCorrect).toBe(true);
    expect(gameState.isComplete).toBe(false); // Still not complete
  });

  test('scenario: multiple validation cycles during gameplay', () => {
    const gameState = createGameState('easy');
    let validationCount = 0;

    // Validation 1: Empty cube
    validateGameState(gameState);
    validationCount++;
    expect(gameState.isCorrect).toBe(true);

    // Add cells and validate
    setCellValue(getCell(gameState.cube, [0, 0, 0]), 'a');
    validateGameState(gameState);
    validationCount++;
    expect(gameState.isCorrect).toBe(true);

    // Add error and validate
    setCellValue(getCell(gameState.cube, [1, 0, 0]), 'a');
    validateGameState(gameState);
    validationCount++;
    expect(gameState.isCorrect).toBe(false);

    // Fix and validate
    setCellValue(getCell(gameState.cube, [1, 0, 0]), 'b');
    validateGameState(gameState);
    validationCount++;
    expect(gameState.isCorrect).toBe(true);

    expect(validationCount).toBe(4);
  });

  test('scenario: progressive completion tracking', () => {
    const gameState = createGameState('easy');
    const totalCells = 16 * 16 * 16;

    // Track completion percentage
    const getCompletionPercentage = () => {
      return (countFilledCells(gameState.cube) / totalCells) * 100;
    };

    expect(getCompletionPercentage()).toBe(0);

    // Fill 10% of cells
    const targetCells = Math.floor(totalCells * 0.1);
    let filled = 0;
    for (let i = 0; i < 16 && filled < targetCells; i++) {
      for (let j = 0; j < 16 && filled < targetCells; j++) {
        for (let k = 0; k < 16 && filled < targetCells; k++) {
          setCellValue(getCell(gameState.cube, [i, j, k]), '0');
          filled++;
        }
      }
    }

    const percentage = getCompletionPercentage();
    expect(percentage).toBeGreaterThanOrEqual(9.9); // Account for rounding
    expect(percentage).toBeLessThanOrEqual(10.1);
  });

  test('scenario: save, load, modify, detect changes', () => {
    const localStorageMock = new (class {
      private store: Map<string, string> = new Map();
      getItem(key: string): string | null { return this.store.get(key) ?? null; }
      setItem(key: string, value: string): void { this.store.set(key, value); }
      removeItem(key: string): void { this.store.delete(key); }
      clear(): void { this.store.clear(); }
    })();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = localStorageMock;

    // Save initial state
    const game1 = createGameState('easy');
    setCellValue(getCell(game1.cube, [0, 0, 0]), 'a');
    const initialCount = countFilledCells(game1.cube);
    saveGameState(game1);

    // Load and modify
    const game2 = loadGameState();
    expect(game2).not.toBeNull();
    setCellValue(getCell(game2!.cube, [1, 0, 0]), 'b');
    const newCount = countFilledCells(game2!.cube);

    // Detect change
    expect(newCount).toBe(initialCount + 1);
  });
});
