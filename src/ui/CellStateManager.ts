/**
 * CellStateManager for Hex-Do-Cube
 * Single source of truth for cell visual states (selection, hover, error highlighting).
 *
 * Responsibilities:
 * - Track which cell is currently selected
 * - Track which cell is currently hovered
 * - Coordinate visual state updates with CubeRenderer
 * - Provide clean API for state transitions
 *
 * This component centralizes all cell visual state management that was previously
 * scattered across InputController and CellEditor, ensuring consistent state
 * transitions and a single source of truth for cell highlighting.
 */

import type { Position } from '../models/Cell.js';
import type { CubeRenderer } from '../renderer/CubeRenderer.js';

/**
 * CellStateManager manages cell visual states and coordinates with CubeRenderer
 */
export class CellStateManager {
  private cubeRenderer: CubeRenderer;
  private selectedCell: Position | null = null;
  private hoveredCell: Position | null = null;

  constructor(cubeRenderer: CubeRenderer) {
    this.cubeRenderer = cubeRenderer;
  }

  /**
   * Select a cell, updating visual state
   * If another cell is selected, it will be deselected first
   * @param position - The position to select, or null to deselect
   */
  public selectCell(position: Position | null): void {
    // Clear previous selection
    if (this.selectedCell) {
      this.cubeRenderer.clearCellState(this.selectedCell);
    }

    // Set new selection
    this.selectedCell = position;

    if (position) {
      this.cubeRenderer.setCellState(position, 'selected');
    }
  }

  /**
   * Set hover state for a cell
   * @param position - The position to hover, or null to clear hover
   */
  public hoverCell(position: Position | null): void {
    // Clear previous hover
    if (this.hoveredCell) {
      this.cubeRenderer.clearCellState(this.hoveredCell);
    }

    // Set new hover
    this.hoveredCell = position;

    if (position) {
      this.cubeRenderer.setCellState(position, 'hover');
    }
  }

  /**
   * Set error state for a cell (generic error highlighting)
   * @param position - The position to mark as error
   */
  public setErrorState(position: Position): void {
    this.cubeRenderer.setCellState(position, 'error');
  }

  /**
   * Clear error state for a cell
   * @param position - The position to clear error state from
   */
  public clearErrorState(position: Position): void {
    this.cubeRenderer.clearCellState(position);
  }

  /**
   * Set conflict-given state for a cell (green highlight for given cells in conflict)
   * @param position - The position to mark with conflict-given state
   */
  public setConflictGivenState(position: Position): void {
    this.cubeRenderer.setCellState(position, 'conflict-given');
  }

  /**
   * Set wrong state for a cell (red highlight for wrong user-entered values)
   * @param position - The position to mark as wrong
   */
  public setWrongState(position: Position): void {
    this.cubeRenderer.setCellState(position, 'wrong');
  }

  /**
   * Get the currently selected cell
   * @returns The selected cell position, or null if no cell is selected
   */
  public getSelectedCell(): Position | null {
    return this.selectedCell;
  }

  /**
   * Get the currently hovered cell
   * @returns The hovered cell position, or null if no cell is hovered
   */
  public getHoveredCell(): Position | null {
    return this.hoveredCell;
  }

  /**
   * Clear all visual states (selection, hover, errors)
   * Resets all cells to normal state
   */
  public clearAllStates(): void {
    this.selectedCell = null;
    this.hoveredCell = null;
    this.cubeRenderer.clearAllStates();
  }

  /**
   * Clear only the current selection
   */
  public clearSelection(): void {
    this.selectCell(null);
  }

  /**
   * Clear only the current hover
   */
  public clearHover(): void {
    this.hoverCell(null);
  }
}
