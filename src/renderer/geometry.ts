/**
 * Geometry utilities for Hex-Do-Cube
 * Shared utilities for cube positioning, spacing, and centering calculations.
 *
 * These utilities ensure consistent positioning across all renderers
 * (CubeRenderer, ValueSpriteRenderer, MinimapRenderer, SubsquareSeparatorRenderer)
 * by centralizing the math for cube centering at world origin.
 */

/**
 * The standard cube size (16x16x16 cells)
 */
export const CUBE_SIZE = 16;

/**
 * Calculate the spacing between cell centers
 * @param cellSize - Size of each cell cube
 * @param cellGap - Gap between adjacent cells
 * @returns The spacing between cell centers
 */
export function calculateSpacing(cellSize: number, cellGap: number): number {
  return cellSize + cellGap;
}

/**
 * Calculate the offset needed to center the cube at world origin (0, 0, 0)
 *
 * CENTERING STRATEGY:
 * - Cube has numCells cells per dimension (indices 0 to numCells-1)
 * - Cell centers are positioned at i * spacing where i = 0..numCells-1
 * - With spacing = cellSize + cellGap, cells span from 0 to (numCells-1) * spacing
 * - The geometric center is halfway: ((numCells-1) * spacing) / 2
 * - We apply this offset so the cube's geometric center aligns with world origin (0,0,0)
 *
 * @param cellSize - Size of each cell cube
 * @param cellGap - Gap between adjacent cells
 * @param numCells - Number of cells per dimension (default: CUBE_SIZE = 16)
 * @returns The offset to subtract from each coordinate to center the cube
 */
export function calculateCenterOffset(
  cellSize: number,
  cellGap: number,
  numCells: number = CUBE_SIZE
): number {
  const spacing = calculateSpacing(cellSize, cellGap);
  const maxIndex = numCells - 1;
  return (maxIndex * spacing) / 2;
}

/**
 * Convert cell indices (i, j, k) to world coordinates (x, y, z)
 * The resulting coordinates are centered so the cube's geometric center is at (0, 0, 0)
 *
 * @param i - Cell index in i dimension (0-15 for standard cube)
 * @param j - Cell index in j dimension (0-15 for standard cube)
 * @param k - Cell index in k dimension (0-15 for standard cube)
 * @param cellSize - Size of each cell cube
 * @param cellGap - Gap between adjacent cells
 * @returns World coordinates { x, y, z }
 */
export function cellPositionToWorld(
  i: number,
  j: number,
  k: number,
  cellSize: number,
  cellGap: number
): { x: number; y: number; z: number } {
  const spacing = calculateSpacing(cellSize, cellGap);
  const offset = calculateCenterOffset(cellSize, cellGap);

  return {
    x: j * spacing - offset, // j maps to x (horizontal-right)
    y: i * spacing - offset, // i maps to y (vertical)
    z: k * spacing - offset, // k maps to z (depth)
  };
}
