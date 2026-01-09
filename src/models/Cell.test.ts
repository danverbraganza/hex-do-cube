import { describe, expect, it } from 'bun:test';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  type CellType,
  type HexValue,
  type Position,
  VALID_HEX_VALUES,
  cellsEqual,
  clearCell,
  copyCell,
  createCell,
  createEmptyCell,
  createGivenCell,
  isCellEditable,
  isCellEmpty,
  isValidCoordinate,
  isValidHexValue,
  isValidPosition,
  parseHexValue,
  parsePositionKey,
  positionKey,
  setCellValue,
} from './Cell';

describe('Cell Model', () => {
  describe('VALID_HEX_VALUES', () => {
    it('should contain all 16 hex digits', () => {
      expect(VALID_HEX_VALUES.size).toBe(16);
      const expected = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
      for (const val of expected) {
        expect(VALID_HEX_VALUES.has(val)).toBe(true);
      }
    });

    it('should not contain uppercase letters', () => {
      expect(VALID_HEX_VALUES.has('A')).toBe(false);
      expect(VALID_HEX_VALUES.has('F')).toBe(false);
    });
  });

  describe('isValidHexValue', () => {
    it('should return true for valid lowercase hex digits', () => {
      const validValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
      for (const val of validValues) {
        expect(isValidHexValue(val)).toBe(true);
      }
    });

    it('should return true for uppercase hex digits (normalized)', () => {
      expect(isValidHexValue('A')).toBe(true);
      expect(isValidHexValue('F')).toBe(true);
      expect(isValidHexValue('B')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isValidHexValue('g')).toBe(false);
      expect(isValidHexValue('z')).toBe(false);
      expect(isValidHexValue('')).toBe(false);
      expect(isValidHexValue('10')).toBe(false);
      expect(isValidHexValue('-1')).toBe(false);
      expect(isValidHexValue(' ')).toBe(false);
    });
  });

  describe('parseHexValue', () => {
    it('should parse valid lowercase hex values', () => {
      expect(parseHexValue('0')).toBe('0');
      expect(parseHexValue('a')).toBe('a');
      expect(parseHexValue('f')).toBe('f');
    });

    it('should normalize uppercase to lowercase', () => {
      expect(parseHexValue('A')).toBe('a');
      expect(parseHexValue('F')).toBe('f');
      expect(parseHexValue('B')).toBe('b');
    });

    it('should return null for empty/null/undefined input', () => {
      expect(parseHexValue('')).toBe(null);
      expect(parseHexValue(null)).toBe(null);
      expect(parseHexValue(undefined)).toBe(null);
    });

    it('should return null for invalid input', () => {
      expect(parseHexValue('g')).toBe(null);
      expect(parseHexValue('xyz')).toBe(null);
      expect(parseHexValue('10')).toBe(null);
    });
  });

  describe('isValidCoordinate', () => {
    it('should return true for valid coordinates 0-15', () => {
      for (let i = 0; i <= 15; i++) {
        expect(isValidCoordinate(i)).toBe(true);
      }
    });

    it('should return false for negative numbers', () => {
      expect(isValidCoordinate(-1)).toBe(false);
      expect(isValidCoordinate(-100)).toBe(false);
    });

    it('should return false for numbers > 15', () => {
      expect(isValidCoordinate(16)).toBe(false);
      expect(isValidCoordinate(100)).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(isValidCoordinate(1.5)).toBe(false);
      expect(isValidCoordinate(0.1)).toBe(false);
      expect(isValidCoordinate(NaN)).toBe(false);
      expect(isValidCoordinate(Infinity)).toBe(false);
    });
  });

  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(isValidPosition([0, 0, 0])).toBe(true);
      expect(isValidPosition([15, 15, 15])).toBe(true);
      expect(isValidPosition([7, 8, 9])).toBe(true);
    });

    it('should return false for positions with invalid coordinates', () => {
      expect(isValidPosition([-1, 0, 0])).toBe(false);
      expect(isValidPosition([0, 16, 0])).toBe(false);
      expect(isValidPosition([0, 0, -1])).toBe(false);
    });

    it('should return false for positions with wrong length', () => {
      expect(isValidPosition([0, 0] as unknown as Position)).toBe(false);
      expect(isValidPosition([0, 0, 0, 0] as unknown as Position)).toBe(false);
    });
  });

  describe('createCell', () => {
    it('should create a cell with default values', () => {
      const cell = createCell([0, 0, 0]);
      expect(cell.position).toEqual([0, 0, 0]);
      expect(cell.value).toBe(null);
      expect(cell.type).toBe('editable');
    });

    it('should create a cell with specified value and type', () => {
      const cell = createCell([5, 10, 15], 'a', 'given');
      expect(cell.position).toEqual([5, 10, 15]);
      expect(cell.value).toBe('a');
      expect(cell.type).toBe('given');
    });

    it('should throw for invalid position', () => {
      expect(() => createCell([-1, 0, 0])).toThrow('Invalid position');
      expect(() => createCell([0, 16, 0])).toThrow('Invalid position');
      expect(() => createCell([0, 0, 20])).toThrow('Invalid position');
    });
  });

  describe('createEmptyCell', () => {
    it('should create an empty editable cell', () => {
      const cell = createEmptyCell([3, 4, 5]);
      expect(cell.position).toEqual([3, 4, 5]);
      expect(cell.value).toBe(null);
      expect(cell.type).toBe('editable');
    });
  });

  describe('createGivenCell', () => {
    it('should create a given cell with a value', () => {
      const cell = createGivenCell([1, 2, 3], 'f');
      expect(cell.position).toEqual([1, 2, 3]);
      expect(cell.value).toBe('f');
      expect(cell.type).toBe('given');
    });

    it('should throw if value is null', () => {
      // @ts-expect-error - Testing runtime validation
      expect(() => createGivenCell([0, 0, 0], null)).toThrow('Given cells must have a value');
    });
  });

  describe('isCellEmpty', () => {
    it('should return true for cells with null value', () => {
      const cell = createEmptyCell([0, 0, 0]);
      expect(isCellEmpty(cell)).toBe(true);
    });

    it('should return false for cells with a value', () => {
      const cell = createCell([0, 0, 0], '5');
      expect(isCellEmpty(cell)).toBe(false);
    });
  });

  describe('isCellEditable', () => {
    it('should return true for editable cells', () => {
      const cell = createEmptyCell([0, 0, 0]);
      expect(isCellEditable(cell)).toBe(true);
    });

    it('should return false for given cells', () => {
      const cell = createGivenCell([0, 0, 0], '5');
      expect(isCellEditable(cell)).toBe(false);
    });
  });

  describe('setCellValue', () => {
    it('should set the value of an editable cell', () => {
      const cell = createEmptyCell([0, 0, 0]);
      setCellValue(cell, 'a');
      expect(cell.value).toBe('a');
    });

    it('should allow setting value to null', () => {
      const cell = createCell([0, 0, 0], 'b');
      setCellValue(cell, null);
      expect(cell.value).toBe(null);
    });

    it('should return the same cell reference', () => {
      const cell = createEmptyCell([0, 0, 0]);
      const result = setCellValue(cell, 'c');
      expect(result).toBe(cell);
    });

    it('should throw when trying to modify a given cell', () => {
      const cell = createGivenCell([0, 0, 0], '5');
      expect(() => setCellValue(cell, 'a')).toThrow('Cannot modify a given cell');
    });
  });

  describe('clearCell', () => {
    it('should set the value to null', () => {
      const cell = createCell([0, 0, 0], 'd', 'editable');
      clearCell(cell);
      expect(cell.value).toBe(null);
    });

    it('should throw when trying to clear a given cell', () => {
      const cell = createGivenCell([0, 0, 0], '5');
      expect(() => clearCell(cell)).toThrow('Cannot modify a given cell');
    });
  });

  describe('copyCell', () => {
    it('should create a deep copy of the cell', () => {
      const original = createCell([1, 2, 3], 'e', 'editable');
      const copy = copyCell(original);

      expect(copy).not.toBe(original);
      expect(copy.position).not.toBe(original.position);
      expect(copy.position).toEqual(original.position);
      expect(copy.value).toBe(original.value);
      expect(copy.type).toBe(original.type);
    });

    it('should not affect original when modifying copy', () => {
      const original = createCell([0, 0, 0], '1', 'editable');
      const copy = copyCell(original);

      setCellValue(copy, '9');
      expect(original.value).toBe('1');
      expect(copy.value).toBe('9');
    });
  });

  describe('cellsEqual', () => {
    it('should return true for identical cells', () => {
      const a = createCell([1, 2, 3], 'a', 'given');
      const b = createCell([1, 2, 3], 'a', 'given');
      expect(cellsEqual(a, b)).toBe(true);
    });

    it('should return false for different positions', () => {
      const a = createCell([1, 2, 3], 'a', 'editable');
      const b = createCell([1, 2, 4], 'a', 'editable');
      expect(cellsEqual(a, b)).toBe(false);
    });

    it('should return false for different values', () => {
      const a = createCell([1, 2, 3], 'a', 'editable');
      const b = createCell([1, 2, 3], 'b', 'editable');
      expect(cellsEqual(a, b)).toBe(false);
    });

    it('should return false for different types', () => {
      const a = createCell([1, 2, 3], 'a', 'editable');
      const b = createCell([1, 2, 3], 'a', 'given');
      expect(cellsEqual(a, b)).toBe(false);
    });

    it('should handle null values correctly', () => {
      const a = createEmptyCell([0, 0, 0]);
      const b = createEmptyCell([0, 0, 0]);
      expect(cellsEqual(a, b)).toBe(true);

      const c = createCell([0, 0, 0], '0', 'editable');
      expect(cellsEqual(a, c)).toBe(false);
    });
  });

  describe('Type safety', () => {
    it('should only allow valid HexValue types', () => {
      // TypeScript should catch these at compile time
      // These tests verify runtime behavior matches type expectations
      const validValues: HexValue[] = [
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
        null
      ];

      for (const val of validValues) {
        const cell = createCell([0, 0, 0], val);
        expect(cell.value).toBe(val);
      }
    });

    it('should only allow valid CellType values', () => {
      const validTypes: CellType[] = ['given', 'editable'];
      for (const type of validTypes) {
        const cell = createCell([0, 0, 0], null, type);
        expect(cell.type).toBe(type);
      }
    });
  });

  describe('positionKey', () => {
    it('should generate a unique key for a position', () => {
      expect(positionKey([0, 0, 0])).toBe('0,0,0');
      expect(positionKey([1, 2, 3])).toBe('1,2,3');
      expect(positionKey([15, 15, 15])).toBe('15,15,15');
    });

    it('should generate different keys for different positions', () => {
      const key1 = positionKey([0, 0, 0]);
      const key2 = positionKey([0, 0, 1]);
      const key3 = positionKey([1, 0, 0]);
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should generate same key for same position', () => {
      const pos: Position = [5, 10, 15];
      expect(positionKey(pos)).toBe(positionKey(pos));
      expect(positionKey([5, 10, 15])).toBe(positionKey([5, 10, 15]));
    });
  });

  describe('parsePositionKey', () => {
    it('should parse a position key back to Position', () => {
      expect(parsePositionKey('0,0,0')).toEqual([0, 0, 0]);
      expect(parsePositionKey('1,2,3')).toEqual([1, 2, 3]);
      expect(parsePositionKey('15,15,15')).toEqual([15, 15, 15]);
    });

    it('should be inverse of positionKey', () => {
      const positions: Position[] = [
        [0, 0, 0],
        [1, 2, 3],
        [5, 10, 15],
        [15, 15, 15],
      ];

      for (const pos of positions) {
        const key = positionKey(pos);
        const parsed = parsePositionKey(key);
        expect(parsed).toEqual(pos);
      }
    });

    it('should round-trip correctly', () => {
      const keys = ['0,0,0', '1,2,3', '15,15,15'];
      for (const key of keys) {
        const parsed = parsePositionKey(key);
        const regenerated = positionKey(parsed);
        expect(regenerated).toBe(key);
      }
    });

    it('should throw on invalid format', () => {
      expect(() => parsePositionKey('1,2')).toThrow('Invalid position key format');
      expect(() => parsePositionKey('a,b,c')).toThrow('Invalid position key format');
      expect(() => parsePositionKey('1,2,3,4')).toThrow('Invalid position key format');
    });

    it('should throw on invalid coordinates', () => {
      expect(() => parsePositionKey('-1,0,0')).toThrow('Invalid coordinates');
      expect(() => parsePositionKey('0,16,0')).toThrow('Invalid coordinates');
      expect(() => parsePositionKey('0,0,100')).toThrow('Invalid coordinates');
    });
  });
});
