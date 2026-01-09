/**
 * Tests for geometry utilities
 */

import { describe, expect, test } from 'bun:test';
import {
  CUBE_SIZE,
  calculateSpacing,
  calculateCenterOffset,
  cellPositionToWorld,
} from './geometry.js';

describe('geometry utilities', () => {
  describe('CUBE_SIZE constant', () => {
    test('should be 16', () => {
      expect(CUBE_SIZE).toBe(16);
    });
  });

  describe('calculateSpacing', () => {
    test('should return sum of cellSize and cellGap', () => {
      expect(calculateSpacing(1.0, 0.1)).toBeCloseTo(1.1, 10);
      expect(calculateSpacing(2.0, 0.5)).toBeCloseTo(2.5, 10);
      expect(calculateSpacing(0.8, 0.05)).toBeCloseTo(0.85, 10);
    });

    test('should handle zero gap', () => {
      expect(calculateSpacing(1.0, 0)).toBe(1.0);
    });

    test('should handle zero size', () => {
      expect(calculateSpacing(0, 0.1)).toBe(0.1);
    });
  });

  describe('calculateCenterOffset', () => {
    test('should calculate offset for default 16-cell cube', () => {
      const cellSize = 1.0;
      const cellGap = 0.1;
      const spacing = 1.1;
      const expected = (15 * spacing) / 2; // (maxIndex * spacing) / 2
      expect(calculateCenterOffset(cellSize, cellGap)).toBe(expected);
      expect(calculateCenterOffset(cellSize, cellGap)).toBe(8.25);
    });

    test('should calculate offset for custom cube size', () => {
      const cellSize = 1.0;
      const cellGap = 0.1;
      const numCells = 8;
      const spacing = 1.1;
      const expected = (7 * spacing) / 2; // (maxIndex * spacing) / 2
      expect(calculateCenterOffset(cellSize, cellGap, numCells)).toBeCloseTo(expected, 10);
      expect(calculateCenterOffset(cellSize, cellGap, numCells)).toBeCloseTo(3.85, 10);
    });

    test('should calculate offset for minimap dimensions', () => {
      const cellSize = 0.8;
      const cellGap = 0.05;
      const spacing = 0.85;
      const expected = (15 * spacing) / 2;
      expect(calculateCenterOffset(cellSize, cellGap)).toBeCloseTo(expected, 10);
      expect(calculateCenterOffset(cellSize, cellGap)).toBeCloseTo(6.375, 10);
    });

    test('should return 0 for single-cell cube', () => {
      expect(calculateCenterOffset(1.0, 0.1, 1)).toBe(0);
    });

    test('should handle zero spacing', () => {
      expect(calculateCenterOffset(0, 0, 16)).toBe(0);
    });
  });

  describe('cellPositionToWorld', () => {
    const cellSize = 1.0;
    const cellGap = 0.1;
    const spacing = 1.1;
    const offset = 8.25; // (15 * 1.1) / 2

    test('should convert cell (0,0,0) to world coordinates', () => {
      const pos = cellPositionToWorld(0, 0, 0, cellSize, cellGap);
      expect(pos.x).toBe(0 * spacing - offset); // -8.25
      expect(pos.y).toBe(0 * spacing - offset); // -8.25
      expect(pos.z).toBe(0 * spacing - offset); // -8.25
      expect(pos.x).toBe(-8.25);
      expect(pos.y).toBe(-8.25);
      expect(pos.z).toBe(-8.25);
    });

    test('should convert cell (15,15,15) to world coordinates', () => {
      const pos = cellPositionToWorld(15, 15, 15, cellSize, cellGap);
      expect(pos.x).toBe(15 * spacing - offset); // 8.25
      expect(pos.y).toBe(15 * spacing - offset); // 8.25
      expect(pos.z).toBe(15 * spacing - offset); // 8.25
      expect(pos.x).toBe(8.25);
      expect(pos.y).toBe(8.25);
      expect(pos.z).toBe(8.25);
    });

    test('should convert center cell (7,7,7) to near world origin', () => {
      const pos = cellPositionToWorld(7, 7, 7, cellSize, cellGap);
      // 7 * 1.1 - 8.25 = 7.7 - 8.25 = -0.55
      expect(pos.x).toBeCloseTo(-0.55, 5);
      expect(pos.y).toBeCloseTo(-0.55, 5);
      expect(pos.z).toBeCloseTo(-0.55, 5);
    });

    test('should map indices correctly: j→x, i→y, k→z', () => {
      const pos = cellPositionToWorld(1, 2, 3, cellSize, cellGap);
      expect(pos.x).toBe(2 * spacing - offset); // j=2 → x
      expect(pos.y).toBe(1 * spacing - offset); // i=1 → y
      expect(pos.z).toBe(3 * spacing - offset); // k=3 → z
    });

    test('should work with minimap dimensions', () => {
      const minimapCellSize = 0.8;
      const minimapCellGap = 0.05;
      const minimapSpacing = 0.85;
      const minimapOffset = 6.375; // (15 * 0.85) / 2

      const pos = cellPositionToWorld(0, 0, 0, minimapCellSize, minimapCellGap);
      expect(pos.x).toBeCloseTo(0 * minimapSpacing - minimapOffset, 10);
      expect(pos.y).toBeCloseTo(0 * minimapSpacing - minimapOffset, 10);
      expect(pos.z).toBeCloseTo(0 * minimapSpacing - minimapOffset, 10);
      expect(pos.x).toBeCloseTo(-6.375, 10);
      expect(pos.y).toBeCloseTo(-6.375, 10);
      expect(pos.z).toBeCloseTo(-6.375, 10);
    });

    test('should produce symmetric coordinates for opposite corners', () => {
      const corner000 = cellPositionToWorld(0, 0, 0, cellSize, cellGap);
      const corner15 = cellPositionToWorld(15, 15, 15, cellSize, cellGap);

      expect(corner000.x).toBe(-corner15.x);
      expect(corner000.y).toBe(-corner15.y);
      expect(corner000.z).toBe(-corner15.z);
    });

    test('should center cube at origin (average of all corners is 0)', () => {
      const corner000 = cellPositionToWorld(0, 0, 0, cellSize, cellGap);
      const corner15 = cellPositionToWorld(15, 15, 15, cellSize, cellGap);

      const centerX = (corner000.x + corner15.x) / 2;
      const centerY = (corner000.y + corner15.y) / 2;
      const centerZ = (corner000.z + corner15.z) / 2;

      expect(centerX).toBeCloseTo(0, 10);
      expect(centerY).toBeCloseTo(0, 10);
      expect(centerZ).toBeCloseTo(0, 10);
    });
  });
});
