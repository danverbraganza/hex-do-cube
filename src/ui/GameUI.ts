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
import type { ViewStateManager } from './ViewStateManager.js';
import { isGameWon, validateGameState, checkCompletion, type Difficulty } from '../models/GameState.js';
import { WinScreenRenderer } from '../renderer/WinScreenRenderer.js';

/**
 * Configuration for GameUI
 */
export interface GameUIConfig {
  /** Container element for the UI overlay */
  container: HTMLElement;
  /** Reference to the scene manager for camera control */
  sceneManager: SceneManager;
  /** Reference to the view state manager for coordinated view transitions */
  viewStateManager: ViewStateManager;
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
  private viewStateManager: ViewStateManager;
  private cellEditor: CellEditor;
  private gameState: GameState;

  // Win screen renderer for fireworks
  private winScreenRenderer: WinScreenRenderer;

  // UI elements
  private hudOverlay!: HTMLDivElement;
  private homeButton!: HTMLButtonElement;
  private checkButton!: HTMLButtonElement;
  private newGameButton!: HTMLButtonElement;
  private difficultySelect!: HTMLSelectElement;
  private winNotification!: HTMLDivElement;
  private wrongCompletionNotification!: HTMLDivElement;
  private layerIndicator!: HTMLDivElement;
  private versionDisplay!: HTMLDivElement;

  // Face view control buttons
  private xyViewButton!: HTMLButtonElement;
  private xzViewButton!: HTMLButtonElement;
  private yzViewButton!: HTMLButtonElement;
  private homeViewButton!: HTMLButtonElement;

  // Callbacks
  private newGameCallbacks: NewGameCallback[] = [];

  constructor(config: GameUIConfig) {
    this.container = config.container;
    this.sceneManager = config.sceneManager;
    this.viewStateManager = config.viewStateManager;
    // inputController is in config but not used by GameUI - it's managed by main.ts
    this.cellEditor = config.cellEditor;
    this.gameState = config.gameState;

    // Initialize win screen renderer
    this.winScreenRenderer = new WinScreenRenderer();
    this.sceneManager.add(this.winScreenRenderer.getContainer());

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

    // Bottom-left face view controls
    const bottomLeftControls = document.createElement('div');
    bottomLeftControls.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: auto;
    `;

    // Label for face view controls
    const faceViewLabel = document.createElement('div');
    faceViewLabel.textContent = 'Face Views:';
    faceViewLabel.style.cssText = `
      color: #ffffff;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 4px;
    `;

    // Container for face view buttons
    const faceViewButtons = document.createElement('div');
    faceViewButtons.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // XY face view button (looking down Z axis)
    this.xyViewButton = document.createElement('button');
    this.xyViewButton.textContent = 'XY Face';
    this.xyViewButton.title = 'View XY face (looking down Z axis)';
    this.applyButtonStyle(this.xyViewButton);

    // XZ face view button (looking down Y axis)
    this.xzViewButton = document.createElement('button');
    this.xzViewButton.textContent = 'XZ Face';
    this.xzViewButton.title = 'View XZ face (looking down Y axis)';
    this.applyButtonStyle(this.xzViewButton);

    // YZ face view button (looking down X axis)
    this.yzViewButton = document.createElement('button');
    this.yzViewButton.textContent = 'YZ Face';
    this.yzViewButton.title = 'View YZ face (looking down X axis)';
    this.applyButtonStyle(this.yzViewButton);

    // Home/isometric view button
    this.homeViewButton = document.createElement('button');
    this.homeViewButton.textContent = 'Isometric';
    this.homeViewButton.title = 'Return to isometric 3D view';
    this.applyButtonStyle(this.homeViewButton);

    faceViewButtons.appendChild(this.xyViewButton);
    faceViewButtons.appendChild(this.xzViewButton);
    faceViewButtons.appendChild(this.yzViewButton);
    faceViewButtons.appendChild(this.homeViewButton);

    bottomLeftControls.appendChild(faceViewLabel);
    bottomLeftControls.appendChild(faceViewButtons);

    // Win notification (initially hidden)
    this.winNotification = document.createElement('div');
    this.winNotification.id = 'win-notification';
    this.winNotification.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.5);
      color: #ffffff;
      padding: 48px 64px;
      border-radius: 16px;
      font-size: 48px;
      font-weight: bold;
      text-align: center;
      pointer-events: auto;
      display: none;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
      cursor: pointer;
      animation: winPulse 1.5s ease-in-out infinite;
    `;
    this.winNotification.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px; text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);">
        YOU WIN!
      </div>
      <div style="font-size: 18px; font-weight: normal; margin-top: 16px; opacity: 0.8;">
        Click anywhere to dismiss
      </div>
    `;

    // Add CSS animation for pulsing effect
    const style = document.createElement('style');
    style.textContent = `
      @keyframes winPulse {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
        }
        50% {
          transform: translate(-50%, -50%) scale(1.05);
          text-shadow: 0 0 20px rgba(255, 215, 0, 1);
        }
      }
    `;
    document.head.appendChild(style);

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

    // Layer indicator (initially hidden, shown only in face-on view)
    this.layerIndicator = document.createElement('div');
    this.layerIndicator.id = 'layer-indicator';
    this.layerIndicator.style.cssText = `
      position: absolute;
      top: 16px;
      right: 50%;
      transform: translateX(50%);
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      pointer-events: none;
      display: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    `;
    this.layerIndicator.textContent = 'Layer: 0 / 16';

    // Version display (bottom-right corner)
    this.versionDisplay = document.createElement('div');
    this.versionDisplay.id = 'version-display';
    this.versionDisplay.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 16px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      font-family: monospace;
      pointer-events: none;
      user-select: none;
    `;
    this.versionDisplay.textContent = `v${__GIT_SHA__}`;

    // Assemble HUD
    this.hudOverlay.appendChild(topLeftControls);
    this.hudOverlay.appendChild(topRightControls);
    this.hudOverlay.appendChild(bottomLeftControls);
    this.hudOverlay.appendChild(this.winNotification);
    this.hudOverlay.appendChild(this.wrongCompletionNotification);
    this.hudOverlay.appendChild(this.layerIndicator);
    this.hudOverlay.appendChild(this.versionDisplay);

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

    // Face view button handlers
    this.xyViewButton.addEventListener('click', () => {
      this.handleXYViewButton();
    });

    this.xzViewButton.addEventListener('click', () => {
      this.handleXZViewButton();
    });

    this.yzViewButton.addEventListener('click', () => {
      this.handleYZViewButton();
    });

    this.homeViewButton.addEventListener('click', () => {
      this.handleHomeViewButton();
    });
  }

  /**
   * Handle home button click
   * Returns to canonical 3D rotational view, properly exiting face-on mode if active
   */
  private handleHomeButton(): void {
    // Use ViewStateManager to properly coordinate all view components
    this.viewStateManager.returnTo3DView();
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
   * Handle XY face view button click
   * Snaps camera to view looking down the Z axis (viewing XY plane)
   * Automatically defaults to the outermost layer based on camera position
   */
  private handleXYViewButton(): void {
    // XY face corresponds to 'k' face (Z axis)
    // No layer specified - defaults to outermost layer
    this.viewStateManager.enterFaceOnView('k');
  }

  /**
   * Handle XZ face view button click
   * Snaps camera to view looking down the Y axis (viewing XZ plane)
   * Automatically defaults to the outermost layer based on camera position
   */
  private handleXZViewButton(): void {
    // XZ face corresponds to 'i' face (Y axis)
    // No layer specified - defaults to outermost layer
    this.viewStateManager.enterFaceOnView('i');
  }

  /**
   * Handle YZ face view button click
   * Snaps camera to view looking down the X axis (viewing YZ plane)
   * Automatically defaults to the outermost layer based on camera position
   */
  private handleYZViewButton(): void {
    // YZ face corresponds to 'j' face (X axis)
    // No layer specified - defaults to outermost layer
    this.viewStateManager.enterFaceOnView('j');
  }

  /**
   * Handle home view button click
   * Returns to isometric 3D view
   */
  private handleHomeViewButton(): void {
    // Same as the home button - return to canonical isometric view
    this.viewStateManager.returnTo3DView();
  }

  /**
   * Show the win notification with fireworks and auto-rotation
   */
  private showWinNotification(): void {
    this.hideWrongCompletionNotification(); // Ensure only one notification shows
    this.winNotification.style.display = 'block';

    // Start fireworks effect
    this.winScreenRenderer.show();

    // Start auto-rotation of the cube
    this.sceneManager.startAutoRotation();

    // Return to 3D view if in face-on mode
    if (this.viewStateManager.isInFaceOnView()) {
      this.viewStateManager.returnTo3DView();
    }
  }

  /**
   * Hide the win notification and stop effects
   */
  private hideWinNotification(): void {
    this.winNotification.style.display = 'none';

    // Stop fireworks effect
    this.winScreenRenderer.hide();

    // Stop auto-rotation
    this.sceneManager.stopAutoRotation();
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
   * Show the layer indicator with the current layer
   * @param layer - The current layer (0-15)
   */
  public showLayerIndicator(layer: number): void {
    this.layerIndicator.textContent = `Layer: ${layer + 1} / 16`;
    this.layerIndicator.style.display = 'block';
  }

  /**
   * Hide the layer indicator
   */
  public hideLayerIndicator(): void {
    this.layerIndicator.style.display = 'none';
  }

  /**
   * Update the layer indicator with a new layer value
   * @param layer - The new layer (0-15)
   */
  public updateLayerIndicator(layer: number): void {
    this.layerIndicator.textContent = `Layer: ${layer + 1} / 16`;
  }

  /**
   * Update win screen animations (call each frame)
   */
  public update(): void {
    this.winScreenRenderer.update();
  }

  /**
   * Clean up resources and remove UI elements
   */
  public dispose(): void {
    // Remove event listeners (handled by removing DOM elements)
    if (this.hudOverlay.parentElement === this.container) {
      this.container.removeChild(this.hudOverlay);
    }

    // Dispose win screen renderer
    this.winScreenRenderer.dispose();

    // Clear callbacks
    this.newGameCallbacks = [];
  }
}
