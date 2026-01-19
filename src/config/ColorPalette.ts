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
    /** Primary background (dark gray) */
    primary: { hex: 0x1a1a1a, css: '#1a1a1a' } as ColorDef,
    /** Overlay background (semi-transparent black) */
    overlay: { hex: 0x000000, css: 'rgba(0, 0, 0, 0.7)', opacity: 0.7 } as ColorDef,
    /** Button background (semi-transparent white) */
    button: { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.1)', opacity: 0.1 } as ColorDef,
    /** Button hover background */
    buttonHover: { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.2)', opacity: 0.2 } as ColorDef,
    /** Modal dialog background */
    modalDialog: { hex: 0x14141e, css: 'rgba(20, 20, 30, 0.95)', opacity: 0.95 } as ColorDef,
    /** Message panel background */
    messagePanel: { hex: 0x14141e, css: 'rgba(20, 20, 30, 0.95)', opacity: 0.95 } as ColorDef,
    /** Sculptor badge background */
    sculptorBadge: { hex: 0x0a0a0a, css: '#0a0a0a' } as ColorDef,
  },

  /** Text colors */
  text: {
    /** Primary text (white) */
    primary: { hex: 0xffffff, css: '#ffffff' } as ColorDef,
    /** Secondary text (semi-transparent white) */
    secondary: { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.7)', opacity: 0.7 } as ColorDef,
  },

  /** Accent colors for UI feedback */
  accent: {
    /** Success state (green) */
    success: { hex: 0x4ade80, css: '#4ade80' } as ColorDef,
    /** Error state (red) */
    error: { hex: 0xef4444, css: '#ef4444' } as ColorDef,
    /** Warning state (orange) */
    warning: { hex: 0xf59e0b, css: '#f59e0b' } as ColorDef,
  },

  /** UI element colors */
  ui: {
    /** Border color (semi-transparent white) */
    border: { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.2)', opacity: 0.2 } as ColorDef,
    /** Modal cancel button */
    modalCancel: { hex: 0x666666, css: '#666666' } as ColorDef,
    /** Modal cancel button hover */
    modalCancelHover: { hex: 0x555555, css: '#555555' } as ColorDef,
    /** Modal confirm button */
    modalConfirm: { hex: 0x2563eb, css: '#2563eb' } as ColorDef,
    /** Modal confirm button hover */
    modalConfirmHover: { hex: 0x1d4ed8, css: '#1d4ed8' } as ColorDef,
    /** Welcome button */
    welcomeButton: { hex: 0x2563eb, css: '#2563eb' } as ColorDef,
    /** Welcome button hover */
    welcomeButtonHover: { hex: 0x1d4ed8, css: '#1d4ed8' } as ColorDef,
    /** Hyperlink color */
    link: { hex: 0x60a5fa, css: '#60a5fa' } as ColorDef,
    /** Hyperlink hover color */
    linkHover: { hex: 0x93c5fd, css: '#93c5fd' } as ColorDef,
    /** Sculptor badge link */
    sculptorLink: { hex: 0x00d4aa, css: '#00d4aa' } as ColorDef,
    /** Win notification glow (gold) */
    winGlow: { hex: 0xffd700, css: 'rgba(255, 215, 0, 0.8)', opacity: 0.8 } as ColorDef,
    /** Win notification glow bright (gold) */
    winGlowBright: { hex: 0xffd700, css: 'rgba(255, 215, 0, 1)', opacity: 1.0 } as ColorDef,
    /** Version display (translucent white) */
    versionDisplay: { hex: 0xffffff, css: 'rgba(255, 255, 255, 0.5)', opacity: 0.5 } as ColorDef,
  },

  /** Three.js scene and lighting colors */
  threejs: {
    /** White color for lights and sprites */
    white: { hex: 0xffffff, css: '#ffffff' } as ColorDef,
    /** Light color for directional lighting */
    lightColor: { hex: 0xffffff, css: '#ffffff' } as ColorDef,
  },

  /** Cube renderer cell state colors */
  cell: {
    /** Given/preset cells (blue) */
    given: { hex: 0x4a90e2, css: '#4a90e2' } as ColorDef,
    /** Editable/user cells (green) */
    editable: { hex: 0x7ed321, css: '#7ed321' } as ColorDef,
    /** Hover state (gold) */
    hover: { hex: 0xffd700, css: '#ffd700' } as ColorDef,
    /** Selected state (orange) */
    selected: { hex: 0xff9500, css: '#ff9500' } as ColorDef,
    /** Error state (red) */
    error: { hex: 0xe74c3c, css: '#e74c3c' } as ColorDef,
    /** Conflict given state (green) */
    conflictGiven: { hex: 0x2ecc71, css: '#2ecc71' } as ColorDef,
    /** Wrong user input (red) */
    wrong: { hex: 0xff0000, css: '#ff0000' } as ColorDef,
  },

  /** Minimap-specific colors */
  minimap: {
    /** Highlight color (gold) */
    highlight: { hex: 0xffd700, css: '#ffd700' } as ColorDef,
  },

  /** Subsquare separator colors */
  separator: {
    /** Subsquare separator lines (magenta) */
    magenta: { hex: 0xff00ff, css: '#ff00ff' } as ColorDef,
  },

  /** Win screen firework colors */
  firework: {
    red: { hex: 0xff0000, css: '#ff0000' } as ColorDef,
    green: { hex: 0x00ff00, css: '#00ff00' } as ColorDef,
    blue: { hex: 0x0000ff, css: '#0000ff' } as ColorDef,
    yellow: { hex: 0xffff00, css: '#ffff00' } as ColorDef,
    magenta: { hex: 0xff00ff, css: '#ff00ff' } as ColorDef,
    cyan: { hex: 0x00ffff, css: '#00ffff' } as ColorDef,
    orange: { hex: 0xff8800, css: '#ff8800' } as ColorDef,
    purple: { hex: 0x8800ff, css: '#8800ff' } as ColorDef,
  },

  /** Hexadecimal value colors for minimap gradient (0-f) */
  hexValues: {
    '0': { hex: 0x1a1a2e, css: '#1a1a2e' } as ColorDef,
    '1': { hex: 0x16213e, css: '#16213e' } as ColorDef,
    '2': { hex: 0x0f3460, css: '#0f3460' } as ColorDef,
    '3': { hex: 0x1e56a0, css: '#1e56a0' } as ColorDef,
    '4': { hex: 0x2e86ab, css: '#2e86ab' } as ColorDef,
    '5': { hex: 0x48a9a6, css: '#48a9a6' } as ColorDef,
    '6': { hex: 0x4ecdc4, css: '#4ecdc4' } as ColorDef,
    '7': { hex: 0x6dd47e, css: '#6dd47e' } as ColorDef,
    '8': { hex: 0x95d5b2, css: '#95d5b2' } as ColorDef,
    '9': { hex: 0xffd23f, css: '#ffd23f' } as ColorDef,
    a: { hex: 0xffb703, css: '#ffb703' } as ColorDef,
    b: { hex: 0xff8800, css: '#ff8800' } as ColorDef,
    c: { hex: 0xff6b35, css: '#ff6b35' } as ColorDef,
    d: { hex: 0xff4d4d, css: '#ff4d4d' } as ColorDef,
    e: { hex: 0xe63946, css: '#e63946' } as ColorDef,
    f: { hex: 0xd62828, css: '#d62828' } as ColorDef,
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
