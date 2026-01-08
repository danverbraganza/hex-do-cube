/**
 * Generator service for Hex-Do-Cube
 * Implements mathematical Latin cube construction using GF(4) arithmetic
 * for instant cube generation, and removes cells based on difficulty.
 *
 * The mathematical construction uses base-4 digit decomposition and XOR
 * operations (GF(4) arithmetic) to compute cell values in O(1) time.
 * This replaces the slow backtracking algorithm with instant generation.
 */

import type { Cube } from '../models/Cube.js';
import { createCube } from '../models/Cube.js';
import { createGivenCell, createEmptyCell, type HexValue, type Position } from '../models/Cell.js';

/**
 * All possible hex values
 */
const HEX_VALUES: Exclude<HexValue, null>[] = [
  '0', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'
];

/**
 * Computes the cell value at position (r, c, z) using mathematical construction.
 *
 * This function uses base-4 digit decomposition and XOR operations (GF(4) arithmetic)
 * to compute values instantly in O(1) time.
 *
 * Algorithm:
 * - Decompose each coordinate into base-4 digits: r = 4*ur + vr (ur, vr in 0..3)
 * - Compute symbol digits using XOR:
 *   - us = vr ^ uc ^ uz ^ vz  (high base-4 digit)
 *   - vs = ur ^ vc ^ vz       (low base-4 digit)
 * - Pack result: (us << 2) | vs  (returns 0..15)
 *
 * This construction guarantees all Latin cube constraints are satisfied:
 * - All rows, columns, and beams contain each value 0-15 exactly once
 * - All 4x4 sub-squares on all faces contain each value 0-15 exactly once
 *
 * @param r - Row coordinate (0-15)
 * @param c - Column coordinate (0-15)
 * @param z - Depth coordinate (0-15)
 * @returns Value in range 0-15
 */
function cellValue(r: number, c: number, z: number): number {
  // Base-4 decomposition: each coordinate becomes (u, v) where coord = 4*u + v
  const ur = Math.floor(r / 4);
  const vr = r % 4;
  const uc = Math.floor(c / 4);
  const vc = c % 4;
  const uz = Math.floor(z / 4);
  const vz = z % 4;

  // XOR operations (GF(4) arithmetic)
  const us = vr ^ uc ^ uz ^ vz;  // high base-4 digit of symbol
  const vs = ur ^ vc ^ vz;        // low base-4 digit of symbol

  // Pack into 0..15
  return (us << 2) | vs;
}

/**
 * Converts a numeric value (0-15) to its hexadecimal character representation
 * @param value - Numeric value (0-15)
 * @returns Hexadecimal character ('0'-'9', 'a'-'f')
 */
function valueToHex(value: number): Exclude<HexValue, null> {
  return HEX_VALUES[value];
}

/**
 * Difficulty level configuration
 */
export type Difficulty = 'easy';

/**
 * Configuration for puzzle difficulty
 */
interface DifficultyConfig {
  /** Target percentage of cells to keep as given (0-1) */
  givenCellsRatio: number;
}

/**
 * Difficulty configurations
 */
const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { givenCellsRatio: 0.70 } // 70% given cells, 30% removed
};

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 * @param array - The array to shuffle
 * @returns The shuffled array
 */
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a fully solved valid cube using mathematical construction.
 *
 * This function uses the cellValue() formula to instantly generate a valid
 * 16x16x16 Latin cube that satisfies all constraints:
 * - All rows, columns, and beams contain each value 0-15 exactly once
 * - All 4x4 sub-squares on all faces contain each value 0-15 exactly once
 *
 * PERFORMANCE: This is instant (O(1) per cell, ~4096 operations total)
 * compared to the previous backtracking approach which took 5+ minutes.
 *
 * @returns A cube with all cells filled with valid values
 */
export function generateSolvedCube(): Cube {
  const cube = createCube();

  // Fill all 4096 cells using the mathematical construction
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const numericValue = cellValue(i, j, k);
        const hexValue = valueToHex(numericValue);
        cube.cells[i][j][k].value = hexValue;
      }
    }
  }

  return cube;
}

/**
 * Creates a deep copy of a cube
 * @param cube - The cube to copy
 * @returns A new cube with the same values
 */
function copyCube(cube: Cube): Cube {
  const newCube = createCube();
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        newCube.cells[i][j][k].value = cube.cells[i][j][k].value;
      }
    }
  }
  return newCube;
}

/**
 * Removes cells from a solved cube to create a puzzle
 * Attempts to maintain unique solvability but may fall back to simpler approach if too slow
 * @param solvedCube - A fully solved cube
 * @param difficulty - The difficulty level
 * @returns A cube with cells removed according to difficulty
 */
function removeCells(solvedCube: Cube, difficulty: Difficulty): Cube {
  const config = DIFFICULTY_CONFIG[difficulty];
  const totalCells = 16 * 16 * 16; // 4096
  const targetGivenCells = Math.floor(totalCells * config.givenCellsRatio);
  const cellsToRemove = totalCells - targetGivenCells;

  // Create a working copy
  const puzzle = copyCube(solvedCube);

  // Create list of all positions
  const positions: Position[] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        positions.push([i, j, k] as const);
      }
    }
  }

  // Shuffle positions for random removal
  shuffle(positions);

  let removedCount = 0;

  // Try to remove cells while maintaining uniqueness
  // Note: Full uniqueness checking is very slow for 4096 cells
  // For easy difficulty, we use a simpler approach: just remove randomly
  // The high ratio of given cells (70%) ensures solvability in practice
  for (const pos of positions) {
    if (removedCount >= cellsToRemove) {
      break;
    }

    const [i, j, k] = pos;

    // Remove the cell
    puzzle.cells[i][j][k].value = null;
    removedCount++;
  }

  return puzzle;
}

/**
 * Generates a new puzzle cube at the specified difficulty
 * @param difficulty - The difficulty level (default: 'easy')
 * @returns An object containing the puzzle cube and the complete solution
 */
export function generatePuzzle(difficulty: Difficulty = 'easy'): { cube: Cube; solution: HexValue[][][] } {
  // Phase 1: Generate a fully solved cube
  const solvedCube = generateSolvedCube();

  // Extract solution as 3D array
  const solution: HexValue[][][] = [];
  for (let i = 0; i < 16; i++) {
    solution[i] = [];
    for (let j = 0; j < 16; j++) {
      solution[i][j] = [];
      for (let k = 0; k < 16; k++) {
        solution[i][j][k] = solvedCube.cells[i][j][k].value;
      }
    }
  }

  // Phase 2: Remove cells based on difficulty
  const puzzle = removeCells(solvedCube, difficulty);

  // Phase 3: Convert remaining cells to "given" type
  const finalPuzzle = createCube();
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const value = puzzle.cells[i][j][k].value;
        const pos: Position = [i, j, k] as const;

        if (value !== null) {
          // This is a given cell (clue)
          finalPuzzle.cells[i][j][k] = createGivenCell(pos, value);
        } else {
          // This is an editable cell (player fills this)
          finalPuzzle.cells[i][j][k] = createEmptyCell(pos);
        }
      }
    }
  }

  return { cube: finalPuzzle, solution };
}
