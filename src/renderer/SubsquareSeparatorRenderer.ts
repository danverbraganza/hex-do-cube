/**
 * SubsquareSeparatorRenderer for Hex-Do-Cube
 * Creates visual separator planes to delineate 4×4 subsquare boundaries in the cube.
 *
 * Responsibilities:
 * - Create thin plane geometry segments at subsquare boundaries
 * - Position planes at indices 4, 8, 12 on each axis
 * - Magenta color (0xff00ff) with translucent opacity (0.15) in 3D view
 * - In face-on view: render only active layer's separators, fully opaque (1.0)
 * - Coordinate with ViewStateManager for mode transitions
 *
 * Implementation:
 * - 9 total planes: 3 per axis (X, Y, Z) at positions 4, 8, 12
 * - Each plane spans the full cube dimension (16 cells)
 * - Planes are 0.02 units thick to be visually thin but visible
 */

import * as THREE from 'three';

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

  // Materials for different modes
  private material3D: THREE.MeshBasicMaterial;
  private materialFaceOn: THREE.MeshBasicMaterial;

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
      separatorColor: config.separatorColor ?? 0xff00ff, // Magenta
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
   * - Same centering offset as CubeRenderer for consistent world origin alignment
   */
  private initializeSeparatorPlanes(): void {
    const spacing = this.config.cellSize + this.config.cellGap;
    const numCells = 16;
    const maxIndex = numCells - 1;
    const offset = (maxIndex * spacing) / 2; // Center at world origin

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
        boundary * spacing - offset,
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
        boundary * spacing - offset,
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
        boundary * spacing - offset
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
    // Update all planes to use 3D material and be visible
    for (const plane of [...this.planesX, ...this.planesY, ...this.planesZ]) {
      plane.material = this.material3D;
      plane.visible = true;
    }
  }

  /**
   * Show only active layer's separators in face-on mode with opaque material
   *
   * @param face - The face being viewed ('i', 'j', or 'k')
   * @param layer - The current layer depth (0-15)
   */
  private showFaceOnMode(face: Face, layer: number): void {
    // Note: layer parameter preserved for potential future use (e.g., highlighting current layer's separators)
    // Currently, we show all separator planes for the viewed axis
    void layer; // Explicitly mark as intentionally unused for now

    // Determine which planes to show based on face
    // - 'i' face (looking down Y): show Y-axis separators (XZ planes)
    // - 'j' face (looking down X): show X-axis separators (YZ planes)
    // - 'k' face (looking down Z): show Z-axis separators (XY planes)

    switch (face) {
      case 'i': // Looking down Y-axis, show XZ planes (perpendicular to Y)
        // Show Y-axis planes, hide X and Z planes
        this.setPlaneVisibility(this.planesY, true, this.materialFaceOn);
        this.setPlaneVisibility(this.planesX, false);
        this.setPlaneVisibility(this.planesZ, false);
        break;

      case 'j': // Looking down X-axis, show YZ planes (perpendicular to X)
        // Show X-axis planes, hide Y and Z planes
        this.setPlaneVisibility(this.planesX, true, this.materialFaceOn);
        this.setPlaneVisibility(this.planesY, false);
        this.setPlaneVisibility(this.planesZ, false);
        break;

      case 'k': // Looking down Z-axis, show XY planes (perpendicular to Z)
        // Show Z-axis planes, hide X and Y planes
        this.setPlaneVisibility(this.planesZ, true, this.materialFaceOn);
        this.setPlaneVisibility(this.planesX, false);
        this.setPlaneVisibility(this.planesY, false);
        break;
    }
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
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose of geometries
    for (const plane of [...this.planesX, ...this.planesY, ...this.planesZ]) {
      if (plane.geometry) {
        plane.geometry.dispose();
      }
    }

    // Dispose of materials
    this.material3D.dispose();
    this.materialFaceOn.dispose();

    // Clear container
    this.container.clear();
    this.planesX = [];
    this.planesY = [];
    this.planesZ = [];
  }
}
