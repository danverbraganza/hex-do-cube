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
import { COLORS, LIGHTING } from '../config/RenderConfig.js';

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
  private perspectiveCamera: THREE.PerspectiveCamera;
  private orthographicCamera: THREE.OrthographicCamera;
  private currentCamera: THREE.Camera;
  private cameraMode: CameraMode = 'isometric';
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;

  private cameraDistance: number;
  private animationFrameId: number | null = null;

  // Camera animation state
  private cameraAnimation: {
    active: boolean;
    startPosition: THREE.Vector3;
    targetPosition: THREE.Vector3;
    startUp: THREE.Vector3;
    targetUp: THREE.Vector3;
    startLookAt: THREE.Vector3;
    targetLookAt: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null = null;

  constructor(config: SceneManagerConfig) {
    this.container = config.container;
    this.cameraDistance = config.cameraDistance ?? 37.5;

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      config.backgroundColor ?? COLORS.BACKGROUND
    );

    // Initialize perspective camera for isometric-style view
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      config.fov ?? 50,
      aspect,
      config.near ?? 0.1,
      config.far ?? 1000
    );

    // Initialize orthographic camera for face-on view
    // Size the orthographic view to show the full cube (16 cells + gaps)
    // With cellSize=1, cellGap=0.1, total size is about 17.5 units
    const orthoSize = 10; // Half-size to show in each direction
    this.orthographicCamera = new THREE.OrthographicCamera(
      -orthoSize * aspect, // left
      orthoSize * aspect,  // right
      orthoSize,           // top
      -orthoSize,          // bottom
      config.near ?? 0.1,
      config.far ?? 1000
    );

    // Start with perspective camera
    this.currentCamera = this.perspectiveCamera;

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
    this.perspectiveCamera.position.set(distance, distance, distance);

    // Look at cube center (origin)
    this.perspectiveCamera.lookAt(0, 0, 0);
    this.perspectiveCamera.up.set(0, 1, 0);

    // Also set up orthographic camera at same position (though it won't be used in 3D view)
    this.orthographicCamera.position.set(distance, distance, distance);
    this.orthographicCamera.lookAt(0, 0, 0);
    this.orthographicCamera.up.set(0, 1, 0);
  }

  /**
   * Set up lighting suitable for translucent cube rendering
   * - Ambient light for overall illumination
   * - Directional light for depth and dimension
   */
  private setupLighting(): void {
    // Ambient light provides base illumination
    this.ambientLight = new THREE.AmbientLight(
      LIGHTING.LIGHT_COLOR,
      LIGHTING.AMBIENT_INTENSITY
    );
    this.scene.add(this.ambientLight);

    // Directional light adds depth and highlights
    this.directionalLight = new THREE.DirectionalLight(
      LIGHTING.LIGHT_COLOR,
      LIGHTING.DIRECTIONAL_INTENSITY
    );
    this.directionalLight.position.set(10, 10, 10);
    this.scene.add(this.directionalLight);
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;

    // Update perspective camera
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    // Update orthographic camera
    const orthoSize = 10;
    this.orthographicCamera.left = -orthoSize * aspect;
    this.orthographicCamera.right = orthoSize * aspect;
    this.orthographicCamera.top = orthoSize;
    this.orthographicCamera.bottom = -orthoSize;
    this.orthographicCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Rotate camera around the cube by specified angles
   * @param deltaAzimuth - Horizontal rotation in radians
   * @param deltaPolar - Vertical rotation in radians
   *
   * The camera orbits around the cube's center at origin (0, 0, 0)
   * Only works in isometric mode (perspective camera)
   */
  public rotateCamera(deltaAzimuth: number, deltaPolar: number): void {
    // Only rotate in isometric mode
    if (this.cameraMode !== 'isometric') {
      return;
    }

    // Convert current camera position to spherical coordinates
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.perspectiveCamera.position);

    // Apply rotation deltas
    spherical.theta += deltaAzimuth;
    spherical.phi += deltaPolar;

    // Clamp phi to prevent camera from flipping
    const epsilon = 0.001;
    spherical.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, spherical.phi));

    // Convert back to Cartesian coordinates
    this.perspectiveCamera.position.setFromSpherical(spherical);

    // Keep looking at cube center
    this.perspectiveCamera.lookAt(0, 0, 0);
  }

  /**
   * Reset camera to canonical isometric view with smooth animation
   * @param animated - Whether to animate the transition (default: true)
   */
  public resetCamera(animated: boolean = true): void {
    // Switch to perspective camera for 3D rotational view
    this.cameraMode = 'isometric';
    this.currentCamera = this.perspectiveCamera;

    if (animated) {
      const distance = this.cameraDistance;
      const targetPosition = new THREE.Vector3(distance, distance, distance);
      const targetUp = new THREE.Vector3(0, 1, 0);
      this.animateCameraTo(targetPosition, targetUp);
    } else {
      this.setupCanonicalView();
    }
  }

  /**
   * Ease-in-ease-out function (smoothstep)
   * Returns a smooth interpolation value between 0 and 1
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Animate camera to a target position and orientation (looking at origin)
   * @param targetPosition - Target camera position
   * @param targetUp - Target camera up vector
   * @param duration - Animation duration in milliseconds (default: 400ms)
   */
  private animateCameraTo(
    targetPosition: THREE.Vector3,
    targetUp: THREE.Vector3,
    duration: number = 400
  ): void {
    // For backward compatibility, animate looking at origin
    this.animateCameraToWithLookAt(targetPosition, new THREE.Vector3(0, 0, 0), targetUp, duration);
  }

  /**
   * Animate camera to a target position and orientation with custom lookAt point
   * @param targetPosition - Target camera position
   * @param targetLookAt - Target point to look at
   * @param targetUp - Target camera up vector
   * @param duration - Animation duration in milliseconds (default: 400ms)
   */
  private animateCameraToWithLookAt(
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    targetUp: THREE.Vector3,
    duration: number = 400
  ): void {
    // Use the currently active camera for animation
    const camera = this.cameraMode === 'isometric' ? this.perspectiveCamera : this.orthographicCamera;

    // Calculate current lookAt point by projecting forward from camera
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.multiplyScalar(this.cameraDistance);
    currentLookAt.add(camera.position);

    this.cameraAnimation = {
      active: true,
      startPosition: camera.position.clone(),
      targetPosition: targetPosition.clone(),
      startUp: camera.up.clone(),
      targetUp: targetUp.clone(),
      startLookAt: currentLookAt,
      targetLookAt: targetLookAt.clone(),
      startTime: performance.now(),
      duration,
    };
  }

  /**
   * Update camera animation state (called each frame)
   * Returns true if animation is still active, false if completed
   */
  private updateCameraAnimation(): boolean {
    if (!this.cameraAnimation || !this.cameraAnimation.active) {
      return false;
    }

    const now = performance.now();
    const elapsed = now - this.cameraAnimation.startTime;
    const progress = Math.min(elapsed / this.cameraAnimation.duration, 1);

    // Apply easing function
    const easedProgress = this.easeInOutCubic(progress);

    // Get the camera to animate based on current mode
    const camera = this.cameraMode === 'isometric' ? this.perspectiveCamera : this.orthographicCamera;

    // Interpolate position
    camera.position.lerpVectors(
      this.cameraAnimation.startPosition,
      this.cameraAnimation.targetPosition,
      easedProgress
    );

    // Interpolate up vector
    camera.up.lerpVectors(
      this.cameraAnimation.startUp,
      this.cameraAnimation.targetUp,
      easedProgress
    );

    // Interpolate lookAt point
    const currentLookAt = new THREE.Vector3();
    currentLookAt.lerpVectors(
      this.cameraAnimation.startLookAt,
      this.cameraAnimation.targetLookAt,
      easedProgress
    );
    camera.lookAt(currentLookAt);

    // Check if animation is complete
    if (progress >= 1) {
      this.cameraAnimation.active = false;
      return false;
    }

    return true;
  }

  /**
   * Calculate the world position of a layer along a face axis
   * @param layer - The layer index (0-15)
   * @returns The world coordinate of that layer
   */
  private getLayerPosition(layer: number): number {
    // Match CubeRenderer's cell positioning:
    // spacing = cellSize + cellGap = 1.0 + 0.1 = 1.1
    // offset = 7.5 * spacing = 8.25
    // layer position = layer * spacing - offset
    const spacing = 1.1;
    const offset = 7.5 * spacing;
    return layer * spacing - offset;
  }

  /**
   * Set camera to face-on view for a specific face with smooth animation
   * @param face - The face to view ('i', 'j', or 'k')
   * @param layer - The layer depth (0-15)
   * @param animated - Whether to animate the transition (default: true)
   *
   * Camera is positioned to look at the specific layer plane.
   * Uses orthographic camera for true 2D appearance.
   */
  public setFaceOnView(face: 'i' | 'j' | 'k', layer: number, animated: boolean = true): void {
    // Switch to orthographic camera for face-on view
    this.cameraMode = 'face-on';
    this.currentCamera = this.orthographicCamera;

    const { position, lookAt, up } = this.calculateFaceOnCameraParams(face, layer);

    if (animated) {
      this.animateCameraToWithLookAt(position, lookAt, up);
    } else {
      // Instant snap
      this.orthographicCamera.position.copy(position);
      this.orthographicCamera.up.copy(up);
      this.orthographicCamera.lookAt(lookAt);
    }
  }

  /**
   * Calculate camera parameters for face-on view of a specific layer
   * @param face - The face to view
   * @param layer - The layer depth (0-15)
   * @returns Camera position, lookAt point, and up vector
   */
  private calculateFaceOnCameraParams(face: 'i' | 'j' | 'k', layer: number): {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    up: THREE.Vector3;
  } {
    const distance = this.cameraDistance;
    const layerPos = this.getLayerPosition(layer);

    let position: THREE.Vector3;
    let lookAt: THREE.Vector3;
    let up: THREE.Vector3;

    switch (face) {
      case 'i': // Top/bottom face (y-axis) - camera looks down/up Y axis
        position = new THREE.Vector3(0, layerPos + distance, 0);
        lookAt = new THREE.Vector3(0, layerPos, 0);
        up = new THREE.Vector3(0, 0, -1);
        break;
      case 'j': // Right/left face (x-axis) - camera looks along X axis
        position = new THREE.Vector3(layerPos + distance, 0, 0);
        lookAt = new THREE.Vector3(layerPos, 0, 0);
        up = new THREE.Vector3(0, 1, 0);
        break;
      case 'k': // Front/back face (z-axis) - camera looks along Z axis
        position = new THREE.Vector3(0, 0, layerPos + distance);
        lookAt = new THREE.Vector3(0, 0, layerPos);
        up = new THREE.Vector3(0, 1, 0);
        break;
    }

    return { position, lookAt, up };
  }

  /**
   * Update camera position for a layer change in face-on view
   * @param face - The current face being viewed
   * @param layer - The new layer depth (0-15)
   * @param animated - Whether to animate the transition (default: true)
   */
  public updateFaceOnLayer(face: 'i' | 'j' | 'k', layer: number, animated: boolean = true): void {
    if (this.cameraMode !== 'face-on') {
      return; // Only update in face-on mode
    }

    const { position, lookAt, up } = this.calculateFaceOnCameraParams(face, layer);

    if (animated) {
      this.animateCameraToWithLookAt(position, lookAt, up);
    } else {
      this.orthographicCamera.position.copy(position);
      this.orthographicCamera.up.copy(up);
      this.orthographicCamera.lookAt(lookAt);
    }
  }

  /**
   * Start the render loop
   * @param callback - Optional callback to run each frame after rendering main scene
   */
  public startRenderLoop(callback?: () => void): void {
    if (this.animationFrameId !== null) {
      return; // Already running
    }

    const animate = (): void => {
      this.animationFrameId = requestAnimationFrame(animate);

      // Update camera animation if active
      this.updateCameraAnimation();

      // Ensure full viewport is set before main render
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.renderer.setViewport(0, 0, width, height);

      // Render main scene first (using the currently active camera)
      this.renderer.render(this.scene, this.currentCamera);

      // Then run callback (e.g., for minimap rendering on top)
      if (callback) {
        callback();
      }
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
    this.renderer.render(this.scene, this.currentCamera);
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
   * Get the currently active Three.js camera
   */
  public getCamera(): THREE.Camera {
    return this.currentCamera;
  }

  /**
   * Get the perspective camera (for 3D rotational view)
   */
  public getPerspectiveCamera(): THREE.PerspectiveCamera {
    return this.perspectiveCamera;
  }

  /**
   * Get the orthographic camera (for face-on view)
   */
  public getOrthographicCamera(): THREE.OrthographicCamera {
    return this.orthographicCamera;
  }

  /**
   * Get the current camera mode
   */
  public getCameraMode(): CameraMode {
    return this.cameraMode;
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
