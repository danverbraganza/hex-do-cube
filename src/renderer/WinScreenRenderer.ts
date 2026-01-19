/**
 * WinScreenRenderer for Hex-Do-Cube
 * Renders a celebratory fireworks particle effect when the player wins
 *
 * Features:
 * - Multiple firework bursts at random positions
 * - Colorful particles using Three.js Points
 * - Particles fade out naturally over time
 * - Continuous loop of fireworks
 * - Performance-conscious particle count
 */

import * as THREE from 'three';
import { PALETTE } from '../config/ColorPalette.js';

export interface WinScreenRendererConfig {
  /** Number of active fireworks at once (default: 3) */
  maxFireworks?: number;
  /** Number of particles per firework burst (default: 100) */
  particlesPerBurst?: number;
  /** Particle lifetime in seconds (default: 2) */
  particleLifetime?: number;
  /** Launch interval in seconds (default: 0.3) */
  launchInterval?: number;
}

/**
 * Represents a single firework burst
 */
interface Firework {
  /** Launch position */
  origin: THREE.Vector3;
  /** Launch time (seconds since epoch) */
  launchTime: number;
  /** Particle system */
  particles: THREE.Points;
  /** Particle velocities */
  velocities: THREE.Vector3[];
  /** Firework color */
  color: THREE.Color;
}

/**
 * WinScreenRenderer manages fireworks particle effects
 */
export class WinScreenRenderer {
  private container: THREE.Group;
  private fireworks: Firework[] = [];
  private lastLaunchTime: number = 0;

  private config: Required<WinScreenRendererConfig>;

  // Colorful firework colors (celebration theme)
  private readonly FIREWORK_COLORS = [
    new THREE.Color(PALETTE.firework.red.hex),
    new THREE.Color(PALETTE.firework.green.hex),
    new THREE.Color(PALETTE.firework.blue.hex),
    new THREE.Color(PALETTE.firework.yellow.hex),
    new THREE.Color(PALETTE.firework.magenta.hex),
    new THREE.Color(PALETTE.firework.cyan.hex),
    new THREE.Color(PALETTE.firework.orange.hex),
    new THREE.Color(PALETTE.firework.purple.hex),
  ];

  constructor(config: WinScreenRendererConfig = {}) {
    this.config = {
      maxFireworks: config.maxFireworks ?? 3,
      particlesPerBurst: config.particlesPerBurst ?? 100,
      particleLifetime: config.particleLifetime ?? 2,
      launchInterval: config.launchInterval ?? 0.3,
    };

    this.container = new THREE.Group();
  }

  /**
   * Get the Three.js container object
   */
  public getContainer(): THREE.Group {
    return this.container;
  }

  /**
   * Launch a new firework at a random position
   */
  private launchFirework(): void {
    // Random launch position (within cube bounds, elevated)
    const origin = new THREE.Vector3(
      (Math.random() - 0.5) * 20, // X: -10 to 10
      Math.random() * 10 + 5,     // Y: 5 to 15 (above cube)
      (Math.random() - 0.5) * 20  // Z: -10 to 10
    );

    // Random color from palette
    const color = this.FIREWORK_COLORS[
      Math.floor(Math.random() * this.FIREWORK_COLORS.length)
    ].clone();

    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.config.particlesPerBurst * 3);
    const colors = new Float32Array(this.config.particlesPerBurst * 3);

    // Initialize all particles at origin
    for (let i = 0; i < this.config.particlesPerBurst; i++) {
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create particle material
    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Create particle system
    const particles = new THREE.Points(geometry, material);

    // Generate random velocities for each particle (explosion pattern)
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < this.config.particlesPerBurst; i++) {
      // Random direction in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = Math.random() * 5 + 3; // Speed: 3-8 units/sec

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      velocities.push(velocity);
    }

    // Add to scene
    this.container.add(particles);

    // Track firework
    const firework: Firework = {
      origin,
      launchTime: performance.now() / 1000,
      particles,
      velocities,
      color,
    };
    this.fireworks.push(firework);
  }

  /**
   * Update fireworks animation (call each frame)
   * @returns true if there are active fireworks, false otherwise
   */
  public update(): boolean {
    const now = performance.now() / 1000;

    // Launch new fireworks if needed (only if show() was called)
    if (this.lastLaunchTime > 0 && this.fireworks.length < this.config.maxFireworks) {
      const timeSinceLaunch = now - this.lastLaunchTime;
      // Launch immediately on first update (timeSinceLaunch will be very small)
      // or after interval has elapsed
      if (this.fireworks.length === 0 || timeSinceLaunch > this.config.launchInterval) {
        this.launchFirework();
        this.lastLaunchTime = now;
      }
    }

    // Update existing fireworks
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const firework = this.fireworks[i];
      const age = now - firework.launchTime;

      // Remove expired fireworks
      if (age > this.config.particleLifetime) {
        this.container.remove(firework.particles);
        firework.particles.geometry.dispose();
        (firework.particles.material as THREE.Material).dispose();
        this.fireworks.splice(i, 1);
        continue;
      }

      // Update particle positions
      const positions = firework.particles.geometry.attributes.position;
      for (let j = 0; j < this.config.particlesPerBurst; j++) {
        const velocity = firework.velocities[j];

        // Apply velocity with gravity
        positions.array[j * 3] = firework.origin.x + velocity.x * age;
        positions.array[j * 3 + 1] = firework.origin.y + velocity.y * age - 4.9 * age * age; // Gravity
        positions.array[j * 3 + 2] = firework.origin.z + velocity.z * age;
      }
      positions.needsUpdate = true;

      // Fade out particles over lifetime
      const material = firework.particles.material as THREE.PointsMaterial;
      material.opacity = 1.0 - age / this.config.particleLifetime;
    }

    return this.fireworks.length > 0;
  }

  /**
   * Show the win screen (start launching fireworks)
   */
  public show(): void {
    this.lastLaunchTime = performance.now() / 1000; // Set to current time to enable launching
  }

  /**
   * Hide the win screen (clear all fireworks)
   */
  public hide(): void {
    // Remove all fireworks
    for (const firework of this.fireworks) {
      this.container.remove(firework.particles);
      firework.particles.geometry.dispose();
      (firework.particles.material as THREE.Material).dispose();
    }
    this.fireworks = [];
    this.lastLaunchTime = 0; // Reset to disable launching
  }

  /**
   * Check if win screen is currently showing
   */
  public isShowing(): boolean {
    return this.fireworks.length > 0;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.hide();
  }
}
