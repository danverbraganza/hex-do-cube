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
import { ValueSpriteRenderer } from './ValueSpriteRenderer.js';

/**
 * Visual state for a cell (hover, selected, error)
 */
export type CellState = 'normal' | 'hover' | 'selected' | 'error';

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
  };

  // Container for all meshes
  private container: THREE.Group;

  // Cell state tracking
  private cellStates: Map<string, CellState> = new Map();

  // Raycaster for picking
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Value sprite renderer for billboard sprites
  private spriteRenderer: ValueSpriteRenderer;

  constructor(cube: Cube, config: CubeRendererConfig = {}) {
    this.cube = cube;

    // Apply default configuration
    this.config = {
      cellSize: config.cellSize ?? 1,
      cellGap: config.cellGap ?? 0.1,
      filledOpacity: config.filledOpacity ?? 0.6,
      emptyOpacity: config.emptyOpacity ?? 0.05,
      givenColor: config.givenColor ?? 0x4a90e2,
      editableColor: config.editableColor ?? 0x7ed321,
      hoverColor: config.hoverColor ?? 0xffd700,
      selectedColor: config.selectedColor ?? 0xff9500,
      errorColor: config.errorColor ?? 0xe74c3c,
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
        color: 0xffffff,
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
    };
  }

  /**
   * Initialize meshes for all 4096 cells
   *
   * CENTERING STRATEGY:
   * - Cube has 16 cells per dimension (indices 0-15)
   * - Cell centers are positioned at i * spacing where i = 0..15
   * - With spacing = cellSize + cellGap (default 1.1), cells span from 0 to 16.5
   * - The geometric center is halfway: (0 + 15 * spacing) / 2 = 7.5 * spacing
   * - We apply this offset so the cube's geometric center aligns with world origin (0,0,0)
   * - Camera lookAt(0,0,0) targets this center, centering the cube in the viewport
   *
   * VERIFICATION:
   * - Cell 0 position: 0 - 8.25 = -8.25
   * - Cell 15 position: 16.5 - 8.25 = 8.25
   * - Center: (-8.25 + 8.25) / 2 = 0 ✓
   */
  private initializeCellMeshes(): void {
    const spacing = this.config.cellSize + this.config.cellGap;

    // Calculate offset to center the cube at world origin (0, 0, 0)
    // For 16 cells indexed 0-15, the center is at (0 + 15*spacing)/2 = 7.5 * spacing
    const numCells = 16;
    const maxIndex = numCells - 1; // 15
    const offset = (maxIndex * spacing) / 2;

    for (let i = 0; i < numCells; i++) {
      for (let j = 0; j < numCells; j++) {
        for (let k = 0; k < numCells; k++) {
          const cell = this.cube.cells[i][j][k];
          const mesh = this.createCellMesh(cell);

          // Position mesh with offset so cube center is at world origin
          // Mapping: i=y(vertical), j=x(horizontal-right), k=z(depth)
          mesh.position.set(
            j * spacing - offset,  // x: left(-) to right(+)
            i * spacing - offset,  // y: bottom(-) to top(+)
            k * spacing - offset   // z: back(-) to front(+)
          );

          // Store mesh reference
          const key = this.positionKey([i, j, k]);
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
    const key = this.positionKey(position);
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
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          this.updateCell([i, j, k]);
        }
      }
    }
    // Update all sprites as well
    this.spriteRenderer.updateAllSprites();
  }

  /**
   * Set the visual state of a cell (hover, selected, error)
   */
  public setCellState(position: Position, state: CellState): void {
    const key = this.positionKey(position);
    this.cellStates.set(key, state);
    this.updateCell(position);
  }

  /**
   * Get the visual state of a cell
   */
  public getCellState(position: Position): CellState {
    const key = this.positionKey(position);
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
    const key = this.positionKey(position);
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
    const key = this.positionKey(position);
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
   * Generate a unique string key for a cell position
   */
  private positionKey(position: Position): string {
    return `${position[0]},${position[1]},${position[2]}`;
  }

  /**
   * Get the bounding box of the entire cube in world space
   * This is useful for verification that the cube is centered at origin
   *
   * @returns The min and max corners of the cube's bounding box
   */
  public getCubeBounds(): { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 } {
    const spacing = this.config.cellSize + this.config.cellGap;
    const numCells = 16;
    const maxIndex = numCells - 1;
    const offset = (maxIndex * spacing) / 2;

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
