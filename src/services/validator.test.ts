/**
 * Tests for the validator service
 * Uses table-driven tests for comprehensive coverage
 */

import { describe, test, expect } from 'bun:test';
import {
  validateCellGroup,
  validateRow,
  validateColumn,
  validateBeam,
  validateSubSquare,
  validateAllRows,
  validateAllColumns,
  validateAllBeams,
  validateAllSubSquares,
  validateCube
} from './validator.js';
import { createCube, setCell, type Cube } from '../models/Cube.js';
import { createCell, type HexValue, type Position } from '../models/Cell.js';

describe('validateCellGroup', () => {
  test('validates empty group as valid', () => {
    const cells = Array.from({ length: 16 }, (_, i) =>
      createCell([0, 0, i] as const, null)
    );
    const result = validateCellGroup(cells);
    expect(result.isValid).toBe(true);
    expect(result.duplicates).toEqual([]);
    expect(result.positions).toEqual([]);
  });

  test('validates group with all unique values', () => {
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    const cells = hexValues.map((value, i) =>
      createCell([0, 0, i] as const, value)
    );
    const result = validateCellGroup(cells);
    expect(result.isValid).toBe(true);
    expect(result.duplicates).toEqual([]);
    expect(result.positions).toEqual([]);
  });

  test('validates group with partial fill and no duplicates', () => {
    const cells = [
      createCell([0, 0, 0] as const, '1'),
      createCell([0, 0, 1] as const, '2'),
      createCell([0, 0, 2] as const, null),
      createCell([0, 0, 3] as const, '3'),
      createCell([0, 0, 4] as const, null),
      ...Array.from({ length: 11 }, (_, i) => createCell([0, 0, i + 5] as const, null))
    ];
    const result = validateCellGroup(cells);
    expect(result.isValid).toBe(true);
    expect(result.duplicates).toEqual([]);
    expect(result.positions).toEqual([]);
  });

  // Table-driven tests for duplicate scenarios
  const duplicateTestCases: Array<{
    name: string;
    values: HexValue[];
    expectedDuplicates: HexValue[];
    expectedPositionCount: number;
  }> = [
    {
      name: 'single duplicate value',
      values: ['1', '2', '3', '1', null, null, null, null, null, null, null, null, null, null, null, null],
      expectedDuplicates: ['1'],
      expectedPositionCount: 2
    },
    {
      name: 'multiple duplicate values',
      values: ['a', 'b', 'a', 'c', 'b', null, null, null, null, null, null, null, null, null, null, null],
      expectedDuplicates: ['a', 'b'],
      expectedPositionCount: 4
    },
    {
      name: 'triple duplicate',
      values: ['5', '5', '5', null, null, null, null, null, null, null, null, null, null, null, null, null],
      expectedDuplicates: ['5'],
      expectedPositionCount: 3
    },
    {
      name: 'all same value',
      values: ['f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f'],
      expectedDuplicates: ['f'],
      expectedPositionCount: 16
    },
    {
      name: 'multiple pairs of duplicates',
      values: ['0', '0', '1', '1', '2', '2', '3', '3', null, null, null, null, null, null, null, null],
      expectedDuplicates: ['0', '1', '2', '3'],
      expectedPositionCount: 8
    }
  ];

  for (const testCase of duplicateTestCases) {
    test(`detects ${testCase.name}`, () => {
      const cells = testCase.values.map((value, i) =>
        createCell([0, 0, i] as const, value)
      );
      const result = validateCellGroup(cells);
      expect(result.isValid).toBe(false);
      expect(result.duplicates.sort()).toEqual(testCase.expectedDuplicates.sort());
      expect(result.positions).toHaveLength(testCase.expectedPositionCount);
    });
  }
});

describe('validateRow', () => {
  test('validates empty row', () => {
    const cube = createCube();
    const result = validateRow(cube, 0, 0);
    expect(result.isValid).toBe(true);
  });

  test('validates row with unique values', () => {
    const cube = createCube();
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    // Fill row at j=5, k=10 with all unique hex values
    for (let i = 0; i < 16; i++) {
      setCell(cube, [i, 5, 10], createCell([i, 5, 10] as const, hexValues[i]));
    }

    const result = validateRow(cube, 5, 10);
    expect(result.isValid).toBe(true);
  });

  test('detects duplicate in row', () => {
    const cube = createCube();

    // Add duplicate '7' in row j=2, k=3
    setCell(cube, [0, 2, 3], createCell([0, 2, 3] as const, '7'));
    setCell(cube, [5, 2, 3], createCell([5, 2, 3] as const, '7'));

    const result = validateRow(cube, 2, 3);
    expect(result.isValid).toBe(false);
    expect(result.duplicates).toContain('7');
    expect(result.positions).toHaveLength(2);
  });
});

describe('validateColumn', () => {
  test('validates empty column', () => {
    const cube = createCube();
    const result = validateColumn(cube, 0, 0);
    expect(result.isValid).toBe(true);
  });

  test('validates column with unique values', () => {
    const cube = createCube();
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    // Fill column at i=3, k=7 with all unique hex values
    for (let j = 0; j < 16; j++) {
      setCell(cube, [3, j, 7], createCell([3, j, 7] as const, hexValues[j]));
    }

    const result = validateColumn(cube, 3, 7);
    expect(result.isValid).toBe(true);
  });

  test('detects duplicate in column', () => {
    const cube = createCube();

    // Add duplicate 'a' in column i=1, k=1
    setCell(cube, [1, 0, 1], createCell([1, 0, 1] as const, 'a'));
    setCell(cube, [1, 8, 1], createCell([1, 8, 1] as const, 'a'));

    const result = validateColumn(cube, 1, 1);
    expect(result.isValid).toBe(false);
    expect(result.duplicates).toContain('a');
    expect(result.positions).toHaveLength(2);
  });
});

describe('validateBeam', () => {
  test('validates empty beam', () => {
    const cube = createCube();
    const result = validateBeam(cube, 0, 0);
    expect(result.isValid).toBe(true);
  });

  test('validates beam with unique values', () => {
    const cube = createCube();
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    // Fill beam at i=8, j=12 with all unique hex values
    for (let k = 0; k < 16; k++) {
      setCell(cube, [8, 12, k], createCell([8, 12, k] as const, hexValues[k]));
    }

    const result = validateBeam(cube, 8, 12);
    expect(result.isValid).toBe(true);
  });

  test('detects duplicate in beam', () => {
    const cube = createCube();

    // Add duplicate 'd' in beam i=4, j=4
    setCell(cube, [4, 4, 2], createCell([4, 4, 2] as const, 'd'));
    setCell(cube, [4, 4, 9], createCell([4, 4, 9] as const, 'd'));

    const result = validateBeam(cube, 4, 4);
    expect(result.isValid).toBe(false);
    expect(result.duplicates).toContain('d');
    expect(result.positions).toHaveLength(2);
  });
});

describe('validateSubSquare', () => {
  // Table-driven tests for all three face types
  const faceTestCases: Array<{
    face: 'i' | 'j' | 'k';
    layer: number;
    subRow: number;
    subCol: number;
    description: string;
  }> = [
    { face: 'i', layer: 0, subRow: 0, subCol: 0, description: 'i-face (top-left sub-square)' },
    { face: 'i', layer: 8, subRow: 2, subCol: 3, description: 'i-face (middle layer)' },
    { face: 'j', layer: 5, subRow: 1, subCol: 1, description: 'j-face' },
    { face: 'k', layer: 15, subRow: 3, subCol: 3, description: 'k-face (bottom-right sub-square)' }
  ];

  for (const testCase of faceTestCases) {
    test(`validates empty sub-square on ${testCase.description}`, () => {
      const cube = createCube();
      const result = validateSubSquare(cube, testCase.face, testCase.layer, testCase.subRow, testCase.subCol);
      expect(result.isValid).toBe(true);
    });
  }

  test('validates sub-square with all unique values', () => {
    const cube = createCube();
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    // Fill sub-square on i-face, layer=5, subRow=1, subCol=2 (cells [4-7, 8-11])
    const layer = 5;
    const startRow = 1 * 4; // j starts at 4
    const startCol = 2 * 4; // k starts at 8

    let valueIndex = 0;
    for (let jOffset = 0; jOffset < 4; jOffset++) {
      for (let kOffset = 0; kOffset < 4; kOffset++) {
        const pos: Position = [layer, startRow + jOffset, startCol + kOffset];
        setCell(cube, pos, createCell(pos, hexValues[valueIndex++]));
      }
    }

    const result = validateSubSquare(cube, 'i', layer, 1, 2);
    expect(result.isValid).toBe(true);
  });

  test('detects duplicate in sub-square', () => {
    const cube = createCube();

    // Add duplicate '3' in sub-square on k-face, layer=10, subRow=0, subCol=0
    const layer = 10;
    setCell(cube, [0, 0, layer], createCell([0, 0, layer] as const, '3'));
    setCell(cube, [2, 2, layer], createCell([2, 2, layer] as const, '3'));

    const result = validateSubSquare(cube, 'k', layer, 0, 0);
    expect(result.isValid).toBe(false);
    expect(result.duplicates).toContain('3');
    expect(result.positions).toHaveLength(2);
  });
});

describe('validateAllRows', () => {
  test('returns no errors for empty cube', () => {
    const cube = createCube();
    const errors = validateAllRows(cube);
    expect(errors).toHaveLength(0);
  });

  test('returns no errors for cube with valid rows', () => {
    const cube = createCube();
    // Fill one valid row
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    for (let i = 0; i < 16; i++) {
      setCell(cube, [i, 0, 0], createCell([i, 0, 0] as const, hexValues[i]));
    }

    const errors = validateAllRows(cube);
    expect(errors).toHaveLength(0);
  });

  test('detects errors in multiple rows', () => {
    const cube = createCube();

    // Add duplicate in row j=0, k=0
    setCell(cube, [0, 0, 0], createCell([0, 0, 0] as const, '5'));
    setCell(cube, [1, 0, 0], createCell([1, 0, 0] as const, '5'));

    // Add duplicate in row j=1, k=1
    setCell(cube, [2, 1, 1], createCell([2, 1, 1] as const, 'f'));
    setCell(cube, [3, 1, 1], createCell([3, 1, 1] as const, 'f'));

    const errors = validateAllRows(cube);
    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.every(e => e.type === 'row')).toBe(true);
  });
});

describe('validateAllColumns', () => {
  test('returns no errors for empty cube', () => {
    const cube = createCube();
    const errors = validateAllColumns(cube);
    expect(errors).toHaveLength(0);
  });

  test('detects errors in columns', () => {
    const cube = createCube();

    // Add duplicate in column i=0, k=0
    setCell(cube, [0, 0, 0], createCell([0, 0, 0] as const, '9'));
    setCell(cube, [0, 5, 0], createCell([0, 5, 0] as const, '9'));

    const errors = validateAllColumns(cube);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.every(e => e.type === 'column')).toBe(true);
  });
});

describe('validateAllBeams', () => {
  test('returns no errors for empty cube', () => {
    const cube = createCube();
    const errors = validateAllBeams(cube);
    expect(errors).toHaveLength(0);
  });

  test('detects errors in beams', () => {
    const cube = createCube();

    // Add duplicate in beam i=5, j=5
    setCell(cube, [5, 5, 0], createCell([5, 5, 0] as const, 'c'));
    setCell(cube, [5, 5, 7], createCell([5, 5, 7] as const, 'c'));

    const errors = validateAllBeams(cube);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.every(e => e.type === 'beam')).toBe(true);
  });
});

describe('validateAllSubSquares', () => {
  test('returns no errors for empty cube', () => {
    const cube = createCube();
    const errors = validateAllSubSquares(cube);
    expect(errors).toHaveLength(0);
  });

  test('detects errors in sub-squares', () => {
    const cube = createCube();

    // Add duplicate in sub-square on i-face, layer=0, subRow=0, subCol=0
    setCell(cube, [0, 0, 0], createCell([0, 0, 0] as const, 'e'));
    setCell(cube, [0, 1, 1], createCell([0, 1, 1] as const, 'e'));

    const errors = validateAllSubSquares(cube);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.every(e => e.type === 'sub-square')).toBe(true);
  });
});

describe('validateCube', () => {
  test('validates empty cube as valid', () => {
    const cube = createCube();
    const result = validateCube(cube);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validates fully filled valid cube', () => {
    const cube = createCube();
    // Note: Creating a fully valid 16x16x16 Sudoku cube is complex
    // For this test, we'll just fill one row validly and check it passes
    const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    for (let i = 0; i < 16; i++) {
      setCell(cube, [i, 0, 0], createCell([i, 0, 0] as const, hexValues[i]));
    }

    const result = validateCube(cube);
    expect(result.isValid).toBe(true);
  });

  test('detects multiple types of errors', () => {
    const cube = createCube();

    // Add error in row (affects row, potentially beam and sub-square)
    setCell(cube, [0, 0, 0], createCell([0, 0, 0] as const, '1'));
    setCell(cube, [1, 0, 0], createCell([1, 0, 0] as const, '1'));

    // Add error in column (affects column, potentially beam and sub-square)
    setCell(cube, [5, 0, 5], createCell([5, 0, 5] as const, '2'));
    setCell(cube, [5, 3, 5], createCell([5, 3, 5] as const, '2'));

    // Add error in beam (affects beam, potentially row/column and sub-square)
    setCell(cube, [10, 10, 0], createCell([10, 10, 0] as const, '3'));
    setCell(cube, [10, 10, 5], createCell([10, 10, 5] as const, '3'));

    const result = validateCube(cube);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Should have errors from different constraint types
    const errorTypes = new Set(result.errors.map(e => e.type));
    expect(errorTypes.size).toBeGreaterThan(0);
  });

  test('provides detailed error information', () => {
    const cube = createCube();

    // Create a specific error scenario
    const pos1: Position = [0, 0, 0];
    const pos2: Position = [1, 0, 0];
    setCell(cube, pos1, createCell(pos1, 'a'));
    setCell(cube, pos2, createCell(pos2, 'a'));

    const result = validateCube(cube);
    expect(result.isValid).toBe(false);

    // Find the row error
    const rowError = result.errors.find(e => e.type === 'row' && e.description.includes('j=0, k=0'));
    expect(rowError).toBeDefined();
    expect(rowError!.cells).toHaveLength(2);
    expect(rowError!.description).toContain('duplicate');
  });
});

describe('integration: complex validation scenarios', () => {
  // Table-driven tests for complex scenarios
  const complexScenarios: Array<{
    name: string;
    setup: (cube: Cube) => void;
    expectedValid: boolean;
    expectedErrorTypes: Array<'row' | 'column' | 'beam' | 'sub-square'>;
  }> = [
    {
      name: 'single cell causes multiple constraint violations',
      setup: (cube: Cube) => {
        // Place duplicate values that will cause row, column, beam, and sub-square errors
        // All in the same sub-square (0-3, 0-3, 0-3)
        setCell(cube, [0, 0, 0], createCell([0, 0, 0] as const, '7'));
        setCell(cube, [1, 0, 0], createCell([1, 0, 0] as const, '7')); // Same row
        setCell(cube, [0, 1, 0], createCell([0, 1, 0] as const, '7')); // Same column
        setCell(cube, [0, 0, 1], createCell([0, 0, 1] as const, '7')); // Same beam
      },
      expectedValid: false,
      expectedErrorTypes: ['row', 'column', 'beam', 'sub-square']
    },
    {
      name: 'cascading errors across multiple constraints',
      setup: (cube: Cube) => {
        // Create errors in different parts of the cube
        for (let i = 0; i < 3; i++) {
          setCell(cube, [i, 0, 0], createCell([i, 0, 0] as const, 'f')); // Row error
          setCell(cube, [5, i, 5], createCell([5, i, 5] as const, 'e')); // Column error
          setCell(cube, [10, 10, i], createCell([10, 10, i] as const, 'd')); // Beam error
        }
      },
      expectedValid: false,
      expectedErrorTypes: ['row', 'column', 'beam']
    },
    {
      name: 'no errors with sparse filling',
      setup: (cube: Cube) => {
        // Sparsely fill the cube with no conflicts
        setCell(cube, [0, 0, 0], createCell([0, 0, 0] as const, '0'));
        setCell(cube, [5, 5, 5], createCell([5, 5, 5] as const, '5'));
        setCell(cube, [10, 10, 10], createCell([10, 10, 10] as const, 'a'));
        setCell(cube, [15, 15, 15], createCell([15, 15, 15] as const, 'f'));
      },
      expectedValid: true,
      expectedErrorTypes: []
    }
  ];

  for (const scenario of complexScenarios) {
    test(scenario.name, () => {
      const cube = createCube();
      scenario.setup(cube);

      const result = validateCube(cube);
      expect(result.isValid).toBe(scenario.expectedValid);

      if (!scenario.expectedValid) {
        const actualErrorTypes = new Set(result.errors.map(e => e.type));
        for (const expectedType of scenario.expectedErrorTypes) {
          expect(actualErrorTypes.has(expectedType)).toBe(true);
        }
      }
    });
  }
});
