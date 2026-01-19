/**
 * SubsquareSeparatorRenderer for Hex-Do-Cube
 * Creates visual separator planes to delineate 4×4 subsquare boundaries in the cube.
 *
 * Responsibilities:
 * - Create thin plane geometry segments at subsquare boundaries
 * - Position planes at indices 4, 8, 12 on each axis
 * - Coral/orange-red color with translucent opacity (0.15) in 3D view
 * - In face-on view: render only active layer's separators, fully opaque (1.0)
 * - Coordinate with ViewStateManager for mode transitions
 *
 * Implementation:
 * - 9 total planes: 3 per axis (X, Y, Z) at positions 4, 8, 12
 * - Each plane spans the full cube dimension (16 cells)
 * - Planes are 0.02 units thick to be visually thin but visible
 */

import * as THREE from 'three';
import { PALETTE } from '../config/ColorPalette.js';
import { calculateSpacing, calculateCenterOffset } from './geometry.js';

/**
 * Face type for face-on view
 */
export type Face = 'i' | 'j' | 'k';

/**
 * Configuration for SubsquareSeparatorRenderer
 */
export interface SubsquareSeparatorRendererConfig {
  /** Size of each cell cube in 3D space */
  cellSize?: number;
  /** Gap between adjacent cells */
  cellGap?: number;
  /** Color of separator planes */
  separatorColor?: number;
  /** Opacity in 3D view */
  opacity3D?: number;
  /** Opacity in face-on view */
  opacityFaceOn?: number;
  /** Thickness of separator planes */
  planeThickness?: number;
}

/**
 * SubsquareSeparatorRenderer manages visual separator planes for subsquare boundaries
 */
export class SubsquareSeparatorRenderer {
  private config: Required<SubsquareSeparatorRendererConfig>;

  // Container for all separator planes
  private container: THREE.Group;

  // Plane groups organized by axis
  private planesX: THREE.Mesh[] = []; // Perpendicular to X-axis
  private planesY: THREE.Mesh[] = []; // Perpendicular to Y-axis
  private planesZ: THREE.Mesh[] = []; // Perpendicular to Z-axis

  // Face-on mode line segments (created on-demand)
  private faceOnLines: THREE.Group | null = null;

  // Materials for different modes
  private material3D: THREE.MeshBasicMaterial;
  private materialFaceOn: THREE.MeshBasicMaterial;
  private lineMaterial: THREE.MeshBasicMaterial;

  // Current mode state (tracked but not currently used in implementation)
  // Future use: optimize updates by avoiding redundant mode changes
  // private currentMode: '3d' | 'face-on' = '3d';
  // private currentFace: Face | null = null;
  // private currentLayer: number = 0;

  constructor(config: SubsquareSeparatorRendererConfig = {}) {
    // Apply default configuration
    this.config = {
      cellSize: config.cellSize ?? 1.0,
      cellGap: config.cellGap ?? 0.1,
      separatorColor: config.separatorColor ?? PALETTE.separator.coral.hex,
      opacity3D: config.opacity3D ?? 0.15,
      opacityFaceOn: config.opacityFaceOn ?? 1.0,
      planeThickness: config.planeThickness ?? 0.02,
    };

    // Create container group
    this.container = new THREE.Group();
    this.container.name = 'SubsquareSeparators';

    // Create materials
    this.material3D = new THREE.MeshBasicMaterial({
      color: this.config.separatorColor,
      transparent: true,
      opacity: this.config.opacity3D,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.materialFaceOn = new THREE.MeshBasicMaterial({
      color: this.config.separatorColor,
      transparent: true,
      opacity: this.config.opacityFaceOn,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.lineMaterial = new THREE.MeshBasicMaterial({
      color: this.config.separatorColor,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    // Initialize all separator planes
    this.initializeSeparatorPlanes();
  }

  /**
   * Initialize all separator planes at subsquare boundaries
   *
   * Positioning strategy:
   * - Cube has 16 cells per dimension (indices 0-15)
   * - Subsquares are 4×4, so boundaries at indices 4, 8, 12
   * - Planes positioned at the gaps between cells
   * - Uses shared geometry utilities for consistent positioning
   */
  private initializeSeparatorPlanes(): void {
    const spacing = calculateSpacing(this.config.cellSize, this.config.cellGap);
    const offset = calculateCenterOffset(this.config.cellSize, this.config.cellGap);
    const numCells = 16;

    // Full cube span for plane dimensions
    const fullSpan = numCells * spacing;

    // Subsquare boundary indices (between subsquares)
    const boundaries = [4, 8, 12];

    // Create planes perpendicular to X-axis (YZ planes)
    for (const boundary of boundaries) {
      const geometry = new THREE.PlaneGeometry(fullSpan, fullSpan);
      const mesh = new THREE.Mesh(geometry, this.material3D);

      // Position at boundary, centered on YZ plane
      mesh.position.set(
        (boundary - 0.5) * spacing - offset,
        0, // Already centered
        0  // Already centered
      );

      // Rotate to be perpendicular to X-axis (YZ plane)
      mesh.rotation.y = Math.PI / 2;

      // Store reference and metadata
      mesh.userData.axis = 'x';
      mesh.userData.boundary = boundary;
      this.planesX.push(mesh);
      this.container.add(mesh);
    }

    // Create planes perpendicular to Y-axis (XZ planes)
    for (const boundary of boundaries) {
      const geometry = new THREE.PlaneGeometry(fullSpan, fullSpan);
      const mesh = new THREE.Mesh(geometry, this.material3D);

      // Position at boundary, centered on XZ plane
      mesh.position.set(
        0, // Already centered
        (boundary - 0.5) * spacing - offset,
        0  // Already centered
      );

      // Rotate to be perpendicular to Y-axis (XZ plane)
      mesh.rotation.x = Math.PI / 2;

      // Store reference and metadata
      mesh.userData.axis = 'y';
      mesh.userData.boundary = boundary;
      this.planesY.push(mesh);
      this.container.add(mesh);
    }

    // Create planes perpendicular to Z-axis (XY planes)
    for (const boundary of boundaries) {
      const geometry = new THREE.PlaneGeometry(fullSpan, fullSpan);
      const mesh = new THREE.Mesh(geometry, this.material3D);

      // Position at boundary, centered on XY plane
      mesh.position.set(
        0, // Already centered
        0, // Already centered
        (boundary - 0.5) * spacing - offset
      );

      // Default orientation (already perpendicular to Z-axis)
      // No rotation needed

      // Store reference and metadata
      mesh.userData.axis = 'z';
      mesh.userData.boundary = boundary;
      this.planesZ.push(mesh);
      this.container.add(mesh);
    }
  }

  /**
   * Create 2D line segments for face-on view
   *
   * In face-on view, we render 2D lines at the subsquare boundaries instead of 3D planes.
   * For a 16x16 grid, there are 3 separator positions on each axis (at 4, 8, 12),
   * resulting in 6 total lines (3 horizontal, 3 vertical).
   *
   * @param face - The face being viewed ('i', 'j', or 'k')
   * @param layer - The current layer depth (0-15)
   * @returns A group containing all line segments
   */
  private createFaceOnLines(face: Face, layer: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'FaceOnSeparatorLines';

    const spacing = calculateSpacing(this.config.cellSize, this.config.cellGap);
    const offset = calculateCenterOffset(this.config.cellSize, this.config.cellGap);
    const numCells = 16;

    // Full span of the grid (16 cells)
    const fullSpan = numCells * spacing;

    // Subsquare boundary indices
    const boundaries = [4, 8, 12];

    // Line width is half the cell gap
    const lineWidth = this.config.cellGap / 2;

    // Calculate the layer position in world coordinates
    const layerPos = layer * spacing - offset;

    // Create lines based on which face is being viewed
    // For each face, we create lines perpendicular to the two axes that form the face
    switch (face) {
      case 'i': // Looking down Y-axis, viewing XZ plane
        // Create vertical lines (parallel to Z-axis) at X positions 4, 8, 12
        for (const boundary of boundaries) {
          const x = (boundary - 0.5) * spacing - offset;
          const geometry = new THREE.BoxGeometry(lineWidth, 0.001, fullSpan);
          const mesh = new THREE.Mesh(geometry, this.lineMaterial);
          mesh.position.set(x, layerPos, 0);
          group.add(mesh);
        }
        // Create horizontal lines (parallel to X-axis) at Z positions 4, 8, 12
        for (const boundary of boundaries) {
          const z = (boundary - 0.5) * spacing - offset;
          const geometry = new THREE.BoxGeometry(fullSpan, 0.001, lineWidth);
          const mesh = new THREE.Mesh(geometry, this.lineMaterial);
          mesh.position.set(0, layerPos, z);
          group.add(mesh);
        }
        break;

      case 'j': // Looking down X-axis, viewing YZ plane
        // Create vertical lines (parallel to Z-axis) at Y positions 4, 8, 12
        for (const boundary of boundaries) {
          const y = (boundary - 0.5) * spacing - offset;
          const geometry = new THREE.BoxGeometry(0.001, lineWidth, fullSpan);
          const mesh = new THREE.Mesh(geometry, this.lineMaterial);
          mesh.position.set(layerPos, y, 0);
          group.add(mesh);
        }
        // Create horizontal lines (parallel to Y-axis) at Z positions 4, 8, 12
        for (const boundary of boundaries) {
          const z = (boundary - 0.5) * spacing - offset;
          const geometry = new THREE.BoxGeometry(0.001, fullSpan, lineWidth);
          const mesh = new THREE.Mesh(geometry, this.lineMaterial);
          mesh.position.set(layerPos, 0, z);
          group.add(mesh);
        }
        break;

      case 'k': // Looking down Z-axis, viewing XY plane
        // Create vertical lines (parallel to Y-axis) at X positions 4, 8, 12
        for (const boundary of boundaries) {
          const x = (boundary - 0.5) * spacing - offset;
          const geometry = new THREE.BoxGeometry(lineWidth, fullSpan, 0.001);
          const mesh = new THREE.Mesh(geometry, this.lineMaterial);
          mesh.position.set(x, 0, layerPos);
          group.add(mesh);
        }
        // Create horizontal lines (parallel to X-axis) at Y positions 4, 8, 12
        for (const boundary of boundaries) {
          const y = (boundary - 0.5) * spacing - offset;
          const geometry = new THREE.BoxGeometry(fullSpan, lineWidth, 0.001);
          const mesh = new THREE.Mesh(geometry, this.lineMaterial);
          mesh.position.set(0, y, layerPos);
          group.add(mesh);
        }
        break;
    }

    return group;
  }

  /**
   * Get the Three.js container group for this renderer
   */
  public getContainer(): THREE.Group {
    return this.container;
  }

  /**
   * Set the rendering mode (3D or face-on)
   *
   * @param mode - '3d' for 3D rotational view, 'face-on' for face editing view
   * @param face - The face being viewed (only valid in face-on mode)
   * @param layer - The current layer depth (only valid in face-on mode)
   */
  public setMode(mode: '3d' | 'face-on', face?: Face, layer?: number): void {
    if (mode === '3d') {
      // 3D mode: show all planes with translucent material
      this.show3DMode();
    } else if (mode === 'face-on' && face !== undefined && layer !== undefined) {
      // Face-on mode: show only active layer's separators with opaque material
      this.showFaceOnMode(face, layer);
    } else {
      console.warn('Invalid mode parameters for SubsquareSeparatorRenderer.setMode');
    }
  }

  /**
   * Show all planes in 3D mode with translucent material
   */
  private show3DMode(): void {
    // Hide face-on lines if they exist
    if (this.faceOnLines) {
      this.container.remove(this.faceOnLines);
      this.disposeFaceOnLines();
      this.faceOnLines = null;
    }

    // Update all planes to use 3D material and be visible
    for (const plane of [...this.planesX, ...this.planesY, ...this.planesZ]) {
      plane.material = this.material3D;
      plane.visible = true;
    }
  }

  /**
   * Show line segments in face-on mode
   *
   * In face-on view, we replace 3D planes with 2D line segments at the active layer.
   * This creates a clear grid pattern showing the 4x4 subsquare divisions.
   *
   * @param face - The face being viewed ('i', 'j', or 'k')
   * @param layer - The current layer depth (0-15)
   */
  private showFaceOnMode(face: Face, layer: number): void {
    // Hide all 3D planes
    this.setPlaneVisibility(this.planesX, false);
    this.setPlaneVisibility(this.planesY, false);
    this.setPlaneVisibility(this.planesZ, false);

    // Remove old face-on lines if they exist
    if (this.faceOnLines) {
      this.container.remove(this.faceOnLines);
      this.disposeFaceOnLines();
      this.faceOnLines = null;
    }

    // Create and add new face-on lines for the current face and layer
    this.faceOnLines = this.createFaceOnLines(face, layer);
    this.container.add(this.faceOnLines);
  }

  /**
   * Set visibility and material for a set of planes
   *
   * @param planes - Array of plane meshes
   * @param visible - Whether to show the planes
   * @param material - Optional material to apply (if visible)
   */
  private setPlaneVisibility(
    planes: THREE.Mesh[],
    visible: boolean,
    material?: THREE.Material
  ): void {
    for (const plane of planes) {
      plane.visible = visible;
      if (visible && material) {
        plane.material = material;
      }
    }
  }

  /**
   * Dispose of face-on lines and their resources
   */
  private disposeFaceOnLines(): void {
    if (!this.faceOnLines) return;

    this.faceOnLines.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
      }
    });
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose of geometries
    for (const plane of [...this.planesX, ...this.planesY, ...this.planesZ]) {
      if (plane.geometry) {
        plane.geometry.dispose();
      }
    }

    // Dispose of face-on lines
    if (this.faceOnLines) {
      this.container.remove(this.faceOnLines);
      this.disposeFaceOnLines();
      this.faceOnLines = null;
    }

    // Dispose of materials
    this.material3D.dispose();
    this.materialFaceOn.dispose();
    this.lineMaterial.dispose();

    // Clear container
    this.container.clear();
    this.planesX = [];
    this.planesY = [];
    this.planesZ = [];
  }
}
