/**
 * InputController for Hex-Do-Cube
 * Handles mouse and keyboard input for navigation and cell editing.
 *
 * Responsibilities:
 * - Left-mouse drag or middle-mouse drag: Rotate cube in 3D view
 * - Left-mouse click: Select cell for editing (if not dragged)
 * - Double-click on face: Enter face-on view
 * - Mouse wheel in face-on view: Navigate layers
 * - Double-click on minimap: Return to 3D rotational view
 * - Keyboard input: Handle hex value input (0-9, a-f) for cell editing
 * - Track view mode (3D vs face-on)
 * - Manage cell selection state
 * - Update ALL renderers after cell edits (CubeRenderer and MinimapRenderer)
 *
 * Note: InputController owns the rendering updates for user-initiated cell edits.
 * CellEditor handles validation and error states but does NOT update renderers.
 */

import type { SceneManager } from '../renderer/SceneManager.js';
import type { CubeRenderer } from '../renderer/CubeRenderer.js';
import type { FaceRenderer } from '../renderer/FaceRenderer.js';
import type { MinimapRenderer } from '../renderer/MinimapRenderer.js';
import type { Cube } from '../models/Cube.js';
import type { Position, HexValue } from '../models/Cell.js';
import { isValidHexValue, isCellEditable, setCellValue } from '../models/Cell.js';

/**
 * View mode enum
 */
export type ViewMode = '3d-rotational' | 'face-on';

/**
 * Configuration for InputController
 */
export interface InputControllerConfig {
  /** Canvas element to attach event listeners to */
  canvas: HTMLCanvasElement;
  /** Sensitivity for camera rotation (radians per pixel) */
  rotationSensitivity?: number;
  /** Double-click time threshold in milliseconds */
  doubleClickThreshold?: number;
}

/**
 * Callback for when a cell value changes
 */
export type CellValueChangeCallback = (position: Position, value: HexValue) => void;

/**
 * Callback for when view mode changes
 */
export type ViewModeChangeCallback = (mode: ViewMode) => void;

/**
 * InputController manages all user input for the game
 */
export class InputController {
  private config: Required<InputControllerConfig>;
  private canvas: HTMLCanvasElement;

  // Renderer references
  private sceneManager: SceneManager;
  private cubeRenderer: CubeRenderer;
  private faceRenderer: FaceRenderer;
  private minimapRenderer: MinimapRenderer;
  private cube: Cube;

  // Cell state manager for visual state coordination
  private cellStateManager: import('./CellStateManager.js').CellStateManager;

  // View state manager (optional, for coordinated view transitions)
  private viewStateManager: import('./ViewStateManager.js').ViewStateManager | null = null; // Used conditionally in enterFaceOnView and exitFaceOnView

  // Message panel (optional, for logging and debugging)
  private messagePanel: import('./MessagePanel.js').MessagePanel | null = null;

  // Disposal flag to prevent operations after dispose()
  private isDisposed: boolean = false;

  // Mouse state for drag rotation (left or middle button)
  private isMiddleMouseDown: boolean = false;
  private isLeftMouseDown: boolean = false;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragThreshold: number = 5; // pixels to move before it's considered a drag

  // Double-click detection
  private lastClickTime: number = 0;
  private lastClickPosition: { x: number; y: number } | null = null;

  // Callbacks
  private cellValueChangeCallbacks: CellValueChangeCallback[] = [];
  private viewModeChangeCallbacks: ViewModeChangeCallback[] = [];

  // Bound event handlers (for cleanup)
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleMouseLeave: (e: MouseEvent) => void;
  private boundHandleWheel: (e: WheelEvent) => void;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleContextMenu: (e: MouseEvent) => void;

  constructor(
    config: InputControllerConfig,
    sceneManager: SceneManager,
    cubeRenderer: CubeRenderer,
    faceRenderer: FaceRenderer,
    minimapRenderer: MinimapRenderer,
    cube: Cube,
    cellStateManager: import('./CellStateManager.js').CellStateManager
  ) {
    this.canvas = config.canvas;
    this.sceneManager = sceneManager;
    this.cubeRenderer = cubeRenderer;
    this.faceRenderer = faceRenderer;
    this.minimapRenderer = minimapRenderer;
    this.cube = cube;
    this.cellStateManager = cellStateManager;

    // Apply default configuration
    this.config = {
      canvas: config.canvas,
      rotationSensitivity: config.rotationSensitivity ?? 0.005,
      doubleClickThreshold: config.doubleClickThreshold ?? 300,
    };

    // Bind event handlers
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleContextMenu = this.handleContextMenu.bind(this);

    // Register event listeners
    this.registerEventListeners();
  }

  /**
   * Register all event listeners
   */
  private registerEventListeners(): void {
    // Mouse events on canvas
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandleMouseLeave);
    this.canvas.addEventListener('wheel', this.boundHandleWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.boundHandleContextMenu);

    // Keyboard events on document (for global capture)
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Remove all event listeners
   */
  private unregisterEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandleMouseLeave);
    this.canvas.removeEventListener('wheel', this.boundHandleWheel);
    this.canvas.removeEventListener('contextmenu', this.boundHandleContextMenu);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    // Middle mouse button (button 1)
    if (event.button === 1) {
      event.preventDefault();
      this.isMiddleMouseDown = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      return;
    }

    // Left mouse button (button 0)
    if (event.button === 0) {
      this.isLeftMouseDown = true;
      this.isDragging = false;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      // Don't prevent default yet - wait to see if it's a click or drag
    }
  }

  /**
   * Handle left mouse click (with double-click detection)
   */
  private handleLeftClick(event: MouseEvent): void {
    const currentTime = Date.now();
    const currentPosition = { x: event.clientX, y: event.clientY };

    // Check if this is a double-click
    const isDoubleClick =
      this.lastClickPosition &&
      Math.abs(currentPosition.x - this.lastClickPosition.x) < 5 &&
      Math.abs(currentPosition.y - this.lastClickPosition.y) < 5 &&
      currentTime - this.lastClickTime < this.config.doubleClickThreshold;

    if (isDoubleClick) {
      this.handleDoubleClick(event);
      // Reset double-click detection
      this.lastClickTime = 0;
      this.lastClickPosition = null;
    } else {
      // Single click - handle cell selection
      this.handleSingleClick(event);
      // Update double-click detection state
      this.lastClickTime = currentTime;
      this.lastClickPosition = currentPosition;
    }
  }

  /**
   * Safely pick a cell at the given coordinates with error handling
   * Returns null if controller is disposed, if picking fails, or if no cell is picked
   */
  private safePick(x: number, y: number): Position | null {
    // Prevent operations after disposal
    if (this.isDisposed) {
      return null;
    }

    try {
      // Convert to normalized device coordinates
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (x / rect.width) * 2 - 1;
      const mouseY = -(y / rect.height) * 2 + 1;

      // Pick cell at mouse position
      const camera = this.sceneManager.getCamera();
      return this.cubeRenderer.pickCell(camera, mouseX, mouseY);
    } catch (error) {
      console.warn('Cell picking failed:', error);
      return null;
    }
  }

  /**
   * Handle single click (cell selection)
   */
  private handleSingleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is in minimap (clicks in minimap don't select cells)
    if (this.minimapRenderer.isPointInMinimap(x, y, rect.width, rect.height)) {
      return;
    }

    // Pick cell at mouse position with error handling
    const pickedPosition = this.safePick(x, y);

    if (pickedPosition) {
      this.selectCell(pickedPosition);
    } else {
      this.deselectCell();
    }
  }

  /**
   * Handle double-click (view transitions)
   */
  private handleDoubleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if double-click is in minimap
    if (this.minimapRenderer.isPointInMinimap(x, y, rect.width, rect.height)) {
      // Return to 3D rotational view
      const currentMode = this.viewStateManager?.getViewMode() ?? '3d-rotational';
      if (currentMode === 'face-on') {
        this.exitFaceOnView();
      }
      return;
    }

    // Double-click on face in 3D view - enter face-on view
    const currentMode = this.viewStateManager?.getViewMode() ?? '3d-rotational';
    if (currentMode === '3d-rotational') {
      // Pick cell with error handling
      const pickedPosition = this.safePick(x, y);

      if (pickedPosition) {
        // Determine which face to enter based on picked cell
        // For MVP, we'll use a simple heuristic: enter the face perpendicular to the axis
        // where the picked cell is closest to an edge
        const [i, j, k] = pickedPosition;

        // Find which coordinate is closest to edge (0 or 15)
        const iDist = Math.min(i, 15 - i);
        const jDist = Math.min(j, 15 - j);
        const kDist = Math.min(k, 15 - k);

        let face: 'i' | 'j' | 'k';
        let layer: number;

        if (iDist <= jDist && iDist <= kDist) {
          face = 'i';
          layer = i;
        } else if (jDist <= kDist) {
          face = 'j';
          layer = j;
        } else {
          face = 'k';
          layer = k;
        }

        this.enterFaceOnView(face, layer);
      }
    }
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    const currentMode = this.viewStateManager?.getViewMode() ?? '3d-rotational';

    // Check if left mouse is down and might be dragging
    if (this.isLeftMouseDown && !this.isDragging && currentMode === '3d-rotational') {
      const deltaX = Math.abs(event.clientX - this.lastMouseX);
      const deltaY = Math.abs(event.clientY - this.lastMouseY);

      // If mouse moved beyond threshold, it's a drag not a click
      if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
        this.isDragging = true;
      }
    }

    // Left or middle mouse drag - rotate camera in 3D view
    const isRotating = (this.isMiddleMouseDown || (this.isLeftMouseDown && this.isDragging))
                       && currentMode === '3d-rotational';

    if (isRotating) {
      event.preventDefault();

      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;

      // Convert pixel deltas to rotation angles
      // Note: Negate deltaX and deltaY to correct inverted rotation
      // Dragging left should rotate left (negative), not right
      // Dragging up should rotate up (negative), not down
      const deltaAzimuth = -deltaX * this.config.rotationSensitivity;
      const deltaPolar = -deltaY * this.config.rotationSensitivity;

      // Apply rotation
      this.sceneManager.rotateCamera(deltaAzimuth, deltaPolar);

      // Update last mouse position
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    // Middle mouse button release
    if (event.button === 1) {
      this.isMiddleMouseDown = false;
    }

    // Left mouse button release
    if (event.button === 0) {
      // Only process as click if it wasn't a drag
      if (this.isLeftMouseDown && !this.isDragging) {
        this.handleLeftClick(event);
      }
      this.isLeftMouseDown = false;
      this.isDragging = false;
    }
  }

  /**
   * Handle mouse leaving the canvas (cancel any drag operation)
   */
  private handleMouseLeave(_event: MouseEvent): void {
    this.isMiddleMouseDown = false;
    this.isLeftMouseDown = false;
    this.isDragging = false;
  }

  /**
   * Handle mouse wheel events (layer navigation in face-on view)
   */
  private handleWheel(event: WheelEvent): void {
    const currentMode = this.viewStateManager?.getViewMode() ?? '3d-rotational';

    // Add logging for debugging
    if (this.messagePanel) {
      this.messagePanel.log(
        `Wheel event: deltaY=${event.deltaY}, viewMode=${currentMode}, faceRendererActive=${this.faceRenderer.isActiveView()}`
      );
    }

    // Only handle wheel in face-on view
    if (currentMode === 'face-on') {
      event.preventDefault();
      this.faceRenderer.handleWheelScroll(event.deltaY);
    }
  }

  /**
   * Handle keyboard events (hex value input)
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Only handle keyboard input if a cell is selected
    const selectedCell = this.cellStateManager.getSelectedCell();
    if (!selectedCell) {
      return;
    }

    const key = event.key.toLowerCase();

    // Check if it's a valid hex value (0-9, a-f)
    if (isValidHexValue(key)) {
      event.preventDefault();
      this.inputHexValue(key as Exclude<HexValue, null>);
    }
    // Backspace or Delete - clear cell
    else if (key === 'backspace' || key === 'delete') {
      event.preventDefault();
      this.clearSelectedCell();
    }
    // Escape - deselect cell
    else if (key === 'escape') {
      event.preventDefault();
      this.deselectCell();
    }
  }

  /**
   * Handle context menu (prevent default for middle mouse)
   */
  private handleContextMenu(event: MouseEvent): void {
    // Prevent context menu on middle mouse button
    if (this.isMiddleMouseDown) {
      event.preventDefault();
    }
  }

  /**
   * Update cell appearance in all renderers
   *
   * This is the single source of truth for renderer updates after user cell edits.
   * Ensures consistent cell updates across both CubeRenderer and MinimapRenderer.
   *
   * Responsibility: InputController owns all renderer updates for user-initiated edits.
   * CellEditor focuses on validation and does NOT update renderers directly.
   */
  private updateCellRenderers(position: Position): void {
    this.cubeRenderer.updateCell(position);
    this.minimapRenderer.updateCell(position);
  }

  /**
   * Input a hex value into the selected cell
   */
  private inputHexValue(value: Exclude<HexValue, null>): void {
    const selectedCell = this.cellStateManager.getSelectedCell();
    if (!selectedCell) {
      return;
    }

    const [i, j, k] = selectedCell;
    const cell = this.cube.cells[i][j][k];

    // Only allow editing of editable cells
    if (!isCellEditable(cell)) {
      return;
    }

    // Set the cell value
    setCellValue(cell, value);

    // Update renderer
    this.updateCellRenderers(selectedCell);

    // Notify listeners
    this.notifyCellValueChange(selectedCell, value);
  }

  /**
   * Clear the selected cell's value
   */
  private clearSelectedCell(): void {
    const selectedCell = this.cellStateManager.getSelectedCell();
    if (!selectedCell) {
      return;
    }

    const [i, j, k] = selectedCell;
    const cell = this.cube.cells[i][j][k];

    // Only allow editing of editable cells
    if (!isCellEditable(cell)) {
      return;
    }

    // Clear the cell value
    setCellValue(cell, null);

    // Update renderer
    this.updateCellRenderers(selectedCell);

    // Notify listeners
    this.notifyCellValueChange(selectedCell, null);
  }

  /**
   * Select a cell
   */
  private selectCell(position: Position): void {
    this.cellStateManager.selectCell(position);
  }

  /**
   * Deselect the currently selected cell
   */
  private deselectCell(): void {
    this.cellStateManager.clearSelection();
  }

  /**
   * Ensures ViewStateManager is set, throws descriptive error if not.
   * Call this before using viewStateManager to get clear error messages.
   */
  private requireViewStateManager(): import('./ViewStateManager.js').ViewStateManager {
    if (!this.viewStateManager) {
      throw new Error('InputController: ViewStateManager required but not set. Call setViewStateManager() before entering face-on view.');
    }
    return this.viewStateManager;
  }

  /**
   * Enter face-on view for a specific face
   * Requires ViewStateManager to be set for proper coordination of all components
   */
  private enterFaceOnView(face: 'i' | 'j' | 'k', layer?: number): void {
    // Verify ViewStateManager is available - required for correct coordinated transitions
    const manager = this.requireViewStateManager();

    manager.enterFaceOnView(face, layer);
    this.deselectCell(); // Clear selection when entering face-on view
    this.notifyViewModeChange('face-on'); // Notify callbacks
  }

  /**
   * Exit face-on view and return to 3D rotational view
   * Requires ViewStateManager to be set for proper coordination of all components
   */
  private exitFaceOnView(): void {
    // Verify ViewStateManager is available - required for correct coordinated transitions
    const manager = this.requireViewStateManager();

    manager.exitFaceOnView();
    this.deselectCell(); // Clear selection when exiting face-on view
    this.notifyViewModeChange('3d-rotational'); // Notify callbacks
  }

  /**
   * Programmatically return to 3D rotational view (public API for UI controls)
   * This is the same as double-clicking the minimap or pressing the Home button
   */
  public returnTo3DView(): void {
    const currentMode = this.viewStateManager?.getViewMode() ?? '3d-rotational';
    if (currentMode === 'face-on') {
      this.exitFaceOnView();
    }
  }

  /**
   * Get the current view mode
   */
  public getViewMode(): ViewMode {
    return this.viewStateManager?.getViewMode() ?? '3d-rotational';
  }

  /**
   * Get the currently selected cell
   */
  public getSelectedCell(): Position | null {
    return this.cellStateManager.getSelectedCell();
  }

  /**
   * Register a callback for cell value changes
   */
  public onCellValueChange(callback: CellValueChangeCallback): void {
    this.cellValueChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for view mode changes
   */
  public onViewModeChange(callback: ViewModeChangeCallback): void {
    this.viewModeChangeCallbacks.push(callback);
  }

  /**
   * Notify all listeners of a cell value change
   */
  private notifyCellValueChange(position: Position, value: HexValue): void {
    for (const callback of [...this.cellValueChangeCallbacks]) {
      callback(position, value);
    }
  }

  /**
   * Notify all listeners of a view mode change
   */
  private notifyViewModeChange(mode: ViewMode): void {
    for (const callback of [...this.viewModeChangeCallbacks]) {
      callback(mode);
    }
  }

  /**
   * Update cube reference (when loading a new puzzle)
   */
  public setCube(cube: Cube): void {
    this.cube = cube;
    this.deselectCell();
  }

  /**
   * Set the ViewStateManager for coordinated view transitions
   * This should be called after construction to enable proper face-on view handling
   */
  public setViewStateManager(viewStateManager: import('./ViewStateManager.js').ViewStateManager): void {
    this.viewStateManager = viewStateManager;
  }

  /**
   * Set the MessagePanel for logging and debugging
   * This should be called after construction to enable event logging
   */
  public setMessagePanel(messagePanel: import('./MessagePanel.js').MessagePanel): void {
    this.messagePanel = messagePanel;
  }

  /**
   * Clean up resources and remove event listeners
   */
  public dispose(): void {
    this.isDisposed = true;
    this.unregisterEventListeners();
    this.deselectCell();
    this.cellValueChangeCallbacks = [];
    this.viewModeChangeCallbacks = [];
  }
}
