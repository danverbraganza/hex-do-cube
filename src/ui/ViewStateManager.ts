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

import * as THREE from 'three';
import type { SceneManager } from '../renderer/SceneManager.js';
import type { FaceRenderer, Face } from '../renderer/FaceRenderer.js';
import type { MinimapRenderer } from '../renderer/MinimapRenderer.js';
import type { SubsquareSeparatorRenderer } from '../renderer/SubsquareSeparatorRenderer.js';
import type { CubeRenderer } from '../renderer/CubeRenderer.js';
import type { CellStateManager } from './CellStateManager.js';
import type { Position } from '../models/Cell.js';

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
  cellStateManager?: CellStateManager;
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
  private cellStateManager?: CellStateManager;

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
    this.cellStateManager = config.cellStateManager;

    // Listen to layer changes from FaceRenderer to update minimap
    this.faceRenderer.onLayerChange((face, layer) => {
      this.minimapRenderer.setHighlightedLayer(face, layer);
    });
  }

  /**
   * Determine the outermost layer for a face based on camera position
   * @param face - The face to view ('i', 'j', or 'k')
   * @returns The outermost layer (0 or 15)
   */
  private getOutermostLayer(face: Face): number {
    const camera = this.sceneManager.getCamera();

    switch (face) {
      case 'i': // Y-axis face
        // If camera Y position is positive, outermost is layer 15
        // If camera Y position is negative, outermost is layer 0
        return camera.position.y > 0 ? 15 : 0;
      case 'j': // X-axis face
        // If camera X position is positive, outermost is layer 15
        // If camera X position is negative, outermost is layer 0
        return camera.position.x > 0 ? 15 : 0;
      case 'k': // Z-axis face
        // If camera Z position is positive, outermost is layer 15
        // If camera Z position is negative, outermost is layer 0
        return camera.position.z > 0 ? 15 : 0;
    }
  }

  /**
   * Calculate the appropriate layer for a selected cell based on the target face
   * @param face - The face to view ('i', 'j', or 'k')
   * @param position - The position of the selected cell [i, j, k]
   * @returns The layer depth that contains the selected cell for the given face
   */
  private getLayerForSelectedCell(face: Face, position: Position): number {
    const [i, j, k] = position;
    switch (face) {
      case 'i': // i-face views XY planes at different i depths
        return i;
      case 'j': // j-face views XZ planes at different j depths
        return j;
      case 'k': // k-face views YZ planes at different k depths
        return k;
    }
  }

  /**
   * Enter face-on view for a specific face
   * Coordinates all components to transition smoothly
   *
   * @param face - The face to view ('i', 'j', or 'k')
   * @param layer - The initial layer depth (0-15). If undefined, defaults to:
   *                - Layer containing the selected cell (if a cell is selected)
   *                - Outermost layer based on camera position (if no cell is selected)
   */
  public enterFaceOnView(face: Face, layer?: number): void {
    // Determine target layer if not explicitly specified
    let targetLayer: number;
    if (layer !== undefined) {
      // Layer explicitly provided - use it
      targetLayer = layer;
    } else {
      // Layer not specified - check for selected cell
      const selectedCell = this.cellStateManager?.getSelectedCell();
      if (selectedCell) {
        // Navigate to the layer containing the selected cell
        targetLayer = this.getLayerForSelectedCell(face, selectedCell);
      } else {
        // No selection - use outermost layer based on camera position
        targetLayer = this.getOutermostLayer(face);
      }
    }
    // Don't re-enter if already in face-on view for the same face
    if (this.currentMode === 'face-on' && this.faceRenderer.getCurrentFace() === face) {
      // Just update the layer if different
      if (this.faceRenderer.getCurrentLayer() !== targetLayer) {
        this.faceRenderer.setLayer(targetLayer);
        this.minimapRenderer.setHighlightedLayer(face, targetLayer);
        // Update layer visibility for CubeRenderer
        this.cubeRenderer.setVisibleLayer(face, targetLayer);
        // Notify listeners of layer change
        this.notifyViewModeChange('face-on', face, targetLayer);
      }
      return;
    }

    // Update state
    this.currentMode = 'face-on';

    // VISUAL PIZZAZZ: Reveal entire cube during transition
    this.cubeRenderer.revealEntireCube();

    // Coordinate all components
    this.faceRenderer.enterFaceOnView(face, targetLayer);

    // Set up camera animation with completion callback
    this.sceneManager.setFaceOnView(face, targetLayer, true, () => {
      // TRANSITION COMPLETE: Hide all but current layer
      this.cubeRenderer.setMode('face-on');
      this.cubeRenderer.hideAllButCurrentLayer(face, targetLayer);
    });

    // Only highlight the layer slice, not the face surface
    // (layer highlight already shows which face we're viewing at which depth)
    this.minimapRenderer.setHighlightedLayer(face, targetLayer);

    // Set rendering mode for face-on
    this.cubeRenderer.setMode('face-on');

    // Set subsquare separator mode
    this.subsquareSeparatorRenderer?.setMode('face-on', face, targetLayer);

    // Notify listeners
    this.notifyViewModeChange('face-on', face, targetLayer);
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

    // VISUAL PIZZAZZ: Reveal entire cube during transition
    this.cubeRenderer.revealEntireCube();

    // Coordinate all components
    this.faceRenderer.exitFaceOnView();

    // Set up camera animation with completion callback
    this.sceneManager.resetCamera(true, () => {
      // TRANSITION COMPLETE: Show all layers for 3D view
      this.cubeRenderer.setMode('3d');
      this.cubeRenderer.hideAllButCurrentLayer(null, null);
    });

    this.minimapRenderer.setHighlightedFace(null);
    this.minimapRenderer.setHighlightedLayer(null, null);

    // Set rendering mode for 3D
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
   * Start auto-rotation of the camera around the cube
   * @param speed - Rotation speed in radians per second (default: Math.PI / 6)
   * @param axis - Rotation axis (default: Y axis for horizontal rotation)
   */
  public startAutoRotation(speed?: number, axis?: THREE.Vector3): void {
    this.sceneManager.startAutoRotation(speed, axis);
  }

  /**
   * Stop auto-rotation of the camera
   */
  public stopAutoRotation(): void {
    this.sceneManager.stopAutoRotation();
  }

  /**
   * Check if auto-rotation is currently active
   */
  public isAutoRotating(): boolean {
    return this.sceneManager.isAutoRotating();
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
    for (const callback of [...this.viewModeChangeCallbacks]) {
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
