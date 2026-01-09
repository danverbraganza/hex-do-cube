/**
 * CellEditor for Hex-Do-Cube
 * Orchestrates cell value editing with validation feedback and visual state management.
 *
 * Responsibilities:
 * - Accept hex value input (0-9, a-f) for selected cells
 * - Validate that only editable cells can be modified (not given cells)
 * - Provide visual feedback for validation conflicts
 * - Distinguish given vs editable cells visually
 * - Integrate with InputController for cell selection
 * - Integrate with validator for conflict detection
 * - Update CubeRenderer with error states for conflicting cells
 */

import type { Cube } from '../models/Cube.js';
import type { Position, HexValue } from '../models/Cell.js';
import type { CubeRenderer } from '../renderer/CubeRenderer.js';
import { isCellEditable, setCellValue, positionKey, parsePositionKey } from '../models/Cell.js';
import { validateCube, type CubeValidationResult } from '../services/validator.js';

/**
 * Configuration for CellEditor
 */
export interface CellEditorConfig {
  /** Whether to automatically validate on each edit (default: false) */
  autoValidate?: boolean;
  /** Whether to show error highlights (default: true) */
  showErrorHighlights?: boolean;
}

/**
 * Callback for when validation results change
 */
export type ValidationCallback = (result: CubeValidationResult) => void;

/**
 * Callback for when a cell is successfully edited
 */
export type CellEditCallback = (position: Position, value: HexValue) => void;

/**
 * CellEditor manages the editing of cell values with validation feedback
 */
export class CellEditor {
  private cube: Cube;
  private renderer: CubeRenderer;
  private config: Required<CellEditorConfig>;
  private solution: HexValue[][][]; // The correct solution for comparison

  // Validation state
  private lastValidationResult: CubeValidationResult | null = null;
  private errorPositions: Set<string> = new Set();

  // Callbacks
  private validationCallbacks: ValidationCallback[] = [];
  private editCallbacks: CellEditCallback[] = [];

  constructor(
    cube: Cube,
    renderer: CubeRenderer,
    solution: HexValue[][][],
    config: CellEditorConfig = {}
  ) {
    this.cube = cube;
    this.renderer = renderer;
    this.solution = solution;

    // Apply default configuration
    this.config = {
      autoValidate: config.autoValidate ?? false,
      showErrorHighlights: config.showErrorHighlights ?? true,
    };
  }

  /**
   * Attempt to edit a cell with a new value
   * @param position - The position of the cell to edit
   * @param value - The new hex value (or null to clear)
   * @returns true if edit was successful, false if cell is not editable
   */
  public editCell(position: Position, value: HexValue): boolean {
    const [i, j, k] = position;
    const cell = this.cube.cells[i][j][k];

    // Check if cell is editable
    if (!isCellEditable(cell)) {
      return false;
    }

    // Set the cell value
    setCellValue(cell, value);

    // Update renderer
    this.renderer.updateCell(position);

    // Notify edit callbacks
    this.notifyEdit(position, value);

    // Auto-validate if enabled
    if (this.config.autoValidate) {
      this.validate();
    }

    return true;
  }

  /**
   * Clear the value of a cell (set to null)
   * @param position - The position of the cell to clear
   * @returns true if clear was successful, false if cell is not editable
   */
  public clearCell(position: Position): boolean {
    return this.editCell(position, null);
  }

  /**
   * Check if a cell can be edited
   * @param position - The position to check
   * @returns true if the cell is editable
   */
  public canEdit(position: Position): boolean {
    const [i, j, k] = position;
    const cell = this.cube.cells[i][j][k];
    return isCellEditable(cell);
  }

  /**
   * Validate the entire cube and update visual feedback
   * Distinguishes between:
   * - Given cells in conflict (green highlight)
   * - User cells with wrong values (red highlight)
   * @returns The validation result
   */
  public validate(): CubeValidationResult {
    // Run validation
    const result = validateCube(this.cube);
    this.lastValidationResult = result;

    // Update error highlights if enabled
    if (this.config.showErrorHighlights) {
      this.updateErrorHighlights(result);
    }

    // Notify validation callbacks
    this.notifyValidation(result);

    return result;
  }

  /**
   * Get the last validation result (without re-running validation)
   * @returns The last validation result, or null if validation hasn't been run
   */
  public getLastValidationResult(): CubeValidationResult | null {
    return this.lastValidationResult;
  }

  /**
   * Clear all error highlights from the renderer
   */
  public clearErrorHighlights(): void {
    // Clear error states for all previously highlighted cells
    for (const posKey of this.errorPositions) {
      const position = parsePositionKey(posKey);
      const state = this.renderer.getCellState(position);
      // Clear any error-related state (error, conflict-given, wrong)
      if (state === 'error' || state === 'conflict-given' || state === 'wrong') {
        this.renderer.clearCellState(position);
      }
    }
    this.errorPositions.clear();
  }

  /**
   * Update error highlights based on validation results
   * Applies different highlighting based on cell type and correctness:
   * - GREEN (conflict-given): Given cells involved in constraint violations
   * - RED (wrong): User-entered cells with incorrect values (compared to solution)
   */
  private updateErrorHighlights(result: CubeValidationResult): void {
    // Clear previous error highlights
    this.clearErrorHighlights();

    // Don't show highlights if validation passed
    if (result.isValid) {
      return;
    }

    // Collect all positions in conflicts
    const conflictPositions = new Set<string>();
    for (const error of result.errors) {
      for (const position of error.cells) {
        // Skip undefined positions (shouldn't happen, but be defensive)
        if (!position || position.length !== 3) {
          continue;
        }
        const key = positionKey(position);
        conflictPositions.add(key);
      }
    }

    // Apply appropriate highlighting to each conflicting cell
    for (const posKey of conflictPositions) {
      const position = parsePositionKey(posKey);
      const [i, j, k] = position;
      const cell = this.cube.cells[i][j][k];
      const currentState = this.renderer.getCellState(position);

      // Skip if cell is currently selected (selected state takes precedence)
      if (currentState === 'selected') {
        this.errorPositions.add(posKey);
        continue;
      }

      // Determine the appropriate highlight state
      let highlightState: 'conflict-given' | 'wrong' | 'error';

      if (cell.type === 'given') {
        // Given cells in conflict get GREEN highlight
        highlightState = 'conflict-given';
      } else {
        // User cells: check if value is wrong compared to solution
        const correctValue = this.solution[i][j][k];
        if (cell.value !== correctValue) {
          // User cell with WRONG value gets RED highlight
          highlightState = 'wrong';
        } else {
          // User cell with CORRECT value but in conflict (shouldn't happen in valid puzzle)
          // Use generic error state
          highlightState = 'error';
        }
      }

      this.renderer.setCellState(position, highlightState);
      this.errorPositions.add(posKey);
    }
  }

  /**
   * Check if a cell is currently in an error state
   * @param position - The position to check
   * @returns true if the cell is part of a validation error
   */
  public isCellInError(position: Position): boolean {
    const key = positionKey(position);
    return this.errorPositions.has(key);
  }

  /**
   * Register a callback for validation events
   * @param callback - Function to call when validation completes
   */
  public onValidation(callback: ValidationCallback): void {
    this.validationCallbacks.push(callback);
  }

  /**
   * Register a callback for cell edit events
   * @param callback - Function to call when a cell is edited
   */
  public onEdit(callback: CellEditCallback): void {
    this.editCallbacks.push(callback);
  }

  /**
   * Notify all validation callbacks
   */
  private notifyValidation(result: CubeValidationResult): void {
    for (const callback of this.validationCallbacks) {
      callback(result);
    }
  }

  /**
   * Notify all edit callbacks
   */
  private notifyEdit(position: Position, value: HexValue): void {
    for (const callback of this.editCallbacks) {
      callback(position, value);
    }
  }

  /**
   * Update the cube reference (e.g., when loading a new puzzle)
   */
  public setCube(cube: Cube, solution?: HexValue[][][]): void {
    this.cube = cube;
    if (solution) {
      this.solution = solution;
    }
    this.clearErrorHighlights();
    this.lastValidationResult = null;
  }

  /**
   * Update the solution reference
   */
  public setSolution(solution: HexValue[][][]): void {
    this.solution = solution;
  }

  /**
   * Enable or disable auto-validation
   */
  public setAutoValidate(enabled: boolean): void {
    this.config.autoValidate = enabled;
  }

  /**
   * Enable or disable error highlights
   */
  public setShowErrorHighlights(enabled: boolean): void {
    this.config.showErrorHighlights = enabled;
    if (!enabled) {
      this.clearErrorHighlights();
    } else if (this.lastValidationResult && !this.lastValidationResult.isValid) {
      this.updateErrorHighlights(this.lastValidationResult);
    }
  }

  /**
   * Dispose of all resources and clear callbacks
   */
  public dispose(): void {
    this.clearErrorHighlights();
    this.validationCallbacks = [];
    this.editCallbacks = [];
    this.lastValidationResult = null;
  }
}
