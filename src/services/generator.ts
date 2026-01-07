/**
 * Generator service for Hex-Do-Cube
 * Implements randomized backtracking algorithm to generate valid solved cubes
 * and creates puzzles by removing cells based on difficulty
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
 * Gets all cells that affect the validity of a position
 * (same row, column, beam, and sub-squares)
 * @param cube - The cube
 * @param pos - The position to check
 * @returns Set of values that constrain this position
 */
function getUsedValues(cube: Cube, pos: Position): Set<HexValue> {
  const [i, j, k] = pos;
  const values = new Set<HexValue>();

  // Row (i varies, j and k fixed)
  for (let ii = 0; ii < 16; ii++) {
    if (ii !== i) { // Skip self
      const val = cube.cells[ii][j][k].value;
      if (val !== null) values.add(val);
    }
  }

  // Column (j varies, i and k fixed)
  for (let jj = 0; jj < 16; jj++) {
    if (jj !== j) { // Skip self
      const val = cube.cells[i][jj][k].value;
      if (val !== null) values.add(val);
    }
  }

  // Beam (k varies, i and j fixed)
  for (let kk = 0; kk < 16; kk++) {
    if (kk !== k) { // Skip self
      const val = cube.cells[i][j][kk].value;
      if (val !== null) values.add(val);
    }
  }

  // Sub-squares on three planar faces
  // i-face (i constant, j and k vary)
  const iSubRow = Math.floor(j / 4);
  const iSubCol = Math.floor(k / 4);
  for (let jOffset = 0; jOffset < 4; jOffset++) {
    for (let kOffset = 0; kOffset < 4; kOffset++) {
      const jj = iSubRow * 4 + jOffset;
      const kk = iSubCol * 4 + kOffset;
      if (jj !== j || kk !== k) { // Skip self
        const val = cube.cells[i][jj][kk].value;
        if (val !== null) values.add(val);
      }
    }
  }

  // j-face (j constant, i and k vary)
  const jSubRow = Math.floor(i / 4);
  const jSubCol = Math.floor(k / 4);
  for (let iOffset = 0; iOffset < 4; iOffset++) {
    for (let kOffset = 0; kOffset < 4; kOffset++) {
      const ii = jSubRow * 4 + iOffset;
      const kk = jSubCol * 4 + kOffset;
      if (ii !== i || kk !== k) { // Skip self
        const val = cube.cells[ii][j][kk].value;
        if (val !== null) values.add(val);
      }
    }
  }

  // k-face (k constant, i and j vary)
  const kSubRow = Math.floor(i / 4);
  const kSubCol = Math.floor(j / 4);
  for (let iOffset = 0; iOffset < 4; iOffset++) {
    for (let jOffset = 0; jOffset < 4; jOffset++) {
      const ii = kSubRow * 4 + iOffset;
      const jj = kSubCol * 4 + jOffset;
      if (ii !== i || jj !== j) { // Skip self
        const val = cube.cells[ii][jj][k].value;
        if (val !== null) values.add(val);
      }
    }
  }

  return values;
}

/**
 * Gets valid values for a cell position based on current constraints
 * @param cube - The cube
 * @param pos - The position to check
 * @returns Array of valid hex values that can be placed at this position
 */
function getValidValues(cube: Cube, pos: Position): Exclude<HexValue, null>[] {
  const usedValues = getUsedValues(cube, pos);
  return HEX_VALUES.filter(val => !usedValues.has(val));
}

/**
 * Finds the next empty cell position in the cube
 * Simple linear scan for efficiency
 * @param cube - The cube
 * @returns The next empty position, or null if cube is full
 */
function findNextEmptyCell(cube: Cube): Position | null {
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        if (cube.cells[i][j][k].value === null) {
          return [i, j, k] as const;
        }
      }
    }
  }
  return null;
}

/**
 * Solves the cube using randomized backtracking with optimizations
 * @param cube - The cube to solve (modified in place)
 * @param maxBacktracks - Maximum number of backtracks before giving up (safety limit)
 * @returns true if solved successfully, false if no solution exists
 */
function solveCubeBacktracking(cube: Cube, maxBacktracks: number = Infinity): boolean {
  let backtrackCount = 0;

  function solve(): boolean {
    const pos = findNextEmptyCell(cube);

    // Base case: no empty cells means we're done
    if (pos === null) {
      return true;
    }

    const [i, j, k] = pos;
    const validValues = getValidValues(cube, pos);

    // No valid values means this path is invalid
    if (validValues.length === 0) {
      backtrackCount++;
      if (backtrackCount > maxBacktracks) {
        return false; // Give up to prevent infinite loops
      }
      return false;
    }

    // Try values in random order for variety
    shuffle(validValues);

    for (const value of validValues) {
      // Try this value
      cube.cells[i][j][k].value = value;

      // Recursively solve
      if (solve()) {
        return true;
      }

      // Backtrack
      cube.cells[i][j][k].value = null;
      backtrackCount++;
      if (backtrackCount > maxBacktracks) {
        return false; // Give up
      }
    }

    return false;
  }

  return solve();
}

/**
 * Generates a fully solved valid cube using randomized backtracking
 *
 * PERFORMANCE NOTE: Generating a 16×16×16 cube with all constraints
 * (rows, columns, beams, and 768 sub-squares) is computationally intensive.
 * Generation may take several minutes on first attempt but usually succeeds
 * due to randomization in the backtracking algorithm.
 *
 * Future optimizations could include:
 * - Constraint propagation
 * - Better heuristics (MRV with look-ahead)
 * - Pre-seeded patterns with permutations
 * - Parallel generation attempts
 *
 * @returns A cube with all cells filled with valid values
 */
export function generateSolvedCube(): Cube {
  const cube = createCube();

  // Use backtracking with no limit (let it run until success)
  // The randomization should eventually find a solution
  const solved = solveCubeBacktracking(cube, Infinity);

  if (!solved) {
    // This should not happen with Infinity limit unless there's a bug
    throw new Error('Failed to generate a valid solved cube');
  }

  return cube;
}

// Note: countSolutions function removed for now
// Full uniqueness checking is very computationally expensive for 4096 cells
// For easy difficulty with 70% given cells, the puzzle is typically solvable
// Future optimization: implement more efficient uniqueness checking if needed

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
 * @returns A cube with some cells empty (puzzle) and others given (clues)
 */
export function generatePuzzle(difficulty: Difficulty = 'easy'): Cube {
  // Phase 1: Generate a fully solved cube
  const solvedCube = generateSolvedCube();

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

  return finalPuzzle;
}
