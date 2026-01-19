/**
 * Tests for GameUI version display
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GameUI } from './GameUI.js';
import type { GameUIConfig } from './GameUI.js';
import { createGameStateFromCube } from '../models/GameState.js';
import { createCube } from '../models/Cube.js';
import type { SceneManager } from '../renderer/SceneManager.js';
import type { ViewStateManager, ViewMode } from './ViewStateManager.js';
import type { InputController } from './InputController.js';
import type { GameValidator } from '../services/GameValidator.js';
import type { Face } from '../models/Cube.js';
import { Window } from 'happy-dom';
import { PALETTE } from '../config/ColorPalette.js';

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
    const gameState = createGameStateFromCube(cube, 'simple', solution);

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
      onViewModeChange: mock(() => {}),
      getViewMode: mock(() => '3d-rotational'),
      getCurrentFace: mock(() => null),
      getCurrentLayer: mock(() => null),
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
    expect(styles.bottom).toBe('44px');
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
    // Check for translucent white color from ColorPalette
    expect(versionDisplay.style.color).toContain(PALETTE.ui.versionDisplay.css);
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

/**
 * Tests for layer navigation buttons [-] and [+]
 */
describe('GameUI - Layer Navigation Buttons', () => {
  let window: Window;
  let container: HTMLElement;
  let gameUI: GameUI;
  let mockViewStateManager: ViewStateManager;
  let onViewModeChangeCallback: () => void;

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
    const gameState = createGameStateFromCube(cube, 'simple', solution);

    // Create minimal mocks
    const mockSceneManager = {
      add: mock(() => {}),
      startAutoRotation: mock(() => {}),
      stopAutoRotation: mock(() => {}),
      getCamera: mock(() => ({ position: { x: 0, y: 0, z: 0 } })),
    } as unknown as SceneManager;

    // Track the onViewModeChange callback
    onViewModeChangeCallback = () => {};
    mockViewStateManager = {
      isInFaceOnView: mock(() => false),
      returnTo3DView: mock(() => {}),
      enterFaceOnView: mock(() => {}),
      onViewModeChange: mock((callback: () => void) => {
        onViewModeChangeCallback = callback;
      }),
      getViewMode: mock(() => '3d-rotational'),
      getCurrentFace: mock(() => null),
      getCurrentLayer: mock(() => null),
      startAutoRotation: mock(() => {}),
      stopAutoRotation: mock(() => {}),
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

  describe('button creation', () => {
    it('should create layer minus button with minus icon', () => {
      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer'));

      expect(layerMinusButton).not.toBeNull();
      expect(layerMinusButton?.tagName).toBe('BUTTON');
      expect(layerMinusButton?.querySelector('svg')).not.toBeNull();
    });

    it('should create layer plus button with plus icon', () => {
      const buttons = Array.from(container.querySelectorAll('button'));
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer'));

      expect(layerPlusButton).not.toBeNull();
      expect(layerPlusButton?.tagName).toBe('BUTTON');
      expect(layerPlusButton?.querySelector('svg')).not.toBeNull();
    });

    it('should have appropriate title attributes', () => {
      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      expect(layerMinusButton.title).toContain('previous layer');
      expect(layerPlusButton.title).toContain('next layer');
    });
  });

  describe('button states in 3D view', () => {
    it('should disable both buttons when not in face-on view', () => {
      // Mock 3D view (not face-on)
      mockViewStateManager.getViewMode = mock(() => '3d-rotational' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => null);

      // Trigger view mode change
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      expect(layerMinusButton.disabled).toBe(true);
      expect(layerPlusButton.disabled).toBe(true);
    });
  });

  describe('button states in face-on view', () => {
    it('should enable buttons appropriately when entering face-on view at middle layer', () => {
      // Mock face-on view at layer 5
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 5);

      // Trigger view mode change
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      expect(layerMinusButton.disabled).toBe(false);
      expect(layerPlusButton.disabled).toBe(false);
    });

    it('should disable [-] button when at layer 0', () => {
      // Mock face-on view at layer 0
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 0);

      // Trigger view mode change
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      expect(layerMinusButton.disabled).toBe(true);
      expect(layerPlusButton.disabled).toBe(false);
    });

    it('should disable [+] button when at layer 15', () => {
      // Mock face-on view at layer 15
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 15);

      // Trigger view mode change
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      expect(layerMinusButton.disabled).toBe(false);
      expect(layerPlusButton.disabled).toBe(true);
    });
  });

  describe('button click behavior', () => {
    it('should decrease layer when [-] button is clicked', () => {
      // Mock face-on view at layer 5 on face 'k'
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 5);
      mockViewStateManager.getCurrentFace = mock(() => 'k' as Face);

      // Trigger view mode change to enable buttons
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;

      // Click the minus button
      layerMinusButton.click();

      // Verify enterFaceOnView was called with layer 4
      expect(mockViewStateManager.enterFaceOnView).toHaveBeenCalledWith('k', 4);
    });

    it('should increase layer when [+] button is clicked', () => {
      // Mock face-on view at layer 5 on face 'k'
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 5);
      mockViewStateManager.getCurrentFace = mock(() => 'k' as Face);

      // Trigger view mode change to enable buttons
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      // Click the plus button
      layerPlusButton.click();

      // Verify enterFaceOnView was called with layer 6
      expect(mockViewStateManager.enterFaceOnView).toHaveBeenCalledWith('k', 6);
    });

    it('should not decrease layer when [-] button is clicked at layer 0', () => {
      // Mock face-on view at layer 0
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 0);
      mockViewStateManager.getCurrentFace = mock(() => 'k' as Face);

      // Trigger view mode change
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;

      // Reset the mock call count
      (mockViewStateManager.enterFaceOnView as any).mockClear();

      // Click the minus button (should be disabled, but click anyway)
      layerMinusButton.click();

      // Verify enterFaceOnView was not called (because we're at layer 0)
      expect(mockViewStateManager.enterFaceOnView).not.toHaveBeenCalled();
    });

    it('should not increase layer when [+] button is clicked at layer 15', () => {
      // Mock face-on view at layer 15
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 15);
      mockViewStateManager.getCurrentFace = mock(() => 'k' as Face);

      // Trigger view mode change
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      // Reset the mock call count
      (mockViewStateManager.enterFaceOnView as any).mockClear();

      // Click the plus button (should be disabled, but click anyway)
      layerPlusButton.click();

      // Verify enterFaceOnView was not called (because we're at layer 15)
      expect(mockViewStateManager.enterFaceOnView).not.toHaveBeenCalled();
    });
  });

  describe('state updates on view mode change', () => {
    it('should update button states when transitioning from 3D to face-on view', () => {
      // Start in 3D view
      mockViewStateManager.getViewMode = mock(() => '3d-rotational' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => null);
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      // Verify buttons are disabled in 3D view
      expect(layerMinusButton.disabled).toBe(true);
      expect(layerPlusButton.disabled).toBe(true);

      // Transition to face-on view at layer 8
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 8);
      onViewModeChangeCallback();

      // Verify buttons are now enabled
      expect(layerMinusButton.disabled).toBe(false);
      expect(layerPlusButton.disabled).toBe(false);
    });

    it('should update button states when transitioning from face-on to 3D view', () => {
      // Start in face-on view
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 8);
      onViewModeChangeCallback();

      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      // Verify buttons are enabled in face-on view
      expect(layerMinusButton.disabled).toBe(false);
      expect(layerPlusButton.disabled).toBe(false);

      // Transition to 3D view
      mockViewStateManager.getViewMode = mock(() => '3d-rotational' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => null);
      onViewModeChangeCallback();

      // Verify buttons are now disabled
      expect(layerMinusButton.disabled).toBe(true);
      expect(layerPlusButton.disabled).toBe(true);
    });

    it('should update button states when navigating between layers', () => {
      const buttons = Array.from(container.querySelectorAll('button'));
      const layerMinusButton = buttons.find(btn => btn.title.includes('previous layer')) as HTMLButtonElement;
      const layerPlusButton = buttons.find(btn => btn.title.includes('next layer')) as HTMLButtonElement;

      // Start at layer 1
      mockViewStateManager.getViewMode = mock(() => 'face-on' as ViewMode);
      mockViewStateManager.getCurrentLayer = mock(() => 1);
      onViewModeChangeCallback();

      expect(layerMinusButton.disabled).toBe(false);
      expect(layerPlusButton.disabled).toBe(false);

      // Navigate to layer 0
      mockViewStateManager.getCurrentLayer = mock(() => 0);
      onViewModeChangeCallback();

      expect(layerMinusButton.disabled).toBe(true);
      expect(layerPlusButton.disabled).toBe(false);

      // Navigate to layer 14
      mockViewStateManager.getCurrentLayer = mock(() => 14);
      onViewModeChangeCallback();

      expect(layerMinusButton.disabled).toBe(false);
      expect(layerPlusButton.disabled).toBe(false);

      // Navigate to layer 15
      mockViewStateManager.getCurrentLayer = mock(() => 15);
      onViewModeChangeCallback();

      expect(layerMinusButton.disabled).toBe(false);
      expect(layerPlusButton.disabled).toBe(true);
    });
  });
});
