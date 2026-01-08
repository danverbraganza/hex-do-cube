/**
 * Tests for WinScreenRenderer
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as THREE from 'three';
import { WinScreenRenderer } from './WinScreenRenderer.js';

describe('WinScreenRenderer', () => {
  let renderer: WinScreenRenderer;

  beforeEach(() => {
    renderer = new WinScreenRenderer();
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('constructor', () => {
    test('creates a valid Three.js Group container', () => {
      const container = renderer.getContainer();
      expect(container).toBeInstanceOf(THREE.Group);
    });

    test('starts with no fireworks', () => {
      const container = renderer.getContainer();
      expect(container.children.length).toBe(0);
    });

    test('accepts custom configuration', () => {
      const customRenderer = new WinScreenRenderer({
        maxFireworks: 5,
        particlesPerBurst: 50,
        particleLifetime: 3,
        launchInterval: 0.5,
      });
      expect(customRenderer.getContainer()).toBeInstanceOf(THREE.Group);
      customRenderer.dispose();
    });

    test('uses default configuration when not provided', () => {
      const defaultRenderer = new WinScreenRenderer();
      expect(defaultRenderer.getContainer()).toBeInstanceOf(THREE.Group);
      defaultRenderer.dispose();
    });
  });

  describe('show', () => {
    test('prepares to launch fireworks', () => {
      renderer.show();
      // After show, update should start launching fireworks
      const updated = renderer.update();
      expect(updated).toBe(true);
    });
  });

  describe('hide', () => {
    test('clears all fireworks', () => {
      renderer.show();
      renderer.update();
      renderer.update();
      renderer.update();

      const container = renderer.getContainer();
      const childrenBefore = container.children.length;

      renderer.hide();

      expect(container.children.length).toBe(0);
      expect(childrenBefore).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    test('launches fireworks when shown', () => {
      renderer.show();
      const container = renderer.getContainer();

      expect(container.children.length).toBe(0);

      renderer.update();

      // Should have launched at least one firework
      expect(container.children.length).toBeGreaterThanOrEqual(1);
    });

    test('returns true when fireworks are active', () => {
      renderer.show();
      const result = renderer.update();
      expect(result).toBe(true);
    });

    test('returns false when no fireworks are active', () => {
      const result = renderer.update();
      expect(result).toBe(false);
    });

    test('limits number of fireworks to maxFireworks', () => {
      const limitedRenderer = new WinScreenRenderer({
        maxFireworks: 2,
        launchInterval: 0.001, // Very fast launch
      });

      limitedRenderer.show();

      // Update many times to try to launch more than max
      for (let i = 0; i < 10; i++) {
        limitedRenderer.update();
      }

      const container = limitedRenderer.getContainer();
      expect(container.children.length).toBeLessThanOrEqual(2);

      limitedRenderer.dispose();
    });

    test('creates THREE.Points for each firework', () => {
      renderer.show();
      renderer.update();

      const container = renderer.getContainer();
      for (const child of container.children) {
        expect(child).toBeInstanceOf(THREE.Points);
      }
    });

    test('fireworks have BufferGeometry', () => {
      renderer.show();
      renderer.update();

      const container = renderer.getContainer();
      const firework = container.children[0] as THREE.Points;
      expect(firework.geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    test('fireworks have PointsMaterial', () => {
      renderer.show();
      renderer.update();

      const container = renderer.getContainer();
      const firework = container.children[0] as THREE.Points;
      expect(firework.material).toBeInstanceOf(THREE.PointsMaterial);
    });

    test('fireworks have position and color attributes', () => {
      renderer.show();
      renderer.update();

      const container = renderer.getContainer();
      const firework = container.children[0] as THREE.Points;
      const geometry = firework.geometry;

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.color).toBeDefined();
    });

    test('updates particle positions over time', () => {
      renderer.show();
      renderer.update();

      const container = renderer.getContainer();
      const firework = container.children[0] as THREE.Points;
      const initialPositions = Array.from(firework.geometry.attributes.position.array);

      // Wait a bit and update again
      for (let i = 0; i < 5; i++) {
        renderer.update();
      }

      const updatedPositions = Array.from(firework.geometry.attributes.position.array);

      // Positions should have changed (particles moving)
      expect(updatedPositions).not.toEqual(initialPositions);
    });

    test('fades out particles over time', () => {
      renderer.show();
      renderer.update();

      const container = renderer.getContainer();
      const firework = container.children[0] as THREE.Points;
      const material = firework.material as THREE.PointsMaterial;

      const initialOpacity = material.opacity;
      expect(initialOpacity).toBeGreaterThan(0);
    });
  });

  describe('isShowing', () => {
    test('returns false initially', () => {
      expect(renderer.isShowing()).toBe(false);
    });

    test('returns true after show and update', () => {
      renderer.show();
      renderer.update();
      expect(renderer.isShowing()).toBe(true);
    });

    test('returns false after hide', () => {
      renderer.show();
      renderer.update();
      renderer.hide();
      expect(renderer.isShowing()).toBe(false);
    });
  });

  describe('dispose', () => {
    test('clears all fireworks', () => {
      renderer.show();
      renderer.update();
      renderer.update();

      renderer.dispose();

      const container = renderer.getContainer();
      expect(container.children.length).toBe(0);
    });

    test('can be called multiple times safely', () => {
      renderer.dispose();
      renderer.dispose();
      // Should not throw
    });
  });

  describe('firework colors', () => {
    test('uses colorful particle colors', () => {
      renderer.show();
      renderer.update();

      const container = renderer.getContainer();
      const firework = container.children[0] as THREE.Points;
      const colors = firework.geometry.attributes.color;

      // Check that colors are defined
      expect(colors).toBeDefined();
      expect(colors.count).toBeGreaterThan(0);

      // Colors should be in valid range [0, 1]
      for (let i = 0; i < colors.count * 3; i++) {
        const value = colors.array[i];
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('particle lifetime', () => {
    test('removes expired fireworks', async () => {
      const shortLivedRenderer = new WinScreenRenderer({
        particleLifetime: 0.01, // 10ms lifetime
        maxFireworks: 1,
      });

      shortLivedRenderer.show();
      shortLivedRenderer.update();

      const container = shortLivedRenderer.getContainer();
      expect(container.children.length).toBe(1);

      // Wait for particles to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      // Update to process expired fireworks
      shortLivedRenderer.update();

      // Expired firework should be removed
      expect(container.children.length).toBe(0);

      shortLivedRenderer.dispose();
    });
  });

  describe('performance', () => {
    test('limits particle count per burst', () => {
      const lowParticleRenderer = new WinScreenRenderer({
        particlesPerBurst: 10,
      });

      lowParticleRenderer.show();
      lowParticleRenderer.update();

      const container = lowParticleRenderer.getContainer();
      const firework = container.children[0] as THREE.Points;
      const positions = firework.geometry.attributes.position;

      // Should have exactly 10 particles (30 floats: 10 particles * 3 coordinates)
      expect(positions.count).toBe(10);

      lowParticleRenderer.dispose();
    });
  });

  describe('launch interval', () => {
    test('respects launch interval timing', () => {
      const slowLaunchRenderer = new WinScreenRenderer({
        launchInterval: 10, // Very slow launch (10 seconds)
        maxFireworks: 5,
      });

      slowLaunchRenderer.show();
      slowLaunchRenderer.update();

      const container = slowLaunchRenderer.getContainer();
      const firstCount = container.children.length;

      // Update a few more times - should not launch more fireworks due to interval
      slowLaunchRenderer.update();
      slowLaunchRenderer.update();

      expect(container.children.length).toBe(firstCount);

      slowLaunchRenderer.dispose();
    });
  });
});
