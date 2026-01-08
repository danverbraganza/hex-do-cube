/**
 * SceneManager orchestrates the Three.js scene, camera, lighting, and renderer lifecycle.
 *
 * Responsibilities:
 * - Initialize and manage Three.js Scene
 * - Set up isometric camera for canonical view (i-face up, j-face right, k-face left)
 * - Configure lighting for translucent cube rendering
 * - Handle renderer initialization with transparency support
 * - Manage window resize events
 * - Provide render loop management
 * - Provide camera rotation controls
 */

import * as THREE from 'three';

export type CameraMode = 'isometric' | 'face-on';

export interface SceneManagerConfig {
  container: HTMLElement;
  /** Camera distance from origin for isometric view */
  cameraDistance?: number;
  /** Field of view for perspective camera */
  fov?: number;
  /** Near clipping plane */
  near?: number;
  /** Far clipping plane */
  far?: number;
  /** Background color */
  backgroundColor?: number;
  /** Background alpha (0-1) */
  backgroundAlpha?: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;

  private cameraDistance: number;
  private animationFrameId: number | null = null;

  constructor(config: SceneManagerConfig) {
    this.container = config.container;
    this.cameraDistance = config.cameraDistance ?? 50;

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      config.backgroundColor ?? 0x1a1a1a
    );

    // Initialize camera (perspective for isometric-style view)
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      config.fov ?? 50,
      aspect,
      config.near ?? 0.1,
      config.far ?? 1000
    );

    // Set up canonical isometric view
    // i-face up (positive y), j-face right (positive x), k-face left (negative z)
    this.setupCanonicalView();

    // Initialize renderer with transparency support
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: config.backgroundAlpha !== undefined && config.backgroundAlpha < 1,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Enable alpha for translucent rendering
    if (config.backgroundAlpha !== undefined) {
      this.renderer.setClearAlpha(config.backgroundAlpha);
    }

    // Append canvas to container
    this.container.appendChild(this.renderer.domElement);

    // Set up lighting for translucent cube rendering
    this.setupLighting();

    // Handle window resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Set up canonical isometric view:
   * - i-face (top) points up
   * - j-face (right) points right
   * - k-face (left) points left
   *
   * This corresponds to viewing the cube from angle (1, 1, 1) looking at origin.
   *
   * CUBE CENTERING:
   * - The 16x16x16 cube is centered at world origin (0, 0, 0)
   * - Camera looks at (0, 0, 0) to target the cube's geometric center
   * - This ensures the cube appears centered in the viewport
   */
  private setupCanonicalView(): void {
    // Position camera at an isometric angle
    // Using equal components gives the classic isometric look
    const distance = this.cameraDistance;
    this.camera.position.set(distance, distance, distance);

    // Look at cube center (origin)
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 1, 0);
  }

  /**
   * Set up lighting suitable for translucent cube rendering
   * - Ambient light for overall illumination
   * - Directional light for depth and dimension
   */
  private setupLighting(): void {
    // Ambient light provides base illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Directional light adds depth and highlights
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 10, 10);
    this.scene.add(this.directionalLight);
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Rotate camera around the cube by specified angles
   * @param deltaAzimuth - Horizontal rotation in radians
   * @param deltaPolar - Vertical rotation in radians
   *
   * The camera orbits around the cube's center at origin (0, 0, 0)
   */
  public rotateCamera(deltaAzimuth: number, deltaPolar: number): void {
    // Convert current camera position to spherical coordinates
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);

    // Apply rotation deltas
    spherical.theta += deltaAzimuth;
    spherical.phi += deltaPolar;

    // Clamp phi to prevent camera from flipping
    const epsilon = 0.001;
    spherical.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, spherical.phi));

    // Convert back to Cartesian coordinates
    this.camera.position.setFromSpherical(spherical);

    // Keep looking at cube center
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Reset camera to canonical isometric view
   */
  public resetCamera(): void {
    this.setupCanonicalView();
  }

  /**
   * Set camera to face-on view for a specific face
   * @param face - The face to view ('i', 'j', or 'k')
   * @param _layer - The layer depth (0-15) - currently unused, for future implementation
   *
   * All face-on views look at the cube's center (0, 0, 0) to ensure
   * the cube remains centered in the viewport from any viewing angle.
   */
  public setFaceOnView(face: 'i' | 'j' | 'k', _layer: number): void {
    const distance = this.cameraDistance;

    switch (face) {
      case 'i': // Top/bottom face (y-axis)
        this.camera.position.set(0, distance, 0);
        this.camera.lookAt(0, 0, 0); // Look at cube center
        this.camera.up.set(0, 0, -1);
        break;
      case 'j': // Right/left face (x-axis)
        this.camera.position.set(distance, 0, 0);
        this.camera.lookAt(0, 0, 0); // Look at cube center
        this.camera.up.set(0, 1, 0);
        break;
      case 'k': // Front/back face (z-axis)
        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0); // Look at cube center
        this.camera.up.set(0, 1, 0);
        break;
    }
  }

  /**
   * Start the render loop
   * @param callback - Optional callback to run each frame before rendering
   */
  public startRenderLoop(callback?: () => void): void {
    if (this.animationFrameId !== null) {
      return; // Already running
    }

    const animate = (): void => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (callback) {
        callback();
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Stop the render loop
   */
  public stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render a single frame (for manual rendering without loop)
   */
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Add an object to the scene
   */
  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove an object from the scene
   */
  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Get the Three.js scene
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the Three.js camera
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Get the Three.js renderer
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Clean up resources and remove event listeners
   */
  public dispose(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.handleResize);

    // Remove canvas from container
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    // Dispose of renderer
    this.renderer.dispose();

    // Clear scene
    this.scene.clear();
  }
}
