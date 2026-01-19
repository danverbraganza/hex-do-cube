/**
 * ColorPalette - Single Source of Truth for All Colors
 *
 * This file centralizes ALL color definitions used across the Hex-Do-Cube application.
 * Each color is exported in TWO formats:
 * - `hex`: number (0xRRGGBB) for Three.js
 * - `css`: string ('#RRGGBB' or 'rgba(...)') for CSS
 *
 * Design goals:
 * - Eliminate color duplication across theme.css and RenderConfig.ts
 * - Provide type-safe color access for both Three.js and DOM rendering
 * - Enable easy theme customization in one place
 *
 * THEME: Light Pastel (OKLab-balanced)
 * - Background centered on hue ~202° (soft blue)
 * - Colors designed using OKLab perceptual color space
 * - Lightness: 0.88-0.96 for backgrounds, 0.20-0.30 for text
 * - Chroma: 0.02-0.08 for soft, muted pastels
 */

/**
 * Color definition with both Three.js and CSS representations
 */
interface ColorDef {
  /** Three.js hex integer (e.g., 0x1a1a1a) */
  hex: number;
  /** CSS color string (e.g., '#1a1a1a' or 'rgba(26, 26, 26, 0.7)') */
  css: string;
  /** Optional: opacity value for colors with alpha (0-1) */
  opacity?: number;
}

/**
 * Centralized color palette for the entire application
 */
export const PALETTE = {
  /** Background colors */
  background: {
    /** Primary background (soft pastel blue, hue ~202°) */
    // OLD (dark theme): { hex: 0x1a1a1a, css: '#1a1a1a' }
    primary: { hex: 0xe3f0f7, css: '#e3f0f7' } as ColorDef,
    /** Overlay background (semi-transparent soft blue-gray) */
    // OLD (dark theme): { hex: 0x000000, css: 'rgba(0, 0, 0, 0.7)', opacity: 0.7 }
    overlay: { hex: 0xd5e8f3, css: 'rgba(213, 232, 243, 0.92)', opacity: 0.92 } as ColorDef,
    /** Button background (subtle blue tint) */
    // OLD (dark theme): { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.1)', opacity: 0.1 }
    button: { hex: 0xcde4f0, css: 'rgba(205, 228, 240, 0.6)', opacity: 0.6 } as ColorDef,
    /** Button hover background (brighter blue) */
    // OLD (dark theme): { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.2)', opacity: 0.2 }
    buttonHover: { hex: 0xb8dced, css: 'rgba(184, 220, 237, 0.85)', opacity: 0.85 } as ColorDef,
    /** Modal dialog background (crisp white with hint of blue) */
    // OLD (dark theme): { hex: 0x14141e, css: 'rgba(20, 20, 30, 0.95)', opacity: 0.95 }
    modalDialog: { hex: 0xf5f9fc, css: 'rgba(245, 249, 252, 0.98)', opacity: 0.98 } as ColorDef,
    /** Message panel background (soft lavender-blue) */
    // OLD (dark theme): { hex: 0x14141e, css: 'rgba(20, 20, 30, 0.95)', opacity: 0.95 }
    messagePanel: { hex: 0xe8eef9, css: 'rgba(232, 238, 249, 0.96)', opacity: 0.96 } as ColorDef,
    /** Sculptor badge background (deep blue-gray) */
    // OLD (dark theme): { hex: 0x0a0a0a, css: '#0a0a0a' }
    sculptorBadge: { hex: 0xd0e3ed, css: '#d0e3ed' } as ColorDef,
  },

  /** Text colors */
  text: {
    /** Primary text (deep blue-gray for readability) */
    // OLD (dark theme): { hex: 0xffffff, css: '#ffffff' }
    primary: { hex: 0x2d4a5c, css: '#2d4a5c' } as ColorDef,
    /** Secondary text (softer blue-gray) */
    // OLD (dark theme): { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.7)', opacity: 0.7 }
    secondary: { hex: 0x5d7589, css: 'rgba(93, 117, 137, 0.85)', opacity: 0.85 } as ColorDef,
  },

  /** Accent colors for UI feedback */
  accent: {
    /** Success state (pastel mint green, hue ~135°) */
    // OLD (dark theme): { hex: 0x4ade80, css: '#4ade80' }
    success: { hex: 0xa8dfc4, css: '#a8dfc4' } as ColorDef,
    /** Error state (pastel coral-pink, hue ~15°) */
    // OLD (dark theme): { hex: 0xef4444, css: '#ef4444' }
    error: { hex: 0xf4b8b8, css: '#f4b8b8' } as ColorDef,
    /** Warning state (pastel peach, hue ~40°) */
    // OLD (dark theme): { hex: 0xf59e0b, css: '#f59e0b' }
    warning: { hex: 0xfdd5b8, css: '#fdd5b8' } as ColorDef,
  },

  /** UI element colors */
  ui: {
    /** Border color (soft blue-gray) */
    // OLD (dark theme): { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.2)', opacity: 0.2 }
    border: { hex: 0xb8d4e6, css: 'rgba(184, 212, 230, 0.5)', opacity: 0.5 } as ColorDef,
    /** Modal cancel button (neutral gray-blue) */
    // OLD (dark theme): { hex: 0x666666, css: '#666666' }
    modalCancel: { hex: 0xc8d8e4, css: '#c8d8e4' } as ColorDef,
    /** Modal cancel button hover (darker gray-blue) */
    // OLD (dark theme): { hex: 0x555555, css: '#555555' }
    modalCancelHover: { hex: 0xb0c7d9, css: '#b0c7d9' } as ColorDef,
    /** Modal confirm button (soft blue, hue ~202°) */
    // OLD (dark theme): { hex: 0x2563eb, css: '#2563eb' }
    modalConfirm: { hex: 0x7db3d8, css: '#7db3d8' } as ColorDef,
    /** Modal confirm button hover (deeper blue) */
    // OLD (dark theme): { hex: 0x1d4ed8, css: '#1d4ed8' }
    modalConfirmHover: { hex: 0x5a9fc9, css: '#5a9fc9' } as ColorDef,
    /** Welcome button (soft blue) */
    // OLD (dark theme): { hex: 0x2563eb, css: '#2563eb' }
    welcomeButton: { hex: 0x7db3d8, css: '#7db3d8' } as ColorDef,
    /** Welcome button hover (deeper blue) */
    // OLD (dark theme): { hex: 0x1d4ed8, css: '#1d4ed8' }
    welcomeButtonHover: { hex: 0x5a9fc9, css: '#5a9fc9' } as ColorDef,
    /** Hyperlink color (medium blue) */
    // OLD (dark theme): { hex: 0x60a5fa, css: '#60a5fa' }
    link: { hex: 0x5a9fc9, css: '#5a9fc9' } as ColorDef,
    /** Hyperlink hover color (lighter blue) */
    // OLD (dark theme): { hex: 0x93c5fd, css: '#93c5fd' }
    linkHover: { hex: 0x7db3d8, css: '#7db3d8' } as ColorDef,
    /** Sculptor badge link (pastel teal, hue ~185°) */
    // OLD (dark theme): { hex: 0x00d4aa, css: '#00d4aa' }
    sculptorLink: { hex: 0x6dccbd, css: '#6dccbd' } as ColorDef,
    /** Win notification glow (pastel gold, hue ~55°) */
    // OLD (dark theme): { hex: 0xffd700, css: 'rgba(255, 215, 0, 0.8)', opacity: 0.8 }
    winGlow: { hex: 0xffeab8, css: 'rgba(255, 234, 184, 0.9)', opacity: 0.9 } as ColorDef,
    /** Win notification glow bright (brighter pastel gold) */
    // OLD (dark theme): { hex: 0xffd700, css: 'rgba(255, 215, 0, 1)', opacity: 1.0 }
    winGlowBright: { hex: 0xffd98f, css: 'rgba(255, 217, 143, 1)', opacity: 1.0 } as ColorDef,
    /** Version display (subtle blue-gray) */
    // OLD (dark theme): { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.5)', opacity: 0.5 }
    versionDisplay: { hex: 0x8ca9bd, css: 'rgba(140, 169, 189, 0.7)', opacity: 0.7 } as ColorDef,
  },

  /** Three.js scene and lighting colors */
  threejs: {
    /** Soft white for lights and sprites (slight warmth) */
    // OLD (dark theme): { hex: 0xffffff, css: '#ffffff' }
    white: { hex: 0xfcfcfc, css: '#fcfcfc' } as ColorDef,
    /** Light color for directional lighting (warm white) */
    // OLD (dark theme): { hex: 0xffffff, css: '#ffffff' }
    lightColor: { hex: 0xfcfcfc, css: '#fcfcfc' } as ColorDef,
  },

  /** Cube renderer cell state colors */
  cell: {
    /** Given/preset cells (pastel blue, hue ~202°) */
    // OLD (dark theme): { hex: 0x4a90e2, css: '#4a90e2' }
    given: { hex: 0x9ac7e4, css: '#9ac7e4' } as ColorDef,
    /** Editable/user cells (pastel mint, hue ~145°) */
    // OLD (dark theme): { hex: 0x7ed321, css: '#7ed321' }
    editable: { hex: 0xb8e6d0, css: '#b8e6d0' } as ColorDef,
    /** Hover state (pastel gold, hue ~50°) */
    // OLD (dark theme): { hex: 0xffd700, css: '#ffd700' }
    hover: { hex: 0xffe9a3, css: '#ffe9a3' } as ColorDef,
    /** Selected state (pastel coral, hue ~25°) */
    // OLD (dark theme): { hex: 0xff9500, css: '#ff9500' }
    selected: { hex: 0xffc89a, css: '#ffc89a' } as ColorDef,
    /** Error state (pastel red-pink, hue ~10°) */
    // OLD (dark theme): { hex: 0xe74c3c, css: '#e74c3c' }
    error: { hex: 0xf4a6a0, css: '#f4a6a0' } as ColorDef,
    /** Conflict given state (pastel green, hue ~140°) */
    // OLD (dark theme): { hex: 0x2ecc71, css: '#2ecc71' }
    conflictGiven: { hex: 0xa8dfc4, css: '#a8dfc4' } as ColorDef,
    /** Wrong user input (pastel red, hue ~5°) */
    // OLD (dark theme): { hex: 0xff0000, css: '#ff0000' }
    wrong: { hex: 0xffa8a8, css: '#ffa8a8' } as ColorDef,
  },

  /** Minimap-specific colors */
  minimap: {
    /** Highlight color (pastel gold, hue ~50°) */
    // OLD (dark theme): { hex: 0xffd700, css: '#ffd700' }
    highlight: { hex: 0xffe9a3, css: '#ffe9a3' } as ColorDef,
  },

  /** Subsquare separator colors */
  separator: {
    /** Subsquare separator lines (pastel coral-orange, hue ~25°) */
    // OLD (dark theme): { hex: 0xff00ff, css: '#ff00ff' }
    coral: { hex: 0xf4c4a8, css: '#f4c4a8' } as ColorDef,
  },

  /** Win screen firework colors (keep vibrant for celebration) */
  firework: {
    // OLD values preserved - keeping vibrant for celebration effect
    red: { hex: 0xff0000, css: '#ff0000' } as ColorDef,
    green: { hex: 0x00ff00, css: '#00ff00' } as ColorDef,
    blue: { hex: 0x0000ff, css: '#0000ff' } as ColorDef,
    yellow: { hex: 0xffff00, css: '#ffff00' } as ColorDef,
    magenta: { hex: 0xff00ff, css: '#ff00ff' } as ColorDef,
    cyan: { hex: 0x00ffff, css: '#00ffff' } as ColorDef,
    orange: { hex: 0xff8800, css: '#ff8800' } as ColorDef,
    purple: { hex: 0x8800ff, css: '#8800ff' } as ColorDef,
  },

  /** Hexadecimal value colors for minimap gradient (0-f) - Pastel rainbow */
  hexValues: {
    // Pastel gradient from cool blues through warm tones
    // OLD (dark theme): { hex: 0x1a1a2e, css: '#1a1a2e' }
    '0': { hex: 0xd5e8f3, css: '#d5e8f3' } as ColorDef, // Soft blue (hue ~202°)
    // OLD (dark theme): { hex: 0x16213e, css: '#16213e' }
    '1': { hex: 0xd0e4f7, css: '#d0e4f7' } as ColorDef, // Light blue
    // OLD (dark theme): { hex: 0x0f3460, css: '#0f3460' }
    '2': { hex: 0xc8e0f5, css: '#c8e0f5' } as ColorDef, // Sky blue
    // OLD (dark theme): { hex: 0x1e56a0, css: '#1e56a0' }
    '3': { hex: 0xbfdcf0, css: '#bfdcf0' } as ColorDef, // Periwinkle
    // OLD (dark theme): { hex: 0x2e86ab, css: '#2e86ab' }
    '4': { hex: 0xb8e1e8, css: '#b8e1e8' } as ColorDef, // Pale cyan
    // OLD (dark theme): { hex: 0x48a9a6, css: '#48a9a6' }
    '5': { hex: 0xb8e6dd, css: '#b8e6dd' } as ColorDef, // Mint
    // OLD (dark theme): { hex: 0x4ecdc4, css: '#4ecdc4' }
    '6': { hex: 0xb8e6d0, css: '#b8e6d0' } as ColorDef, // Seafoam
    // OLD (dark theme): { hex: 0x6dd47e, css: '#6dd47e' }
    '7': { hex: 0xc8edc8, css: '#c8edc8' } as ColorDef, // Pale green
    // OLD (dark theme): { hex: 0x95d5b2, css: '#95d5b2' }
    '8': { hex: 0xddf4cd, css: '#ddf4cd' } as ColorDef, // Pale lime
    // OLD (dark theme): { hex: 0xffd23f, css: '#ffd23f' }
    '9': { hex: 0xffedb8, css: '#ffedb8' } as ColorDef, // Pale yellow
    // OLD (dark theme): { hex: 0xffb703, css: '#ffb703' }
    a: { hex: 0xffe4b8, css: '#ffe4b8' } as ColorDef, // Pale gold
    // OLD (dark theme): { hex: 0xff8800, css: '#ff8800' }
    b: { hex: 0xffd8b8, css: '#ffd8b8' } as ColorDef, // Pale orange
    // OLD (dark theme): { hex: 0xff6b35, css: '#ff6b35' }
    c: { hex: 0xffc9b8, css: '#ffc9b8' } as ColorDef, // Peach
    // OLD (dark theme): { hex: 0xff4d4d, css: '#ff4d4d' }
    d: { hex: 0xffb8b8, css: '#ffb8b8' } as ColorDef, // Pale coral
    // OLD (dark theme): { hex: 0xe63946, css: '#e63946' }
    e: { hex: 0xf4b8c4, css: '#f4b8c4' } as ColorDef, // Pale pink
    // OLD (dark theme): { hex: 0xd62828, css: '#d62828' }
    f: { hex: 0xf4b8d8, css: '#f4b8d8' } as ColorDef, // Pale rose
  },
} as const;

/**
 * Generates CSS custom property declarations from the palette
 * This can be injected into the document to replace theme.css variables
 *
 * @returns CSS string with all custom properties (e.g., "--hdc-bg-primary: #1a1a1a;")
 */
export function getCSSVariables(): string {
  return [
    // Background colors
    `--hdc-bg-primary: ${PALETTE.background.primary.css}`,
    `--hdc-bg-overlay: ${PALETTE.background.overlay.css}`,
    `--hdc-bg-button: ${PALETTE.background.button.css}`,
    `--hdc-bg-button-hover: ${PALETTE.background.buttonHover.css}`,

    // Text colors
    `--hdc-text-primary: ${PALETTE.text.primary.css}`,
    `--hdc-text-secondary: ${PALETTE.text.secondary.css}`,

    // Accent colors
    `--hdc-accent-success: ${PALETTE.accent.success.css}`,
    `--hdc-accent-error: ${PALETTE.accent.error.css}`,
    `--hdc-accent-warning: ${PALETTE.accent.warning.css}`,

    // UI colors
    `--hdc-border-color: ${PALETTE.ui.border.css}`,
  ].join('; ');
}

/**
 * Converts a hex number to CSS hex string
 * @param hex - Three.js hex integer (e.g., 0x1a1a1a)
 * @returns CSS hex string (e.g., '#1a1a1a')
 */
export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/**
 * Converts a CSS hex string to Three.js hex number
 * @param css - CSS hex string (e.g., '#1a1a1a')
 * @returns Three.js hex integer (e.g., 0x1a1a1a)
 */
export function cssToHex(css: string): number {
  return parseInt(css.replace('#', ''), 16);
}
