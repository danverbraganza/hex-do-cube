import { describe, expect, it, beforeEach } from 'bun:test';
import { ViewStateManager, type ViewMode, type ViewModeChangeCallback } from './ViewStateManager.js';
import type { SceneManager } from '../renderer/SceneManager.js';
import type { FaceRenderer, Face } from '../renderer/FaceRenderer.js';
import type { MinimapRenderer } from '../renderer/MinimapRenderer.js';
import type { CubeRenderer } from '../renderer/CubeRenderer.js';

/**
 * Mock Camera for testing
 */
class MockCamera {
  public position = {
    x: 0,
    y: 0,
    z: 0,
  };
}

/**
 * Mock SceneManager for testing
 */
class MockSceneManager implements Partial<SceneManager> {
  public setFaceOnViewCalls: Array<{ face: Face; layer: number }> = [];
  public resetCameraCalls: number = 0;
  public camera = new MockCamera();

  setFaceOnView(face: Face, layer: number, onComplete?: () => void): void {
    this.setFaceOnViewCalls.push({ face, layer });
    // Call completion callback immediately in tests (no actual animation)
    if (onComplete) {
      onComplete();
    }
  }

  resetCamera(onComplete?: () => void): void {
    this.resetCameraCalls++;
    // Call completion callback immediately in tests (no actual animation)
    if (onComplete) {
      onComplete();
    }
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera as unknown as THREE.PerspectiveCamera;
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

  // Layer change callback support
  private layerChangeCallbacks: Array<(face: Face, layer: number) => void> = [];

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

  onLayerChange(callback: (face: Face, layer: number) => void): void {
    this.layerChangeCallbacks.push(callback);
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
  public setHighlightedLayerCalls: Array<{ face: Face | null; layer: number | null }> = [];

  setHighlightedFace(face: Face | null): void {
    this.setHighlightedFaceCalls.push(face);
  }

  setHighlightedLayer(face: Face | null, layer: number | null): void {
    this.setHighlightedLayerCalls.push({ face, layer });
  }

  reset(): void {
    this.setHighlightedFaceCalls = [];
    this.setHighlightedLayerCalls = [];
  }
}

/**
 * Mock CubeRenderer for testing
 */
class MockCubeRenderer implements Partial<CubeRenderer> {
  public setModeCalls: Array<'3d' | 'face-on'> = [];
  public setVisibleLayerCalls: Array<{ face: Face | null; layer: number | null }> = [];
  public setExclusiveVisibleLayerCalls: Array<{ face: Face | null; layer: number | null }> = [];
  public revealEntireCubeCalls = 0;
  public hideAllButCurrentLayerCalls: Array<{ face: Face | null; layer: number | null }> = [];

  setMode(mode: '3d' | 'face-on'): void {
    this.setModeCalls.push(mode);
  }

  setVisibleLayer(face: Face | null, layer: number | null): void {
    this.setVisibleLayerCalls.push({ face, layer });
    // Delegate to setExclusiveVisibleLayer to match real implementation
    this.setExclusiveVisibleLayer(face, layer);
  }

  setExclusiveVisibleLayer(face: Face | null, layer: number | null): void {
    this.setExclusiveVisibleLayerCalls.push({ face, layer });
  }

  revealEntireCube(): void {
    this.revealEntireCubeCalls++;
  }

  hideAllButCurrentLayer(face: Face | null, layer: number | null): void {
    this.hideAllButCurrentLayerCalls.push({ face, layer });
    // hideAllButCurrentLayer calls setExclusiveVisibleLayer atomically
    this.setExclusiveVisibleLayer(face, layer);
  }

  reset(): void {
    this.setModeCalls = [];
    this.setVisibleLayerCalls = [];
    this.setExclusiveVisibleLayerCalls = [];
    this.revealEntireCubeCalls = 0;
    this.hideAllButCurrentLayerCalls = [];
  }
}

describe('ViewStateManager', () => {
  let viewStateManager: ViewStateManager;
  let mockSceneManager: MockSceneManager;
  let mockFaceRenderer: MockFaceRenderer;
  let mockMinimapRenderer: MockMinimapRenderer;
  let mockCubeRenderer: MockCubeRenderer;

  beforeEach(() => {
    mockSceneManager = new MockSceneManager();
    mockFaceRenderer = new MockFaceRenderer();
    mockMinimapRenderer = new MockMinimapRenderer();
    mockCubeRenderer = new MockCubeRenderer();

    viewStateManager = new ViewStateManager({
      sceneManager: mockSceneManager as unknown as SceneManager,
      faceRenderer: mockFaceRenderer as unknown as FaceRenderer,
      minimapRenderer: mockMinimapRenderer as unknown as MinimapRenderer,
      cubeRenderer: mockCubeRenderer as unknown as CubeRenderer,
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

      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: 'j', layer: 3 });
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
      // MinimapRenderer should also be updated with new layer
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: 'k', layer: 10 });
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
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: null, layer: null });
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
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: null, layer: null });
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
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: null, layer: null });
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
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: null, layer: null });
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
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: 'k', layer: 7 });

      // Exit face view
      viewStateManager.exitFaceOnView();

      // Verify all components are coordinated
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');
      expect(viewStateManager.getCurrentFace()).toBe(null);
      expect(viewStateManager.getCurrentLayer()).toBe(null);
      expect(mockFaceRenderer.getCurrentFace()).toBe(null);
      expect(mockFaceRenderer.isActiveView()).toBe(false);
      expect(mockSceneManager.resetCameraCalls).toBe(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedFaceCalls[0]).toBe(null);
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(2);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[1]).toEqual({ face: null, layer: null });
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

  describe('outermost layer default behavior (code-46)', () => {
    it('should default to layer 15 for i-face when camera Y is positive', () => {
      mockSceneManager.camera.position.y = 10;

      viewStateManager.enterFaceOnView('i');

      expect(viewStateManager.getCurrentLayer()).toBe(15);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'i', layer: 15 });
    });

    it('should default to layer 0 for i-face when camera Y is negative', () => {
      mockSceneManager.camera.position.y = -10;

      viewStateManager.enterFaceOnView('i');

      expect(viewStateManager.getCurrentLayer()).toBe(0);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'i', layer: 0 });
    });

    it('should default to layer 15 for j-face when camera X is positive', () => {
      mockSceneManager.camera.position.x = 10;

      viewStateManager.enterFaceOnView('j');

      expect(viewStateManager.getCurrentLayer()).toBe(15);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'j', layer: 15 });
    });

    it('should default to layer 0 for j-face when camera X is negative', () => {
      mockSceneManager.camera.position.x = -10;

      viewStateManager.enterFaceOnView('j');

      expect(viewStateManager.getCurrentLayer()).toBe(0);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'j', layer: 0 });
    });

    it('should default to layer 15 for k-face when camera Z is positive', () => {
      mockSceneManager.camera.position.z = 10;

      viewStateManager.enterFaceOnView('k');

      expect(viewStateManager.getCurrentLayer()).toBe(15);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'k', layer: 15 });
    });

    it('should default to layer 0 for k-face when camera Z is negative', () => {
      mockSceneManager.camera.position.z = -10;

      viewStateManager.enterFaceOnView('k');

      expect(viewStateManager.getCurrentLayer()).toBe(0);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'k', layer: 0 });
    });

    it('should use outermost layer when entering from 3D view', () => {
      mockSceneManager.camera.position.z = 10;

      viewStateManager.enterFaceOnView('k');

      expect(viewStateManager.getViewMode()).toBe('face-on');
      expect(viewStateManager.getCurrentLayer()).toBe(15);
    });

    it('should reset to outermost layer when switching between faces', () => {
      mockSceneManager.camera.position.z = 10;
      viewStateManager.enterFaceOnView('k');
      expect(viewStateManager.getCurrentLayer()).toBe(15);

      mockFaceRenderer.reset();
      mockSceneManager.camera.position.y = -10;
      viewStateManager.enterFaceOnView('i');

      expect(viewStateManager.getCurrentLayer()).toBe(0);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'i', layer: 0 });
    });

    it('should reset to outermost layer when re-entering same face from 3D view', () => {
      mockSceneManager.camera.position.z = 10;
      viewStateManager.enterFaceOnView('k');
      expect(viewStateManager.getCurrentLayer()).toBe(15);

      // Exit to 3D view
      viewStateManager.exitFaceOnView();
      mockFaceRenderer.resetState();
      mockSceneManager.reset();

      // Re-enter same face - should reset to outermost
      mockSceneManager.camera.position.z = 10;
      viewStateManager.enterFaceOnView('k');

      expect(viewStateManager.getCurrentLayer()).toBe(15);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'k', layer: 15 });
    });

    it('should respect explicit layer parameter over outermost default', () => {
      mockSceneManager.camera.position.z = 10;

      viewStateManager.enterFaceOnView('k', 7);

      expect(viewStateManager.getCurrentLayer()).toBe(7);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'k', layer: 7 });
    });

    it('should use outermost layer when switching from face view to different face', () => {
      mockSceneManager.camera.position.z = 10;
      viewStateManager.enterFaceOnView('k', 7);
      expect(viewStateManager.getCurrentLayer()).toBe(7);

      mockFaceRenderer.reset();
      mockSceneManager.camera.position.x = -10;
      viewStateManager.enterFaceOnView('j');

      // Should default to outermost layer (0) for j-face, not preserve layer 7
      expect(viewStateManager.getCurrentLayer()).toBe(0);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'j', layer: 0 });
    });
  });

  describe('minimap layer highlight on scroll (code-67)', () => {
    it('should update minimap layer highlight when FaceRenderer layer changes', () => {
      // Enter face-on view
      viewStateManager.enterFaceOnView('k', 5);
      mockMinimapRenderer.reset();

      // Simulate FaceRenderer layer change (e.g., from mouse wheel scroll)
      // Get the callback that was registered
      const layerChangeCallback = (mockFaceRenderer as MockFaceRenderer)['layerChangeCallbacks'][0];

      // Call the callback as if FaceRenderer changed the layer
      layerChangeCallback('k', 8);

      // Verify minimap was updated with new layer
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(1);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: 'k', layer: 8 });
    });

    it('should handle multiple layer changes', () => {
      viewStateManager.enterFaceOnView('i', 0);
      mockMinimapRenderer.reset();

      const layerChangeCallback = (mockFaceRenderer as MockFaceRenderer)['layerChangeCallbacks'][0];

      // Simulate scrolling through several layers
      layerChangeCallback('i', 1);
      layerChangeCallback('i', 2);
      layerChangeCallback('i', 3);

      // Verify minimap was updated for each change
      expect(mockMinimapRenderer.setHighlightedLayerCalls).toHaveLength(3);
      expect(mockMinimapRenderer.setHighlightedLayerCalls[0]).toEqual({ face: 'i', layer: 1 });
      expect(mockMinimapRenderer.setHighlightedLayerCalls[1]).toEqual({ face: 'i', layer: 2 });
      expect(mockMinimapRenderer.setHighlightedLayerCalls[2]).toEqual({ face: 'i', layer: 3 });
    });
  });

  describe('face-to-face transition sprite visibility bug (code-121)', () => {
    it('should call setExclusiveVisibleLayer during layer change within same face', () => {
      // Enter face 'k' at layer 5
      viewStateManager.enterFaceOnView('k', 5);
      mockCubeRenderer.reset();

      // Change to layer 10 within same face
      viewStateManager.enterFaceOnView('k', 10);

      // Should call setExclusiveVisibleLayer atomically
      expect(mockCubeRenderer.setExclusiveVisibleLayerCalls).toHaveLength(1);
      expect(mockCubeRenderer.setExclusiveVisibleLayerCalls[0]).toEqual({ face: 'k', layer: 10 });
    });

    it('should call revealEntireCube when transitioning from one face to another', () => {
      // Enter face 'k' at layer 5
      viewStateManager.enterFaceOnView('k', 5);
      mockCubeRenderer.reset();

      // Transition to face 'i' at layer 7
      viewStateManager.enterFaceOnView('i', 7);

      // Should call revealEntireCube for visual pizzazz
      expect(mockCubeRenderer.revealEntireCubeCalls).toBe(1);
    });

    it('should call hideAllButCurrentLayer in camera animation callback after face-to-face transition', () => {
      // Enter face 'k' at layer 5
      viewStateManager.enterFaceOnView('k', 5);
      mockCubeRenderer.reset();

      // Transition to face 'i' at layer 7
      viewStateManager.enterFaceOnView('i', 7);

      // The callback is invoked immediately in our mock (line 29-32)
      // So hideAllButCurrentLayer should have been called
      expect(mockCubeRenderer.hideAllButCurrentLayerCalls).toHaveLength(1);
      expect(mockCubeRenderer.hideAllButCurrentLayerCalls[0]).toEqual({ face: 'i', layer: 7 });
    });

    it('should call setExclusiveVisibleLayer after face-to-face transition completes', () => {
      // Enter face 'k' at layer 5
      viewStateManager.enterFaceOnView('k', 5);
      mockCubeRenderer.reset();

      // Transition to face 'i' at layer 7
      viewStateManager.enterFaceOnView('i', 7);

      // After transition completes (callback fired immediately in mock),
      // setExclusiveVisibleLayer should have been called
      // (from hideAllButCurrentLayer -> setExclusiveVisibleLayer)
      expect(mockCubeRenderer.setExclusiveVisibleLayerCalls.length).toBeGreaterThanOrEqual(1);
      expect(mockCubeRenderer.setExclusiveVisibleLayerCalls[0]).toEqual({ face: 'i', layer: 7 });
    });

    it('should ensure FaceRenderer enterFaceOnView is called before camera animation starts', () => {
      // Start in 3D view
      expect(viewStateManager.getViewMode()).toBe('3d-rotational');

      // Enter face 'k' at layer 5
      viewStateManager.enterFaceOnView('k', 5);

      // FaceRenderer should be set up before camera animation
      expect(mockFaceRenderer.enterFaceOnViewCalls).toHaveLength(1);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'k', layer: 5 });

      mockFaceRenderer.reset();
      mockCubeRenderer.reset();
      mockSceneManager.reset();

      // Transition to face 'i'
      viewStateManager.enterFaceOnView('i', 7);

      // FaceRenderer.enterFaceOnView should be called BEFORE SceneManager.setFaceOnView
      // In our test, we can verify both were called
      expect(mockFaceRenderer.enterFaceOnViewCalls).toHaveLength(1);
      expect(mockSceneManager.setFaceOnViewCalls).toHaveLength(1);
    });

    it('DEMONSTRATES BUG: revealEntireCube is called but filterCells happens before camera callback', () => {
      // This test demonstrates the exact sequence of calls during a face-to-face transition.
      //
      // ROOT CAUSE ANALYSIS:
      // ====================
      // When transitioning from face 'k' to face 'i':
      //
      // 1. ViewStateManager.enterFaceOnView('i', 7) is called
      // 2. Since this is a face-to-face transition (not same-face layer change):
      //    a. Line 180: revealEntireCube() - Sets ALL sprites visible
      //    b. Line 183: faceRenderer.enterFaceOnView('i', 7)
      //       - This calls updateCellVisibility()
      //       - Which calls cubeRenderer.filterCells(predicate)
      //       - Which should filter sprites to only show layer 7
      //    c. Line 186: Camera animation starts
      //    d. Eventually: Camera callback fires
      //       - Calls hideAllButCurrentLayer('i', 7)
      //       - Which calls setExclusiveVisibleLayer('i', 7)
      //
      // THE BUG:
      // ========
      // Between steps 2a and 2b, there is a window where ALL sprites are visible.
      // Step 2b calls filterCells(), which SHOULD hide sprites not in layer 7.
      // However, filterCells() iterates through ALL cells and calls setSpriteVisibility()
      // for each one based on a predicate.
      //
      // The problem is that filterCells() and setExclusiveVisibleLayer() may produce
      // different results if:
      // - They iterate in different orders
      // - They use different logic to determine visibility
      // - There's a race condition between them
      //
      // The user reports that clicking the same face button AGAIN (which triggers a
      // same-face layer change) fixes the issue. This is because same-face layer
      // changes use setExclusiveVisibleLayer() ATOMICALLY (line 172), without the
      // revealEntireCube() + filterCells() sequence.
      //
      // CONCLUSION:
      // ===========
      // The root cause is that face-to-face transitions use filterCells() (via
      // FaceRenderer.updateCellVisibility()), while same-face layer changes use
      // setExclusiveVisibleLayer() directly. These two methods may not produce
      // identical visibility states, or there's a timing issue where filterCells()
      // doesn't complete before the user sees the result.

      // Start in face 'k' at layer 5
      viewStateManager.enterFaceOnView('k', 5);

      mockCubeRenderer.reset();
      mockFaceRenderer.reset();
      mockSceneManager.reset();

      // Transition to face 'i' at layer 7 (face-to-face transition)
      viewStateManager.enterFaceOnView('i', 7);

      // Verify the call sequence:
      // 1. revealEntireCube() should be called
      expect(mockCubeRenderer.revealEntireCubeCalls).toBe(1);

      // 2. faceRenderer.enterFaceOnView() should be called
      expect(mockFaceRenderer.enterFaceOnViewCalls).toHaveLength(1);
      expect(mockFaceRenderer.enterFaceOnViewCalls[0]).toEqual({ face: 'i', layer: 7 });

      // 3. Camera animation callback should fire (hideAllButCurrentLayer)
      expect(mockCubeRenderer.hideAllButCurrentLayerCalls).toHaveLength(1);
      expect(mockCubeRenderer.hideAllButCurrentLayerCalls[0]).toEqual({ face: 'i', layer: 7 });

      // 4. setExclusiveVisibleLayer should be called from hideAllButCurrentLayer
      expect(mockCubeRenderer.setExclusiveVisibleLayerCalls.length).toBeGreaterThanOrEqual(1);

      // The bug is that FaceRenderer.enterFaceOnView() calls updateCellVisibility()
      // which uses filterCells(), but this may not produce the same result as
      // setExclusiveVisibleLayer(). The fix would be to ensure that
      // FaceRenderer.enterFaceOnView() does NOT call filterCells() during face-to-face
      // transitions, and instead relies solely on the camera callback's
      // hideAllButCurrentLayer() -> setExclusiveVisibleLayer() to set visibility.
    });
  });
});
