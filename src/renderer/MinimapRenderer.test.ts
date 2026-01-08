import { describe, expect, it, beforeEach } from 'bun:test';
import { MinimapRenderer } from './MinimapRenderer.js';
import type { Cube } from '../models/Cube.js';
import type { Cell } from '../models/Cell.js';
import * as THREE from 'three';

/**
 * Mock Cube for testing
 */
class MockCube implements Partial<Cube> {
  public cells: Cell[][][] = [];

  constructor() {
    // Initialize 16x16x16 cube with empty cells
    for (let i = 0; i < 16; i++) {
      this.cells[i] = [];
      for (let j = 0; j < 16; j++) {
        this.cells[i][j] = [];
        for (let k = 0; k < 16; k++) {
          this.cells[i][j][k] = {
            value: null,
            position: [i, j, k],
            type: 'editable',
          } as Cell;
        }
      }
    }
  }
}

/**
 * Mock WebGLRenderer for testing
 */
class MockWebGLRenderer {
  public setViewport = () => {};
  public setScissor = () => {};
  public setScissorTest = () => {};
  public autoClear = true;
  public clear = () => {};
  public render = () => {};
}

describe('MinimapRenderer - Layer Highlighting', () => {
  let minimapRenderer: MinimapRenderer;
  let mockCube: MockCube;
  let mockRenderer: MockWebGLRenderer;

  beforeEach(() => {
    // Create mock WebGL renderer
    mockRenderer = new MockWebGLRenderer();

    // Create mock cube
    mockCube = new MockCube();

    // Create minimap renderer
    minimapRenderer = new MinimapRenderer(
      mockCube as unknown as Cube,
      mockRenderer as unknown as THREE.WebGLRenderer,
      {
        viewportSize: 200,
        margin: 20,
      }
    );
  });

  describe('setHighlightedLayer', () => {
    it('should initially have no highlighted layer', () => {
      expect(minimapRenderer.getHighlightedLayer()).toBe(null);
    });

    it('should set highlighted layer for face "i" at layer 5', () => {
      minimapRenderer.setHighlightedLayer('i', 5);
      const highlighted = minimapRenderer.getHighlightedLayer();
      expect(highlighted).toEqual({ face: 'i', layer: 5 });
    });

    it('should set highlighted layer for face "j" at layer 0', () => {
      minimapRenderer.setHighlightedLayer('j', 0);
      const highlighted = minimapRenderer.getHighlightedLayer();
      expect(highlighted).toEqual({ face: 'j', layer: 0 });
    });

    it('should set highlighted layer for face "k" at layer 15', () => {
      minimapRenderer.setHighlightedLayer('k', 15);
      const highlighted = minimapRenderer.getHighlightedLayer();
      expect(highlighted).toEqual({ face: 'k', layer: 15 });
    });

    it('should clear highlighted layer when face is null', () => {
      minimapRenderer.setHighlightedLayer('i', 5);
      minimapRenderer.setHighlightedLayer(null, null);
      expect(minimapRenderer.getHighlightedLayer()).toBe(null);
    });

    it('should clear highlighted layer when layer is null', () => {
      minimapRenderer.setHighlightedLayer('i', 5);
      minimapRenderer.setHighlightedLayer('i', null);
      expect(minimapRenderer.getHighlightedLayer()).toBe(null);
    });

    it('should update highlighted layer when changing layers on same face', () => {
      minimapRenderer.setHighlightedLayer('k', 7);
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'k', layer: 7 });

      minimapRenderer.setHighlightedLayer('k', 10);
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'k', layer: 10 });
    });

    it('should update highlighted layer when changing faces', () => {
      minimapRenderer.setHighlightedLayer('k', 7);
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'k', layer: 7 });

      minimapRenderer.setHighlightedLayer('i', 5);
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'i', layer: 5 });
    });

    it('should handle layer values at boundaries (0 and 15)', () => {
      minimapRenderer.setHighlightedLayer('i', 0);
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'i', layer: 0 });

      minimapRenderer.setHighlightedLayer('j', 15);
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'j', layer: 15 });
    });

    it('should handle layer values below 0 (no mesh will be visible)', () => {
      minimapRenderer.setHighlightedLayer('i', -1);
      const highlighted = minimapRenderer.getHighlightedLayer();
      expect(highlighted).toEqual({ face: 'i', layer: -1 });
    });

    it('should handle layer values above 15 (no mesh will be visible)', () => {
      minimapRenderer.setHighlightedLayer('i', 16);
      const highlighted = minimapRenderer.getHighlightedLayer();
      expect(highlighted).toEqual({ face: 'i', layer: 16 });
    });
  });

  describe('layer and face highlighting coordination', () => {
    it('should allow both face and layer highlights simultaneously', () => {
      minimapRenderer.setHighlightedFace('k');
      minimapRenderer.setHighlightedLayer('k', 7);

      expect(minimapRenderer.getHighlightedFace()).toBe('k');
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'k', layer: 7 });
    });

    it('should maintain face highlight when setting layer highlight', () => {
      minimapRenderer.setHighlightedFace('k');
      expect(minimapRenderer.getHighlightedFace()).toBe('k');

      minimapRenderer.setHighlightedLayer('k', 7);
      expect(minimapRenderer.getHighlightedFace()).toBe('k');
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'k', layer: 7 });
    });

    it('should maintain layer highlight when clearing face highlight', () => {
      minimapRenderer.setHighlightedFace('k');
      minimapRenderer.setHighlightedLayer('k', 7);

      minimapRenderer.setHighlightedFace(null);
      expect(minimapRenderer.getHighlightedFace()).toBe(null);
      expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'k', layer: 7 });
    });

    it('should maintain face highlight when clearing layer highlight', () => {
      minimapRenderer.setHighlightedFace('k');
      minimapRenderer.setHighlightedLayer('k', 7);

      minimapRenderer.setHighlightedLayer(null, null);
      expect(minimapRenderer.getHighlightedFace()).toBe('k');
      expect(minimapRenderer.getHighlightedLayer()).toBe(null);
    });
  });

  describe('all three faces', () => {
    it('should handle layer highlighting for i-face across all layers', () => {
      for (let layer = 0; layer < 16; layer++) {
        minimapRenderer.setHighlightedLayer('i', layer);
        expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'i', layer });
      }
    });

    it('should handle layer highlighting for j-face across all layers', () => {
      for (let layer = 0; layer < 16; layer++) {
        minimapRenderer.setHighlightedLayer('j', layer);
        expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'j', layer });
      }
    });

    it('should handle layer highlighting for k-face across all layers', () => {
      for (let layer = 0; layer < 16; layer++) {
        minimapRenderer.setHighlightedLayer('k', layer);
        expect(minimapRenderer.getHighlightedLayer()).toEqual({ face: 'k', layer });
      }
    });
  });
});
