/**
 * Centralized rendering configuration for Hex-Do-Cube
 *
 * This file contains SHARED rendering constants that are intentionally the same
 * across multiple renderers. Renderer-specific values (like minimap cellSize or
 * cameraDistance) are kept in their respective renderer files.
 *
 * SHARED VALUES (defined here):
 * - COLORS.BACKGROUND: Scene background color
 * - LIGHTING: Ambient and directional light intensities
 * - OPACITY.FILLED: Opacity for filled cells
 *
 * INTENTIONALLY DIFFERENT (kept in renderer files):
 * - cellSize: Main=1.0, Minimap=0.8 (minimap is smaller)
 * - cellGap: Main=0.1, Minimap=0.05 (minimap is more compact)
 * - cameraDistance: Main=37.5, Minimap=30 (different viewport sizes)
 * - emptyOpacity: CubeRenderer=0.05, Minimap=0.1 (visibility needs differ)
 */

/**
 * Shared color constants
 */
export const COLORS = {
  /** Background color for scenes (dark gray) */
  BACKGROUND: 0x1a1a1a,
  /** White color for empty cells and sprites */
  WHITE: 0xffffff,
} as const;

/**
 * Shared lighting configuration
 */
export const LIGHTING = {
  /** Ambient light intensity (0-1) */
  AMBIENT_INTENSITY: 0.6,
  /** Directional light intensity (0-1) */
  DIRECTIONAL_INTENSITY: 0.8,
  /** Directional light color */
  LIGHT_COLOR: 0xffffff,
} as const;

/**
 * Shared opacity values
 */
export const OPACITY = {
  /** Opacity for filled cells (translucent) */
  FILLED: 0.6,
} as const;
