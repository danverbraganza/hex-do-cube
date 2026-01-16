/**
 * GameValidator for Hex-Do-Cube
 * Provides unified validation API combining constraint checking,
 * completion detection, and win condition evaluation.
 *
 * This service consolidates the previously fragmented validation flow:
 * - cellEditor.validate() - returns CubeValidationResult
 * - validateGameState() - updates GameState.validationResult
 * - isGameWon() / checkCompletion() - separate logic for win detection
 *
 * Into a single cohesive API with a comprehensive GameStatus result.
 */

import type { GameState } from '../models/GameState.js';
import type { CellEditor } from '../ui/CellEditor.js';
import type { ValidationError } from './validator.js';
import { checkCompletion, isGameWon, validateGameState } from '../models/GameState.js';

/**
 * Comprehensive game status result
 * Combines completion, validity, and win condition in a single interface
 */
export interface GameStatus {
  /** All cells are filled (no nulls) */
  isComplete: boolean;
  /** No constraint violations (all rows/columns/beams/sub-squares unique) */
  isValid: boolean;
  /** Complete AND valid AND all values correct (win condition) */
  isWon: boolean;
  /** List of validation errors (empty if isValid is true) */
  errors: ValidationError[];
}

/**
 * GameValidator provides a unified validation API
 * Single source of truth for game state validation
 */
export class GameValidator {
  constructor(private cellEditor: CellEditor) {}

  /**
   * Check the current game status
   * Combines completion checking, constraint validation, and win detection
   *
   * @param gameState - The game state to validate
   * @returns Comprehensive GameStatus with all validation results
   */
  public check(gameState: GameState): GameStatus {
    // 1. Trigger validation through cell editor (handles visual feedback)
    const cubeValidationResult = this.cellEditor.validate();

    // 2. Update game state with validation results
    validateGameState(gameState);

    // 3. Check for completion (all cells filled)
    const isComplete = checkCompletion(gameState);

    // 4. Check for win condition (complete AND correct)
    const isWon = isGameWon(gameState);

    // 5. Return unified status
    return {
      isComplete,
      isValid: cubeValidationResult.isValid,
      isWon,
      errors: cubeValidationResult.errors,
    };
  }
}
