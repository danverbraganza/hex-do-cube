/**
 * GameUI for Hex-Do-Cube
 * Provides HUD overlay with game controls and notifications
 *
 * Responsibilities:
 * - Home button: Returns to canonical isometric view
 * - Check button: Triggers on-demand validation (not automatic)
 * - Win notification: Shows when cube is complete and correct
 * - Difficulty selector: For now, just "Easy" (70% given cells)
 * - New game functionality: Generates a new puzzle
 */

import type { GameState } from '../models/GameState.js';
import type { SceneManager } from '../renderer/SceneManager.js';
import type { CellEditor } from './CellEditor.js';
import type { InputController } from './InputController.js';
import { isGameWon, validateGameState, checkCompletion, type Difficulty } from '../models/GameState.js';

/**
 * Configuration for GameUI
 */
export interface GameUIConfig {
  /** Container element for the UI overlay */
  container: HTMLElement;
  /** Reference to the scene manager for camera control */
  sceneManager: SceneManager;
  /** Reference to the input controller for view transitions */
  inputController: InputController;
  /** Reference to the cell editor for validation */
  cellEditor: CellEditor;
  /** Current game state */
  gameState: GameState;
}

/**
 * Callback for when a new game is requested
 */
export type NewGameCallback = (difficulty: Difficulty) => void;

/**
 * GameUI manages the HUD overlay with game controls
 */
export class GameUI {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private inputController: InputController;
  private cellEditor: CellEditor;
  private gameState: GameState;

  // UI elements
  private hudOverlay!: HTMLDivElement;
  private homeButton!: HTMLButtonElement;
  private checkButton!: HTMLButtonElement;
  private newGameButton!: HTMLButtonElement;
  private difficultySelect!: HTMLSelectElement;
  private winNotification!: HTMLDivElement;
  private wrongCompletionNotification!: HTMLDivElement;

  // Callbacks
  private newGameCallbacks: NewGameCallback[] = [];

  constructor(config: GameUIConfig) {
    this.container = config.container;
    this.sceneManager = config.sceneManager;
    this.inputController = config.inputController;
    this.cellEditor = config.cellEditor;
    this.gameState = config.gameState;

    this.initializeUI();
    this.attachEventHandlers();
  }

  /**
   * Initialize the HUD UI elements
   */
  private initializeUI(): void {
    // Create HUD overlay container
    this.hudOverlay = document.createElement('div');
    this.hudOverlay.id = 'hud-overlay';
    this.hudOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    // Top-left controls
    const topLeftControls = document.createElement('div');
    topLeftControls.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      gap: 8px;
      pointer-events: auto;
    `;

    // Home button
    this.homeButton = document.createElement('button');
    this.homeButton.textContent = 'Home';
    this.homeButton.title = 'Return to canonical isometric view';
    this.applyButtonStyle(this.homeButton);

    // Check button
    this.checkButton = document.createElement('button');
    this.checkButton.textContent = 'Check';
    this.checkButton.title = 'Validate current solution';
    this.applyButtonStyle(this.checkButton);

    topLeftControls.appendChild(this.homeButton);
    topLeftControls.appendChild(this.checkButton);

    // Top-right controls
    const topRightControls = document.createElement('div');
    topRightControls.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      align-items: center;
      pointer-events: auto;
    `;

    // Difficulty selector
    const difficultyLabel = document.createElement('label');
    difficultyLabel.textContent = 'Difficulty: ';
    difficultyLabel.style.cssText = `
      color: #ffffff;
      font-size: 14px;
      margin-right: 4px;
    `;

    this.difficultySelect = document.createElement('select');
    this.difficultySelect.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    `;

    // Currently only Easy difficulty is supported
    const easyOption = document.createElement('option');
    easyOption.value = 'easy';
    easyOption.textContent = 'Easy';
    this.difficultySelect.appendChild(easyOption);

    // New game button
    this.newGameButton = document.createElement('button');
    this.newGameButton.textContent = 'New Game';
    this.newGameButton.title = 'Start a new puzzle';
    this.applyButtonStyle(this.newGameButton);

    topRightControls.appendChild(difficultyLabel);
    topRightControls.appendChild(this.difficultySelect);
    topRightControls.appendChild(this.newGameButton);

    // Win notification (initially hidden)
    this.winNotification = document.createElement('div');
    this.winNotification.id = 'win-notification';
    this.winNotification.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 150, 0, 0.95);
      color: #ffffff;
      padding: 32px 48px;
      border-radius: 8px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      pointer-events: auto;
      display: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    `;
    this.winNotification.textContent = 'Congratulations! Puzzle Solved!';

    // Wrong completion notification (initially hidden)
    this.wrongCompletionNotification = document.createElement('div');
    this.wrongCompletionNotification.id = 'wrong-completion-notification';
    this.wrongCompletionNotification.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(200, 50, 0, 0.95);
      color: #ffffff;
      padding: 32px 48px;
      border-radius: 8px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      pointer-events: auto;
      display: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    `;
    this.wrongCompletionNotification.innerHTML = 'Cube Complete but Incorrect!<br/><span style="font-size: 16px; font-weight: normal;">Check the highlighted errors</span>';

    // Assemble HUD
    this.hudOverlay.appendChild(topLeftControls);
    this.hudOverlay.appendChild(topRightControls);
    this.hudOverlay.appendChild(this.winNotification);
    this.hudOverlay.appendChild(this.wrongCompletionNotification);

    // Add to container
    this.container.appendChild(this.hudOverlay);
  }

  /**
   * Apply consistent button styling
   */
  private applyButtonStyle(button: HTMLButtonElement): void {
    button.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    `;

    // Hover effect
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255, 255, 255, 0.1)';
    });
  }

  /**
   * Attach event handlers to UI elements
   */
  private attachEventHandlers(): void {
    // Home button: Reset camera to canonical view
    this.homeButton.addEventListener('click', () => {
      this.handleHomeButton();
    });

    // Check button: Validate current solution
    this.checkButton.addEventListener('click', () => {
      this.handleCheckButton();
    });

    // New game button: Generate new puzzle
    this.newGameButton.addEventListener('click', () => {
      this.handleNewGameButton();
    });

    // Win notification click: Dismiss
    this.winNotification.addEventListener('click', () => {
      this.hideWinNotification();
    });

    // Wrong completion notification click: Dismiss
    this.wrongCompletionNotification.addEventListener('click', () => {
      this.hideWrongCompletionNotification();
    });
  }

  /**
   * Handle home button click
   * Returns to canonical 3D rotational view, properly exiting face-on mode if active
   */
  private handleHomeButton(): void {
    // Use InputController to properly coordinate all view components
    this.inputController.returnTo3DView();
    // Also reset camera to canonical isometric position
    this.sceneManager.resetCamera();
  }

  /**
   * Handle check button click
   * Validates the cube and provides appropriate feedback:
   * - Win notification if complete and correct
   * - Wrong completion notification if complete but incorrect
   * - Error highlights only if incomplete or incorrect
   */
  private handleCheckButton(): void {
    // Trigger validation through cell editor (handles visual feedback)
    const result = this.cellEditor.validate();

    // Update game state with validation results
    validateGameState(this.gameState);

    // Check for win condition (complete AND correct)
    if (isGameWon(this.gameState)) {
      this.showWinNotification();
      return;
    }

    // Check for wrong completion (complete BUT incorrect)
    const isComplete = checkCompletion(this.gameState);
    if (isComplete && !result.isValid) {
      this.showWrongCompletionNotification();
    }
    // If incomplete or has errors, the CellEditor already highlighted errors
  }

  /**
   * Handle new game button click
   */
  private handleNewGameButton(): void {
    const difficulty = this.difficultySelect.value as Difficulty;

    // Confirm before starting new game (if current game has progress)
    // For simplicity, just start immediately for now
    this.notifyNewGame(difficulty);
  }

  /**
   * Show the win notification
   */
  private showWinNotification(): void {
    this.hideWrongCompletionNotification(); // Ensure only one notification shows
    this.winNotification.style.display = 'block';
  }

  /**
   * Hide the win notification
   */
  private hideWinNotification(): void {
    this.winNotification.style.display = 'none';
  }

  /**
   * Show the wrong completion notification
   */
  private showWrongCompletionNotification(): void {
    this.hideWinNotification(); // Ensure only one notification shows
    this.wrongCompletionNotification.style.display = 'block';
  }

  /**
   * Hide the wrong completion notification
   */
  private hideWrongCompletionNotification(): void {
    this.wrongCompletionNotification.style.display = 'none';
  }

  /**
   * Update the game state reference (e.g., when loading a new game)
   * @param gameState - The new game state
   */
  public setGameState(gameState: GameState): void {
    this.gameState = gameState;
    this.hideWinNotification(); // Hide notifications for new game
    this.hideWrongCompletionNotification();
  }

  /**
   * Register a callback for new game events
   * @param callback - Function to call when new game is requested
   */
  public onNewGame(callback: NewGameCallback): void {
    this.newGameCallbacks.push(callback);
  }

  /**
   * Notify all new game callbacks
   */
  private notifyNewGame(difficulty: Difficulty): void {
    for (const callback of this.newGameCallbacks) {
      callback(difficulty);
    }
  }

  /**
   * Manually trigger win notification (for testing or external win detection)
   */
  public showWin(): void {
    this.showWinNotification();
  }

  /**
   * Manually hide win notification
   */
  public hideWin(): void {
    this.hideWinNotification();
  }

  /**
   * Clean up resources and remove UI elements
   */
  public dispose(): void {
    // Remove event listeners (handled by removing DOM elements)
    if (this.hudOverlay.parentElement === this.container) {
      this.container.removeChild(this.hudOverlay);
    }

    // Clear callbacks
    this.newGameCallbacks = [];
  }
}
