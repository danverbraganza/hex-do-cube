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
    /** Primary colour (soft pastel blue, hue ~202°) */
    primary: { hex: 0x00204, css: "#000204" } as ColorDef,
    /** Overlay background (semi-transparent soft blue-gray) */
    overlay: {
      hex: 0x06141c,
      css: "rgba(6, 20, 28, 0.92)",
      opacity: 0.92,
    } as ColorDef,
    /** Button background (subtle blue tint) */
    button: {
      hex: 0xcde4f0,
      css: "rgba(205, 228, 240, 0.6)",
      opacity: 0.6,
    } as ColorDef,
    /** Button hover background (brighter blue) */
    buttonHover: {
      hex: 0xb8dced,
      css: "rgba(184, 220, 237, 0.85)",
      opacity: 0.85,
    } as ColorDef,
    /** Modal dialog background (crisp white with hint of blue) */
    modalDialog: {
      hex: 0xf5f9fc,
      css: "rgba(245, 249, 252, 0.98)",
      opacity: 0.98,
    } as ColorDef,
    /** Message panel background (soft lavender-blue) */
    messagePanel: {
      hex: 0xe8eef9,
      css: "rgba(232, 238, 249, 0.96)",
      opacity: 0.96,
    } as ColorDef,
    /** Sculptor badge background (deep blue-gray) */
    sculptorBadge: { hex: 0xd0e3ed, css: "#d0e3ed" } as ColorDef,
  },

  /** Text colors */
  text: {
    /** Primary text (deep blue-gray for readability) */
    primary: { hex: 0x2d4a5c, css: "#2d4a5c" } as ColorDef,
    /** Secondary text (softer blue-gray) */
    secondary: {
      hex: 0x5d7589,
      css: "rgba(93, 117, 137, 0.85)",
      opacity: 0.85,
    } as ColorDef,
  },

  /** Accent colors for UI feedback */
  accent: {
    /** Success state (pastel mint green, hue ~135°) */
    success: { hex: 0xa8dfc4, css: "#a8dfc4" } as ColorDef,
    /** Error state (pastel coral-pink, hue ~15°) */
    error: { hex: 0xf4b8b8, css: "#f4b8b8" } as ColorDef,
    /** Warning state (pastel peach, hue ~40°) */
    warning: { hex: 0xfdd5b8, css: "#fdd5b8" } as ColorDef,
  },

  /** UI element colors */
  ui: {
    /** Border color (soft blue-gray) */
    border: {
      hex: 0xb8d4e6,
      css: "rgba(184, 212, 230, 0.5)",
      opacity: 0.5,
    } as ColorDef,
    /** Modal cancel button (neutral gray-blue) */
    modalCancel: { hex: 0xc8d8e4, css: "#c8d8e4" } as ColorDef,
    /** Modal cancel button hover (darker gray-blue) */
    modalCancelHover: { hex: 0xb0c7d9, css: "#b0c7d9" } as ColorDef,
    /** Modal confirm button (soft blue, hue ~202°) */
    modalConfirm: { hex: 0x7db3d8, css: "#7db3d8" } as ColorDef,
    /** Modal confirm button hover (deeper blue) */
    modalConfirmHover: { hex: 0x5a9fc9, css: "#5a9fc9" } as ColorDef,
    /** Welcome button (soft blue) */
    welcomeButton: { hex: 0x7db3d8, css: "#7db3d8" } as ColorDef,
    /** Welcome button hover (deeper blue) */
    welcomeButtonHover: { hex: 0x5a9fc9, css: "#5a9fc9" } as ColorDef,
    /** Hyperlink color (medium blue) */
    link: { hex: 0x5a9fc9, css: "#5a9fc9" } as ColorDef,
    /** Hyperlink hover color (lighter blue) */
    linkHover: { hex: 0x7db3d8, css: "#7db3d8" } as ColorDef,
    /** Sculptor badge link (pastel teal, hue ~185°) */
    sculptorLink: { hex: 0x6dccbd, css: "#6dccbd" } as ColorDef,
    /** Win notification glow (pastel gold, hue ~55°) */
    winGlow: {
      hex: 0xffeab8,
      css: "rgba(255, 234, 184, 0.9)",
      opacity: 0.9,
    } as ColorDef,
    /** Win notification glow bright (brighter pastel gold) */
    winGlowBright: {
      hex: 0xffd98f,
      css: "rgba(255, 217, 143, 1)",
      opacity: 1.0,
    } as ColorDef,
    /** Version display (subtle blue-gray) */
    versionDisplay: {
      hex: 0x8ca9bd,
      css: "rgba(140, 169, 189, 0.7)",
      opacity: 0.7,
    } as ColorDef,
  },

  /** Three.js scene and lighting colors */
  threejs: {
    /** Soft white for lights and sprites (slight warmth) */
    white: { hex: 0xfcfcfc, css: "#fcfcfc" } as ColorDef,
    /** Light color for directional lighting (warm white) */
    lightColor: { hex: 0xfcfcfc, css: "#fcfcfc" } as ColorDef,
  },

  /** Cube renderer cell state colors */
  cell: {
    /** Given/preset cells (pastel blue, hue ~202°) */
    given: { hex: 0x9ac7e4, css: "#9ac7e4" } as ColorDef,
    /** Editable/user cells (pastel mint, hue ~145°) */
    editable: { hex: 0xb8e6d0, css: "#b8e6d0" } as ColorDef,
    /** Hover state (pastel gold, hue ~50°) */
    hover: { hex: 0xffe9a3, css: "#ffe9a3" } as ColorDef,
    /** Selected state (pastel coral, hue ~25°) */
    selected: { hex: 0xffc89a, css: "#ffc89a" } as ColorDef,
    /** Error state (pastel red-pink, hue ~10°) */
    error: { hex: 0xf4a6a0, css: "#f4a6a0" } as ColorDef,
    /** Conflict given state (pastel green, hue ~140°) */
    conflictGiven: { hex: 0xa8dfc4, css: "#a8dfc4" } as ColorDef,
    /** Wrong user input (pastel red, hue ~5°) */
    wrong: { hex: 0xffa8a8, css: "#ffa8a8" } as ColorDef,
  },

  /** Minimap-specific colors */
  minimap: {
    /** Highlight color (pastel gold, hue ~50°) */
    highlight: { hex: 0xffe9a3, css: "#ffe9a3" } as ColorDef,
  },

  /** Subsquare separator colors */
  separator: {
    /** Subsquare separator lines (pastel coral-orange, hue ~25°) */
    coral: { hex: 0xf4c4a8, css: "#f4c4a8" } as ColorDef,
  },

  /** Win screen firework colors (vibrant for celebration) */
  firework: {
    red: { hex: 0xff0000, css: "#ff0000" } as ColorDef,
    green: { hex: 0x00ff00, css: "#00ff00" } as ColorDef,
    blue: { hex: 0x0000ff, css: "#0000ff" } as ColorDef,
    yellow: { hex: 0xffff00, css: "#ffff00" } as ColorDef,
    magenta: { hex: 0xff00ff, css: "#ff00ff" } as ColorDef,
    cyan: { hex: 0x00ffff, css: "#00ffff" } as ColorDef,
    orange: { hex: 0xff8800, css: "#ff8800" } as ColorDef,
    purple: { hex: 0x8800ff, css: "#8800ff" } as ColorDef,
  },

  /** Hexadecimal value colors for minimap gradient (0-f) - Pastel rainbow */
  hexValues: {
    "0": { hex: 0xd5e8f3, css: "#d5e8f3" } as ColorDef, // Soft blue (hue ~202°)
    "1": { hex: 0xd0e4f7, css: "#d0e4f7" } as ColorDef, // Light blue
    "2": { hex: 0xc8e0f5, css: "#c8e0f5" } as ColorDef, // Sky blue
    "3": { hex: 0xbfdcf0, css: "#bfdcf0" } as ColorDef, // Periwinkle
    "4": { hex: 0xb8e1e8, css: "#b8e1e8" } as ColorDef, // Pale cyan
    "5": { hex: 0xb8e6dd, css: "#b8e6dd" } as ColorDef, // Mint
    "6": { hex: 0xb8e6d0, css: "#b8e6d0" } as ColorDef, // Seafoam
    "7": { hex: 0xc8edc8, css: "#c8edc8" } as ColorDef, // Pale green
    "8": { hex: 0xddf4cd, css: "#ddf4cd" } as ColorDef, // Pale lime
    "9": { hex: 0xffedb8, css: "#ffedb8" } as ColorDef, // Pale yellow
    a: { hex: 0xffe4b8, css: "#ffe4b8" } as ColorDef, // Pale gold
    b: { hex: 0xffd8b8, css: "#ffd8b8" } as ColorDef, // Pale orange
    c: { hex: 0xffc9b8, css: "#ffc9b8" } as ColorDef, // Peach
    d: { hex: 0xffb8b8, css: "#ffb8b8" } as ColorDef, // Pale coral
    e: { hex: 0xf4b8c4, css: "#f4b8c4" } as ColorDef, // Pale pink
    f: { hex: 0xf4b8d8, css: "#f4b8d8" } as ColorDef, // Pale rose
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
  ].join("; ");
}

/**
 * Converts a hex number to CSS hex string
 * @param hex - Three.js hex integer (e.g., 0x1a1a1a)
 * @returns CSS hex string (e.g., '#1a1a1a')
 */
export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

/**
 * Converts a CSS hex string to Three.js hex number
 * @param css - CSS hex string (e.g., '#1a1a1a')
 * @returns Three.js hex integer (e.g., 0x1a1a1a)
 */
export function cssToHex(css: string): number {
  return parseInt(css.replace("#", ""), 16);
}
