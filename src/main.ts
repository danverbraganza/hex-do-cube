/**
 * Entry point for Hex-Do-Cube
 * Wires up all models, services, renderers, and UI components
 */

// Models
import { createGameStateFromCube } from './models/GameState.js';
import { createCube } from './models/Cube.js';
import { createCell } from './models/Cell.js';
import type { HexValue, CellType } from './models/Cell.js';

// Services
import { loadGameState, saveGameState, hasGameState } from './services/storage.js';
import { generatePuzzle } from './services/generator.js';

// Data
import cachedPuzzleData from './data/cached-puzzle.json';

// Renderers
import { SceneManager } from './renderer/SceneManager.js';
import { CubeRenderer } from './renderer/CubeRenderer.js';
import { FaceRenderer } from './renderer/FaceRenderer.js';
import { MinimapRenderer } from './renderer/MinimapRenderer.js';

// UI
import { InputController } from './ui/InputController.js';
import { CellEditor } from './ui/CellEditor.js';
import { GameUI } from './ui/GameUI.js';
import { ViewStateManager } from './ui/ViewStateManager.js';

console.log('Hex-Do-Cube initialized');

/**
 * Cached puzzle format (matches generate-puzzle.ts output)
 */
interface CachedPuzzle {
  version: number;
  difficulty: 'easy';
  generatedAt: string;
  cells: Array<{
    position: [number, number, number];
    value: HexValue;
    type: CellType;
  }>;
  givenCellCount: number;
  emptyCellCount: number;
}

/**
 * Loads the cached puzzle and converts it to a Cube
 */
function loadCachedPuzzle(): ReturnType<typeof createCube> {
  const cached = cachedPuzzleData as CachedPuzzle;
  const cube = createCube();

  // Populate cube with cached cells
  for (const serializedCell of cached.cells) {
    const [i, j, k] = serializedCell.position;
    const cell = createCell(
      [i, j, k] as const,
      serializedCell.value,
      serializedCell.type
    );
    cube.cells[i][j][k] = cell;
  }

  console.log(`Loaded cached puzzle with ${cached.givenCellCount} given cells`);
  return cube;
}

/**
 * Initialize and start the game
 */
export function init(): void {
  console.log('Game initialization...');

  // 1. Get container element
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('App container not found');
  }

  // Set up basic styling for body and container to ensure no offsets
  document.body.style.cssText = `
    margin: 0;
    padding: 0;
    overflow: hidden;
  `;

  container.style.cssText = `
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    position: relative;
  `;

  // 2. Initialize Three.js scene
  const sceneManager = new SceneManager({
    container,
    backgroundColor: 0x1a1a1a,
    cameraDistance: 50
  });

  // 3. Check storage for saved game, or load cached puzzle
  let gameState;
  if (hasGameState()) {
    try {
      const loaded = loadGameState();
      if (loaded) {
        console.log('Loaded saved game from storage');
        gameState = loaded;
      } else {
        console.log('No saved game found, loading cached puzzle');
        const cachedCube = loadCachedPuzzle();
        gameState = createGameStateFromCube(cachedCube, 'easy');
      }
    } catch (error) {
      console.error('Failed to load saved game:', error);
      console.log('Loading cached puzzle instead');
      const cachedCube = loadCachedPuzzle();
      gameState = createGameStateFromCube(cachedCube, 'easy');
    }
  } else {
    console.log('No saved game found, loading cached puzzle');
    const cachedCube = loadCachedPuzzle();
    gameState = createGameStateFromCube(cachedCube, 'easy');
  }

  // 4. Initialize CubeRenderer with cube
  const cubeRenderer = new CubeRenderer(gameState.cube);
  sceneManager.add(cubeRenderer.getContainer());

  // 5. Initialize FaceRenderer
  const faceRenderer = new FaceRenderer(cubeRenderer, sceneManager);

  // 6. Initialize MinimapRenderer
  const minimapRenderer = new MinimapRenderer(
    gameState.cube,
    sceneManager.getRenderer()
  );

  // 7. Initialize ViewStateManager to coordinate view transitions
  const viewStateManager = new ViewStateManager({
    sceneManager,
    faceRenderer,
    minimapRenderer,
  });

  // 8. Initialize InputController
  const inputController = new InputController(
    {
      canvas: sceneManager.getRenderer().domElement,
    },
    sceneManager,
    cubeRenderer,
    faceRenderer,
    minimapRenderer,
    gameState.cube
  );

  // 9. Initialize CellEditor
  const cellEditor = new CellEditor(
    gameState.cube,
    cubeRenderer,
    {
      autoValidate: false, // On-demand validation only
      showErrorHighlights: true,
    }
  );

  // 10. Initialize GameUI
  const gameUI = new GameUI({
    container,
    sceneManager,
    inputController,
    cellEditor,
    gameState,
  });

  // Set up auto-save on cell value changes
  inputController.onCellValueChange(() => {
    try {
      saveGameState(gameState);
      console.log('Game state auto-saved');
    } catch (error) {
      console.error('Failed to auto-save game state:', error);
    }
  });

  // Set up new game handler
  gameUI.onNewGame((difficulty) => {
    console.log(`Generating new ${difficulty} puzzle... This may take 2-5 minutes.`);

    // Show loading state (in a real app, this would be a loading spinner)
    // For now, we'll just disable the button and log
    console.log('Please wait while generating puzzle...');

    // Generate puzzle asynchronously to avoid blocking UI
    setTimeout(() => {
      try {
        const newCube = generatePuzzle(difficulty);
        const newGameState = createGameStateFromCube(newCube, difficulty);

        // Update all components with new game state
        Object.assign(gameState, newGameState);

        cubeRenderer.setCube(gameState.cube);
        minimapRenderer.setCube(gameState.cube);
        inputController.setCube(gameState.cube);
        cellEditor.setCube(gameState.cube);
        gameUI.setGameState(gameState);

        // Save new game
        saveGameState(gameState);

        // Reset camera to canonical view
        sceneManager.resetCamera();

        console.log('New puzzle generated successfully!');
      } catch (error) {
        console.error('Failed to generate puzzle:', error);
        alert('Failed to generate puzzle. Please try again.');
      }
    }, 100);
  });

  // 11. Start render loop
  sceneManager.startRenderLoop(() => {
    // Update view state animations (layer transitions) each frame
    viewStateManager.update();

    // Render minimap
    const canvas = sceneManager.getRenderer().domElement;
    minimapRenderer.render(canvas.width, canvas.height);
  });

  console.log('Hex-Do-Cube ready! Double-click on a face to enter editing view.');
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
