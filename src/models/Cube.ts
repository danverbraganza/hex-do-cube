/**
 * Cube model for Hex-Do-Cube
 * Represents the 16×16×16 game cube with validation and getter methods
 */

import { Cell, createEmptyCell, type Position, type HexValue } from './Cell.js';

/**
 * Face type for sub-square identification
 * - 'i': top face (constant i)
 * - 'j': right face (constant j)
 * - 'k': left face (constant k)
 */
export type Face = 'i' | 'j' | 'k';

/**
 * Validation result for cube constraint checking
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Details about a validation error
 */
export interface ValidationError {
  type: 'row' | 'column' | 'beam' | 'sub-square';
  description: string;
  cells: Position[];
}

/**
 * Cube interface representing the 16×16×16 puzzle grid
 */
export interface Cube {
  cells: Cell[][][]; // cells[i][j][k]
  validate(): ValidationResult;
  getRow(i: number, j: number): Cell[];
  getColumn(i: number, k: number): Cell[];
  getBeam(j: number, k: number): Cell[];
  getSubSquare(face: Face, layer: number, subRow: number, subCol: number): Cell[];
}

/**
 * Creates a new 16×16×16 cube with empty editable cells
 * @returns A new Cube instance
 */
export function createCube(): Cube {
  // Initialize 16×16×16 array with empty cells
  const cells: Cell[][][] = [];
  for (let i = 0; i < 16; i++) {
    cells[i] = [];
    for (let j = 0; j < 16; j++) {
      cells[i][j] = [];
      for (let k = 0; k < 16; k++) {
        cells[i][j][k] = createEmptyCell([i, j, k] as const);
      }
    }
  }

  return {
    cells,
    validate,
    getRow,
    getColumn,
    getBeam,
    getSubSquare
  };
}

/**
 * Gets a row from the cube (varies i, fixed j and k)
 * @param j - The j coordinate (0-15)
 * @param k - The k coordinate (0-15)
 * @returns Array of 16 cells in the row
 * @throws Error if coordinates are out of bounds
 */
function getRow(this: Cube, j: number, k: number): Cell[] {
  validateCoordinate(j, 'j');
  validateCoordinate(k, 'k');

  const row: Cell[] = [];
  for (let i = 0; i < 16; i++) {
    row.push(this.cells[i][j][k]);
  }
  return row;
}

/**
 * Gets a column from the cube (varies j, fixed i and k)
 * @param i - The i coordinate (0-15)
 * @param k - The k coordinate (0-15)
 * @returns Array of 16 cells in the column
 * @throws Error if coordinates are out of bounds
 */
function getColumn(this: Cube, i: number, k: number): Cell[] {
  validateCoordinate(i, 'i');
  validateCoordinate(k, 'k');

  const column: Cell[] = [];
  for (let j = 0; j < 16; j++) {
    column.push(this.cells[i][j][k]);
  }
  return column;
}

/**
 * Gets a beam from the cube (varies k, fixed i and j)
 * @param i - The i coordinate (0-15)
 * @param j - The j coordinate (0-15)
 * @returns Array of 16 cells in the beam
 * @throws Error if coordinates are out of bounds
 */
function getBeam(this: Cube, i: number, j: number): Cell[] {
  validateCoordinate(i, 'i');
  validateCoordinate(j, 'j');

  const beam: Cell[] = [];
  for (let k = 0; k < 16; k++) {
    beam.push(this.cells[i][j][k]);
  }
  return beam;
}

/**
 * Gets a 4×4 sub-square from a planar face
 * Each 16×16 face is divided into 16 sub-squares (4×4 grid of 4×4 cells)
 *
 * @param face - Which face to get the sub-square from ('i', 'j', or 'k')
 * @param layer - Which layer of the face (0-15)
 * @param subRow - Which sub-square row (0-3)
 * @param subCol - Which sub-square column (0-3)
 * @returns Array of 16 cells in the sub-square
 * @throws Error if parameters are out of bounds
 */
function getSubSquare(
  this: Cube,
  face: Face,
  layer: number,
  subRow: number,
  subCol: number
): Cell[] {
  validateCoordinate(layer, 'layer');
  validateSubSquareCoordinate(subRow, 'subRow');
  validateSubSquareCoordinate(subCol, 'subCol');

  const subSquare: Cell[] = [];
  const startRow = subRow * 4;
  const startCol = subCol * 4;

  // Extract the 4×4 sub-square based on which face we're looking at
  if (face === 'i') {
    // i-face: i is constant (layer), j and k vary
    const i = layer;
    for (let jOffset = 0; jOffset < 4; jOffset++) {
      for (let kOffset = 0; kOffset < 4; kOffset++) {
        const j = startRow + jOffset;
        const k = startCol + kOffset;
        subSquare.push(this.cells[i][j][k]);
      }
    }
  } else if (face === 'j') {
    // j-face: j is constant (layer), i and k vary
    const j = layer;
    for (let iOffset = 0; iOffset < 4; iOffset++) {
      for (let kOffset = 0; kOffset < 4; kOffset++) {
        const i = startRow + iOffset;
        const k = startCol + kOffset;
        subSquare.push(this.cells[i][j][k]);
      }
    }
  } else if (face === 'k') {
    // k-face: k is constant (layer), i and j vary
    const k = layer;
    for (let iOffset = 0; iOffset < 4; iOffset++) {
      for (let jOffset = 0; jOffset < 4; jOffset++) {
        const i = startRow + iOffset;
        const j = startCol + jOffset;
        subSquare.push(this.cells[i][j][k]);
      }
    }
  } else {
    throw new Error(`Invalid face: ${face}. Must be 'i', 'j', or 'k'.`);
  }

  return subSquare;
}

/**
 * Validates all constraints in the cube
 * Checks all rows, columns, beams, and sub-squares for duplicates
 * @returns ValidationResult with isValid flag and list of errors
 */
function validate(this: Cube): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate all rows (j and k fixed, i varies)
  for (let j = 0; j < 16; j++) {
    for (let k = 0; k < 16; k++) {
      const row = this.getRow(j, k);
      const error = validateGroup(row, 'row', `Row (j=${j}, k=${k})`);
      if (error) errors.push(error);
    }
  }

  // Validate all columns (i and k fixed, j varies)
  for (let i = 0; i < 16; i++) {
    for (let k = 0; k < 16; k++) {
      const column = this.getColumn(i, k);
      const error = validateGroup(column, 'column', `Column (i=${i}, k=${k})`);
      if (error) errors.push(error);
    }
  }

  // Validate all beams (i and j fixed, k varies)
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      const beam = this.getBeam(i, j);
      const error = validateGroup(beam, 'beam', `Beam (i=${i}, j=${j})`);
      if (error) errors.push(error);
    }
  }

  // Validate all sub-squares on all faces
  const faces: Face[] = ['i', 'j', 'k'];
  for (const face of faces) {
    for (let layer = 0; layer < 16; layer++) {
      for (let subRow = 0; subRow < 4; subRow++) {
        for (let subCol = 0; subCol < 4; subCol++) {
          const subSquare = this.getSubSquare(face, layer, subRow, subCol);
          const error = validateGroup(
            subSquare,
            'sub-square',
            `Sub-square (face=${face}, layer=${layer}, subRow=${subRow}, subCol=${subCol})`
          );
          if (error) errors.push(error);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a group of cells (row/column/beam/sub-square) for duplicate values
 * @param cells - Array of 16 cells to validate
 * @param type - Type of group being validated
 * @param description - Human-readable description of the group
 * @returns ValidationError if duplicates found, null otherwise
 */
function validateGroup(
  cells: Cell[],
  type: ValidationError['type'],
  description: string
): ValidationError | null {
  const valueMap = new Map<HexValue, Position[]>();

  // Track positions for each value
  for (const cell of cells) {
    if (cell.value !== null) {
      if (!valueMap.has(cell.value)) {
        valueMap.set(cell.value, []);
      }
      valueMap.get(cell.value)!.push(cell.position);
    }
  }

  // Check for duplicates
  const duplicates: Position[] = [];
  for (const positions of valueMap.values()) {
    if (positions.length > 1) {
      duplicates.push(...positions);
    }
  }

  if (duplicates.length > 0) {
    return {
      type,
      description,
      cells: duplicates
    };
  }

  return null;
}

/**
 * Validates that a coordinate is in range [0, 15]
 * @param coord - The coordinate to validate
 * @param name - Name of the coordinate for error messages
 * @throws Error if coordinate is out of bounds
 */
function validateCoordinate(coord: number, name: string): void {
  if (!Number.isInteger(coord) || coord < 0 || coord > 15) {
    throw new Error(`${name} must be an integer in [0, 15], got: ${coord}`);
  }
}

/**
 * Validates that a sub-square coordinate is in range [0, 3]
 * @param coord - The coordinate to validate
 * @param name - Name of the coordinate for error messages
 * @throws Error if coordinate is out of bounds
 */
function validateSubSquareCoordinate(coord: number, name: string): void {
  if (!Number.isInteger(coord) || coord < 0 || coord > 3) {
    throw new Error(`${name} must be an integer in [0, 3], got: ${coord}`);
  }
}

/**
 * Gets a cell at the specified position
 * @param cube - The cube to get the cell from
 * @param position - The [i, j, k] position
 * @returns The cell at that position
 * @throws Error if position is invalid
 */
export function getCell(cube: Cube, position: Position): Cell {
  const [i, j, k] = position;
  validateCoordinate(i, 'i');
  validateCoordinate(j, 'j');
  validateCoordinate(k, 'k');
  return cube.cells[i][j][k];
}

/**
 * Sets a cell at the specified position
 * @param cube - The cube to modify
 * @param position - The [i, j, k] position
 * @param cell - The cell to set
 * @throws Error if position is invalid
 */
export function setCell(cube: Cube, position: Position, cell: Cell): void {
  const [i, j, k] = position;
  validateCoordinate(i, 'i');
  validateCoordinate(j, 'j');
  validateCoordinate(k, 'k');
  cube.cells[i][j][k] = cell;
}

/**
 * Checks if the cube is completely filled (no empty cells)
 * @param cube - The cube to check
 * @returns true if all cells have values
 */
export function isCubeFilled(cube: Cube): boolean {
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        if (cube.cells[i][j][k].value === null) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Counts the number of filled cells in the cube
 * @param cube - The cube to count
 * @returns Number of cells with non-null values
 */
export function countFilledCells(cube: Cube): number {
  let count = 0;
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        if (cube.cells[i][j][k].value !== null) {
          count++;
        }
      }
    }
  }
  return count;
}
