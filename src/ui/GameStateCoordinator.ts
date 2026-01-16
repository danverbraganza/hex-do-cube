/**
 * GameStateCoordinator for Hex-Do-Cube
 * Centralizes game state reset logic to maintain SRP (Single Responsibility Principle).
 *
 * Responsibilities:
 * - Hold references to all components that need game state updates
 * - Provide a single resetGame() method to update all components atomically
 * - Handle the coordination logic internally, so callers don't need to know about individual components
 *
 * This coordinator ensures that when starting a new game, all components are updated
 * in the correct order without requiring the caller to manage each component individually.
 */

import type { CubeRenderer } from '../renderer/CubeRenderer.js';
import type { MinimapRenderer } from '../renderer/MinimapRenderer.js';
import type { InputController } from './InputController.js';
import type { CellEditor } from './CellEditor.js';
import type { GameUI } from './GameUI.js';
import type { GameState } from '../models/GameState.js';

/**
 * Configuration for GameStateCoordinator
 */
export interface GameStateCoordinatorConfig {
  /** Reference to the cube renderer */
  cubeRenderer: CubeRenderer;
  /** Reference to the minimap renderer */
  minimapRenderer: MinimapRenderer;
  /** Reference to the input controller */
  inputController: InputController;
  /** Reference to the cell editor */
  cellEditor: CellEditor;
  /** Reference to the game UI */
  gameUI: GameUI;
}

/**
 * GameStateCoordinator centralizes game reset logic
 */
export class GameStateCoordinator {
  private cubeRenderer: CubeRenderer;
  private minimapRenderer: MinimapRenderer;
  private inputController: InputController;
  private cellEditor: CellEditor;
  private gameUI: GameUI;

  constructor(config: GameStateCoordinatorConfig) {
    this.cubeRenderer = config.cubeRenderer;
    this.minimapRenderer = config.minimapRenderer;
    this.inputController = config.inputController;
    this.cellEditor = config.cellEditor;
    this.gameUI = config.gameUI;
  }

  /**
   * Reset the game with a new game state
   * Updates all components atomically in the correct order
   *
   * @param gameState - The new game state to apply
   */
  resetGame(gameState: GameState): void {
    // Update all components with new game state
    // Order matters: renderers first, then controllers, then UI
    this.cubeRenderer.setCube(gameState.cube);
    this.minimapRenderer.setCube(gameState.cube);
    this.inputController.setCube(gameState.cube);
    this.cellEditor.setCube(gameState.cube);
    this.gameUI.setGameState(gameState);
  }
}
