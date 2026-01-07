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
import { isCellEditable, setCellValue } from '../models/Cell.js';
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

  // Validation state
  private lastValidationResult: CubeValidationResult | null = null;
  private errorPositions: Set<string> = new Set();

  // Callbacks
  private validationCallbacks: ValidationCallback[] = [];
  private editCallbacks: CellEditCallback[] = [];

  constructor(
    cube: Cube,
    renderer: CubeRenderer,
    config: CellEditorConfig = {}
  ) {
    this.cube = cube;
    this.renderer = renderer;

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
      const position = this.parsePositionKey(posKey);
      const state = this.renderer.getCellState(position);
      if (state === 'error') {
        this.renderer.clearCellState(position);
      }
    }
    this.errorPositions.clear();
  }

  /**
   * Update error highlights based on validation results
   */
  private updateErrorHighlights(result: CubeValidationResult): void {
    // Clear previous error highlights
    this.clearErrorHighlights();

    // Don't show highlights if validation passed
    if (result.isValid) {
      return;
    }

    // Collect all error positions
    const newErrorPositions = new Set<string>();
    for (const error of result.errors) {
      for (const position of error.cells) {
        const key = this.positionKey(position);
        newErrorPositions.add(key);
      }
    }

    // Apply error state to cells, but don't override selected state
    for (const posKey of newErrorPositions) {
      const position = this.parsePositionKey(posKey);
      const currentState = this.renderer.getCellState(position);

      // Only set error state if cell is not currently selected
      // (selected state takes precedence for UX)
      if (currentState !== 'selected') {
        this.renderer.setCellState(position, 'error');
      }

      this.errorPositions.add(posKey);
    }
  }

  /**
   * Check if a cell is currently in an error state
   * @param position - The position to check
   * @returns true if the cell is part of a validation error
   */
  public isCellInError(position: Position): boolean {
    const key = this.positionKey(position);
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
  public setCube(cube: Cube): void {
    this.cube = cube;
    this.clearErrorHighlights();
    this.lastValidationResult = null;
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

  /**
   * Generate a unique string key for a cell position
   */
  private positionKey(position: Position): string {
    return `${position[0]},${position[1]},${position[2]}`;
  }

  /**
   * Parse a position key back to a Position tuple
   */
  private parsePositionKey(key: string): Position {
    const parts = key.split(',').map(Number);
    return [parts[0], parts[1], parts[2]] as Position;
  }
}
