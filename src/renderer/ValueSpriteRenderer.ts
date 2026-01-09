/**
 * ValueSpriteRenderer for Hex-Do-Cube
 * Manages billboard sprite rendering for cell values that always face the camera.
 *
 * Responsibilities:
 * - Generate text textures for hex values (0-9, a-f)
 * - Create and manage Three.js Sprites for each cell with a value
 * - Position sprites at cell centers
 * - Ensure sprites always face camera (billboard behavior)
 * - Update sprite visibility and values based on cell state
 * - Coordinate with CubeRenderer for positioning
 *
 * PERFORMANCE NOTES:
 * - Generates 16 canvas textures once at initialization (one per hex value) ✓
 * - Reuses textures via SpriteMaterial.map for all sprites with same value ✓
 * - Canvas textures use power-of-2 dimensions (128x128) for GPU efficiency ✓
 * - Sprites have depthWrite: false to work correctly with translucent cells ✓
 * - Future optimization: Texture atlas could combine all 16 textures into one (P3 priority)
 */

import * as THREE from 'three';
import type { Cube } from '../models/Cube.js';
import type { Cell, HexValue, Position } from '../models/Cell.js';

/**
 * Configuration for ValueSpriteRenderer
 */
export interface ValueSpriteRendererConfig {
  /** Size of each sprite in 3D space */
  spriteSize?: number;
  /** Font size for text rendering */
  fontSize?: number;
  /** Font family for text rendering */
  fontFamily?: string;
  /** Text color */
  textColor?: string;
  /** Background color (null for transparent) */
  backgroundColor?: string | null;
  /** Size of each cell cube in 3D space (must match CubeRenderer) */
  cellSize?: number;
  /** Gap between adjacent cells (must match CubeRenderer) */
  cellGap?: number;
}

/**
 * Maps a cell position to its sprite
 */
type SpriteMeshMap = Map<string, THREE.Sprite>;

/**
 * ValueSpriteRenderer manages billboard sprites for cell values
 */
export class ValueSpriteRenderer {
  private cube: Cube;
  private config: Required<ValueSpriteRendererConfig>;

  // Sprite management
  private sprites: SpriteMeshMap = new Map();
  private textures: Map<HexValue, THREE.CanvasTexture> = new Map();

  // Container for all sprites
  private container: THREE.Group;

  constructor(cube: Cube, config: ValueSpriteRendererConfig = {}) {
    this.cube = cube;

    // Apply default configuration
    this.config = {
      spriteSize: config.spriteSize ?? 0.8,
      fontSize: config.fontSize ?? 64,
      fontFamily: config.fontFamily ?? 'Arial, sans-serif',
      textColor: config.textColor ?? '#ffffff',
      backgroundColor: config.backgroundColor ?? null,
      cellSize: config.cellSize ?? 1,
      cellGap: config.cellGap ?? 0.1,
    };

    // Create container group at world origin
    // The container itself stays at (0, 0, 0) - all child sprites are positioned
    // relative to this origin with the same offsets as CubeRenderer to match cell positions
    this.container = new THREE.Group();
    this.container.name = 'ValueSpriteRenderer';
    this.container.position.set(0, 0, 0); // Explicitly set to origin (redundant but clear)

    // Generate textures for all hex values
    this.generateTextures();

    // Initialize sprites for all cells with values
    this.initializeSprites();
  }

  /**
   * Generate canvas textures for all hex values (0-9, a-f)
   */
  private generateTextures(): void {
    const hexValues: Exclude<HexValue, null>[] = [
      '0', '1', '2', '3', '4', '5', '6', '7',
      '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'
    ];

    for (const value of hexValues) {
      const texture = this.createTextTexture(value);
      this.textures.set(value, texture);
    }
  }

  /**
   * Create a canvas texture for a single hex character
   */
  private createTextTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context for canvas');
    }

    // Set canvas size (power of 2 for best performance)
    canvas.width = 128;
    canvas.height = 128;

    // Configure text rendering
    context.font = `bold ${this.config.fontSize}px ${this.config.fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw background if specified
    if (this.config.backgroundColor) {
      context.fillStyle = this.config.backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw text
    context.fillStyle = this.config.textColor;
    context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Initialize sprites for all cells that have values
   *
   * CENTERING: Sprites use the same offset as CubeRenderer to ensure
   * they appear at the center of their respective cells, with the
   * entire cube centered at world origin (0,0,0).
   */
  private initializeSprites(): void {
    const spacing = this.config.cellSize + this.config.cellGap;

    // Calculate offset to center the cube at world origin (0, 0, 0)
    // Must match CubeRenderer.ts offset calculation
    const numCells = 16;
    const maxIndex = numCells - 1; // 15
    const offset = (maxIndex * spacing) / 2;

    for (let i = 0; i < numCells; i++) {
      for (let j = 0; j < numCells; j++) {
        for (let k = 0; k < numCells; k++) {
          const cell = this.cube.cells[i][j][k];

          if (cell.value !== null) {
            const sprite = this.createSprite(cell);

            // Position sprite at cell center with offset so cube center is at world origin
            sprite.position.set(
              j * spacing - offset,  // x: matches CubeRenderer
              i * spacing - offset,  // y: matches CubeRenderer
              k * spacing - offset   // z: matches CubeRenderer
            );

            // Store sprite reference
            const key = this.positionKey([i, j, k]);
            this.sprites.set(key, sprite);

            // Add to container
            this.container.add(sprite);
          }
        }
      }
    }
  }

  /**
   * Create a sprite for a single cell
   */
  private createSprite(cell: Cell): THREE.Sprite {
    const texture = this.textures.get(cell.value);
    if (!texture) {
      throw new Error(`No texture found for value: ${cell.value}`);
    }

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(this.config.spriteSize, this.config.spriteSize, 1);

    // Store cell reference in userData
    sprite.userData.position = cell.position;
    sprite.userData.value = cell.value;

    return sprite;
  }

  /**
   * Update a specific cell's sprite
   * Creates a new sprite if value changed from null, removes sprite if changed to null
   */
  public updateCell(position: Position): void {
    const key = this.positionKey(position);
    const [i, j, k] = position;
    const cell = this.cube.cells[i][j][k];
    const existingSprite = this.sprites.get(key);

    if (cell.value === null) {
      // Remove sprite if it exists
      if (existingSprite) {
        this.container.remove(existingSprite);
        existingSprite.material.dispose();
        this.sprites.delete(key);
      }
    } else {
      // Update or create sprite
      if (existingSprite) {
        // Update existing sprite with new texture
        const texture = this.textures.get(cell.value);
        if (texture) {
          existingSprite.material.map = texture;
          existingSprite.material.needsUpdate = true;
          existingSprite.userData.value = cell.value;
        }
      } else {
        // Create new sprite
        const sprite = this.createSprite(cell);

        // Position the sprite with offset to center cube at world origin
        const spacing = this.config.cellSize + this.config.cellGap;
        const numCells = 16;
        const maxIndex = numCells - 1; // 15
        const offset = (maxIndex * spacing) / 2;
        sprite.position.set(
          j * spacing - offset,
          i * spacing - offset,
          k * spacing - offset
        );

        this.sprites.set(key, sprite);
        this.container.add(sprite);
      }
    }
  }

  /**
   * Update all sprites (useful after bulk changes)
   */
  public updateAllSprites(): void {
    // Clear all existing sprites
    for (const sprite of this.sprites.values()) {
      this.container.remove(sprite);
      sprite.material.dispose();
    }
    this.sprites.clear();

    // Reinitialize all sprites
    this.initializeSprites();
  }

  /**
   * Show or hide a specific sprite
   */
  public setSpriteVisibility(position: Position, visible: boolean): void {
    const key = this.positionKey(position);
    const sprite = this.sprites.get(key);
    if (sprite) {
      sprite.visible = visible;
    }
  }

  /**
   * Show or hide all sprites
   */
  public setAllSpritesVisibility(visible: boolean): void {
    for (const sprite of this.sprites.values()) {
      sprite.visible = visible;
    }
  }

  /**
   * Set visible layer for face-on view
   * @param face - The face being viewed ('i', 'j', or 'k')
   * @param layer - The layer index to show (0-15), or null to show all layers
   *
   * Face meanings:
   * - 'i': XY plane at different Z depths, hide sprites where i !== layer
   * - 'j': XZ plane at different Y depths, hide sprites where j !== layer
   * - 'k': YZ plane at different X depths, hide sprites where k !== layer
   *
   * When layer is null, all layers are visible (3D view mode)
   */
  public setVisibleLayer(face: 'i' | 'j' | 'k' | null, layer: number | null): void {
    if (face === null || layer === null) {
      // Show all layers (3D view mode)
      this.setAllSpritesVisibility(true);
      return;
    }

    // Show only the specified layer
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          const position: Position = [i, j, k];
          let visible = false;

          switch (face) {
            case 'i': // XY plane, layer is i index
              visible = (i === layer);
              break;
            case 'j': // XZ plane, layer is j index
              visible = (j === layer);
              break;
            case 'k': // YZ plane, layer is k index
              visible = (k === layer);
              break;
          }

          this.setSpriteVisibility(position, visible);
        }
      }
    }
  }

  /**
   * Show or hide sprites based on a predicate function
   */
  public filterSprites(predicate: (cell: Cell) => boolean): void {
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          const cell = this.cube.cells[i][j][k];
          const visible = predicate(cell);
          this.setSpriteVisibility([i, j, k], visible);
        }
      }
    }
  }

  /**
   * Get the Three.js container group for this renderer
   */
  public getContainer(): THREE.Group {
    return this.container;
  }

  /**
   * Get a specific sprite by position
   */
  public getSprite(position: Position): THREE.Sprite | undefined {
    const key = this.positionKey(position);
    return this.sprites.get(key);
  }

  /**
   * Update the cube reference (e.g., when loading a new puzzle)
   */
  public setCube(cube: Cube): void {
    this.cube = cube;
    this.updateAllSprites();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose of textures
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.textures.clear();

    // Dispose of sprites and their materials
    for (const sprite of this.sprites.values()) {
      sprite.material.dispose();
    }

    // Clear sprites from container
    this.container.clear();
    this.sprites.clear();
  }

  /**
   * Generate a unique string key for a cell position
   */
  private positionKey(position: Position): string {
    return `${position[0]},${position[1]},${position[2]}`;
  }
}
