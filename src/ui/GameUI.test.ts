/**
 * Tests for GameUI version display
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GameUI } from './GameUI.js';
import type { GameUIConfig } from './GameUI.js';
import { createGameStateFromCube } from '../models/GameState.js';
import { createCube } from '../models/Cube.js';
import type { SceneManager } from '../renderer/SceneManager.js';
import type { ViewStateManager } from './ViewStateManager.js';
import type { InputController } from './InputController.js';
import type { GameValidator } from '../services/GameValidator.js';
import { Window } from 'happy-dom';

/**
 * Simple version display tests - only testing the UI element creation and styling
 * We use minimal mocks since we only care about the version display element
 */
describe('GameUI - Version Display', () => {
  let window: Window;
  let container: HTMLElement;
  let gameUI: GameUI;

  beforeEach(() => {
    // Set up DOM environment using happy-dom
    window = new Window();
    global.document = window.document as unknown as Document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.window = window as any;

    // Create container
    window.document.body.innerHTML = '<div id="container"></div>';
    container = window.document.getElementById('container')! as unknown as HTMLElement;

    // Create minimal game state
    const cube = createCube();
    const solution = cube.cells.map(layer =>
      layer.map(row =>
        row.map(cell => cell.value)
      )
    );
    const gameState = createGameStateFromCube(cube, 'easy', solution);

    // Create minimal mocks - just enough to instantiate GameUI
    const mockSceneManager = {
      add: mock(() => {}),
      startAutoRotation: mock(() => {}),
      stopAutoRotation: mock(() => {}),
      getCamera: mock(() => ({ position: { x: 0, y: 0, z: 0 } })),
    } as unknown as SceneManager;

    const mockViewStateManager = {
      isInFaceOnView: mock(() => false),
      returnTo3DView: mock(() => {}),
      enterFaceOnView: mock(() => {}),
    } as unknown as ViewStateManager;

    const mockGameValidator = {
      check: mock(() => ({ isComplete: false, isValid: true, isWon: false, errors: [] })),
    } as unknown as GameValidator;

    const mockInputController = {} as unknown as InputController;

    // Create GameUI
    const config: GameUIConfig = {
      container,
      sceneManager: mockSceneManager,
      viewStateManager: mockViewStateManager,
      inputController: mockInputController,
      gameValidator: mockGameValidator,
      gameState,
    };
    gameUI = new GameUI(config);
  });

  afterEach(() => {
    if (gameUI) {
      gameUI.dispose();
    }
  });

  it('should render version display element', () => {
    const versionDisplay = container.querySelector('#version-display');
    expect(versionDisplay).not.toBeNull();
    expect(versionDisplay?.tagName).toBe('DIV');
  });

  it('should display version with "v" prefix', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    expect(versionDisplay.textContent).toBeTruthy();
    expect(versionDisplay.textContent).toMatch(/^v/);
  });

  it('should display version matching git SHA pattern', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    // Should match format: v{sha} where sha is alphanumeric (or 'dev' for dev builds)
    expect(versionDisplay.textContent).toMatch(/^v[a-z0-9]+$/);
  });

  it('should position version display in bottom-right corner', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    const styles = versionDisplay.style;

    expect(styles.position).toBe('absolute');
    expect(styles.bottom).toBe('16px');
    expect(styles.right).toBe('16px');
  });

  it('should style version display with small font size', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    expect(versionDisplay.style.fontSize).toBe('11px');
  });

  it('should style version display with monospace font', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    expect(versionDisplay.style.fontFamily).toBe('monospace');
  });

  it('should style version display as translucent', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    // Check for translucent white color
    expect(versionDisplay.style.color).toContain('rgba(255, 255, 255, 0.5)');
  });

  it('should make version display non-interactive', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    expect(versionDisplay.style.pointerEvents).toBe('none');
    expect(versionDisplay.style.userSelect).toBe('none');
  });

  it('should keep version display always visible', () => {
    const versionDisplay = container.querySelector('#version-display') as HTMLElement;
    // Version display should not have 'display: none' - it should always be visible
    expect(versionDisplay.style.display).not.toBe('none');
  });
});
