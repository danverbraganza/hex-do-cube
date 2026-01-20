/**
 * GameUI for Hex-Do-Cube
 * Provides HUD overlay with game controls and notifications
 *
 * Responsibilities:
 * - Check button: Triggers on-demand validation (not automatic)
 * - Win notification: Shows when cube is complete and correct
 * - Difficulty selector: For now, just "Easy" (70% given cells)
 * - New game functionality: Generates a new puzzle
 */

import type { GameState } from "../models/GameState.js";
import type { SceneManager } from "../renderer/SceneManager.js";
import type { ViewStateManager } from "./ViewStateManager.js";
import type { Difficulty } from "../models/Difficulty.js";
import { DIFFICULTIES, DIFFICULTY_ORDER } from "../models/Difficulty.js";
import { GameValidator } from "../services/GameValidator.js";
import { WinScreenRenderer } from "../renderer/WinScreenRenderer.js";
import { Modal } from "./Modal.js";
import { PALETTE } from "../config/ColorPalette.js";

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
  /** Reference to the game validator for unified validation */
  gameValidator: GameValidator;
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
  private gameValidator: GameValidator;
  private gameState: GameState;

  // Win screen renderer for fireworks
  private winScreenRenderer: WinScreenRenderer;

  // Confirmation modal
  private confirmModal: Modal;

  // Welcome modal elements
  private welcomeModalOverlay: HTMLDivElement | null = null;

  // UI elements
  private hudOverlay!: HTMLDivElement;
  private checkButton!: HTMLButtonElement;
  private helpButton!: HTMLButtonElement;
  private newGameButton!: HTMLButtonElement;
  private difficultySelect!: HTMLSelectElement;
  private winNotification!: HTMLDivElement;
  private wrongCompletionNotification!: HTMLDivElement;
  private layerIndicator!: HTMLDivElement;
  private versionDisplay!: HTMLDivElement;
  private sculptorBadge!: HTMLDivElement;

  // Face view control buttons
  private xyViewButton!: HTMLButtonElement;
  private xzViewButton!: HTMLButtonElement;
  private yzViewButton!: HTMLButtonElement;
  private homeViewButton!: HTMLButtonElement;

  // Layer navigation buttons
  private layerMinusButton!: HTMLButtonElement;
  private layerPlusButton!: HTMLButtonElement;

  // Callbacks
  private newGameCallbacks: NewGameCallback[] = [];

  constructor(config: GameUIConfig) {
    this.container = config.container;
    this.sceneManager = config.sceneManager;
    this.viewStateManager = config.viewStateManager;
    this.gameValidator = config.gameValidator;
    this.gameState = config.gameState;

    // Initialize win screen renderer
    this.winScreenRenderer = new WinScreenRenderer();
    this.sceneManager.add(this.winScreenRenderer.getContainer());

    // Initialize confirmation modal
    this.confirmModal = new Modal();

    this.initializeUI();
    this.attachEventHandlers();
    this.checkAndShowWelcomeModal();
  }

  /**
   * Initialize the HUD UI elements
   */
  private initializeUI(): void {
    // Create HUD overlay container
    this.hudOverlay = document.createElement("div");
    this.hudOverlay.id = "hud-overlay";
    this.hudOverlay.className = "hdc-hud-overlay";

    // Top-left controls
    const topLeftControls = document.createElement("div");
    topLeftControls.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      gap: 8px;
      pointer-events: auto;
    `;

    // Check button
    this.checkButton = document.createElement("button");
    this.checkButton.textContent = "Check";
    this.checkButton.title = "Validate current solution";
    this.checkButton.className = "hdc-button";

    // Help button
    this.helpButton = document.createElement("button");
    this.helpButton.textContent = "Help";
    this.helpButton.title = "Show instructions";
    this.helpButton.className = "hdc-button";

    topLeftControls.appendChild(this.checkButton);
    topLeftControls.appendChild(this.helpButton);

    // Top-right controls (positioned to account for MessagePanel width)
    // MessagePanel is 280px wide when expanded, 40px when collapsed
    // Position at right: 300px to ensure clear separation
    const topRightControls = document.createElement("div");
    topRightControls.style.cssText = `
      position: absolute;
      top: 16px;
      right: 300px;
      display: flex;
      gap: 8px;
      align-items: center;
      pointer-events: auto;
    `;

    // Difficulty selector
    const difficultyLabel = document.createElement("label");
    difficultyLabel.textContent = "Difficulty: ";
    difficultyLabel.className = "hdc-control-label";
    difficultyLabel.style.marginRight = "4px"; // Position-specific spacing

    this.difficultySelect = document.createElement("select");
    this.difficultySelect.className = "hdc-select";

    // Add all difficulty levels from centralized configuration
    for (const diff of DIFFICULTY_ORDER) {
      const option = document.createElement("option");
      option.value = diff;
      option.textContent = DIFFICULTIES[diff].label;
      this.difficultySelect.appendChild(option);
    }

    // Set default to 'simple'
    this.difficultySelect.value = "simple";

    // New game button
    this.newGameButton = document.createElement("button");
    this.newGameButton.textContent = "New Game";
    this.newGameButton.title = "Start a new puzzle";
    this.newGameButton.className = "hdc-button";

    topRightControls.appendChild(difficultyLabel);
    topRightControls.appendChild(this.difficultySelect);
    topRightControls.appendChild(this.newGameButton);

    // Bottom-left face view controls
    const bottomLeftControls = document.createElement("div");
    bottomLeftControls.style.cssText = `
      position: absolute;
      bottom: 44px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: auto;
    `;

    // Label for face view controls
    const faceViewLabel = document.createElement("div");
    faceViewLabel.textContent = "Face Views:";
    faceViewLabel.className = "hdc-control-label";
    faceViewLabel.style.fontWeight = "bold";

    // Container for face view buttons
    const faceViewButtons = document.createElement("div");
    faceViewButtons.className = "hdc-control-group";
    faceViewButtons.style.gap = "4px"; // Override default gap for tighter spacing

    // XY face view button (looking down Z axis)
    this.xyViewButton = document.createElement("button");
    this.xyViewButton.textContent = "XY Face";
    this.xyViewButton.title = "View XY face (looking down Z axis)";
    this.xyViewButton.className = "hdc-button";

    // XZ face view button (looking down Y axis)
    this.xzViewButton = document.createElement("button");
    this.xzViewButton.textContent = "XZ Face";
    this.xzViewButton.title = "View XZ face (looking down Y axis)";
    this.xzViewButton.className = "hdc-button";

    // YZ face view button (looking down X axis)
    this.yzViewButton = document.createElement("button");
    this.yzViewButton.textContent = "YZ Face";
    this.yzViewButton.title = "View YZ face (looking down X axis)";
    this.yzViewButton.className = "hdc-button";

    // Home/isometric view button
    this.homeViewButton = document.createElement("button");
    this.homeViewButton.textContent = "Isometric";
    this.homeViewButton.title = "Return to isometric 3D view";
    this.homeViewButton.className = "hdc-button";

    faceViewButtons.appendChild(this.xyViewButton);
    faceViewButtons.appendChild(this.xzViewButton);
    faceViewButtons.appendChild(this.yzViewButton);
    faceViewButtons.appendChild(this.homeViewButton);

    bottomLeftControls.appendChild(faceViewLabel);
    bottomLeftControls.appendChild(faceViewButtons);

    // Layer navigation controls
    const layerNavLabel = document.createElement("div");
    layerNavLabel.textContent = "Layer:";
    layerNavLabel.className = "hdc-control-label";
    layerNavLabel.style.fontWeight = "bold";
    layerNavLabel.style.marginTop = "12px";

    // Container for layer navigation buttons
    const layerNavButtons = document.createElement("div");
    layerNavButtons.style.cssText = `
      display: flex;
      gap: 4px;
    `;

    // Layer minus button [-]
    this.layerMinusButton = document.createElement("button");
    this.layerMinusButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
  <rect x="3" y="7" width="10" height="2" rx="1"/>
</svg>`;
    this.layerMinusButton.title = "Navigate to previous layer (shallower)";
    this.layerMinusButton.disabled = true; // Initially disabled
    this.layerMinusButton.className = "hdc-button";

    // Layer plus button [+]
    this.layerPlusButton = document.createElement("button");
    this.layerPlusButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
  <rect x="3" y="7" width="10" height="2" rx="1"/>
  <rect x="7" y="3" width="2" height="10" rx="1"/>
</svg>`;
    this.layerPlusButton.title = "Navigate to next layer (deeper)";
    this.layerPlusButton.disabled = true; // Initially disabled
    this.layerPlusButton.className = "hdc-button";

    layerNavButtons.appendChild(this.layerMinusButton);
    layerNavButtons.appendChild(this.layerPlusButton);

    bottomLeftControls.appendChild(layerNavLabel);
    bottomLeftControls.appendChild(layerNavButtons);

    // Win notification (initially hidden)
    this.winNotification = document.createElement("div");
    this.winNotification.id = "win-notification";
    this.winNotification.className = "hdc-notification hdc-notification--success";
    // Keep position-specific and special styling inline
    this.winNotification.style.cssText = `
      padding: 48px 64px;
      border-radius: 16px;
      font-size: 48px;
      cursor: pointer;
      animation: winPulse 1.5s ease-in-out infinite;
    `;
    this.winNotification.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px; text-shadow: 0 0 10px ${PALETTE.ui.winGlow.css};">
        YOU WIN!
      </div>
      <div style="font-size: 18px; font-weight: normal; margin-top: 16px; opacity: 0.8;">
        Click anywhere to dismiss
      </div>
    `;

    // Add CSS animation for pulsing effect
    const style = document.createElement("style");
    style.textContent = `
      @keyframes winPulse {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
          text-shadow: 0 0 10px ${PALETTE.ui.winGlow.css};
        }
        50% {
          transform: translate(-50%, -50%) scale(1.05);
          text-shadow: 0 0 20px ${PALETTE.ui.winGlowBright.css};
        }
      }
    `;
    document.head.appendChild(style);

    // Wrong completion notification (initially hidden)
    this.wrongCompletionNotification = document.createElement("div");
    this.wrongCompletionNotification.id = "wrong-completion-notification";
    this.wrongCompletionNotification.className = "hdc-notification hdc-notification--error";
    this.wrongCompletionNotification.style.cursor = "pointer"; // Position-specific: make clickable
    this.wrongCompletionNotification.innerHTML =
      'Cube Complete but Incorrect!<br/><span style="font-size: 16px; font-weight: normal;">Check the highlighted errors</span>';

    // Layer indicator (initially hidden, shown only in face-on view)
    this.layerIndicator = document.createElement("div");
    this.layerIndicator.id = "layer-indicator";
    this.layerIndicator.className = "hdc-layer-indicator";
    this.layerIndicator.style.fontWeight = "bold"; // Keep bold style
    this.layerIndicator.textContent = "Layer: 0 / 16";

    // Version display (bottom-right corner)
    this.versionDisplay = document.createElement("div");
    this.versionDisplay.id = "version-display";
    this.versionDisplay.style.cssText = `
      position: absolute;
      bottom: 44px;
      right: 16px;
      color: ${PALETTE.ui.versionDisplay.css};
      font-size: 11px;
      font-family: monospace;
      pointer-events: none;
      user-select: none;
    `;
    // Handle both build-time and test environments
    const gitSha = typeof __GIT_SHA__ !== "undefined" ? __GIT_SHA__ : "dev";
    this.versionDisplay.textContent = `v${gitSha}`;

    // Sculptor badge footer
    this.sculptorBadge = document.createElement("div");
    this.sculptorBadge.id = "sculptor-badge";
    this.sculptorBadge.className = "hdc-sculptor-badge";
    this.sculptorBadge.innerHTML = `
      Made with
      <a href="https://imbue.com/sculptor/" target="_blank" rel="noopener">Sculptor by Imbue</a>
    `;

    // Assemble HUD
    this.hudOverlay.appendChild(topLeftControls);
    this.hudOverlay.appendChild(topRightControls);
    this.hudOverlay.appendChild(bottomLeftControls);
    this.hudOverlay.appendChild(this.winNotification);
    this.hudOverlay.appendChild(this.wrongCompletionNotification);
    this.hudOverlay.appendChild(this.layerIndicator);
    this.hudOverlay.appendChild(this.versionDisplay);
    this.hudOverlay.appendChild(this.sculptorBadge);

    // Add to container
    this.container.appendChild(this.hudOverlay);
  }

  /**
   * Attach event handlers to UI elements
   */
  private attachEventHandlers(): void {
    // Check button: Validate current solution
    this.checkButton.addEventListener("click", () => {
      this.handleCheckButton();
    });

    // Help button: Show welcome modal
    this.helpButton.addEventListener("click", () => {
      this.handleHelpButton();
    });

    // New game button: Generate new puzzle
    this.newGameButton.addEventListener("click", () => {
      this.handleNewGameButton();
    });

    // Win notification click: Dismiss
    this.winNotification.addEventListener("click", () => {
      this.hideWinNotification();
    });

    // Wrong completion notification click: Dismiss
    this.wrongCompletionNotification.addEventListener("click", () => {
      this.hideWrongCompletionNotification();
    });

    // Face view button handlers
    this.xyViewButton.addEventListener("click", () => {
      this.handleXYViewButton();
    });

    this.xzViewButton.addEventListener("click", () => {
      this.handleXZViewButton();
    });

    this.yzViewButton.addEventListener("click", () => {
      this.handleYZViewButton();
    });

    this.homeViewButton.addEventListener("click", () => {
      this.handleHomeViewButton();
    });

    // Layer navigation button handlers
    this.layerMinusButton.addEventListener("click", () => {
      this.handleLayerMinusButton();
    });

    this.layerPlusButton.addEventListener("click", () => {
      this.handleLayerPlusButton();
    });

    // Listen to view mode changes to update button states
    this.viewStateManager.onViewModeChange(() => {
      this.updateLayerButtonStates();
    });

    // Difficulty select change handler: flash New Game button
    this.difficultySelect.addEventListener("change", () => {
      this.handleDifficultyChange();
    });
  }

  /**
   * Handle check button click
   * Validates the cube and provides appropriate feedback:
   * - Win notification if complete and correct
   * - Wrong completion notification if complete but incorrect
   * - Error highlights only if incomplete or incorrect
   */
  private handleCheckButton(): void {
    // Use unified GameValidator to check game status
    const status = this.gameValidator.check(this.gameState);

    // Check for win condition (complete AND correct)
    if (status.isWon) {
      this.showWinNotification();
      return;
    }

    // Check for wrong completion (complete BUT incorrect)
    if (status.isComplete && !status.isValid) {
      this.showWrongCompletionNotification();
    }
    // If incomplete or has errors, the CellEditor already highlighted errors
  }

  /**
   * Handle help button click
   * Shows the welcome modal with game instructions
   */
  private handleHelpButton(): void {
    this.showWelcomeModal();
  }

  /**
   * Handle difficulty select change
   * Flashes the New Game button to draw attention to it
   */
  private handleDifficultyChange(): void {
    this.newGameButton.classList.add('hdc-button--flashing');
    // Remove class after animation completes (3 flashes × 400ms = 1200ms)
    setTimeout(() => {
      this.newGameButton.classList.remove('hdc-button--flashing');
    }, 1200);
  }

  /**
   * Handle new game button click
   * Shows confirmation modal if user has progress, otherwise starts immediately
   */
  private handleNewGameButton(): void {
    const difficulty = this.difficultySelect.value as Difficulty;

    // Check if user has progress (any editable cells filled)
    if (this.hasUserProgress()) {
      // Show confirmation modal
      this.confirmModal.show({
        message:
          "You will lose your saved progress if you generate a new cube. Are you sure you want to do this?",
        confirmText: "Yes, start new",
        cancelText: "No, keep playing",
        onConfirm: () => {
          this.notifyNewGame(difficulty);
        },
        onCancel: () => {
          // Do nothing, modal will close automatically
        },
      });
    } else {
      // No progress, start new game immediately
      this.notifyNewGame(difficulty);
    }
  }

  /**
   * Check if the user has made any progress in the current game
   * @returns true if any editable cells have been filled
   */
  private hasUserProgress(): boolean {
    // Use filterCells to find any editable cells with values
    const editableCellsWithValues = this.gameState.cube.filterCells(
      (cell) => cell.type === "editable" && cell.value !== null,
    );
    return editableCellsWithValues.length > 0;
  }

  /**
   * Handle XY face view button click
   * Snaps camera to view looking down the Z axis (viewing XY plane)
   * Automatically defaults to the outermost layer based on camera position
   */
  private handleXYViewButton(): void {
    // XY face corresponds to 'k' face (Z axis)
    // No layer specified - defaults to outermost layer
    this.viewStateManager.enterFaceOnView("k");
  }

  /**
   * Handle XZ face view button click
   * Snaps camera to view looking down the Y axis (viewing XZ plane)
   * Automatically defaults to the outermost layer based on camera position
   */
  private handleXZViewButton(): void {
    // XZ face corresponds to 'i' face (Y axis)
    // No layer specified - defaults to outermost layer
    this.viewStateManager.enterFaceOnView("i");
  }

  /**
   * Handle YZ face view button click
   * Snaps camera to view looking down the X axis (viewing YZ plane)
   * Automatically defaults to the outermost layer based on camera position
   */
  private handleYZViewButton(): void {
    // YZ face corresponds to 'j' face (X axis)
    // No layer specified - defaults to outermost layer
    this.viewStateManager.enterFaceOnView("j");
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
   * Handle layer minus button click
   * Decreases the current layer (e.g., layer 2/16 -> layer 1/16)
   */
  private handleLayerMinusButton(): void {
    const currentLayer = this.viewStateManager.getCurrentLayer();
    if (currentLayer !== null && currentLayer > 0) {
      const currentFace = this.viewStateManager.getCurrentFace();
      if (currentFace) {
        this.viewStateManager.enterFaceOnView(currentFace, currentLayer - 1);
      }
    }
  }

  /**
   * Handle layer plus button click
   * Increases the current layer (e.g., layer 1/16 -> layer 2/16)
   */
  private handleLayerPlusButton(): void {
    const currentLayer = this.viewStateManager.getCurrentLayer();
    if (currentLayer !== null && currentLayer < 15) {
      const currentFace = this.viewStateManager.getCurrentFace();
      if (currentFace) {
        this.viewStateManager.enterFaceOnView(currentFace, currentLayer + 1);
      }
    }
  }

  /**
   * Update the disabled state of layer navigation buttons
   * Buttons are disabled when not in face-on view, or when at layer boundaries
   */
  private updateLayerButtonStates(): void {
    const isInFaceOnView = this.viewStateManager.getViewMode() === 'face-on';
    const currentLayer = this.viewStateManager.getCurrentLayer();

    if (!isInFaceOnView || currentLayer === null) {
      // Not in face-on view - disable both buttons
      this.layerMinusButton.disabled = true;
      this.layerPlusButton.disabled = true;
    } else {
      // In face-on view - enable based on layer position
      this.layerMinusButton.disabled = (currentLayer === 0);
      this.layerPlusButton.disabled = (currentLayer === 15);
    }
    // CSS handles the visual styling for disabled state automatically via :disabled pseudo-class
  }

  /**
   * Show the win notification with fireworks and auto-rotation
   */
  private showWinNotification(): void {
    this.hideWrongCompletionNotification(); // Ensure only one notification shows
    this.winNotification.style.display = "block";

    // Start fireworks effect
    this.winScreenRenderer.show();

    // Start auto-rotation of the cube
    this.viewStateManager.startAutoRotation();

    // Return to 3D view if in face-on mode
    if (this.viewStateManager.isInFaceOnView()) {
      this.viewStateManager.returnTo3DView();
    }
  }

  /**
   * Hide the win notification and stop effects
   */
  private hideWinNotification(): void {
    this.winNotification.style.display = "none";

    // Stop fireworks effect
    this.winScreenRenderer.hide();

    // Stop auto-rotation
    this.viewStateManager.stopAutoRotation();
  }

  /**
   * Show the wrong completion notification
   */
  private showWrongCompletionNotification(): void {
    this.hideWinNotification(); // Ensure only one notification shows
    this.wrongCompletionNotification.style.display = "block";
  }

  /**
   * Hide the wrong completion notification
   */
  private hideWrongCompletionNotification(): void {
    this.wrongCompletionNotification.style.display = "none";
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
    for (const callback of [...this.newGameCallbacks]) {
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
    this.layerIndicator.style.display = "block";
  }

  /**
   * Hide the layer indicator
   */
  public hideLayerIndicator(): void {
    this.layerIndicator.style.display = "none";
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
   * Check if this is the user's first time and show welcome modal
   * Uses localStorage key 'hex-do-cube-welcomed' to track first-time status
   */
  private checkAndShowWelcomeModal(): void {
    const WELCOMED_KEY = 'hex-do-cube-welcomed';

    // Check if localStorage is available (not available in test environment)
    try {
      // Check if user has already been welcomed
      if (typeof localStorage !== 'undefined' && !localStorage.getItem(WELCOMED_KEY)) {
        this.showWelcomeModal();
      }
    } catch (e) {
      // localStorage not available, skip welcome modal
    }
  }

  /**
   * Create and show the welcome modal for first-time users
   */
  private showWelcomeModal(): void {
    // Create overlay
    this.welcomeModalOverlay = document.createElement('div');
    this.welcomeModalOverlay.className = 'hdc-welcome-modal-overlay';

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'hdc-welcome-dialog';

    // Create title
    const title = document.createElement('div');
    title.className = 'hdc-welcome-title';
    title.textContent = 'Welcome to Hex-do-ku';

    // Create content
    const content = document.createElement('div');
    content.className = 'hdc-welcome-content';
    content.innerHTML = `
      <p>
        Hex-do-ku is <a href="https://en.wikipedia.org/wiki/Sudoku" target="_blank" rel="noopener">Sudoku</a>
        with <a href="https://en.wikipedia.org/wiki/Hexadecimal" target="_blank" rel="noopener">hexadecimal</a>
        numbers (0-9, a-f) instead of 1-9.
      </p>
      <p>
        It's played in 3 dimensions - a 16×16×16 cube.
      </p>
      <p>
        Each row, column, depth-line, and 4×4 subsquare must contain each hex digit exactly once.
      </p>
    `;

    // Check for mobile and add warning if needed
    if (window.matchMedia('(max-width: 768px)').matches) {
      const warning = document.createElement('p');
      warning.className = 'hdc-welcome-warning';
      warning.textContent = '⚠️ Note: This experience is optimized for desktop browsers. Mobile support is limited.';
      content.appendChild(warning);
    }

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'hdc-welcome-button-container';

    // Create button
    const button = document.createElement('button');
    button.className = 'hdc-welcome-button';
    button.textContent = 'Start Playing';
    button.addEventListener('click', () => {
      this.dismissWelcomeModal();
    });

    // Assemble modal
    buttonContainer.appendChild(button);
    dialog.appendChild(title);
    dialog.appendChild(content);
    dialog.appendChild(buttonContainer);
    this.welcomeModalOverlay.appendChild(dialog);

    // Add to DOM
    document.body.appendChild(this.welcomeModalOverlay);

    // Show modal
    this.welcomeModalOverlay.style.display = 'flex';

    // Prevent dialog clicks from closing modal
    dialog.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Dismiss the welcome modal and mark user as welcomed
   */
  private dismissWelcomeModal(): void {
    const WELCOMED_KEY = 'hex-do-cube-welcomed';

    // Set localStorage flag
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WELCOMED_KEY, 'true');
      }
    } catch (e) {
      // localStorage not available, continue anyway
    }

    // Hide and remove modal
    if (this.welcomeModalOverlay) {
      this.welcomeModalOverlay.style.display = 'none';
      if (this.welcomeModalOverlay.parentElement) {
        this.welcomeModalOverlay.parentElement.removeChild(this.welcomeModalOverlay);
      }
      this.welcomeModalOverlay = null;
    }
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

    // Dispose confirmation modal
    this.confirmModal.dispose();

    // Dispose welcome modal if still present
    if (this.welcomeModalOverlay && this.welcomeModalOverlay.parentElement) {
      this.welcomeModalOverlay.parentElement.removeChild(this.welcomeModalOverlay);
      this.welcomeModalOverlay = null;
    }

    // Clear callbacks
    this.newGameCallbacks = [];
  }
}
