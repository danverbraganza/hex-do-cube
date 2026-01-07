/**
 * Cell model for Hex-Do-Cube
 * Represents an individual cell in the 16×16×16 cube
 */

/**
 * HexValue represents a hexadecimal digit (0-9, a-f) or null (empty cell)
 */
export type HexValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  | null;

/**
 * All valid hex digits for validation
 */
export const VALID_HEX_VALUES: ReadonlySet<string> = new Set([
  '0', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'
]);

/**
 * CellType indicates whether a cell was part of the original puzzle (given)
 * or can be edited by the player (editable)
 */
export type CellType = 'given' | 'editable';

/**
 * Position tuple representing [i, j, k] coordinates in the cube
 * Each coordinate ranges from 0 to 15
 */
export type Position = readonly [i: number, j: number, k: number];

/**
 * Cell interface representing a single cell in the puzzle
 */
export interface Cell {
  readonly position: Position;
  value: HexValue;
  readonly type: CellType;
}

/**
 * Validates if a string is a valid hex value
 * @param value - The value to validate
 * @returns true if the value is a valid hex digit (0-9, a-f), false otherwise
 */
export function isValidHexValue(value: string): value is Exclude<HexValue, null> {
  return VALID_HEX_VALUES.has(value.toLowerCase());
}

/**
 * Parses a string input to a HexValue
 * Handles case-insensitive input and returns null for empty/invalid values
 * @param input - The input string to parse
 * @returns The parsed HexValue or null
 */
export function parseHexValue(input: string | null | undefined): HexValue {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  const normalized = input.toLowerCase();
  if (isValidHexValue(normalized)) {
    return normalized as Exclude<HexValue, null>;
  }
  return null;
}

/**
 * Validates if a position coordinate is within the valid range [0, 15]
 * @param coord - The coordinate to validate
 * @returns true if the coordinate is valid
 */
export function isValidCoordinate(coord: number): boolean {
  return Number.isInteger(coord) && coord >= 0 && coord <= 15;
}

/**
 * Validates if a position is valid (all coordinates in range [0, 15])
 * @param position - The position tuple to validate
 * @returns true if all coordinates are valid
 */
export function isValidPosition(position: Position): boolean {
  return position.length === 3 &&
    isValidCoordinate(position[0]) &&
    isValidCoordinate(position[1]) &&
    isValidCoordinate(position[2]);
}

/**
 * Creates a new Cell with the specified properties
 * @param position - The [i, j, k] coordinates of the cell
 * @param value - The hex value or null for empty
 * @param type - Whether the cell is 'given' or 'editable'
 * @returns A new Cell object
 * @throws Error if position is invalid
 */
export function createCell(
  position: Position,
  value: HexValue = null,
  type: CellType = 'editable'
): Cell {
  if (!isValidPosition(position)) {
    throw new Error(
      `Invalid position: [${position.join(', ')}]. Each coordinate must be an integer in [0, 15].`
    );
  }

  return {
    position: [position[0], position[1], position[2]] as const,
    value,
    type
  };
}

/**
 * Creates an empty editable cell at the specified position
 * @param position - The [i, j, k] coordinates
 * @returns A new empty editable Cell
 */
export function createEmptyCell(position: Position): Cell {
  return createCell(position, null, 'editable');
}

/**
 * Creates a given (non-editable) cell with a value at the specified position
 * @param position - The [i, j, k] coordinates
 * @param value - The hex value (must not be null for given cells)
 * @returns A new given Cell
 * @throws Error if value is null
 */
export function createGivenCell(position: Position, value: Exclude<HexValue, null>): Cell {
  if (value === null) {
    throw new Error('Given cells must have a value');
  }
  return createCell(position, value, 'given');
}

/**
 * Checks if a cell is empty (has no value)
 * @param cell - The cell to check
 * @returns true if the cell's value is null
 */
export function isCellEmpty(cell: Cell): boolean {
  return cell.value === null;
}

/**
 * Checks if a cell can be edited
 * @param cell - The cell to check
 * @returns true if the cell type is 'editable'
 */
export function isCellEditable(cell: Cell): boolean {
  return cell.type === 'editable';
}

/**
 * Sets the value of an editable cell
 * @param cell - The cell to modify
 * @param value - The new value
 * @returns The modified cell (same reference)
 * @throws Error if the cell is not editable
 */
export function setCellValue(cell: Cell, value: HexValue): Cell {
  if (!isCellEditable(cell)) {
    throw new Error('Cannot modify a given cell');
  }
  cell.value = value;
  return cell;
}

/**
 * Clears the value of an editable cell
 * @param cell - The cell to clear
 * @returns The modified cell (same reference)
 * @throws Error if the cell is not editable
 */
export function clearCell(cell: Cell): Cell {
  return setCellValue(cell, null);
}

/**
 * Creates a deep copy of a cell
 * @param cell - The cell to copy
 * @returns A new Cell with the same values
 */
export function copyCell(cell: Cell): Cell {
  return {
    position: [cell.position[0], cell.position[1], cell.position[2]] as const,
    value: cell.value,
    type: cell.type
  };
}

/**
 * Compares two cells for equality
 * @param a - First cell
 * @param b - Second cell
 * @returns true if cells have the same position, value, and type
 */
export function cellsEqual(a: Cell, b: Cell): boolean {
  return (
    a.position[0] === b.position[0] &&
    a.position[1] === b.position[1] &&
    a.position[2] === b.position[2] &&
    a.value === b.value &&
    a.type === b.type
  );
}
