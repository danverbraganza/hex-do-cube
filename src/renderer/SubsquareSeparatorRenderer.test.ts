/**
 * Unit tests for SubsquareSeparatorRenderer
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as THREE from 'three';
import { SubsquareSeparatorRenderer } from './SubsquareSeparatorRenderer.js';

describe('SubsquareSeparatorRenderer', () => {
  let renderer: SubsquareSeparatorRenderer;

  beforeEach(() => {
    renderer = new SubsquareSeparatorRenderer();
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('Constructor', () => {
    test('creates a container group', () => {
      const container = renderer.getContainer();
      expect(container).toBeInstanceOf(THREE.Group);
      expect(container.name).toBe('SubsquareSeparators');
    });

    test('creates 9 separator planes (3 per axis)', () => {
      const container = renderer.getContainer();
      // Should have 9 planes total: 3 X-axis + 3 Y-axis + 3 Z-axis
      expect(container.children.length).toBe(9);
    });

    test('uses default configuration when not specified', () => {
      const container = renderer.getContainer();
      expect(container.children.length).toBeGreaterThan(0);
      // Verify first plane has expected properties
      const firstPlane = container.children[0] as THREE.Mesh;
      expect(firstPlane).toBeInstanceOf(THREE.Mesh);
      expect(firstPlane.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    });

    test('accepts custom configuration', () => {
      const customRenderer = new SubsquareSeparatorRenderer({
        cellSize: 2.0,
        cellGap: 0.2,
        separatorColor: 0x00ff00,
        opacity3D: 0.5,
        opacityFaceOn: 0.8,
        planeThickness: 0.05,
      });

      const container = customRenderer.getContainer();
      expect(container.children.length).toBe(9);

      customRenderer.dispose();
    });
  });

  describe('setMode', () => {
    test('shows all planes in 3D mode', () => {
      renderer.setMode('3d');

      const container = renderer.getContainer();
      const visiblePlanes = container.children.filter((child) => child.visible);

      // All 9 planes should be visible in 3D mode
      expect(visiblePlanes.length).toBe(9);
    });

    test('shows only Y-axis planes in face-on i view', () => {
      renderer.setMode('face-on', 'i', 0);

      const container = renderer.getContainer();
      const visiblePlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.visible && plane.userData.axis === 'y';
      });

      // Should show 3 Y-axis planes when viewing i face
      expect(visiblePlanes.length).toBe(3);

      // X and Z planes should be hidden
      const xPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'x';
      });
      const zPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'z';
      });

      expect(xPlanes.every((p) => !p.visible)).toBe(true);
      expect(zPlanes.every((p) => !p.visible)).toBe(true);
    });

    test('shows only X-axis planes in face-on j view', () => {
      renderer.setMode('face-on', 'j', 0);

      const container = renderer.getContainer();
      const visiblePlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.visible && plane.userData.axis === 'x';
      });

      // Should show 3 X-axis planes when viewing j face
      expect(visiblePlanes.length).toBe(3);

      // Y and Z planes should be hidden
      const yPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'y';
      });
      const zPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'z';
      });

      expect(yPlanes.every((p) => !p.visible)).toBe(true);
      expect(zPlanes.every((p) => !p.visible)).toBe(true);
    });

    test('shows only Z-axis planes in face-on k view', () => {
      renderer.setMode('face-on', 'k', 0);

      const container = renderer.getContainer();
      const visiblePlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.visible && plane.userData.axis === 'z';
      });

      // Should show 3 Z-axis planes when viewing k face
      expect(visiblePlanes.length).toBe(3);

      // X and Y planes should be hidden
      const xPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'x';
      });
      const yPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'y';
      });

      expect(xPlanes.every((p) => !p.visible)).toBe(true);
      expect(yPlanes.every((p) => !p.visible)).toBe(true);
    });

    test('switches between 3D and face-on modes correctly', () => {
      // Start in 3D mode
      renderer.setMode('3d');
      let container = renderer.getContainer();
      let visibleCount = container.children.filter((child) => child.visible).length;
      expect(visibleCount).toBe(9);

      // Switch to face-on mode
      renderer.setMode('face-on', 'i', 0);
      container = renderer.getContainer();
      visibleCount = container.children.filter((child) => child.visible).length;
      expect(visibleCount).toBe(3);

      // Switch back to 3D mode
      renderer.setMode('3d');
      container = renderer.getContainer();
      visibleCount = container.children.filter((child) => child.visible).length;
      expect(visibleCount).toBe(9);
    });
  });

  describe('Plane positioning', () => {
    test('planes are positioned at subsquare boundaries', () => {
      const container = renderer.getContainer();
      const spacing = 1.0 + 0.1; // cellSize + cellGap (default)
      const offset = (15 * spacing) / 2;

      // Expected positions for boundaries 4, 8, 12
      const expectedBoundaries = [4, 8, 12];

      // Check X-axis planes
      const xPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'x';
      }) as THREE.Mesh[];

      expect(xPlanes.length).toBe(3);
      xPlanes.forEach((plane, i) => {
        const expectedX = expectedBoundaries[i] * spacing - offset;
        expect(plane.position.x).toBeCloseTo(expectedX, 5);
        expect(plane.userData.boundary).toBe(expectedBoundaries[i]);
      });

      // Check Y-axis planes
      const yPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'y';
      }) as THREE.Mesh[];

      expect(yPlanes.length).toBe(3);
      yPlanes.forEach((plane, i) => {
        const expectedY = expectedBoundaries[i] * spacing - offset;
        expect(plane.position.y).toBeCloseTo(expectedY, 5);
        expect(plane.userData.boundary).toBe(expectedBoundaries[i]);
      });

      // Check Z-axis planes
      const zPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'z';
      }) as THREE.Mesh[];

      expect(zPlanes.length).toBe(3);
      zPlanes.forEach((plane, i) => {
        const expectedZ = expectedBoundaries[i] * spacing - offset;
        expect(plane.position.z).toBeCloseTo(expectedZ, 5);
        expect(plane.userData.boundary).toBe(expectedBoundaries[i]);
      });
    });

    test('planes are properly oriented perpendicular to their axis', () => {
      const container = renderer.getContainer();

      // X-axis planes should be rotated around Y by π/2
      const xPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'x';
      }) as THREE.Mesh[];

      xPlanes.forEach((plane) => {
        expect(plane.rotation.y).toBeCloseTo(Math.PI / 2, 5);
      });

      // Y-axis planes should be rotated around X by π/2
      const yPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'y';
      }) as THREE.Mesh[];

      yPlanes.forEach((plane) => {
        expect(plane.rotation.x).toBeCloseTo(Math.PI / 2, 5);
      });

      // Z-axis planes should have no rotation (default orientation)
      const zPlanes = container.children.filter((child) => {
        const plane = child as THREE.Mesh;
        return plane.userData.axis === 'z';
      }) as THREE.Mesh[];

      zPlanes.forEach((plane) => {
        expect(plane.rotation.x).toBe(0);
        expect(plane.rotation.y).toBe(0);
        expect(plane.rotation.z).toBe(0);
      });
    });
  });

  describe('dispose', () => {
    test('cleans up all resources', () => {
      const container = renderer.getContainer();
      const initialChildCount = container.children.length;

      expect(initialChildCount).toBe(9);

      renderer.dispose();

      // Container should be cleared
      expect(container.children.length).toBe(0);
    });
  });

  describe('Material properties', () => {
    test('planes use translucent material in 3D mode', () => {
      renderer.setMode('3d');

      const container = renderer.getContainer();
      const firstPlane = container.children[0] as THREE.Mesh;
      const material = firstPlane.material as THREE.MeshBasicMaterial;

      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(0.15); // Default opacity3D
      expect(material.side).toBe(THREE.DoubleSide);
      expect(material.depthWrite).toBe(false);
    });

    test('visible planes use opaque material in face-on mode', () => {
      renderer.setMode('face-on', 'i', 0);

      const container = renderer.getContainer();
      const visiblePlanes = container.children.filter((child) => {
        return child.visible;
      }) as THREE.Mesh[];

      visiblePlanes.forEach((plane) => {
        const material = plane.material as THREE.MeshBasicMaterial;
        expect(material.transparent).toBe(true);
        expect(material.opacity).toBe(1.0); // Default opacityFaceOn
        expect(material.side).toBe(THREE.DoubleSide);
        expect(material.depthWrite).toBe(false);
      });
    });
  });
});
