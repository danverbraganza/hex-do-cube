#!/usr/bin/env bun
/**
 * Script to pre-generate a cached easy puzzle for Hex-Do-Cube
 * This script generates one easy puzzle and saves it to src/data/cached-puzzle.json
 *
 * Generation takes 2-5 minutes due to the complexity of solving a 16x16x16 cube
 * with 768 sub-square constraints.
 *
 * Usage: bun run scripts/generate-puzzle.ts
 */

import { generatePuzzle } from '../src/services/generator.js';
import type { Cube } from '../src/models/Cube.js';
import type { HexValue, CellType } from '../src/models/Cell.js';
import { mkdir, write } from 'fs/promises';
import { dirname } from 'path';

/**
 * Serializable representation of a Cell for the cached puzzle
 */
interface SerializedCell {
  position: [number, number, number];
  value: HexValue;
  type: CellType;
}

/**
 * Cached puzzle format with metadata
 */
interface CachedPuzzle {
  /** Schema version for future migrations */
  version: number;
  /** Difficulty level */
  difficulty: 'easy';
  /** Generation timestamp (ISO 8601) */
  generatedAt: string;
  /** All non-empty cells (given cells with values) */
  cells: SerializedCell[];
  /** Total number of given cells */
  givenCellCount: number;
  /** Total number of empty cells */
  emptyCellCount: number;
  /** Complete solution (16x16x16 array, all cells filled) */
  solution: HexValue[][][];
}

/**
 * Serializes a generated puzzle cube to the cached format
 * Only stores non-empty cells to save space
 */
function serializePuzzle(cube: Cube, solution: HexValue[][][]): CachedPuzzle {
  const cells: SerializedCell[] = [];
  let givenCount = 0;
  let emptyCount = 0;

  // Collect all non-empty cells
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const cell = cube.cells[i][j][k];

        if (cell.value !== null || cell.type === 'given') {
          cells.push({
            position: [cell.position[0], cell.position[1], cell.position[2]],
            value: cell.value,
            type: cell.type
          });

          if (cell.type === 'given') {
            givenCount++;
          }
        } else {
          emptyCount++;
        }
      }
    }
  }

  return {
    version: 1,
    difficulty: 'easy',
    generatedAt: new Date().toISOString(),
    cells,
    givenCellCount: givenCount,
    emptyCellCount: emptyCount,
    solution
  };
}

/**
 * Main generation function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Hex-Do-Cube: Pre-generating Cached Easy Puzzle');
  console.log('='.repeat(60));
  console.log();
  console.log('This process will take 2-5 minutes...');
  console.log('Please be patient while the algorithm generates a valid 16x16x16 cube.');
  console.log();

  const startTime = Date.now();

  try {
    // Generate the puzzle
    console.log('[1/3] Generating puzzle...');
    const { cube: puzzle, solution } = generatePuzzle('easy');
    const generationTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`      ✓ Puzzle generated in ${generationTime}s`);

    // Serialize to JSON
    console.log('[2/3] Serializing puzzle...');
    const cached = serializePuzzle(puzzle, solution);
    const json = JSON.stringify(cached, null, 2);
    console.log(`      ✓ Serialized ${cached.cells.length} cells`);
    console.log(`        - Given cells: ${cached.givenCellCount}`);
    console.log(`        - Empty cells: ${cached.emptyCellCount}`);
    console.log(`        - JSON size: ${(json.length / 1024).toFixed(1)} KB`);

    // Write to file
    console.log('[3/3] Writing to src/data/cached-puzzle.json...');
    const outputPath = new URL('../src/data/cached-puzzle.json', import.meta.url).pathname;
    await mkdir(dirname(outputPath), { recursive: true });
    await write(outputPath, json, 'utf-8');
    console.log(`      ✓ Written to ${outputPath}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log();
    console.log('='.repeat(60));
    console.log(`✓ Success! Total time: ${totalTime}s`);
    console.log('='.repeat(60));
    console.log();
    console.log('The cached puzzle is ready to use.');
    console.log('The game can now start instantly without waiting for generation.');
  } catch (error) {
    console.error();
    console.error('✗ Error generating puzzle:');
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (error.stack) {
        console.error();
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(`  ${String(error)}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
