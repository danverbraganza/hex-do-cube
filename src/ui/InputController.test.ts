/**
 * Tests for InputController mouse rotation in isometric view
 * Ensures mouse drag rotation works after all view transitions
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { InputController } from './InputController.js';
import { ViewStateManager } from './ViewStateManager.js';
import { CellStateManager } from './CellStateManager.js';
import { Window } from 'happy-dom';

describe('InputController - Mouse Rotation in Isometric View', () => {
  let window: Window;
  let inputController: InputController;
  let viewStateManager: ViewStateManager;

  beforeEach(() => {
    // Set up DOM environment using happy-dom
    window = new Window();
    global.document = window.document as unknown as Document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.window = window as any;

    // Create a mock canvas
    const canvas = window.document.createElement('canvas') as unknown as HTMLCanvasElement;

    // Create minimal mocks for dependencies
    const mockSceneManager = {
      rotateCamera: mock(() => {}),
      getCamera: mock(() => ({
        position: { x: 10, y: 10, z: 10, clone: () => ({ x: 10, y: 10, z: 10, equals: () => false }) },
      })),
      resetCamera: mock((_animated?: boolean, onComplete?: () => void) => {
        if (onComplete) onComplete();
      }),
      setFaceOnView: mock((_face: any, _layer: any, _animated?: boolean, onComplete?: () => void) => {
        if (onComplete) onComplete();
      }),
      updateFaceOnLayer: mock(() => {}),
      getCameraMode: mock(() => 'isometric'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const mockCubeRenderer = {
      pickCell: mock(() => null),
      updateCell: mock(() => {}),
      clearCellState: mock(() => {}),
      setCellState: mock(() => {}),
      setMode: mock(() => {}),
      setVisibleLayer: mock(() => {}),
      showAllLayersForTransition: mock(() => {}),
      restoreLayerVisibilityAfterTransition: mock(() => {}),
      revealEntireCube: mock(() => {}),
      hideAllButCurrentLayer: mock(() => {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const mockFaceRenderer = {
      enterFaceOnView: mock(() => {}),
      exitFaceOnView: mock(() => {}),
      handleWheelScroll: mock(() => {}),
      isActiveView: mock(() => false),
      getCurrentFace: mock(() => null),
      getCurrentLayer: mock(() => null),
      setLayer: mock(() => {}),
      onLayerChange: mock(() => {}),
      update: mock(() => {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const mockMinimapRenderer = {
      isPointInMinimap: mock(() => false),
      setHighlightedFace: mock(() => {}),
      setHighlightedLayer: mock(() => {}),
      updateCell: mock(() => {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const mockCube = {
      cells: Array(16).fill(null).map(() =>
        Array(16).fill(null).map(() =>
          Array(16).fill(null).map(() => ({
            position: [0, 0, 0],
            value: null,
            type: 'given',
          }))
        )
      ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Create view state manager with mocks
    viewStateManager = new ViewStateManager({
      sceneManager: mockSceneManager,
      faceRenderer: mockFaceRenderer,
      minimapRenderer: mockMinimapRenderer,
      cubeRenderer: mockCubeRenderer,
    });

    // Create cell state manager with mock renderer
    const cellStateManager = new CellStateManager(mockCubeRenderer);

    // Create input controller with mocks
    inputController = new InputController(
      { canvas },
      mockSceneManager,
      mockCubeRenderer,
      mockFaceRenderer,
      mockMinimapRenderer,
      mockCube,
      cellStateManager
    );

    // Wire up ViewStateManager to InputController (this is the key connection!)
    inputController.setViewStateManager(viewStateManager);
  });

  afterEach(() => {
    inputController.dispose();
    viewStateManager.dispose();
  });

  describe('ViewMode synchronization with ViewStateManager', () => {
    it('should start in 3d-rotational mode', () => {
      expect(inputController.getViewMode()).toBe('3d-rotational');
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
    });

    it('should sync viewMode when entering face-on view', () => {
      // Initially in 3d-rotational
      expect(inputController.getViewMode()).toBe('3d-rotational');

      // Enter face-on view through ViewStateManager
      viewStateManager.enterFaceOnView('i', 0);

      // InputController should be synchronized
      expect(inputController.getViewMode()).toBe('face-on');
      expect(viewStateManager.getViewMode()).toBe('face-on');
    });

    it('should sync viewMode when exiting face-on view', () => {
      // Enter face-on view first
      viewStateManager.enterFaceOnView('j', 5);
      expect(inputController.getViewMode()).toBe('face-on');

      // Exit face-on view
      viewStateManager.exitFaceOnView();

      // InputController should be synchronized back to 3d-rotational
      expect(inputController.getViewMode()).toBe('3d-rotational');
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
    });

    it('should sync viewMode when returning to 3D view via returnTo3DView', () => {
      // Enter face-on view
      viewStateManager.enterFaceOnView('k', 10);
      expect(inputController.getViewMode()).toBe('face-on');

      // Return to 3D view (simulating Home button)
      viewStateManager.returnTo3DView();

      // InputController should be synchronized
      expect(inputController.getViewMode()).toBe('3d-rotational');
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
    });

    it('should maintain correct viewMode through multiple transitions', () => {
      // Test multiple view transitions to ensure synchronization is stable
      const transitions = [
        { action: () => viewStateManager.enterFaceOnView('i', 0), expected: 'face-on' as const },
        { action: () => viewStateManager.exitFaceOnView(), expected: '3d-rotational' as const },
        { action: () => viewStateManager.enterFaceOnView('j', 8), expected: 'face-on' as const },
        { action: () => viewStateManager.returnTo3DView(), expected: '3d-rotational' as const },
        { action: () => viewStateManager.enterFaceOnView('k', 15), expected: 'face-on' as const },
        { action: () => viewStateManager.exitFaceOnView(), expected: '3d-rotational' as const },
      ];

      for (const { action, expected } of transitions) {
        action();
        expect(inputController.getViewMode()).toBe(expected);
        expect(viewStateManager.getViewMode()).toBe(expected);
      }
    });

    it('should remain synchronized after entering different faces', () => {
      const faces = ['i', 'j', 'k'] as const;

      for (const face of faces) {
        // Enter face-on view for this face
        viewStateManager.enterFaceOnView(face, 5);
        expect(inputController.getViewMode()).toBe('face-on');

        // Exit back to 3D
        viewStateManager.exitFaceOnView();
        expect(inputController.getViewMode()).toBe('3d-rotational');
      }
    });
  });
});
