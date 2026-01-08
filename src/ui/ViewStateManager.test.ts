import { describe, expect, it, beforeEach } from 'bun:test';
import { ViewStateManager, type ViewMode, type ViewModeChangeCallback } from './ViewStateManager.js';
import type { SceneManager } from '../renderer/SceneManager.js';
import type { FaceRenderer, Face } from '../renderer/FaceRenderer.js';
import type { MinimapRenderer } from '../renderer/MinimapRenderer.js';

/**
 * Mock SceneManager for testing
 */
class MockSceneManager implements Partial<SceneManager> {
  public setFaceOnViewCalls: Array<{ face: Face; layer: number }> = [];
  public resetCameraCalls: number = 0;

  setFaceOnView(face: Face, layer: number): void {
    this.setFaceOnViewCalls.push({ face, layer });
  }

  resetCamera(): void {
    this.resetCameraCalls++;
  }

  reset(): void {
    this.setFaceOnViewCalls = [];
    this.resetCameraCalls = 0;
  }
}

/**
 * Mock FaceRenderer for testing
 */
class MockFaceRenderer implements Partial<FaceRenderer> {
  public currentFace: Face | null = null;
  public currentLayer: number = 0;
  public active: boolean = false;

  public enterFaceOnViewCalls: Array<{ face: Face; layer: number }> = [];
  public exitFaceOnViewCalls: number = 0;
  public setLayerCalls: Array<number> = [];
  public updateCalls: number = 0;

  enterFaceOnView(face: Face, layer: number): void {
    this.enterFaceOnViewCalls.push({ face, layer });
    this.currentFace = face;
    this.currentLayer = layer;
    this.active = true;
  }

  exitFaceOnView(): void {
    this.exitFaceOnViewCalls++;
    this.currentFace = null;
    this.currentLayer = 0;
    this.active = false;
  }

  setLayer(layer: number): void {
    this.setLayerCalls.push(layer);
    this.currentLayer = layer;
  }

  getCurrentFace(): Face | null {
    return this.currentFace;
  }

  getCurrentLayer(): number {
    return this.currentLayer;
  }

  isActiveView(): boolean {
    return this.active;
  }

  update(): void {
    this.updateCalls++;
  }

  reset(): void {
    // Reset call tracking only, preserve state
    this.enterFaceOnViewCalls = [];
    this.exitFaceOnViewCalls = 0;
    this.setLayerCalls = [];
    this.updateCalls = 0;
  }

  resetState(): void {
    // Reset both call tracking and state
    this.currentFace = null;
    this.currentLayer = 0;
    this.active = false;
    this.enterFaceOnViewCalls = [];
    this.exitFaceOnViewCalls = 0;
    this.setLayerCalls = [];
    this.updateCalls = 0;
  }
}

/**
 * Mock MinimapRenderer for testing
 */
class MockMinimapRenderer implements Partial<MinimapRenderer> {
  public setHighlightedFaceCalls: Array<Face | null> = [];

  setHighlightedFace(face: Face | null): void {
    this.setHighlightedFaceCalls.push(face);
  }

  reset(): void {
    this.setHighlightedFaceCalls = [];
  }
}

describe('ViewStateManager', () => {
  let viewStateManager: ViewStateManager;
  let mockSceneManager: MockSceneManager;
  let mockFaceRenderer: MockFaceRenderer;
  let mockMinimapRenderer: MockMinimapRenderer;

  beforeEach(() => {
    mockSceneManager = new MockSceneManager();
    mockFaceRenderer = new MockFaceRenderer();
    mockMinimapRenderer = new MockMinimapRenderer();

    viewStateManager = new ViewStateManager({
      sceneManager: mockSceneManager as unknown as SceneManager,
      faceRenderer: mockFaceRenderer as unknown as FaceRenderer,
      minimapRenderer: mockMinimapRenderer as unknown as MinimapRenderer,
    });
  });

  describe('initial state', () => {
    it('should start in 3D rotational mode', () => {
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
      expect(viewStateManager.isInFaceOnView()).toBe(false);
    });

    it('should have no current face or layer initially', () => {
      expect(viewStateManager.getCurrentFace()).toBe(null);
      expect(viewStateManager.getCurrentLayer()).toBe(null);
    });
  });

  describe('enterFaceOnView', () => {
    it('should set current face to "k" and layer to 7', () => {
      viewStateManager.enterFaceOnView('k', 7);

      expect(viewStateManager.getViewMode()).toBe('face-on');
      expect(viewStateManager.getCurrentFace()).toBe('k');
      expect(viewStateManager.getCurrentLayer()).toBe(7);
      expect(viewStateManager.isInFaceOnView()).toBe(true);
    });

    it('should set current face to "i" and layer to 5', () => {
      viewStateManager.enterFaceOnView('i', 5);

      expect(viewStateManager.getViewMode()).toBe('face-on');
      expect(viewStateManager.getCurrentFace()).toBe('i');
      expect(viewStateManager.getCurrentLayer()).toBe(5);
      expect(viewStateManager.isInFaceOnView()).toBe(true);
    });

    it('should set current face to "j" and layer to 0', () => {
      viewStateManager.enterFaceOnView('j', 0);

      expect(viewStateManager.getViewMode()).toBe('face-on');
      expect(viewStateManager.getCurrentFace()).toBe('j');
      expect(viewStateManager.getCurrentLayer()).toBe(0);
      expect(viewStateManager.isInFaceOnView()).toBe(true);
    });

    it('should coordinate FaceRenderer when entering face view', () => {
      viewStateManager.enterFaceOnView('k', 7);

      expect(mockFaceRenderer.enterFaceOnViewCalls).toHaveLength(1);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'k', layer: 7 });
    });

    it('should coordinate SceneManager when entering face view', () => {
      viewStateManager.enterFaceOnView('i', 5);

      expect(mockSceneManager.setFaceOnViewCalls).toHaveLength(1);
      expect(mockSceneManager.setFaceOnViewCalls[0]).toEqual({ face: 'i', layer: 5 });
    });

    it('should coordinate MinimapRenderer when entering face view', () => {
      viewStateManager.enterFaceOnView('j', 3);

      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls[0]).toBe('j');
    });

    it('should update layer when entering same face with different layer', () => {
      viewStateManager.enterFaceOnView('k', 7);
      mockFaceRenderer.reset();
      mockSceneManager.reset();
      mockMinimapRenderer.reset();

      viewStateManager.enterFaceOnView('k', 10);

      // ViewStateManager calls setLayer on FaceRenderer only if the layer is different
      // In this case, FaceRenderer should have setLayer called once
      expect(mockFaceRenderer.setLayerCalls).toHaveLength(1);
      expect(mockFaceRenderer.setLayerCalls[0]).toBe(10);
      expect(viewStateManager.getCurrentLayer()).toBe(10);
    });

    it('should not re-enter if already in same face and layer', () => {
      viewStateManager.enterFaceOnView('k', 7);

      // Reset call tracking but preserve state (face='k', layer=7)
      mockFaceRenderer.reset();
      mockSceneManager.reset();
      mockMinimapRenderer.reset();

      viewStateManager.enterFaceOnView('k', 7);

      // Should not make any calls since we're already at the same face and layer
      expect(mockFaceRenderer.enterFaceOnViewCalls).toHaveLength(0);
      expect(mockFaceRenderer.setLayerCalls).toHaveLength(0);
      expect(mockSceneManager.setFaceOnViewCalls).toHaveLength(0);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(0);
    });

    it('should transition from one face to another', () => {
      viewStateManager.enterFaceOnView('k', 7);
      mockFaceRenderer.reset();
      mockSceneManager.reset();
      mockMinimapRenderer.reset();

      viewStateManager.enterFaceOnView('i', 5);

      expect(viewStateManager.getCurrentFace()).toBe('i');
      expect(viewStateManager.getCurrentLayer()).toBe(5);
      expect(mockFaceRenderer.enterFaceOnViewCalls).toHaveLength(1);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'i', layer: 5 });
    });
  });

  describe('exitFaceOnView', () => {
    it('should clear face state and return to 3D mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      viewStateManager.exitFaceOnView();

      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
      expect(viewStateManager.getCurrentFace()).toBe(null);
      expect(viewStateManager.getCurrentLayer()).toBe(null);
      expect(viewStateManager.isInFaceOnView()).toBe(false);
    });

    it('should coordinate FaceRenderer when exiting face view', () => {
      viewStateManager.enterFaceOnView('k', 7);
      mockFaceRenderer.reset();

      viewStateManager.exitFaceOnView();

      expect(mockFaceRenderer.exitFaceOnViewCalls).toBe(1);
    });

    it('should coordinate SceneManager when exiting face view', () => {
      viewStateManager.enterFaceOnView('k', 7);
      mockSceneManager.reset();

      viewStateManager.exitFaceOnView();

      expect(mockSceneManager.resetCameraCalls).toBe(1);
    });

    it('should coordinate MinimapRenderer when exiting face view', () => {
      viewStateManager.enterFaceOnView('k', 7);
      mockMinimapRenderer.reset();

      viewStateManager.exitFaceOnView();

      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls[0]).toBe(null);
    });

    it('should not exit if already in 3D view', () => {
      viewStateManager.exitFaceOnView();

      expect(mockFaceRenderer.exitFaceOnViewCalls).toBe(0);
      expect(mockSceneManager.resetCameraCalls).toBe(0);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(0);
    });
  });

  describe('returnTo3DView', () => {
    it('should be equivalent to exitFaceOnView', () => {
      viewStateManager.enterFaceOnView('k', 7);
      mockFaceRenderer.reset();
      mockSceneManager.reset();
      mockMinimapRenderer.reset();

      viewStateManager.returnTo3DView();

      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
      expect(mockFaceRenderer.exitFaceOnViewCalls).toBe(1);
      expect(mockSceneManager.resetCameraCalls).toBe(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls[0]).toBe(null);
    });
  });

  describe('getViewMode', () => {
    it('should return "3d-rotational" in 3D mode', () => {
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
    });

    it('should return "face-on" in face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      expect(viewStateManager.getViewMode()).toBe('face-on');
    });
  });

  describe('getCurrentFace', () => {
    it('should return null when in 3D mode', () => {
      expect(viewStateManager.getCurrentFace()).toBe(null);
    });

    it('should return current face when in face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      expect(viewStateManager.getCurrentFace()).toBe('k');

      viewStateManager.enterFaceOnView('i', 5);
      expect(viewStateManager.getCurrentFace()).toBe('i');

      viewStateManager.enterFaceOnView('j', 3);
      expect(viewStateManager.getCurrentFace()).toBe('j');
    });

    it('should return null after exiting face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      viewStateManager.exitFaceOnView();
      expect(viewStateManager.getCurrentFace()).toBe(null);
    });
  });

  describe('getCurrentLayer', () => {
    it('should return null when in 3D mode', () => {
      expect(viewStateManager.getCurrentLayer()).toBe(null);
    });

    it('should return current layer when in face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      expect(viewStateManager.getCurrentLayer()).toBe(7);

      viewStateManager.enterFaceOnView('i', 5);
      expect(viewStateManager.getCurrentLayer()).toBe(5);

      viewStateManager.enterFaceOnView('j', 0);
      expect(viewStateManager.getCurrentLayer()).toBe(0);
    });

    it('should return null after exiting face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      viewStateManager.exitFaceOnView();
      expect(viewStateManager.getCurrentLayer()).toBe(null);
    });
  });

  describe('isInFaceOnView', () => {
    it('should return false in 3D mode', () => {
      expect(viewStateManager.isInFaceOnView()).toBe(false);
    });

    it('should return true in face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      expect(viewStateManager.isInFaceOnView()).toBe(true);
    });

    it('should return false after exiting face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      viewStateManager.exitFaceOnView();
      expect(viewStateManager.isInFaceOnView()).toBe(false);
    });
  });

  describe('update', () => {
    it('should update FaceRenderer when in face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);
      mockFaceRenderer.reset();

      viewStateManager.update();

      expect(mockFaceRenderer.updateCalls).toBe(1);
    });

    it('should not update FaceRenderer when in 3D mode', () => {
      viewStateManager.update();

      expect(mockFaceRenderer.updateCalls).toBe(0);
    });
  });

  describe('onViewModeChange', () => {
    it('should notify callbacks when entering face view', () => {
      const calls: Array<{ mode: ViewMode; face?: Face; layer?: number }> = [];
      const callback: ViewModeChangeCallback = (mode, face, layer) => {
        calls.push({ mode, face, layer });
      };

      viewStateManager.onViewModeChange(callback);
      viewStateManager.enterFaceOnView('k', 7);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({ mode: 'face-on', face: 'k', layer: 7 });
    });

    it('should notify callbacks when exiting face view', () => {
      const calls: Array<{ mode: ViewMode; face?: Face; layer?: number }> = [];
      const callback: ViewModeChangeCallback = (mode, face, layer) => {
        calls.push({ mode, face, layer });
      };

      viewStateManager.onViewModeChange(callback);
      viewStateManager.enterFaceOnView('k', 7);
      viewStateManager.exitFaceOnView();

      expect(calls).toHaveLength(2);
      expect(calls[1]).toEqual({ mode: '3d-rotational', face: undefined, layer: undefined });
    });

    it('should notify multiple callbacks', () => {
      let callback1Called = false;
      let callback2Called = false;

      viewStateManager.onViewModeChange(() => {
        callback1Called = true;
      });
      viewStateManager.onViewModeChange(() => {
        callback2Called = true;
      });

      viewStateManager.enterFaceOnView('k', 7);

      expect(callback1Called).toBe(true);
      expect(callback2Called).toBe(true);
    });
  });

  describe('syncState', () => {
    it('should fix state mismatch when ViewStateManager thinks face-on but FaceRenderer does not', () => {
      viewStateManager.enterFaceOnView('k', 7);

      // Simulate state mismatch: manually set FaceRenderer to inactive
      mockFaceRenderer.active = false;

      // Reset call tracking
      mockSceneManager.reset();
      mockMinimapRenderer.reset();

      viewStateManager.syncState();

      // ViewStateManager should update its own mode to 3d-rotational
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
      // And reset camera and minimap
      expect(mockSceneManager.resetCameraCalls).toBe(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls[0]).toBe(null);
    });

    it('should fix state mismatch when FaceRenderer thinks active but ViewStateManager does not', () => {
      // Start in 3D mode (default state)
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');

      // Simulate state mismatch: manually set FaceRenderer to active
      mockFaceRenderer.active = true;
      mockFaceRenderer.currentFace = 'k';
      mockFaceRenderer.currentLayer = 7;

      viewStateManager.syncState();

      // ViewStateManager should force FaceRenderer to exit
      expect(mockFaceRenderer.exitFaceOnViewCalls).toBe(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls[0]).toBe(null);
    });

    it('should not make changes when state is consistent in face-on mode', () => {
      viewStateManager.enterFaceOnView('k', 7);

      // Reset call tracking but preserve state
      mockFaceRenderer.reset();
      mockSceneManager.reset();
      mockMinimapRenderer.reset();

      viewStateManager.syncState();

      // No changes should be made since state is consistent
      expect(mockFaceRenderer.exitFaceOnViewCalls).toBe(0);
      expect(mockSceneManager.resetCameraCalls).toBe(0);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(0);
    });

    it('should not make changes when state is consistent in 3D mode', () => {
      // Start in 3D mode (default state)
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
      expect(mockFaceRenderer.isActiveView()).toBe(false);

      viewStateManager.syncState();

      // No changes should be made since state is consistent
      expect(mockFaceRenderer.exitFaceOnViewCalls).toBe(0);
      expect(mockSceneManager.resetCameraCalls).toBe(0);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(0);
    });
  });

  describe('dispose', () => {
    it('should clear callbacks', () => {
      const calls: Array<{ mode: ViewMode }> = [];
      viewStateManager.onViewModeChange((mode) => {
        calls.push({ mode });
      });

      viewStateManager.dispose();
      viewStateManager.enterFaceOnView('k', 7);

      expect(calls).toHaveLength(0);
    });
  });

  describe('face mapping', () => {
    it('should correctly map XY view to "k" face (Z axis)', () => {
      // XY plane is viewed looking down the Z axis, which is the 'k' face
      viewStateManager.enterFaceOnView('k', 7);
      expect(viewStateManager.getCurrentFace()).toBe('k');
    });

    it('should correctly map XZ view to "i" face (Y axis)', () => {
      // XZ plane is viewed looking down the Y axis, which is the 'i' face
      viewStateManager.enterFaceOnView('i', 7);
      expect(viewStateManager.getCurrentFace()).toBe('i');
    });

    it('should correctly map YZ view to "j" face (X axis)', () => {
      // YZ plane is viewed looking down the X axis, which is the 'j' face
      viewStateManager.enterFaceOnView('j', 7);
      expect(viewStateManager.getCurrentFace()).toBe('j');
    });
  });

  describe('ViewStateManager as single source of truth', () => {
    it('should maintain consistent state across all components', () => {
      // Enter face view
      viewStateManager.enterFaceOnView('k', 7);

      // Verify all components are coordinated
      expect(viewStateManager.getViewMode()).toBe('face-on');
      expect(viewStateManager.getCurrentFace()).toBe('k');
      expect(viewStateManager.getCurrentLayer()).toBe(7);
      expect(mockFaceRenderer.getCurrentFace()).toBe('k');
      expect(mockFaceRenderer.getCurrentLayer()).toBe(7);
      expect(mockSceneManager.setFaceOnViewCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(1);

      // Exit face view
      viewStateManager.exitFaceOnView();

      // Verify all components are coordinated
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
      expect(viewStateManager.getCurrentFace()).toBe(null);
      expect(viewStateManager.getCurrentLayer()).toBe(null);
      expect(mockFaceRenderer.getCurrentFace()).toBe(null);
      expect(mockFaceRenderer.isActiveView()).toBe(false);
      expect(mockSceneManager.resetCameraCalls).toBe(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(2);
      expect(mockMinimapRenderer.setHighlightedFaceCalls[1]).toBe(null);
    });

    it('should prevent end-on view bug by always aligning camera with active face', () => {
      // Enter face view for 'k' face
      viewStateManager.enterFaceOnView('k', 7);
      expect(mockSceneManager.setFaceOnViewCalls[0]).toEqual({ face: 'k', layer: 7 });

      // Switch to 'i' face
      viewStateManager.enterFaceOnView('i', 5);
      expect(mockSceneManager.setFaceOnViewCalls[1]).toEqual({ face: 'i', layer: 5 });

      // Switch to 'j' face
      viewStateManager.enterFaceOnView('j', 3);
      expect(mockSceneManager.setFaceOnViewCalls[2]).toEqual({ face: 'j', layer: 3 });

      // Verify camera is always set to match the active face
      expect(mockSceneManager.setFaceOnViewCalls).toHaveLength(3);
      expect(viewStateManager.getCurrentFace()).toBe('j');
    });
  });
});
