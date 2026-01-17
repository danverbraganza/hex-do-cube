/**
 * Entry point for Hex-Do-Cube
 * Wires up all models, services, renderers, and UI components
 */

// Models
import { createGameStateFromCube, type GameState } from './models/GameState.js';
import { createCube } from './models/Cube.js';
import { createCell } from './models/Cell.js';
import type { HexValue, CellType } from './models/Cell.js';

// Services
import { loadGameState, saveGameState, hasGameState } from './services/storage.js';
import { generatePuzzle } from './services/generator.js';
import { GameValidator } from './services/GameValidator.js';

// Data
import cachedPuzzleData from './data/cached-puzzle.json';

// Renderers
import { SceneManager } from './renderer/SceneManager.js';
import { CubeRenderer } from './renderer/CubeRenderer.js';
import { FaceRenderer } from './renderer/FaceRenderer.js';
import { MinimapRenderer } from './renderer/MinimapRenderer.js';
import { SubsquareSeparatorRenderer } from './renderer/SubsquareSeparatorRenderer.js';

// UI
import { InputController } from './ui/InputController.js';
import { CellEditor } from './ui/CellEditor.js';
import { GameUI } from './ui/GameUI.js';
import { ViewStateManager } from './ui/ViewStateManager.js';
import { MessagePanel } from './ui/MessagePanel.js';
import { GameStateCoordinator } from './ui/GameStateCoordinator.js';
import { CellStateManager } from './ui/CellStateManager.js';

console.log('Hex-Do-Cube initialized');

/**
 * Cached puzzle format (matches generate-puzzle.ts output)
 */
interface CachedPuzzle {
  version: number;
  difficulty: 'simple';
  generatedAt: string;
  cells: Array<{
    position: [number, number, number];
    value: HexValue;
    type: CellType;
  }>;
  givenCellCount: number;
  emptyCellCount: number;
  solution: HexValue[][][]; // 16x16x16 array with all cells filled (never null)
}

/**
 * Loads the cached puzzle and converts it to a Cube, also returns solution
 */
function loadCachedPuzzle(): { cube: ReturnType<typeof createCube>; solution: HexValue[][][] } {
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
  return { cube, solution: cached.solution };
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

  // Apply centralized CSS theme styling
  document.body.classList.add('hdc-app');
  // Container (#app) is styled via CSS selector in theme.css

  // 2. Initialize Three.js scene
  const sceneManager = new SceneManager({
    container,
    // backgroundColor and cameraDistance use default values from RenderConfig
  });

  // 3. Check storage for saved game, or load cached puzzle
  let gameState: GameState;
  if (hasGameState()) {
    try {
      const loaded = loadGameState();
      if (loaded) {
        console.log('Loaded saved game from storage');
        gameState = loaded;
      } else {
        console.log('No saved game found, loading cached puzzle');
        const { cube, solution } = loadCachedPuzzle();
        gameState = createGameStateFromCube(cube, 'simple', solution);
      }
    } catch (error) {
      console.error('Failed to load saved game:', error);
      console.log('Loading cached puzzle instead');
      const { cube, solution } = loadCachedPuzzle();
      gameState = createGameStateFromCube(cube, 'simple', solution);
    }
  } else {
    console.log('No saved game found, loading cached puzzle');
    const { cube, solution } = loadCachedPuzzle();
    gameState = createGameStateFromCube(cube, 'simple', solution);
  }

  // 4. Initialize CubeRenderer with cube
  const cubeRenderer = new CubeRenderer(gameState.cube);
  sceneManager.add(cubeRenderer.getContainer());

  // 5. Initialize SubsquareSeparatorRenderer
  const subsquareSeparatorRenderer = new SubsquareSeparatorRenderer();
  sceneManager.add(subsquareSeparatorRenderer.getContainer());

  // 6. Initialize FaceRenderer
  const faceRenderer = new FaceRenderer(cubeRenderer);

  // 7. Initialize MinimapRenderer
  const minimapRenderer = new MinimapRenderer(
    gameState.cube,
    sceneManager.getRenderer()
  );

  // 8a. Initialize CellStateManager for centralized cell state management
  const cellStateManager = new CellStateManager(cubeRenderer);

  // 8. Initialize ViewStateManager to coordinate view transitions
  const viewStateManager = new ViewStateManager({
    sceneManager,
    faceRenderer,
    minimapRenderer,
    cubeRenderer,
    subsquareSeparatorRenderer,
    cellStateManager,
  });

  // 9. Initialize InputController
  const inputController = new InputController(
    {
      canvas: sceneManager.getRenderer().domElement,
    },
    sceneManager,
    cubeRenderer,
    faceRenderer,
    minimapRenderer,
    gameState.cube,
    cellStateManager
  );

  // 9a. Wire up ViewStateManager to InputController for coordinated view transitions
  inputController.setViewStateManager(viewStateManager);

  // 10. Initialize CellEditor
  const cellEditor = new CellEditor(
    gameState.cube,
    cubeRenderer,
    cellStateManager,
    gameState.solution,
    {
      autoValidate: false, // On-demand validation only
      showErrorHighlights: true,
    }
  );

  // 10a. Initialize GameValidator for unified validation API
  const gameValidator = new GameValidator(cellEditor);

  // 11. Initialize MessagePanel
  const messagePanel = new MessagePanel({
    container,
    visible: true,
  });

  // 11a. Wire up MessagePanel to InputController for debugging
  inputController.setMessagePanel(messagePanel);

  // 12. Initialize GameUI
  const gameUI = new GameUI({
    container,
    sceneManager,
    viewStateManager,
    inputController,
    gameValidator,
    gameState,
  });

  // 12a. Initialize GameStateCoordinator to centralize game reset logic
  const gameStateCoordinator = new GameStateCoordinator({
    cubeRenderer,
    minimapRenderer,
    inputController,
    cellEditor,
    gameUI,
  });

  // 13. Connect CellEditor validation to MessagePanel
  cellEditor.onValidation((result) => {
    if (!result.isValid && result.errors.length > 0) {
      // Count wrong cells (cells with incorrect values)
      const wrongCells = new Set<string>();
      for (const error of result.errors) {
        for (const position of error.cells) {
          const [i, j, k] = position;
          const cell = gameState.cube.cells[i][j][k];
          const correctValue = gameState.solution[i][j][k];
          if (cell.value !== correctValue && cell.type !== 'given') {
            wrongCells.add(`${i},${j},${k}`);
          }
        }
      }

      if (wrongCells.size > 0) {
        messagePanel.info(`Found ${wrongCells.size} incorrect cell${wrongCells.size > 1 ? 's' : ''}!`);
      }
    }
  });

  // 14. Set up layer indicator to update when view mode changes
  viewStateManager.onViewModeChange((mode, _face, layer) => {
    if (mode === 'face-on' && layer !== undefined) {
      gameUI.showLayerIndicator(layer);
    } else {
      gameUI.hideLayerIndicator();
    }
  });

  // Also listen to layer changes from FaceRenderer (for scrolling)
  faceRenderer.onLayerChange((face, layer) => {
    gameUI.updateLayerIndicator(layer);
    // Move camera to follow the layer
    sceneManager.updateFaceOnLayer(face, layer, true);
  });

  // 15. Set up auto-save on cell value changes
  inputController.onCellValueChange(() => {
    try {
      saveGameState(gameState);
      messagePanel.log('Game state auto-saved');
    } catch (error) {
      console.error('Failed to auto-save game state:', error);
    }
  });

  // 16. Set up new game handler
  gameUI.onNewGame((difficulty) => {
    messagePanel.log(`Generating new ${difficulty} puzzle...`);

    // Generate puzzle asynchronously to avoid blocking UI
    setTimeout(() => {
      try {
        // Reset view state before generating new puzzle
        // This ensures we exit face-on mode and reset opacities to translucent
        viewStateManager.exitFaceOnView();

        const { cube: newCube, solution: newSolution } = generatePuzzle(difficulty);
        const newGameState = createGameStateFromCube(newCube, difficulty, newSolution);

        // Replace gameState reference with the new game state
        // This is cleaner than Object.assign mutation which can cause issues
        // when components hold references to the old gameState.cube
        gameState = newGameState;

        // Use coordinator to update all components atomically with new game state
        gameStateCoordinator.resetGame(gameState);

        // Save new game state
        saveGameState(gameState);

        messagePanel.log('New puzzle generated successfully');
      } catch (error) {
        console.error('Failed to generate puzzle:', error);
        alert('Failed to generate puzzle. Please try again.');
      }
    }, 100);
  });

  // 17. Start render loop
  sceneManager.startRenderLoop(() => {
    // Update view state animations (layer transitions) each frame
    viewStateManager.update();

    // Update win screen animations (fireworks)
    gameUI.update();

    // Render minimap using client dimensions (CSS pixels, not buffer pixels)
    const canvas = sceneManager.getRenderer().domElement;
    minimapRenderer.render(canvas.clientWidth, canvas.clientHeight);
  });

  // 18. Show ready message
  messagePanel.log('Hex-Do-Cube ready');
  console.log('Hex-Do-Cube ready! Double-click on a face to enter editing view.');
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
