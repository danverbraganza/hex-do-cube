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

    test('shows only X and Z planes (perpendicular) in face-on i view', () => {
      // i-face: looking down Y-axis, viewing XZ plane
      // In face-on mode: all 3D planes are hidden and line segments are shown instead
      renderer.setMode('face-on', 'i', 0);

      const container = renderer.getContainer();

      // All 3D planes should be hidden in face-on mode
      const allPlanes = container.children.filter((child): child is THREE.Mesh => {
        return (
          child instanceof THREE.Mesh &&
          'userData' in child &&
          typeof child.userData === 'object' &&
          child.userData !== null &&
          'axis' in child.userData
        );
      });
      expect(allPlanes.every((p) => !p.visible)).toBe(true);

      // Should have a group with line segments
      const lineGroup = container.children.find((child) => child.name === 'FaceOnSeparatorLines');
      expect(lineGroup).toBeDefined();

      // Face-on i view should have 6 line segments (3 vertical + 3 horizontal)
      if (lineGroup) {
        expect(lineGroup.children.length).toBe(6);
      }
    });

    test('shows only Y and Z planes (perpendicular) in face-on j view', () => {
      // j-face: looking down X-axis, viewing YZ plane
      // In face-on mode: all 3D planes are hidden and line segments are shown instead
      renderer.setMode('face-on', 'j', 0);

      const container = renderer.getContainer();

      // All 3D planes should be hidden in face-on mode
      const allPlanes = container.children.filter((child): child is THREE.Mesh => {
        return (
          child instanceof THREE.Mesh &&
          'userData' in child &&
          typeof child.userData === 'object' &&
          child.userData !== null &&
          'axis' in child.userData
        );
      });
      expect(allPlanes.every((p) => !p.visible)).toBe(true);

      // Should have a group with line segments
      const lineGroup = container.children.find((child) => child.name === 'FaceOnSeparatorLines');
      expect(lineGroup).toBeDefined();

      // Face-on j view should have 6 line segments (3 vertical + 3 horizontal)
      if (lineGroup) {
        expect(lineGroup.children.length).toBe(6);
      }
    });

    test('shows only X and Y planes (perpendicular) in face-on k view', () => {
      // k-face: looking down Z-axis, viewing XY plane
      // In face-on mode: all 3D planes are hidden and line segments are shown instead
      renderer.setMode('face-on', 'k', 0);

      const container = renderer.getContainer();

      // All 3D planes should be hidden in face-on mode
      const allPlanes = container.children.filter((child): child is THREE.Mesh => {
        return (
          child instanceof THREE.Mesh &&
          'userData' in child &&
          typeof child.userData === 'object' &&
          child.userData !== null &&
          'axis' in child.userData
        );
      });
      expect(allPlanes.every((p) => !p.visible)).toBe(true);

      // Should have a group with line segments
      const lineGroup = container.children.find((child) => child.name === 'FaceOnSeparatorLines');
      expect(lineGroup).toBeDefined();

      // Face-on k view should have 6 line segments (3 vertical + 3 horizontal)
      if (lineGroup) {
        expect(lineGroup.children.length).toBe(6);
      }
    });

    test('switches between 3D and face-on modes correctly', () => {
      // Start in 3D mode
      renderer.setMode('3d');
      let container = renderer.getContainer();
      let visibleCount = container.children.filter((child) => child.visible).length;
      expect(visibleCount).toBe(9);

      // Switch to face-on mode (all 3D planes hidden, 1 line group with 6 line segments)
      renderer.setMode('face-on', 'i', 0);
      container = renderer.getContainer();
      const lineGroup = container.children.find((child) => child.name === 'FaceOnSeparatorLines');
      expect(lineGroup).toBeDefined();
      if (lineGroup) {
        expect(lineGroup.children.length).toBe(6); // 3 vertical + 3 horizontal lines
      }

      // Switch back to 3D mode (line group should be removed, all 9 planes visible)
      renderer.setMode('3d');
      container = renderer.getContainer();
      visibleCount = container.children.filter((child) => child.visible).length;
      expect(visibleCount).toBe(9);
      const lineGroupAfter = container.children.find((child) => child.name === 'FaceOnSeparatorLines');
      expect(lineGroupAfter).toBeUndefined();
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
        const expectedX = (expectedBoundaries[i] - 0.5) * spacing - offset;
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
        const expectedY = (expectedBoundaries[i] - 0.5) * spacing - offset;
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
        const expectedZ = (expectedBoundaries[i] - 0.5) * spacing - offset;
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

    test('line segments use opaque material in face-on mode', () => {
      renderer.setMode('face-on', 'i', 0);

      const container = renderer.getContainer();
      const lineGroup = container.children.find((child) => child.name === 'FaceOnSeparatorLines');

      expect(lineGroup).toBeDefined();
      if (lineGroup) {
        // Check that line meshes use opaque material
        lineGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshBasicMaterial;
            expect(material.transparent).toBe(false);
            expect(material.opacity).toBe(1.0);
            expect(material.side).toBe(THREE.DoubleSide);
            expect(material.depthWrite).toBe(true);
          }
        });
      }
    });
  });
});
