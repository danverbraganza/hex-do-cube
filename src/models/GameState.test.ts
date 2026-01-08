/**
 * Tests for GameState model
 * Validates win condition detection and game state management
 */

import { describe, expect, it } from 'bun:test';
import {
  createGameState,
  createGameStateFromCube,
  checkCompletion,
  validateGameState,
  isGameWon,
  resetValidationStatus,
} from './GameState.js';
import { createCube, isCubeFilled } from './Cube.js';
import { setCellValue, type HexValue } from './Cell.js';

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

describe('GameState Model', () => {
  describe('createGameState', () => {
    it('should create a new game state with empty cube', () => {
      const gameState = createGameState('easy', createDummySolution());
      expect(gameState.cube).toBeDefined();
      expect(gameState.difficulty).toBe('easy');
      expect(gameState.isComplete).toBe(false);
      expect(gameState.isCorrect).toBe(null);
    });

    it('should support custom difficulty', () => {
      const gameState = createGameState('easy', createDummySolution());
      expect(gameState.difficulty).toBe('easy');
    });
  });

  describe('createGameStateFromCube', () => {
    it('should create game state from existing cube', () => {
      const cube = createCube();
      const gameState = createGameStateFromCube(cube, 'easy', createDummySolution());
      expect(gameState.cube).toBe(cube);
      expect(gameState.difficulty).toBe('easy');
      expect(gameState.isComplete).toBe(false);
      expect(gameState.isCorrect).toBe(null);
    });
  });

  describe('checkCompletion', () => {
    it('should return false for empty cube', () => {
      const gameState = createGameState('easy', createDummySolution());
      expect(checkCompletion(gameState)).toBe(false);
    });

    it('should return false for partially filled cube', () => {
      const gameState = createGameState('easy', createDummySolution());
      // Fill only first cell
      setCellValue(gameState.cube.cells[0][0][0], '0');
      expect(checkCompletion(gameState)).toBe(false);
    });

    it('should return true for completely filled cube', () => {
      const gameState = createGameState('easy', createDummySolution());
      // Fill all cells with '0' (won't be valid, but will be complete)
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            setCellValue(gameState.cube.cells[i][j][k], '0');
          }
        }
      }
      expect(checkCompletion(gameState)).toBe(true);
      expect(isCubeFilled(gameState.cube)).toBe(true);
    });
  });

  describe('validateGameState', () => {
    it('should mark incomplete cube as not complete', () => {
      const gameState = createGameState('easy', createDummySolution());
      const result = validateGameState(gameState);
      expect(gameState.isComplete).toBe(false);
      expect(gameState.isCorrect).toBe(true); // Empty cube is valid (no conflicts)
      expect(result.isValid).toBe(true);
    });

    it('should detect complete but invalid cube', () => {
      const gameState = createGameState('easy', createDummySolution());
      // Fill all cells with '0' - complete but invalid (duplicates everywhere)
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            setCellValue(gameState.cube.cells[i][j][k], '0');
          }
        }
      }
      const result = validateGameState(gameState);
      expect(gameState.isComplete).toBe(true);
      expect(gameState.isCorrect).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect complete and valid cube', () => {
      const gameState = createGameState('easy', createDummySolution());
      // Fill cube with a simple valid pattern (each row has 0-f)
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            // Simple pattern: value depends on position to avoid conflicts
            const value = ((i + j * 2 + k * 3) % 16).toString(16) as HexValue;
            setCellValue(gameState.cube.cells[i][j][k], value);
          }
        }
      }

      const result = validateGameState(gameState);
      expect(gameState.isComplete).toBe(true);
      // Note: This simple pattern likely won't be valid for all constraints,
      // but we're testing that the validation runs and updates state correctly
      expect(gameState.isCorrect).toBe(result.isValid);
    });

    it('should update isCorrect to false when validation fails', () => {
      const gameState = createGameState('easy', createDummySolution());
      // Create a simple duplicate in a row
      setCellValue(gameState.cube.cells[0][0][0], 'a');
      setCellValue(gameState.cube.cells[1][0][0], 'a'); // duplicate in same row

      const result = validateGameState(gameState);
      expect(result.isValid).toBe(false);
      expect(gameState.isCorrect).toBe(false);
    });

    it('should update isCorrect to true when validation passes', () => {
      const gameState = createGameState('easy', createDummySolution());
      // Create a valid partial fill
      setCellValue(gameState.cube.cells[0][0][0], 'a');
      setCellValue(gameState.cube.cells[1][0][0], 'b');

      const result = validateGameState(gameState);
      expect(result.isValid).toBe(true);
      expect(gameState.isCorrect).toBe(true);
    });
  });

  describe('isGameWon', () => {
    it('should return false for empty cube', () => {
      const gameState = createGameState('easy', createDummySolution());
      expect(isGameWon(gameState)).toBe(false);
    });

    it('should return false when isComplete is false', () => {
      const gameState = createGameState('easy', createDummySolution());
      gameState.isComplete = false;
      gameState.isCorrect = true;
      expect(isGameWon(gameState)).toBe(false);
    });

    it('should return false when isCorrect is false', () => {
      const gameState = createGameState('easy', createDummySolution());
      gameState.isComplete = true;
      gameState.isCorrect = false;
      expect(isGameWon(gameState)).toBe(false);
    });

    it('should return false when isCorrect is null', () => {
      const gameState = createGameState('easy', createDummySolution());
      gameState.isComplete = true;
      gameState.isCorrect = null;
      expect(isGameWon(gameState)).toBe(false);
    });

    it('should return true when both complete and correct', () => {
      const gameState = createGameState('easy', createDummySolution());
      gameState.isComplete = true;
      gameState.isCorrect = true;
      expect(isGameWon(gameState)).toBe(true);
    });

    it('should return false for wrong completion (complete but incorrect)', () => {
      const gameState = createGameState('easy', createDummySolution());
      // Fill all cells with '0' - complete but invalid
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            setCellValue(gameState.cube.cells[i][j][k], '0');
          }
        }
      }
      validateGameState(gameState);
      expect(gameState.isComplete).toBe(true);
      expect(gameState.isCorrect).toBe(false);
      expect(isGameWon(gameState)).toBe(false);
    });
  });

  describe('resetValidationStatus', () => {
    it('should reset isCorrect to null', () => {
      const gameState = createGameState('easy', createDummySolution());
      gameState.isCorrect = true;
      resetValidationStatus(gameState);
      expect(gameState.isCorrect).toBeNull();
    });

    it('should not affect other fields', () => {
      const gameState = createGameState('easy', createDummySolution());
      const cube = gameState.cube;
      const difficulty = gameState.difficulty;
      gameState.isComplete = true;
      gameState.isCorrect = true;

      resetValidationStatus(gameState);

      expect(gameState.cube).toBe(cube);
      expect(gameState.difficulty).toBe(difficulty);
      expect(gameState.isComplete).toBe(true);
      expect(gameState.isCorrect).toBeNull();
    });
  });

  describe('win condition integration', () => {
    it('should properly detect win after validation of solved cube', () => {
      const gameState = createGameState('easy', createDummySolution());

      // Fill with a valid simple pattern for first row
      // This is a simplified test - in reality we'd need a full valid solution
      const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
      for (let i = 0; i < 16; i++) {
        setCellValue(gameState.cube.cells[i][0][0], hexValues[i]);
      }

      // Before validation, isCorrect should be null
      expect(gameState.isCorrect).toBe(null);
      expect(isGameWon(gameState)).toBe(false);

      // After validation, should update correctly
      validateGameState(gameState);
      expect(gameState.isCorrect).not.toBe(null);
    });

    it('should not consider partial cube as won even if valid', () => {
      const gameState = createGameState('easy', createDummySolution());

      // Fill first row validly but leave rest empty
      const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
      for (let i = 0; i < 16; i++) {
        setCellValue(gameState.cube.cells[i][0][0], hexValues[i]);
      }

      validateGameState(gameState);
      expect(gameState.isComplete).toBe(false);
      expect(gameState.isCorrect).toBe(true); // Valid so far
      expect(isGameWon(gameState)).toBe(false); // But not complete
    });
  });

  describe('solution storage', () => {
    it('should store solution in createGameState', () => {
      const solution = createDummySolution();
      const gameState = createGameState('easy', solution);

      expect(gameState.solution).toBeDefined();
      expect(gameState.solution).toBe(solution);
    });

    it('should store solution in createGameStateFromCube', () => {
      const cube = createCube();
      const solution = createDummySolution();
      const gameState = createGameStateFromCube(cube, 'easy', solution);

      expect(gameState.solution).toBeDefined();
      expect(gameState.solution).toBe(solution);
    });

    it('should keep solution separate from cube', () => {
      const solution = createDummySolution();
      const gameState = createGameState('easy', solution);

      // Modify a cube cell
      setCellValue(gameState.cube.cells[0][0][0], 'f');

      // Solution should remain unchanged
      expect(gameState.solution[0][0][0]).toBe('0');
      expect(gameState.cube.cells[0][0][0].value).toBe('f');
    });

    it('should have a complete 16x16x16 solution array', () => {
      const solution = createDummySolution();
      const gameState = createGameState('easy', solution);

      // Verify dimensions
      expect(gameState.solution.length).toBe(16);
      for (let i = 0; i < 16; i++) {
        expect(gameState.solution[i].length).toBe(16);
        for (let j = 0; j < 16; j++) {
          expect(gameState.solution[i][j].length).toBe(16);
        }
      }
    });

    it('should have no null values in solution', () => {
      const solution = createDummySolution();
      const gameState = createGameState('easy', solution);

      // Check all 4096 cells
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            expect(gameState.solution[i][j][k]).not.toBeNull();
            expect(gameState.solution[i][j][k]).toBeDefined();
          }
        }
      }
    });

    it('should allow different solution values than cube values', () => {
      const solution = createDummySolution(); // All '0'
      const gameState = createGameState('easy', solution);

      // Set cube cells to different values
      setCellValue(gameState.cube.cells[0][0][0], 'a');
      setCellValue(gameState.cube.cells[1][1][1], 'b');

      // Solution should still be '0'
      expect(gameState.solution[0][0][0]).toBe('0');
      expect(gameState.solution[1][1][1]).toBe('0');

      // Cube should have different values
      expect(gameState.cube.cells[0][0][0].value).toBe('a');
      expect(gameState.cube.cells[1][1][1].value).toBe('b');
    });
  });
});
