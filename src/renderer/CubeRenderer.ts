/**
 * CubeRenderer for Hex-Do-Cube
 * Manages 3D rendering of the 16×16×16 cube with individual meshes for each cell.
 *
 * Responsibilities:
 * - Create and manage individual meshes for all 4096 cells
 * - Translucent rendering: filled cells at very low opacity, empty cells transparent
 * - Support hover/selection states for cells
 * - Provide ray-casting for cell picking
 * - Update cell appearances based on Cube model state
 * - Coordinate with SceneManager for rotation controls
 *
 * PERFORMANCE NOTES:
 * - Uses shared geometry (1 BoxGeometry for all 4096 cells) ✓
 * - Uses shared materials (6 materials total, reused across cells) ✓
 * - Translucent materials have depthWrite: false to avoid z-fighting ✓
 * - Ray-casting only tests visible meshes to reduce intersection tests ✓
 * - Future optimization: InstancedMesh could reduce 4096 draw calls to ~6 (P3 priority)
 * - Future optimization: Frustum culling per layer in face-on mode (P3 priority)
 */

import * as THREE from 'three';
import type { Cube } from '../models/Cube.js';
import type { Cell, Position } from '../models/Cell.js';
import { positionKey } from '../models/Cell.js';
import { ValueSpriteRenderer } from './ValueSpriteRenderer.js';
import { COLORS, OPACITY } from '../config/RenderConfig.js';
import { PALETTE } from '../config/ColorPalette.js';
import { calculateSpacing, calculateCenterOffset, cellPositionToWorld } from './geometry.js';

/**
 * Visual state for a cell (hover, selected, error, conflict-given, wrong)
 * - 'conflict-given': Green highlight for given cells involved in conflicts
 * - 'wrong': Red highlight for user-entered cells with incorrect values
 */
export type CellState = 'normal' | 'hover' | 'selected' | 'error' | 'conflict-given' | 'wrong';

/**
 * Configuration for CubeRenderer
 */
export interface CubeRendererConfig {
  /** Size of each cell cube in 3D space */
  cellSize?: number;
  /** Gap between adjacent cells */
  cellGap?: number;
  /** Opacity for filled cells (very low for translucency) */
  filledOpacity?: number;
  /** Opacity for empty cells (0 = transparent) */
  emptyOpacity?: number;
  /** Color for given cells */
  givenColor?: number;
  /** Color for editable cells */
  editableColor?: number;
  /** Color for hover state */
  hoverColor?: number;
  /** Color for selected state */
  selectedColor?: number;
  /** Color for error state */
  errorColor?: number;
  /** Color for conflict-given state (green) */
  conflictGivenColor?: number;
  /** Color for wrong state (red) */
  wrongColor?: number;
}

/**
 * Maps a cell position to its mesh
 */
type CellMeshMap = Map<string, THREE.Mesh>;

/**
 * CubeRenderer manages the 3D visualization of the puzzle cube
 */
export class CubeRenderer {
  private cube: Cube;
  private config: Required<CubeRendererConfig>;

  // Mesh management
  private cellMeshes: CellMeshMap = new Map();
  private cellGeometry: THREE.BoxGeometry;
  private materials: {
    givenFilled: THREE.MeshStandardMaterial;
    editableFilled: THREE.MeshStandardMaterial;
    empty: THREE.MeshStandardMaterial;
    hover: THREE.MeshStandardMaterial;
    selected: THREE.MeshStandardMaterial;
    error: THREE.MeshStandardMaterial;
    conflictGiven: THREE.MeshStandardMaterial;
    wrong: THREE.MeshStandardMaterial;
  };

  // Container for all meshes
  private container: THREE.Group;

  // Cell state tracking
  private cellStates: Map<string, CellState> = new Map();

  // Raycaster for picking
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Value sprite renderer for billboard sprites
  private spriteRenderer: ValueSpriteRenderer;

  // Current rendering mode
  private renderMode: '3d' | 'face-on' = '3d';

  constructor(cube: Cube, config: CubeRendererConfig = {}) {
    this.cube = cube;

    // Apply default configuration
    this.config = {
      cellSize: config.cellSize ?? 1,
      cellGap: config.cellGap ?? 0.1,
      filledOpacity: config.filledOpacity ?? OPACITY.FILLED,
      emptyOpacity: config.emptyOpacity ?? 0.05,
      givenColor: config.givenColor ?? PALETTE.cell.given.hex,
      editableColor: config.editableColor ?? PALETTE.cell.editable.hex,
      hoverColor: config.hoverColor ?? PALETTE.cell.hover.hex,
      selectedColor: config.selectedColor ?? PALETTE.cell.selected.hex,
      errorColor: config.errorColor ?? PALETTE.cell.error.hex,
      conflictGivenColor: config.conflictGivenColor ?? PALETTE.cell.conflictGiven.hex,
      wrongColor: config.wrongColor ?? PALETTE.cell.wrong.hex,
    };

    // Create container group at world origin
    // The container itself stays at (0, 0, 0) - all child meshes are positioned
    // relative to this origin with offsets that center the cube's geometric center at (0, 0, 0)
    this.container = new THREE.Group();
    this.container.name = 'CubeRenderer';
    this.container.position.set(0, 0, 0); // Explicitly set to origin (redundant but clear)

    // Create shared geometry
    this.cellGeometry = new THREE.BoxGeometry(
      this.config.cellSize,
      this.config.cellSize,
      this.config.cellSize
    );

    // Create materials
    this.materials = this.createMaterials();

    // Initialize all cell meshes
    this.initializeCellMeshes();

    // Initialize sprite renderer for cell values
    this.spriteRenderer = new ValueSpriteRenderer(cube, {
      cellSize: this.config.cellSize,
      cellGap: this.config.cellGap,
      spriteSize: this.config.cellSize * 0.8, // Sprite slightly smaller than cell
    });

    // Add sprite container to main container
    this.container.add(this.spriteRenderer.getContainer());
  }

  /**
   * Create all materials used for rendering cells
   */
  private createMaterials() {
    return {
      givenFilled: new THREE.MeshStandardMaterial({
        color: this.config.givenColor,
        transparent: true,
        opacity: this.config.filledOpacity,
        depthWrite: false,
      }),
      editableFilled: new THREE.MeshStandardMaterial({
        color: this.config.editableColor,
        transparent: true,
        opacity: this.config.filledOpacity,
        depthWrite: false,
      }),
      empty: new THREE.MeshStandardMaterial({
        color: COLORS.WHITE,
        transparent: true,
        opacity: this.config.emptyOpacity,
        depthWrite: false,
      }),
      hover: new THREE.MeshStandardMaterial({
        color: this.config.hoverColor,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
      selected: new THREE.MeshStandardMaterial({
        color: this.config.selectedColor,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
      error: new THREE.MeshStandardMaterial({
        color: this.config.errorColor,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
      conflictGiven: new THREE.MeshStandardMaterial({
        color: this.config.conflictGivenColor,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
      wrong: new THREE.MeshStandardMaterial({
        color: this.config.wrongColor,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    };
  }

  /**
   * Initialize meshes for all 4096 cells
   *
   * CENTERING STRATEGY:
   * Uses shared geometry utilities to ensure consistent positioning with all renderers.
   * See geometry.ts for details on centering calculations.
   */
  private initializeCellMeshes(): void {
    const numCells = 16;

    for (let i = 0; i < numCells; i++) {
      for (let j = 0; j < numCells; j++) {
        for (let k = 0; k < numCells; k++) {
          const cell = this.cube.cells[i][j][k];
          const mesh = this.createCellMesh(cell);

          // Position mesh using shared geometry utilities
          const worldPos = cellPositionToWorld(
            i, j, k,
            this.config.cellSize,
            this.config.cellGap
          );
          mesh.position.set(worldPos.x, worldPos.y, worldPos.z);

          // Store mesh reference
          const key = positionKey([i, j, k]);
          this.cellMeshes.set(key, mesh);
          this.cellStates.set(key, 'normal');

          // Add to container
          this.container.add(mesh);
        }
      }
    }
  }

  /**
   * Create a mesh for a single cell
   */
  private createCellMesh(cell: Cell): THREE.Mesh {
    const material = this.getMaterialForCell(cell, 'normal');
    const mesh = new THREE.Mesh(this.cellGeometry, material);

    // Store cell position in userData for picking
    mesh.userData.position = cell.position;
    mesh.userData.cell = cell;

    return mesh;
  }

  /**
   * Get the appropriate material for a cell based on its state
   */
  private getMaterialForCell(cell: Cell, state: CellState): THREE.Material {
    // State-based materials take precedence
    if (state === 'hover') return this.materials.hover;
    if (state === 'selected') return this.materials.selected;
    if (state === 'error') return this.materials.error;
    if (state === 'conflict-given') return this.materials.conflictGiven;
    if (state === 'wrong') return this.materials.wrong;

    // Default materials based on cell value and type
    if (cell.value === null) {
      return this.materials.empty;
    } else if (cell.type === 'given') {
      return this.materials.givenFilled;
    } else {
      return this.materials.editableFilled;
    }
  }

  /**
   * Update a specific cell's appearance
   */
  public updateCell(position: Position): void {
    const key = positionKey(position);
    const mesh = this.cellMeshes.get(key);
    if (!mesh) return;

    const [i, j, k] = position;
    const cell = this.cube.cells[i][j][k];
    const state = this.cellStates.get(key) ?? 'normal';

    mesh.material = this.getMaterialForCell(cell, state);
    mesh.userData.cell = cell;

    // Update sprite for this cell
    this.spriteRenderer.updateCell(position);
  }

  /**
   * Update all cells' appearances (useful after bulk changes)
   */
  public updateAllCells(): void {
    this.cube.forEachCell((_cell, position) => {
      this.updateCell(position);
    });
    // Update all sprites as well
    this.spriteRenderer.updateAllSprites();
  }

  /**
   * Set rendering mode (3D or face-on)
   * In face-on mode, all cells are rendered opaque for single-layer clarity
   * In 3D mode, cells are rendered translucent for see-through effect
   * @param mode - '3d' for 3D rotational view, 'face-on' for face editing view
   */
  public setMode(mode: '3d' | 'face-on'): void {
    if (this.renderMode === mode) {
      return; // No change needed
    }

    this.renderMode = mode;

    // Update cell material opacities based on mode
    if (mode === 'face-on') {
      // In face-on mode, all cells should be opaque to prevent seeing through layers
      this.materials.empty.opacity = 1.0;
      this.materials.givenFilled.opacity = 1.0;
      this.materials.editableFilled.opacity = 1.0;
    } else {
      // In 3D mode, cells are translucent/transparent
      this.materials.empty.opacity = this.config.emptyOpacity;
      this.materials.givenFilled.opacity = this.config.filledOpacity;
      this.materials.editableFilled.opacity = this.config.filledOpacity;
    }

    // Update all cells to reflect the new material state
    this.updateAllCells();
  }

  /**
   * Set the visual state of a cell (hover, selected, error)
   */
  public setCellState(position: Position, state: CellState): void {
    const key = positionKey(position);
    this.cellStates.set(key, state);
    this.updateCell(position);
  }

  /**
   * Get the visual state of a cell
   */
  public getCellState(position: Position): CellState {
    const key = positionKey(position);
    return this.cellStates.get(key) ?? 'normal';
  }

  /**
   * Clear the state of a cell back to normal
   */
  public clearCellState(position: Position): void {
    this.setCellState(position, 'normal');
  }

  /**
   * Clear all cell states back to normal
   */
  public clearAllStates(): void {
    for (const key of this.cellStates.keys()) {
      this.cellStates.set(key, 'normal');
    }
    this.updateAllCells();
  }

  /**
   * Show or hide a specific cell
   */
  public setCellVisibility(position: Position, visible: boolean): void {
    const key = positionKey(position);
    const mesh = this.cellMeshes.get(key);
    if (mesh) {
      mesh.visible = visible;
    }
    // Also update sprite visibility
    this.spriteRenderer.setSpriteVisibility(position, visible);
  }

  /**
   * Show or hide all cells
   */
  public setAllCellsVisibility(visible: boolean): void {
    for (const mesh of this.cellMeshes.values()) {
      mesh.visible = visible;
    }
    // Also update all sprites
    this.spriteRenderer.setAllSpritesVisibility(visible);
  }

  /**
   * Set visible layer for face-on view
   * @param face - The face being viewed ('i', 'j', or 'k')
   * @param layer - The layer index to show (0-15), or null to show all layers
   *
   * Face meanings:
   * - 'i': XY plane at different Z depths, hide cells where i !== layer
   * - 'j': XZ plane at different Y depths, hide cells where j !== layer
   * - 'k': YZ plane at different X depths, hide cells where k !== layer
   *
   * When layer is null, all layers are visible (3D view mode)
   */
  public setVisibleLayer(face: 'i' | 'j' | 'k' | null, layer: number | null): void {
    if (face === null || layer === null) {
      // Show all layers (3D view mode)
      this.setAllCellsVisibility(true);
      return;
    }

    // Show only the specified layer
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          const position: Position = [i, j, k];
          let visible = false;

          switch (face) {
            case 'i': // XY plane, layer is i index
              visible = (i === layer);
              break;
            case 'j': // XZ plane, layer is j index
              visible = (j === layer);
              break;
            case 'k': // YZ plane, layer is k index
              visible = (k === layer);
              break;
          }

          this.setCellVisibility(position, visible);
        }
      }
    }
  }

  /**
   * Show or hide cells based on a predicate function
   */
  public filterCells(predicate: (cell: Cell) => boolean): void {
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          const cell = this.cube.cells[i][j][k];
          const visible = predicate(cell);
          this.setCellVisibility([i, j, k], visible);
        }
      }
    }
    // Also filter sprites
    this.spriteRenderer.filterSprites(predicate);
  }

  /**
   * Perform ray-casting to find the cell under the mouse cursor
   * @param camera - The camera to cast from
   * @param mouseX - Normalized mouse X coordinate [-1, 1]
   * @param mouseY - Normalized mouse Y coordinate [-1, 1]
   * @returns The position of the picked cell, or null if no cell was picked
   */
  public pickCell(
    camera: THREE.Camera,
    mouseX: number,
    mouseY: number
  ): Position | null {
    // Set up raycaster from mouse position
    this.raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    // Find intersections with visible meshes only
    const visibleMeshes = Array.from(this.cellMeshes.values()).filter(m => m.visible);
    const intersects = this.raycaster.intersectObjects(visibleMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      return mesh.userData.position as Position;
    }

    return null;
  }

  /**
   * Get the Three.js container group for this renderer
   */
  public getContainer(): THREE.Group {
    return this.container;
  }

  /**
   * Get a specific cell mesh by position
   */
  public getMesh(position: Position): THREE.Mesh | undefined {
    const key = positionKey(position);
    return this.cellMeshes.get(key);
  }

  /**
   * Get the sprite renderer
   */
  public getSpriteRenderer(): ValueSpriteRenderer {
    return this.spriteRenderer;
  }

  /**
   * Update the cube reference (e.g., when loading a new puzzle)
   */
  public setCube(cube: Cube): void {
    this.cube = cube;
    this.spriteRenderer.setCube(cube);
    this.clearAllStates();
    this.updateAllCells();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose of sprite renderer
    this.spriteRenderer.dispose();

    // Dispose of geometry
    this.cellGeometry.dispose();

    // Dispose of materials
    for (const material of Object.values(this.materials)) {
      material.dispose();
    }

    // Clear meshes from container
    this.container.clear();
    this.cellMeshes.clear();
    this.cellStates.clear();
  }

  /**
   * Get the bounding box of the entire cube in world space
   * This is useful for verification that the cube is centered at origin
   *
   * @returns The min and max corners of the cube's bounding box
   */
  public getCubeBounds(): { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 } {
    const spacing = calculateSpacing(this.config.cellSize, this.config.cellGap);
    const offset = calculateCenterOffset(this.config.cellSize, this.config.cellGap);
    const numCells = 16;
    const maxIndex = numCells - 1;

    // Calculate bounds after offset is applied
    const cellHalfSize = this.config.cellSize / 2;
    const minPos = 0 * spacing - offset - cellHalfSize;  // Cell 0's min edge
    const maxPos = maxIndex * spacing - offset + cellHalfSize;  // Cell 15's max edge

    return {
      min: new THREE.Vector3(minPos, minPos, minPos),
      max: new THREE.Vector3(maxPos, maxPos, maxPos),
      center: new THREE.Vector3(
        (minPos + maxPos) / 2,
        (minPos + maxPos) / 2,
        (minPos + maxPos) / 2
      )
    };
  }
}
