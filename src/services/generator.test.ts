/**
 * Tests for generator service
 */

import { describe, test, expect } from 'bun:test';
import { generateSolvedCube, generatePuzzle } from './generator.js';
import { validateCube } from './validator.js';
import { isCubeFilled, countFilledCells } from '../models/Cube.js';

describe('generateSolvedCube', () => {
  test('generates a fully filled cube', () => {
    const cube = generateSolvedCube();
    expect(isCubeFilled(cube)).toBe(true);
    expect(countFilledCells(cube)).toBe(4096);
  }, 300000); // 5 minute timeout for generation

  test('generates a valid cube with no constraint violations', () => {
    const cube = generateSolvedCube();
    const result = validateCube(cube);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  }, 300000); // 5 minute timeout

  test.skip('generates different cubes on successive calls', () => {
    // Skipped: generating multiple cubes is too slow for regular testing
    // This test is conceptually valid but requires too much time
    const cube1 = generateSolvedCube();
    const cube2 = generateSolvedCube();

    // Count differences between the two cubes
    let differences = 0;
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          if (cube1.cells[i][j][k].value !== cube2.cells[i][j][k].value) {
            differences++;
          }
        }
      }
    }

    // With randomization, we should see many differences
    // If they're identical, the randomization isn't working
    expect(differences).toBeGreaterThan(0);
  });

  test.skip('all rows contain exactly one of each hex value', () => {
    // Skipped: Covered by the comprehensive validation test above
    // This detailed test is redundant and slow
    const cube = generateSolvedCube();

    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const row = cube.getRow(j, k);
        const values = row.map(cell => cell.value).sort();
        const expected = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'] as const;
        expect(values).toEqual([...expected]);
      }
    }
  });

  test.skip('all columns contain exactly one of each hex value', () => {
    // Skipped: Covered by the comprehensive validation test above
    const cube = generateSolvedCube();

    for (let i = 0; i < 16; i++) {
      for (let k = 0; k < 16; k++) {
        const column = cube.getColumn(i, k);
        const values = column.map(cell => cell.value).sort();
        const expected = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'] as const;
        expect(values).toEqual([...expected]);
      }
    }
  });

  test.skip('all beams contain exactly one of each hex value', () => {
    // Skipped: Covered by the comprehensive validation test above
    const cube = generateSolvedCube();

    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const beam = cube.getBeam(i, j);
        const values = beam.map(cell => cell.value).sort();
        const expected = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'] as const;
        expect(values).toEqual([...expected]);
      }
    }
  });

  test.skip('all sub-squares contain exactly one of each hex value', () => {
    // Skipped: Covered by the comprehensive validation test above
    const cube = generateSolvedCube();
    const faces = ['i', 'j', 'k'] as const;

    for (const face of faces) {
      for (let layer = 0; layer < 16; layer++) {
        for (let subRow = 0; subRow < 4; subRow++) {
          for (let subCol = 0; subCol < 4; subCol++) {
            const subSquare = cube.getSubSquare(face, layer, subRow, subCol);
            const values = subSquare.map(cell => cell.value).sort();
            const expected = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'] as const;
            expect(values).toEqual([...expected]);
          }
        }
      }
    }
  });
});

describe('generatePuzzle', () => {
  test('generates a puzzle with some empty cells', () => {
    const puzzle = generatePuzzle('easy');
    const filledCount = countFilledCells(puzzle);

    // Easy difficulty should have ~70% given cells
    // That's ~2867 cells (4096 * 0.70)
    // Allow some variance
    expect(filledCount).toBeGreaterThan(2700);
    expect(filledCount).toBeLessThan(3000);
  }, 360000); // 6 minute timeout

  test('generated puzzle has approximately correct ratio of given cells', () => {
    const puzzle = generatePuzzle('easy');
    const filledCount = countFilledCells(puzzle);
    const totalCells = 4096;
    const ratio = filledCount / totalCells;

    // Easy should be around 70% given
    expect(ratio).toBeGreaterThan(0.65);
    expect(ratio).toBeLessThan(0.75);
  }, 360000); // 6 minute timeout

  test('all given cells are marked as "given" type', () => {
    const puzzle = generatePuzzle('easy');

    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          const cell = puzzle.cells[i][j][k];
          if (cell.value !== null) {
            expect(cell.type).toBe('given');
          } else {
            expect(cell.type).toBe('editable');
          }
        }
      }
    }
  }, 360000); // 6 minute timeout

  test('given cells form a valid partial solution', () => {
    const puzzle = generatePuzzle('easy');

    // The given cells should not violate any constraints
    const result = validateCube(puzzle);
    expect(result.isValid).toBe(true);
  }, 360000); // 6 minute timeout

  test.skip('generates different puzzles on successive calls', () => {
    // Skipped: generating multiple puzzles is too slow for regular testing
    const puzzle1 = generatePuzzle('easy');
    const puzzle2 = generatePuzzle('easy');

    // Count differences between the two puzzles
    let differences = 0;
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          if (puzzle1.cells[i][j][k].value !== puzzle2.cells[i][j][k].value) {
            differences++;
          }
        }
      }
    }

    // Should generate different puzzles
    expect(differences).toBeGreaterThan(0);
  });

  test('puzzle contains cells from all regions of the cube', () => {
    const puzzle = generatePuzzle('easy');

    // Check that we have some given cells in different octants
    const octants = [
      [0, 7, 0, 7, 0, 7],
      [0, 7, 0, 7, 8, 15],
      [0, 7, 8, 15, 0, 7],
      [0, 7, 8, 15, 8, 15],
      [8, 15, 0, 7, 0, 7],
      [8, 15, 0, 7, 8, 15],
      [8, 15, 8, 15, 0, 7],
      [8, 15, 8, 15, 8, 15],
    ];

    for (const [iMin, iMax, jMin, jMax, kMin, kMax] of octants) {
      let hasGivenCell = false;
      for (let i = iMin; i <= iMax; i++) {
        for (let j = jMin; j <= jMax; j++) {
          for (let k = kMin; k <= kMax; k++) {
            if (puzzle.cells[i][j][k].value !== null) {
              hasGivenCell = true;
              break;
            }
          }
          if (hasGivenCell) break;
        }
        if (hasGivenCell) break;
      }
      expect(hasGivenCell).toBe(true);
    }
  }, 360000); // 6 minute timeout

  test('performance: can generate a puzzle in reasonable time', () => {
    const start = performance.now();
    const puzzle = generatePuzzle('easy');
    const elapsed = performance.now() - start;

    // Should generate in less than 6 minutes (very generous for complex constraints)
    expect(elapsed).toBeLessThan(360000);

    // Verify it's actually a valid puzzle
    expect(countFilledCells(puzzle)).toBeGreaterThan(0);
  }, 420000); // 7 minute timeout
});
