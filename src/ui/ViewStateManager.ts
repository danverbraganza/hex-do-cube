/**
 * ViewStateManager for Hex-Do-Cube
 * Coordinates view state transitions between 3D rotational view and face-on editing view.
 *
 * Responsibilities:
 * - Centralize view state management
 * - Coordinate all components during view transitions (SceneManager, CubeRenderer, FaceRenderer, MinimapRenderer)
 * - Ensure smooth transitions with proper animation updates
 * - Provide a single source of truth for current view state
 * - Handle edge cases (e.g., transitioning while animating)
 *
 * This manager sits between the InputController/GameUI and the rendering components,
 * ensuring all transitions are properly coordinated.
 */

import type { SceneManager } from '../renderer/SceneManager.js';
import type { FaceRenderer, Face } from '../renderer/FaceRenderer.js';
import type { MinimapRenderer } from '../renderer/MinimapRenderer.js';
import type { SubsquareSeparatorRenderer } from '../renderer/SubsquareSeparatorRenderer.js';
import type { CubeRenderer } from '../renderer/CubeRenderer.js';

/**
 * View mode types
 */
export type ViewMode = '3d-rotational' | 'face-on';

/**
 * Configuration for ViewStateManager
 */
export interface ViewStateManagerConfig {
  sceneManager: SceneManager;
  faceRenderer: FaceRenderer;
  minimapRenderer: MinimapRenderer;
  cubeRenderer: CubeRenderer;
  subsquareSeparatorRenderer?: SubsquareSeparatorRenderer;
}

/**
 * Callback for view mode changes
 */
export type ViewModeChangeCallback = (mode: ViewMode, face?: Face, layer?: number) => void;

/**
 * ViewStateManager coordinates all view transitions
 */
export class ViewStateManager {
  private sceneManager: SceneManager;
  private faceRenderer: FaceRenderer;
  private minimapRenderer: MinimapRenderer;
  private cubeRenderer: CubeRenderer;
  private subsquareSeparatorRenderer?: SubsquareSeparatorRenderer;

  // Current view state
  private currentMode: ViewMode = '3d-rotational';

  // Callbacks
  private viewModeChangeCallbacks: ViewModeChangeCallback[] = [];

  constructor(config: ViewStateManagerConfig) {
    this.sceneManager = config.sceneManager;
    this.faceRenderer = config.faceRenderer;
    this.minimapRenderer = config.minimapRenderer;
    this.cubeRenderer = config.cubeRenderer;
    this.subsquareSeparatorRenderer = config.subsquareSeparatorRenderer;
  }

  /**
   * Enter face-on view for a specific face
   * Coordinates all components to transition smoothly
   *
   * @param face - The face to view ('i', 'j', or 'k')
   * @param layer - The initial layer depth (0-15)
   */
  public enterFaceOnView(face: Face, layer: number): void {
    // Don't re-enter if already in face-on view for the same face
    if (this.currentMode === 'face-on' && this.faceRenderer.getCurrentFace() === face) {
      // Just update the layer if different
      if (this.faceRenderer.getCurrentLayer() !== layer) {
        this.faceRenderer.setLayer(layer);
        this.minimapRenderer.setHighlightedLayer(face, layer);
        // Notify listeners of layer change
        this.notifyViewModeChange('face-on', face, layer);
      }
      return;
    }

    // Update state
    this.currentMode = 'face-on';

    // Coordinate all components
    this.faceRenderer.enterFaceOnView(face, layer);
    this.sceneManager.setFaceOnView(face, layer);
    this.minimapRenderer.setHighlightedFace(face);
    this.minimapRenderer.setHighlightedLayer(face, layer);
    this.cubeRenderer.setMode('face-on');
    this.subsquareSeparatorRenderer?.setMode('face-on', face, layer);

    // Notify listeners
    this.notifyViewModeChange('face-on', face, layer);
  }

  /**
   * Exit face-on view and return to 3D rotational view
   * Coordinates all components to transition smoothly
   */
  public exitFaceOnView(): void {
    // Don't exit if already in 3D view
    if (this.currentMode === '3d-rotational') {
      return;
    }

    // Update state
    this.currentMode = '3d-rotational';

    // Coordinate all components
    this.faceRenderer.exitFaceOnView();
    this.sceneManager.resetCamera();
    this.minimapRenderer.setHighlightedFace(null);
    this.minimapRenderer.setHighlightedLayer(null, null);
    this.cubeRenderer.setMode('3d');
    this.subsquareSeparatorRenderer?.setMode('3d');

    // Notify listeners
    this.notifyViewModeChange('3d-rotational');
  }

  /**
   * Return to canonical 3D rotational view
   * This is the same as exitFaceOnView() but more explicit for UI controls like Home button
   */
  public returnTo3DView(): void {
    this.exitFaceOnView();
  }

  /**
   * Get the current view mode
   */
  public getViewMode(): ViewMode {
    return this.currentMode;
  }

  /**
   * Get the current face being viewed (only valid in face-on mode)
   */
  public getCurrentFace(): Face | null {
    return this.faceRenderer.getCurrentFace();
  }

  /**
   * Get the current layer being viewed (only valid in face-on mode)
   */
  public getCurrentLayer(): number | null {
    if (this.currentMode !== 'face-on') {
      return null;
    }
    return this.faceRenderer.getCurrentLayer();
  }

  /**
   * Check if currently in face-on view
   */
  public isInFaceOnView(): boolean {
    return this.currentMode === 'face-on';
  }

  /**
   * Update animation state (should be called each frame from render loop)
   * This ensures smooth layer transitions in face-on view
   */
  public update(): void {
    // Update FaceRenderer animations (layer transitions)
    if (this.currentMode === 'face-on') {
      this.faceRenderer.update();
    }
  }

  /**
   * Register a callback for view mode changes
   */
  public onViewModeChange(callback: ViewModeChangeCallback): void {
    this.viewModeChangeCallbacks.push(callback);
  }

  /**
   * Notify all listeners of a view mode change
   */
  private notifyViewModeChange(mode: ViewMode, face?: Face, layer?: number): void {
    for (const callback of this.viewModeChangeCallbacks) {
      callback(mode, face, layer);
    }
  }

  /**
   * Handle edge case: ensure consistent state if components get out of sync
   * This is a safety method that can be called periodically or after errors
   */
  public syncState(): void {
    const faceRendererActive = this.faceRenderer.isActiveView();

    if (this.currentMode === 'face-on' && !faceRendererActive) {
      // State mismatch: we think we're in face-on but FaceRenderer doesn't
      // Force exit to 3D view
      this.currentMode = '3d-rotational';
      this.sceneManager.resetCamera();
      this.minimapRenderer.setHighlightedFace(null);
      this.minimapRenderer.setHighlightedLayer(null, null);
    } else if (this.currentMode === '3d-rotational' && faceRendererActive) {
      // State mismatch: FaceRenderer thinks it's active but we don't
      // Force FaceRenderer to exit
      this.faceRenderer.exitFaceOnView();
      this.minimapRenderer.setHighlightedFace(null);
      this.minimapRenderer.setHighlightedLayer(null, null);
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.viewModeChangeCallbacks = [];
  }
}
