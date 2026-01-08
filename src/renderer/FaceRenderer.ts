/**
 * FaceRenderer for Hex-Do-Cube
 * Manages face-on editing view with layer navigation and discrete layer opacity.
 *
 * Responsibilities:
 * - Enter face-on mode for a specific face (i, j, or k)
 * - Manage layer navigation (0-15) via mouse wheel scrolling
 * - Adjust camera to orthographic-style viewing (via SceneManager)
 * - Control cell visibility/opacity for face-on rendering
 * - Coordinate with CubeRenderer to show/hide appropriate cells
 * - Provide smooth opacity animation during layer transitions
 * - Ensure discrete layers (no "frozen between layers" state)
 * - Current layer at 100% opacity, blank cells rendered as solid
 */

import type { CubeRenderer } from './CubeRenderer.js';
import type { SceneManager } from './SceneManager.js';
import type { Position } from '../models/Cell.js';

/**
 * Face type for the face-on view
 * - 'i': top/bottom face (y-axis), rows=j, columns=k, layers=i
 * - 'j': right/left face (x-axis), rows=i, columns=k, layers=j
 * - 'k': front/back face (z-axis), rows=i, columns=j, layers=k
 */
export type Face = 'i' | 'j' | 'k';

/**
 * Configuration for FaceRenderer
 */
export interface FaceRendererConfig {
  /** Duration of layer transition animation in milliseconds */
  transitionDuration?: number;
  /** Opacity of cells during transition (for smooth animation) */
  transitionOpacity?: number;
}

/**
 * FaceRenderer manages the face-on editing view with layer navigation
 */
export class FaceRenderer {
  private cubeRenderer: CubeRenderer;
  private sceneManager: SceneManager;
  private config: Required<FaceRendererConfig>;

  // Current face-on view state
  private isActive: boolean = false;
  private currentFace: Face | null = null;
  private currentLayer: number = 0;

  // Animation state
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionFromLayer: number = 0;
  private transitionToLayer: number = 0;

  // Layer change callbacks
  private layerChangeCallbacks: Array<(face: Face, layer: number) => void> = [];

  constructor(
    cubeRenderer: CubeRenderer,
    sceneManager: SceneManager,
    config: FaceRendererConfig = {}
  ) {
    this.cubeRenderer = cubeRenderer;
    this.sceneManager = sceneManager;

    // Apply default configuration
    this.config = {
      transitionDuration: config.transitionDuration ?? 300,
      transitionOpacity: config.transitionOpacity ?? 0.3,
    };
  }

  /**
   * Enter face-on view for a specific face
   * @param face - The face to view ('i', 'j', or 'k')
   * @param layer - The initial layer depth (0-15), defaults to 0
   */
  public enterFaceOnView(face: Face, layer: number = 0): void {
    if (layer < 0 || layer > 15) {
      throw new Error(`Invalid layer: ${layer}. Must be in range [0, 15].`);
    }

    this.isActive = true;
    this.currentFace = face;
    this.currentLayer = layer;
    this.isTransitioning = false;

    // Position camera for face-on view
    this.sceneManager.setFaceOnView(face, layer);

    // Update cell visibility for the current layer
    this.updateCellVisibility();
  }

  /**
   * Exit face-on view and return to 3D rotational view
   */
  public exitFaceOnView(): void {
    this.isActive = false;
    this.currentFace = null;
    this.isTransitioning = false;

    // Reset camera to canonical isometric view
    this.sceneManager.resetCamera();

    // Show all cells with translucent rendering
    this.cubeRenderer.setAllCellsVisibility(true);
  }

  /**
   * Check if face-on view is currently active
   */
  public isActiveView(): boolean {
    return this.isActive;
  }

  /**
   * Get the current face being viewed
   */
  public getCurrentFace(): Face | null {
    return this.currentFace;
  }

  /**
   * Get the current layer being viewed
   */
  public getCurrentLayer(): number {
    return this.currentLayer;
  }

  /**
   * Navigate to a specific layer
   * @param layer - The target layer (0-15)
   */
  public setLayer(layer: number): void {
    if (!this.isActive || this.currentFace === null) {
      throw new Error('Face-on view is not active');
    }

    if (layer < 0 || layer > 15) {
      throw new Error(`Invalid layer: ${layer}. Must be in range [0, 15].`);
    }

    if (layer === this.currentLayer) {
      return; // Already at this layer
    }

    // Start transition animation
    this.transitionFromLayer = this.currentLayer;
    this.transitionToLayer = layer;
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();

    // Update current layer immediately (discrete layer approach)
    this.currentLayer = layer;

    // Notify listeners of layer change
    this.notifyLayerChange();
  }

  /**
   * Navigate to the next layer (deeper into the cube)
   */
  public nextLayer(): void {
    if (this.currentLayer < 15) {
      this.setLayer(this.currentLayer + 1);
    }
  }

  /**
   * Navigate to the previous layer (shallower in the cube)
   */
  public previousLayer(): void {
    if (this.currentLayer > 0) {
      this.setLayer(this.currentLayer - 1);
    }
  }

  /**
   * Handle mouse wheel scroll for layer navigation
   * @param deltaY - The vertical scroll delta from the wheel event
   */
  public handleWheelScroll(deltaY: number): void {
    if (!this.isActive) {
      return;
    }

    // Positive deltaY = scroll down = next layer (deeper)
    // Negative deltaY = scroll up = previous layer (shallower)
    if (deltaY > 0) {
      this.nextLayer();
    } else if (deltaY < 0) {
      this.previousLayer();
    }
  }

  /**
   * Update animation state and cell visibility
   * Should be called each frame from the render loop
   */
  public update(): void {
    if (!this.isActive || !this.isTransitioning) {
      return;
    }

    const elapsed = performance.now() - this.transitionStartTime;
    const progress = Math.min(elapsed / this.config.transitionDuration, 1.0);

    if (progress >= 1.0) {
      // Transition complete
      this.isTransitioning = false;
      this.updateCellVisibility();
    } else {
      // During transition, show both layers with interpolated opacity
      this.updateTransitionVisibility(progress);
    }
  }

  /**
   * Update cell visibility for the current discrete layer
   * Current layer at 100% opacity, all others hidden
   */
  private updateCellVisibility(): void {
    if (!this.isActive || this.currentFace === null) {
      return;
    }

    const face = this.currentFace;
    const layer = this.currentLayer;

    // Filter cells to show only those in the current layer
    this.cubeRenderer.filterCells((cell) => {
      const [i, j, k] = cell.position;

      switch (face) {
        case 'i': // Rows=j, columns=k, layers=i
          return i === layer;
        case 'j': // Rows=i, columns=k, layers=j
          return j === layer;
        case 'k': // Rows=i, columns=j, layers=k
          return k === layer;
      }
    });
  }

  /**
   * Update cell visibility during layer transition
   * Shows both from and to layers with interpolated opacity for smooth animation
   * @param progress - Animation progress from 0 to 1
   */
  private updateTransitionVisibility(progress: number): void {
    if (!this.isActive || this.currentFace === null) {
      return;
    }

    const face = this.currentFace;
    const fromLayer = this.transitionFromLayer;
    const toLayer = this.transitionToLayer;

    // Note: For MVP, we use discrete visibility with smooth timing
    // Future enhancement: interpolate mesh material opacity based on progress
    // fromOpacity = 1.0 - progress, toOpacity = progress
    void progress; // Used for future opacity interpolation

    // Show cells from both layers during transition
    this.cubeRenderer.filterCells((cell) => {
      const [i, j, k] = cell.position;
      let cellLayer: number;

      switch (face) {
        case 'i':
          cellLayer = i;
          break;
        case 'j':
          cellLayer = j;
          break;
        case 'k':
          cellLayer = k;
          break;
      }

      // Show cells from both transitioning layers
      return cellLayer === fromLayer || cellLayer === toLayer;
    });

    // Note: Actual opacity interpolation would require updating mesh materials
    // For MVP, we use discrete visibility with smooth timing
    // Future enhancement: interpolate mesh material opacity based on fromOpacity/toOpacity
  }

  /**
   * Get all cell positions visible in the current layer
   * Useful for determining which cells can be edited
   */
  public getVisibleCells(): Position[] {
    if (!this.isActive || this.currentFace === null) {
      return [];
    }

    const face = this.currentFace;
    const layer = this.currentLayer;
    const positions: Position[] = [];

    for (let a = 0; a < 16; a++) {
      for (let b = 0; b < 16; b++) {
        let position: Position;

        switch (face) {
          case 'i': // layer=i, rows=j, columns=k
            position = [layer, a, b] as const;
            break;
          case 'j': // layer=j, rows=i, columns=k
            position = [a, layer, b] as const;
            break;
          case 'k': // layer=k, rows=i, columns=j
            position = [a, b, layer] as const;
            break;
        }

        positions.push(position);
      }
    }

    return positions;
  }

  /**
   * Convert screen coordinates to cell position in the current layer
   * @param row - The row index (0-15) in the face
   * @param col - The column index (0-15) in the face
   * @returns The 3D position of the cell
   */
  public getCellPositionFromFaceCoords(row: number, col: number): Position | null {
    if (!this.isActive || this.currentFace === null) {
      return null;
    }

    if (row < 0 || row > 15 || col < 0 || col > 15) {
      return null;
    }

    const face = this.currentFace;
    const layer = this.currentLayer;

    switch (face) {
      case 'i': // layer=i, rows=j, columns=k
        return [layer, row, col] as const;
      case 'j': // layer=j, rows=i, columns=k
        return [row, layer, col] as const;
      case 'k': // layer=k, rows=i, columns=j
        return [row, col, layer] as const;
    }
  }

  /**
   * Convert cell position to face coordinates (row, col) in the current face
   * @param position - The 3D cell position
   * @returns The [row, col] coordinates in the face, or null if not in current layer
   */
  public getFaceCoordsFromPosition(position: Position): [row: number, col: number] | null {
    if (!this.isActive || this.currentFace === null) {
      return null;
    }

    const [i, j, k] = position;
    const face = this.currentFace;
    const layer = this.currentLayer;

    switch (face) {
      case 'i': // layer=i, rows=j, columns=k
        if (i !== layer) return null;
        return [j, k];
      case 'j': // layer=j, rows=i, columns=k
        if (j !== layer) return null;
        return [i, k];
      case 'k': // layer=k, rows=i, columns=j
        if (k !== layer) return null;
        return [i, j];
    }
  }

  /**
   * Register a callback for layer changes
   * @param callback - Function to call when the layer changes
   */
  public onLayerChange(callback: (face: Face, layer: number) => void): void {
    this.layerChangeCallbacks.push(callback);
  }

  /**
   * Notify all layer change callbacks
   */
  private notifyLayerChange(): void {
    if (this.currentFace === null) {
      return;
    }
    for (const callback of this.layerChangeCallbacks) {
      callback(this.currentFace, this.currentLayer);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.exitFaceOnView();
    this.layerChangeCallbacks = [];
  }
}
