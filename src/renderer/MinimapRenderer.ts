/**
 * MinimapRenderer for Hex-Do-Cube
 * Renders a miniature cube view in the lower-left corner for navigation and orientation.
 *
 * Responsibilities:
 * - Render miniature cube in corner viewport
 * - Use separate scene/camera for independent rendering
 * - Always show "Home" alignment (canonical isometric view)
 * - Color-code cells by their hex values (no text rendering)
 * - Highlight active face when in face-on mode
 * - Allow users to see fill level at a glance
 *
 * PERFORMANCE NOTES:
 * - Uses shared geometry (1 BoxGeometry for all 4096 minimap cells) ✓
 * - Now uses material cache (17 materials max: 16 hex values + 1 null) ✓
 * - Renders to scissored viewport to avoid clearing main scene ✓
 * - Materials have depthWrite: false for proper translucency ✓
 * - Separate scene/camera allows independent rendering without state pollution ✓
 */

import * as THREE from 'three';
import type { Cube } from '../models/Cube.js';
import type { Cell, HexValue, Position } from '../models/Cell.js';
import type { Face } from '../models/Cube.js';
import { COLORS, LIGHTING } from '../config/RenderConfig.js';

/**
 * Configuration for MinimapRenderer
 */
export interface MinimapRendererConfig {
  /** Size of the minimap viewport in pixels */
  viewportSize?: number;
  /** Margin from edges in pixels */
  margin?: number;
  /** Size of each cell cube in minimap space */
  cellSize?: number;
  /** Gap between adjacent cells */
  cellGap?: number;
  /** Camera distance from origin */
  cameraDistance?: number;
  /** Background color */
  backgroundColor?: number;
  /** Background alpha (0-1) */
  backgroundAlpha?: number;
  /** Opacity for filled cells */
  filledOpacity?: number;
  /** Opacity for empty cells */
  emptyOpacity?: number;
  /** Color for highlighted face */
  highlightColor?: number;
  /** Opacity for highlighted face */
  highlightOpacity?: number;
}

/**
 * Color mapping for hex values (0-f) to RGB colors
 * Creates a gradient from dark blue (0) to bright red (f)
 */
const HEX_VALUE_COLORS: Record<Exclude<HexValue, null>, number> = {
  '0': 0x1a1a2e, // Very dark blue
  '1': 0x16213e, // Dark blue
  '2': 0x0f3460, // Medium dark blue
  '3': 0x1e56a0, // Medium blue
  '4': 0x2e86ab, // Light blue
  '5': 0x48a9a6, // Cyan
  '6': 0x4ecdc4, // Light cyan
  '7': 0x6dd47e, // Light green
  '8': 0x95d5b2, // Mint
  '9': 0xffd23f, // Yellow
  'a': 0xffb703, // Orange
  'b': 0xff8800, // Deep orange
  'c': 0xff6b35, // Red-orange
  'd': 0xff4d4d, // Light red
  'e': 0xe63946, // Red
  'f': 0xd62828, // Dark red
};

/**
 * Maps a cell position to its mesh
 */
type CellMeshMap = Map<string, THREE.Mesh>;

/**
 * MinimapRenderer manages the miniature cube visualization
 */
export class MinimapRenderer {
  private cube: Cube;
  private config: Required<MinimapRendererConfig>;

  // Separate Three.js scene and camera for minimap
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Mesh management
  private cellMeshes: CellMeshMap = new Map();
  private cellGeometry: THREE.BoxGeometry;

  // Shared materials for efficient reuse (reduces GC pressure)
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  // Particle system for cell rendering (replaces meshes to avoid z-fighting)
  private particles: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;

  // Container for all cell meshes
  private container: THREE.Group;

  // Face highlighting
  private highlightedFace: Face | null = null;
  private faceHighlightMeshes: Map<Face, THREE.Mesh> = new Map();

  // Layer highlighting
  private highlightedLayer: { face: Face; layer: number } | null = null;
  private layerHighlightMeshes: Map<Face, THREE.Mesh[]> = new Map();

  // Lighting
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;

  constructor(
    cube: Cube,
    parentRenderer: THREE.WebGLRenderer,
    config: MinimapRendererConfig = {}
  ) {
    this.cube = cube;
    this.renderer = parentRenderer;

    // Apply default configuration
    this.config = {
      viewportSize: config.viewportSize ?? 200,
      margin: config.margin ?? 20,
      cellSize: config.cellSize ?? 0.8, // Intentionally smaller than main (0.8 vs 1.0)
      cellGap: config.cellGap ?? 0.05, // Intentionally smaller than main (0.05 vs 0.1)
      cameraDistance: config.cameraDistance ?? 30, // Intentionally different than main (30 vs 37.5)
      backgroundColor: config.backgroundColor ?? COLORS.BACKGROUND,
      backgroundAlpha: config.backgroundAlpha ?? 0.8,
      filledOpacity: config.filledOpacity ?? 0.35, // More translucent than main (0.35 vs 0.6)
      emptyOpacity: config.emptyOpacity ?? 0.05, // Reduced from 0.1, ghostly appearance
      highlightColor: config.highlightColor ?? 0xffd700,
      highlightOpacity: config.highlightOpacity ?? 0.3,
    };

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);

    // Initialize camera (canonical isometric view)
    this.camera = new THREE.PerspectiveCamera(
      50,
      1, // Square viewport
      0.1,
      1000
    );
    this.setupCanonicalView();

    // Create container group
    this.container = new THREE.Group();
    this.container.name = 'MinimapRenderer';

    // Create shared geometry
    this.cellGeometry = new THREE.BoxGeometry(
      this.config.cellSize,
      this.config.cellSize,
      this.config.cellSize
    );

    // Set up lighting
    this.setupLighting();

    // Initialize cell meshes
    this.initializeCellMeshes();

    // Initialize particles for cell rendering
    this.initializeParticles();

    // Initialize face highlight meshes
    this.initializeFaceHighlights();

    // Initialize layer highlight meshes
    this.initializeLayerHighlights();

    // Add container to scene
    this.scene.add(this.container);
  }

  /**
   * Set up canonical isometric view (Home alignment)
   * i-face up, j-face right, k-face left
   */
  private setupCanonicalView(): void {
    const distance = this.config.cameraDistance;
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 1, 0);
  }

  /**
   * Set up lighting suitable for minimap rendering
   */
  private setupLighting(): void {
    // Ambient light for overall illumination
    this.ambientLight = new THREE.AmbientLight(
      LIGHTING.LIGHT_COLOR,
      LIGHTING.AMBIENT_INTENSITY
    );
    this.scene.add(this.ambientLight);

    // Directional light for depth
    this.directionalLight = new THREE.DirectionalLight(
      LIGHTING.LIGHT_COLOR,
      LIGHTING.DIRECTIONAL_INTENSITY
    );
    this.directionalLight.position.set(10, 10, 10);
    this.scene.add(this.directionalLight);
  }

  /**
   * Initialize meshes for all 4096 cells with color-coded visualization
   */
  private initializeCellMeshes(): void {
    const spacing = this.config.cellSize + this.config.cellGap;
    const offset = (15 * spacing) / 2; // Center the cube at origin

    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          const cell = this.cube.cells[i][j][k];
          const mesh = this.createCellMesh(cell);

          // Position the mesh in 3D space
          mesh.position.set(
            j * spacing - offset,
            i * spacing - offset,
            k * spacing - offset
          );

          // Store mesh reference
          const key = this.positionKey([i, j, k]);
          this.cellMeshes.set(key, mesh);

          // Hide mesh (particles are now used for rendering)
          mesh.visible = false;

          // Add to container
          this.container.add(mesh);
        }
      }
    }
  }

  /**
   * Create a mesh for a single cell with color-coded material
   */
  private createCellMesh(cell: Cell): THREE.Mesh {
    const material = this.getMaterialForCell(cell);
    const mesh = new THREE.Mesh(this.cellGeometry, material);

    // Store cell position in userData
    mesh.userData.position = cell.position;
    mesh.userData.cell = cell;

    return mesh;
  }

  /**
   * Initialize particles for all filled cells
   * Creates a single THREE.Points object with positions and colors for each filled cell
   */
  private initializeParticles(): void {
    const filledCells: { position: number[]; color: THREE.Color }[] = [];
    const spacing = this.config.cellSize + this.config.cellGap;
    const offset = (15 * spacing) / 2; // Center the cube at origin

    // Collect all filled cells
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          const cell = this.cube.cells[i][j][k];
          if (cell.value !== null) {
            filledCells.push({
              position: [
                j * spacing - offset,
                i * spacing - offset,
                k * spacing - offset,
              ],
              color: new THREE.Color(HEX_VALUE_COLORS[cell.value]),
            });
          }
        }
      }
    }

    // If no filled cells, don't create particles
    if (filledCells.length === 0) return;

    // Create position and color buffers
    const positions = new Float32Array(filledCells.length * 3);
    const colors = new Float32Array(filledCells.length * 3);

    filledCells.forEach((cell, idx) => {
      positions[idx * 3] = cell.position[0];
      positions[idx * 3 + 1] = cell.position[1];
      positions[idx * 3 + 2] = cell.position[2];
      colors[idx * 3] = cell.color.r;
      colors[idx * 3 + 1] = cell.color.g;
      colors[idx * 3 + 2] = cell.color.b;
    });

    // Create geometry with attributes
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );

    // Create material for particles
    const material = new THREE.PointsMaterial({
      size: this.config.cellSize * 0.8,
      vertexColors: true,
      transparent: true,
      opacity: this.config.filledOpacity,
      sizeAttenuation: true,
      depthWrite: false,
    });

    // Create points object
    this.particles = new THREE.Points(this.particleGeometry, material);
    this.particles.visible = true; // Show particles
    this.scene.add(this.particles);
  }

  /**
   * Get material for a cell based on its value (color-coded)
   * Uses material cache to avoid creating duplicate materials
   */
  private getMaterialForCell(cell: Cell): THREE.MeshStandardMaterial {
    // Create cache key based on cell value
    const cacheKey = cell.value ?? 'null';

    // Check if material already exists in cache
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    // Create new material if not in cache
    let material: THREE.MeshStandardMaterial;

    if (cell.value === null) {
      // Empty cell - very low opacity
      material = new THREE.MeshStandardMaterial({
        color: COLORS.WHITE,
        transparent: true,
        opacity: this.config.emptyOpacity,
        depthWrite: false,
      });
    } else {
      // Filled cell - color-coded by hex value
      const color = HEX_VALUE_COLORS[cell.value];
      material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: this.config.filledOpacity,
        depthWrite: false,
      });
    }

    // Store in cache for reuse
    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Initialize face highlight meshes (one per face)
   */
  private initializeFaceHighlights(): void {
    const spacing = this.config.cellSize + this.config.cellGap;
    const size = 16 * spacing; // Size of one face

    // Create thin planes for each face
    const planeGeometry = new THREE.PlaneGeometry(size, size);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: this.config.highlightColor,
      transparent: true,
      opacity: this.config.highlightOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // i-face (top) - horizontal plane at top
    const iFaceMesh = new THREE.Mesh(planeGeometry, planeMaterial.clone());
    iFaceMesh.rotation.x = -Math.PI / 2;
    iFaceMesh.position.y = size / 2;
    iFaceMesh.visible = false;
    this.faceHighlightMeshes.set('i', iFaceMesh);
    this.scene.add(iFaceMesh);

    // j-face (right) - vertical plane on right
    const jFaceMesh = new THREE.Mesh(planeGeometry, planeMaterial.clone());
    jFaceMesh.rotation.y = Math.PI / 2;
    jFaceMesh.position.x = size / 2;
    jFaceMesh.visible = false;
    this.faceHighlightMeshes.set('j', jFaceMesh);
    this.scene.add(jFaceMesh);

    // k-face (left) - vertical plane on front
    const kFaceMesh = new THREE.Mesh(planeGeometry, planeMaterial.clone());
    kFaceMesh.position.z = size / 2;
    kFaceMesh.visible = false;
    this.faceHighlightMeshes.set('k', kFaceMesh);
    this.scene.add(kFaceMesh);
  }

  /**
   * Initialize layer highlight meshes (16 per face, one for each layer depth)
   */
  private initializeLayerHighlights(): void {
    const spacing = this.config.cellSize + this.config.cellGap;
    const size = 16 * spacing; // Size of one face
    const offset = (15 * spacing) / 2; // Center offset

    // Create thin planes for each layer
    const planeGeometry = new THREE.PlaneGeometry(size, size);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: this.config.highlightColor,
      transparent: true,
      opacity: this.config.highlightOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Create layer highlights for each face
    const faces: Face[] = ['i', 'j', 'k'];
    for (const face of faces) {
      const layerMeshes: THREE.Mesh[] = [];

      for (let layer = 0; layer < 16; layer++) {
        const mesh = new THREE.Mesh(planeGeometry, planeMaterial.clone());
        mesh.visible = false;

        // Position based on face and layer
        if (face === 'i') {
          // i-face: horizontal planes at different y (vertical) positions
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.y = layer * spacing - offset;
        } else if (face === 'j') {
          // j-face: vertical planes at different x (horizontal) positions
          mesh.rotation.y = Math.PI / 2;
          mesh.position.x = layer * spacing - offset;
        } else {
          // k-face: vertical planes at different z (depth) positions
          mesh.position.z = layer * spacing - offset;
        }

        layerMeshes.push(mesh);
        this.scene.add(mesh);
      }

      this.layerHighlightMeshes.set(face, layerMeshes);
    }
  }

  /**
   * Update a specific cell's appearance
   * Uses shared materials from cache - no disposal needed
   */
  public updateCell(position: Position): void {
    const key = this.positionKey(position);
    const mesh = this.cellMeshes.get(key);
    if (!mesh) return;

    const [i, j, k] = position;
    const cell = this.cube.cells[i][j][k];

    // Get material from cache (reuses existing materials)
    // No disposal needed as materials are shared
    mesh.material = this.getMaterialForCell(cell);
    mesh.userData.cell = cell;
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

    // Rebuild particles to reflect changes
    this.rebuildParticles();
  }

  /**
   * Rebuild the particle system based on current cube state
   * This is called when cells are updated
   */
  private rebuildParticles(): void {
    // Remove existing particles
    if (this.particles) {
      this.scene.remove(this.particles);
      if (this.particleGeometry) {
        this.particleGeometry.dispose();
      }
      if (this.particles.material instanceof THREE.Material) {
        this.particles.material.dispose();
      }
      this.particles = null;
      this.particleGeometry = null;
    }

    // Rebuild with current cell state
    this.initializeParticles();
  }

  /**
   * Highlight a specific face (for face-on mode)
   * @param face - The face to highlight ('i', 'j', or 'k'), or null to clear
   */
  public setHighlightedFace(face: Face | null): void {
    // Hide all face highlights
    for (const mesh of this.faceHighlightMeshes.values()) {
      mesh.visible = false;
    }

    // Show the specified face highlight
    if (face !== null) {
      const mesh = this.faceHighlightMeshes.get(face);
      if (mesh) {
        mesh.visible = true;
      }
    }

    this.highlightedFace = face;
  }

  /**
   * Get the currently highlighted face
   */
  public getHighlightedFace(): Face | null {
    return this.highlightedFace;
  }

  /**
   * Highlight a specific layer within a face (for face-on mode)
   * @param face - The face containing the layer ('i', 'j', or 'k'), or null to clear
   * @param layer - The layer depth (0-15), or null to clear
   */
  public setHighlightedLayer(face: Face | null, layer: number | null): void {
    // Hide all layer highlights
    for (const meshes of this.layerHighlightMeshes.values()) {
      for (const mesh of meshes) {
        mesh.visible = false;
      }
    }

    // Show the specified layer highlight
    if (face !== null && layer !== null) {
      const layerMeshes = this.layerHighlightMeshes.get(face);
      if (layerMeshes && layer >= 0 && layer < 16) {
        layerMeshes[layer].visible = true;
      }
    }

    // Update state
    this.highlightedLayer = face !== null && layer !== null ? { face, layer } : null;
  }

  /**
   * Get the currently highlighted layer
   */
  public getHighlightedLayer(): { face: Face; layer: number } | null {
    return this.highlightedLayer;
  }

  /**
   * Render the minimap to the viewport
   * @param canvasWidth - Width of the main canvas
   * @param canvasHeight - Height of the main canvas
   */
  public render(canvasWidth: number, canvasHeight: number): void {
    // Calculate viewport position (lower-left corner)
    const x = this.config.margin;
    const y = canvasHeight - this.config.viewportSize - this.config.margin;
    const width = this.config.viewportSize;
    const height = this.config.viewportSize;

    // Set viewport and scissor for minimap rendering
    this.renderer.setViewport(x, y, width, height);
    this.renderer.setScissor(x, y, width, height);
    this.renderer.setScissorTest(true);

    // Clear the minimap region (color and depth) before rendering
    // This ensures the minimap renders cleanly without interference from main scene
    this.renderer.autoClear = false;
    this.renderer.clear(true, true, false); // Clear color and depth, but not stencil

    // Render minimap scene
    this.renderer.render(this.scene, this.camera);

    // Reset autoClear for next frame
    this.renderer.autoClear = true;

    // Reset to full viewport
    this.renderer.setViewport(0, 0, canvasWidth, canvasHeight);
    this.renderer.setScissor(0, 0, canvasWidth, canvasHeight);
    this.renderer.setScissorTest(false);
  }

  /**
   * Update the cube reference (e.g., when loading a new puzzle)
   */
  public setCube(cube: Cube): void {
    this.cube = cube;
    this.updateAllCells();
  }

  /**
   * Get the Three.js scene for this minimap
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the Three.js camera for this minimap
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Get the container group
   */
  public getContainer(): THREE.Group {
    return this.container;
  }

  /**
   * Check if a point (in screen coordinates) is within the minimap viewport
   * @param x - Screen X coordinate
   * @param y - Screen Y coordinate
   * @param _canvasWidth - Width of the main canvas (unused)
   * @param canvasHeight - Height of the main canvas
   * @returns true if the point is within the minimap
   */
  public isPointInMinimap(
    x: number,
    y: number,
    _canvasWidth: number,
    canvasHeight: number
  ): boolean {
    const minimapX = this.config.margin;
    const minimapY = canvasHeight - this.config.viewportSize - this.config.margin;
    const minimapWidth = this.config.viewportSize;
    const minimapHeight = this.config.viewportSize;

    return (
      x >= minimapX &&
      x <= minimapX + minimapWidth &&
      y >= minimapY &&
      y <= minimapY + minimapHeight
    );
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose of cell geometry
    this.cellGeometry.dispose();

    // Dispose of particle system
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
    if (this.particles && this.particles.material instanceof THREE.Material) {
      this.particles.material.dispose();
    }

    // Dispose of cached materials (now shared)
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();

    // Dispose of face highlight materials
    for (const mesh of this.faceHighlightMeshes.values()) {
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    }

    // Dispose of layer highlight materials
    for (const meshes of this.layerHighlightMeshes.values()) {
      for (const mesh of meshes) {
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    }

    // Clear scene
    this.scene.clear();
    this.cellMeshes.clear();
    this.faceHighlightMeshes.clear();
    this.layerHighlightMeshes.clear();
  }

  /**
   * Generate a unique string key for a cell position
   */
  private positionKey(position: Position): string {
    return `${position[0]},${position[1]},${position[2]}`;
  }
}
