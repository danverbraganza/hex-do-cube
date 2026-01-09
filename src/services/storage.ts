/**
 * Storage service for Hex-Do-Cube
 * Provides LocalStorage persistence for complete game state
 */

import type { GameState, Difficulty } from '../models/GameState.js';
import type { HexValue, CellType } from '../models/Cell.js';
import { createCube } from '../models/Cube.js';
import { createCell } from '../models/Cell.js';

/**
 * LocalStorage key for game state
 */
const STORAGE_KEY = 'hex-do-cube-game-state';

/**
 * Serializable representation of a Cell
 */
interface SerializedCell {
  position: [number, number, number];
  value: HexValue;
  type: CellType;
}

/**
 * Serializable representation of GameState
 */
interface SerializedGameState {
  cells: SerializedCell[];
  difficulty: Difficulty;
  isComplete: boolean;
  isCorrect: boolean | null;
  solution: HexValue[][][]; // 16x16x16 array with all cells filled
  version: number; // For future schema migrations
}

/**
 * Current schema version
 */
const SCHEMA_VERSION = 1;

/**
 * Checks if LocalStorage is available and writable
 * @returns true if LocalStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__hex_do_cube_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Serializes a GameState to a format suitable for LocalStorage
 * Only stores non-empty cells to save space
 * @param state - The game state to serialize
 * @returns Serializable object
 */
function serializeGameState(state: GameState): SerializedGameState {
  const cells: SerializedCell[] = [];

  // Only store non-empty cells to save space
  state.cube.forEachCell((cell) => {
    // Skip empty editable cells (they'll be recreated as empty by default)
    if (cell.value !== null || cell.type === 'given') {
      cells.push({
        position: [cell.position[0], cell.position[1], cell.position[2]],
        value: cell.value,
        type: cell.type
      });
    }
  });

  return {
    cells,
    difficulty: state.difficulty,
    isComplete: state.isComplete,
    isCorrect: state.isCorrect,
    solution: state.solution,
    version: SCHEMA_VERSION
  };
}

/**
 * Deserializes a SerializedGameState back to a GameState
 * @param serialized - The serialized game state
 * @returns Reconstructed GameState
 * @throws Error if data is invalid
 */
function deserializeGameState(serialized: SerializedGameState): GameState {
  // Validate schema version
  if (serialized.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${serialized.version}`);
  }

  // Validate required fields
  if (!serialized.cells || !Array.isArray(serialized.cells)) {
    throw new Error('Invalid serialized data: missing or invalid cells array');
  }

  if (!serialized.difficulty) {
    throw new Error('Invalid serialized data: missing difficulty');
  }

  if (!serialized.solution || !Array.isArray(serialized.solution)) {
    throw new Error('Invalid serialized data: missing or invalid solution array');
  }

  // Create empty cube
  const cube = createCube();

  // Populate cube with cells
  for (const serializedCell of serialized.cells) {
    const [i, j, k] = serializedCell.position;

    // Validate position
    if (
      !Number.isInteger(i) || i < 0 || i > 15 ||
      !Number.isInteger(j) || j < 0 || j > 15 ||
      !Number.isInteger(k) || k < 0 || k > 15
    ) {
      throw new Error(`Invalid cell position: [${i}, ${j}, ${k}]`);
    }

    // Create and assign cell
    const cell = createCell(
      [i, j, k] as const,
      serializedCell.value,
      serializedCell.type
    );
    cube.cells[i][j][k] = cell;
  }

  return {
    cube,
    difficulty: serialized.difficulty,
    isComplete: serialized.isComplete ?? false,
    isCorrect: serialized.isCorrect ?? null,
    solution: serialized.solution
  };
}

/**
 * Saves the current game state to LocalStorage
 * @param state - The game state to save
 * @throws Error if LocalStorage is unavailable or quota is exceeded
 */
export function saveGameState(state: GameState): void {
  if (!isStorageAvailable()) {
    throw new Error('LocalStorage is not available');
  }

  try {
    const serialized = serializeGameState(state);
    const json = JSON.stringify(serialized);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    if (error instanceof Error) {
      // Check for quota exceeded error
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Unable to save game state.');
      }
      throw new Error(`Failed to save game state: ${error.message}`);
    }
    throw new Error('Failed to save game state: unknown error');
  }
}

/**
 * Loads the game state from LocalStorage
 * @returns The loaded GameState, or null if no saved state exists
 * @throws Error if stored data is corrupted or invalid
 */
export function loadGameState(): GameState | null {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const json = localStorage.getItem(STORAGE_KEY);

    if (json === null) {
      return null;
    }

    const serialized = JSON.parse(json) as SerializedGameState;
    return deserializeGameState(serialized);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Stored game state is corrupted (invalid JSON)');
    }
    if (error instanceof Error) {
      throw new Error(`Failed to load game state: ${error.message}`);
    }
    throw new Error('Failed to load game state: unknown error');
  }
}

/**
 * Clears the saved game state from LocalStorage
 */
export function clearGameState(): void {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Silently ignore errors when clearing
    // This is a best-effort operation
  }
}

/**
 * Checks if a saved game state exists in LocalStorage
 * @returns true if a saved state exists
 */
export function hasGameState(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}
