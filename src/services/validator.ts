/**
 * Validator service for Hex-Do-Cube
 * Provides functions to validate rows, columns, beams, and 4x4 sub-squares for uniqueness
 *
 * PERFORMANCE NOTES:
 * - Validation is O(n) per constraint (16 cells per constraint)
 * - Full cube validation checks 256 rows + 256 columns + 256 beams + 768 sub-squares = 1536 constraints
 * - Total complexity: O(1536 × 16) = O(24,576) operations - acceptable for on-demand validation
 * - Validation should ONLY run on user request (button click), not on every cell change
 * - Future optimization: Early exit on first error, incremental validation for single cell changes
 */

import type { Cell, HexValue, Position } from '../models/Cell.js';
import type { Cube, Face } from '../models/Cube.js';

/**
 * Validation result for a specific constraint
 */
export interface ConstraintValidationResult {
  isValid: boolean;
  duplicates: HexValue[];
  positions: Position[];
}

/**
 * Comprehensive validation result for the entire cube
 */
export interface CubeValidationResult {
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
 * Validates a group of cells for uniqueness (no duplicate non-null values)
 * @param cells - Array of cells to validate (typically 16 cells)
 * @returns ConstraintValidationResult with duplicate values and their positions
 */
export function validateCellGroup(cells: Cell[]): ConstraintValidationResult {
  const valueMap = new Map<HexValue, Position[]>();

  // Track positions for each non-null value
  for (const cell of cells) {
    if (cell.value !== null) {
      if (!valueMap.has(cell.value)) {
        valueMap.set(cell.value, []);
      }
      valueMap.get(cell.value)!.push(cell.position);
    }
  }

  // Find duplicates (values that appear more than once)
  const duplicates: HexValue[] = [];
  const positions: Position[] = [];

  for (const [value, cellPositions] of valueMap.entries()) {
    if (cellPositions.length > 1) {
      duplicates.push(value);
      positions.push(...cellPositions);
    }
  }

  return {
    isValid: duplicates.length === 0,
    duplicates,
    positions
  };
}

/**
 * Validates a specific row in the cube
 * @param cube - The cube to validate
 * @param j - The j coordinate (0-15)
 * @param k - The k coordinate (0-15)
 * @returns ConstraintValidationResult for this row
 */
export function validateRow(cube: Cube, j: number, k: number): ConstraintValidationResult {
  const row = cube.getRow(j, k);
  return validateCellGroup(row);
}

/**
 * Validates a specific column in the cube
 * @param cube - The cube to validate
 * @param i - The i coordinate (0-15)
 * @param k - The k coordinate (0-15)
 * @returns ConstraintValidationResult for this column
 */
export function validateColumn(cube: Cube, i: number, k: number): ConstraintValidationResult {
  const column = cube.getColumn(i, k);
  return validateCellGroup(column);
}

/**
 * Validates a specific beam in the cube
 * @param cube - The cube to validate
 * @param i - The i coordinate (0-15)
 * @param j - The j coordinate (0-15)
 * @returns ConstraintValidationResult for this beam
 */
export function validateBeam(cube: Cube, i: number, j: number): ConstraintValidationResult {
  const beam = cube.getBeam(i, j);
  return validateCellGroup(beam);
}

/**
 * Validates a specific 4x4 sub-square on a planar face
 * @param cube - The cube to validate
 * @param face - Which face ('i', 'j', or 'k')
 * @param layer - Which layer of the face (0-15)
 * @param subRow - Which sub-square row (0-3)
 * @param subCol - Which sub-square column (0-3)
 * @returns ConstraintValidationResult for this sub-square
 */
export function validateSubSquare(
  cube: Cube,
  face: Face,
  layer: number,
  subRow: number,
  subCol: number
): ConstraintValidationResult {
  const subSquare = cube.getSubSquare(face, layer, subRow, subCol);
  return validateCellGroup(subSquare);
}

/**
 * Validates all rows in the cube
 * @param cube - The cube to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateAllRows(cube: Cube): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let j = 0; j < 16; j++) {
    for (let k = 0; k < 16; k++) {
      const result = validateRow(cube, j, k);
      if (!result.isValid) {
        errors.push({
          type: 'row',
          description: `Row (j=${j}, k=${k}) has duplicate values: ${result.duplicates.join(', ')}`,
          cells: result.positions
        });
      }
    }
  }

  return errors;
}

/**
 * Validates all columns in the cube
 * @param cube - The cube to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateAllColumns(cube: Cube): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < 16; i++) {
    for (let k = 0; k < 16; k++) {
      const result = validateColumn(cube, i, k);
      if (!result.isValid) {
        errors.push({
          type: 'column',
          description: `Column (i=${i}, k=${k}) has duplicate values: ${result.duplicates.join(', ')}`,
          cells: result.positions
        });
      }
    }
  }

  return errors;
}

/**
 * Validates all beams in the cube
 * @param cube - The cube to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateAllBeams(cube: Cube): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      const result = validateBeam(cube, i, j);
      if (!result.isValid) {
        errors.push({
          type: 'beam',
          description: `Beam (i=${i}, j=${j}) has duplicate values: ${result.duplicates.join(', ')}`,
          cells: result.positions
        });
      }
    }
  }

  return errors;
}

/**
 * Validates all 4x4 sub-squares on all planar faces
 * @param cube - The cube to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateAllSubSquares(cube: Cube): ValidationError[] {
  const errors: ValidationError[] = [];
  const faces: Face[] = ['i', 'j', 'k'];

  for (const face of faces) {
    for (let layer = 0; layer < 16; layer++) {
      for (let subRow = 0; subRow < 4; subRow++) {
        for (let subCol = 0; subCol < 4; subCol++) {
          const result = validateSubSquare(cube, face, layer, subRow, subCol);
          if (!result.isValid) {
            errors.push({
              type: 'sub-square',
              description: `Sub-square (face=${face}, layer=${layer}, subRow=${subRow}, subCol=${subCol}) has duplicate values: ${result.duplicates.join(', ')}`,
              cells: result.positions
            });
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Validates all constraints in the cube
 * Checks all rows, columns, beams, and sub-squares for duplicates
 * @param cube - The cube to validate
 * @returns CubeValidationResult with isValid flag and list of all errors
 */
export function validateCube(cube: Cube): CubeValidationResult {
  const errors: ValidationError[] = [
    ...validateAllRows(cube),
    ...validateAllColumns(cube),
    ...validateAllBeams(cube),
    ...validateAllSubSquares(cube)
  ];

  return {
    isValid: errors.length === 0,
    errors
  };
}
