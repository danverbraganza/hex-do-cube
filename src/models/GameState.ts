/**
 * GameState model for Hex-Do-Cube
 * Manages game session state, difficulty, completion status, and validation results
 */

import {
  Cube,
  createCube,
  isCubeFilled,
  type ValidationResult,
} from "./Cube.js";
import type { HexValue } from "./Cell.js";

/**
 * Difficulty level configuration
 */
export type Difficulty =
  | "trivial"
  | "simple"
  | "challenging"
  | "devious"
  | "egotistical"
  | "ludicrous"
  | "herculean"
  | "sisyphean";

/**
 * GameState interface representing a complete game session
 */
export interface GameState {
  cube: Cube;
  difficulty: Difficulty;
  isComplete: boolean;
  isCorrect: boolean | null; // null = not yet checked
  solution: HexValue[][][]; // 16x16x16 array with all cells filled (never null)
}

/**
 * Creates a new game state with an empty cube
 * @param difficulty - The difficulty level (default: 'easy')
 * @param solution - The complete solution for the puzzle (16x16x16 array)
 * @returns A new GameState instance
 */
export function createGameState(
  difficulty: Difficulty = "simple",
  solution: HexValue[][][],
): GameState {
  return {
    cube: createCube(),
    difficulty,
    isComplete: false,
    isCorrect: null,
    solution,
  };
}

/**
 * Creates a game state from an existing cube
 * Useful for loading saved games or testing
 * @param cube - The cube to use
 * @param difficulty - The difficulty level (default: 'easy')
 * @param solution - The complete solution for the puzzle (16x16x16 array)
 * @returns A new GameState instance
 */
export function createGameStateFromCube(
  cube: Cube,
  difficulty: Difficulty = "simple",
  solution: HexValue[][][],
): GameState {
  return {
    cube,
    difficulty,
    isComplete: false,
    isCorrect: null,
    solution,
  };
}

/**
 * Checks if the game is complete (all cells filled and valid)
 * @param gameState - The game state to check
 * @returns true if all cells are filled
 */
export function checkCompletion(gameState: GameState): boolean {
  return isCubeFilled(gameState.cube);
}

/**
 * Validates the current game state and updates isCorrect status
 * This should be called when the player clicks "Check" button
 * @param gameState - The game state to validate
 * @returns ValidationResult with details about any errors
 */
export function validateGameState(gameState: GameState): ValidationResult {
  const validationResult = gameState.cube.validate();

  // Update game state based on validation
  gameState.isComplete = isCubeFilled(gameState.cube);
  gameState.isCorrect = validationResult.isValid;

  return validationResult;
}

/**
 * Checks if the game has been won (complete and correct)
 * @param gameState - The game state to check
 * @returns true if the game is won
 */
export function isGameWon(gameState: GameState): boolean {
  return gameState.isComplete && gameState.isCorrect === true;
}

/**
 * Resets the validation status (sets isCorrect back to null)
 * Useful when player makes a move after checking
 * @param gameState - The game state to reset
 */
export function resetValidationStatus(gameState: GameState): void {
  gameState.isCorrect = null;
}
