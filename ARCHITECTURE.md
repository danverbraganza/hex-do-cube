# Hex-Do-Cube Architecture

## Overview

Hex-Do-Cube is a 3D hexadecimal Sudoku puzzle game implemented in TypeScript with Three.js for 3D rendering. The game presents a 16×16×16 cube where players fill cells with hexadecimal values (0-9, a-f) following Sudoku-like constraints.

## Core Constraints

Each row, column, beam (depth line), and 4×4 sub-square within each planar face must contain exactly one of each hexadecimal value (0-9, a-f) with no duplicates.

**Sub-square Definition:** Each 16×16 planar face is divided into 16 sub-squares (4×4 grid of 4×4 cells). There is no concept of 3D sub-cubes.

## Technology Stack

- **Language:** TypeScript (strict mode)
- **3D Rendering:** Three.js
- **Build Tool:** Vite
- **Package Manager:** Bun
- **Test Framework:** Bun Test (built-in)
- **Task Management:** Just (justfile)
- **Issue Tracking:** bd (beads)
- **Storage:** LocalStorage API

## Project Structure

```
src/
├── config/          # Centralized configuration
│   └── RenderConfig.ts    # Shared colors, lighting, opacity values
│
├── models/          # Core data structures and game state
│   ├── Cell.ts      # Individual cell representation
│   ├── Cube.ts      # 16×16×16 grid and operations
│   └── GameState.ts # Game session management
│
├── services/        # Business logic (pure functions where possible)
│   ├── generator.ts # Puzzle generation (Latin cube construction)
│   ├── validator.ts # Constraint validation logic
│   └── storage.ts   # LocalStorage persistence (with solution)
│
├── renderer/        # Three.js rendering layer
│   ├── SceneManager.ts           # Scene orchestration, camera animation
│   ├── CubeRenderer.ts           # 3D isometric cell rendering
│   ├── FaceRenderer.ts           # Face-on editing view
│   ├── MinimapRenderer.ts        # Navigation minimap (lower-left)
│   ├── ValueSpriteRenderer.ts    # Billboard sprites for cell values
│   ├── SubsquareSeparatorRenderer.ts  # (Phase 6) Subsquare grid lines
│   └── WinScreenRenderer.ts      # (Phase 6) Fireworks particle system
│
├── ui/              # User interaction layer
│   ├── InputController.ts  # Mouse/keyboard handling
│   ├── CellEditor.ts       # Cell value editing
│   ├── GameUI.ts           # HUD and menus
│   ├── ViewStateManager.ts # View state coordination
│   └── MessagePanel.ts     # (Phase 6) Log/message display
│
├── data/            # Static data
│   └── cached-puzzle.json  # Pre-generated puzzle with solution
│
└── main.ts          # Application entry point
```

## Architectural Decisions

### 1. Puzzle Generation
**Decision:** Implement full backtracking solver for procedural generation.

**Rationale:**
- Provides unlimited unique puzzles
- Generation code generalizes to any puzzle configuration
- Randomization in solver ensures variety
- No need for pre-generated puzzle database

### 2. Three.js Rendering Strategy
**Decision:** Individual meshes for each cell.

**Rationale:**
- Simpler ray-casting for cell picking/selection
- Easier to manage per-cell states (hover, selected, error)
- Memory overhead acceptable for 4,096 cells on modern hardware
- Future optimization to InstancedMesh if needed

### 3. Cell Value Rendering
**Decision:** True billboard sprites (Three.js Sprites).

**Rationale:**
- Sprites always face camera regardless of cube rotation
- Native Three.js support for text rendering
- Consistent visual presentation in isometric view
- Better performance than HTML overlays

### 4. Layer Switching UX
**Decision:** Discrete layers with animated transitions and camera movement.

**Rationale:**
- User always sees exactly one layer at 100% opacity
- Smooth opacity animation during scroll for visual continuity
- No "frozen between layers" state
- Clear focus on current editing layer
- Camera moves along face-normal axis when layer changes
- Every layer appears identical in size/position (consistent UX)

### 5. Validation Timing
**Decision:** On-demand validation only (user clicks "Check").

**Rationale:**
- Reduces distraction during gameplay
- Avoids constant red highlighting during exploration
- Player-initiated feedback loop
- Simpler state management

### 6. LocalStorage Schema
**Decision:** Store complete game state including solution.

**Rationale:**
- Simpler serialization/deserialization
- Easier debugging and inspection
- No complex delta tracking
- Storage size acceptable (~100KB for full state)

**Storage Structure:**
- `solution`: Complete solved cube (HexValue[][][]) - the correct answer
- `givenCells`: Set of positions that are "given" (immutable)
- `userGuesses`: Current user-entered values for editable cells
- This separation enables validation against known-correct values

### 7. Test Framework
**Decision:** Bun's built-in test runner over Jest.

**Rationale:**
- Already using Bun as package manager
- Zero additional configuration
- Faster execution
- Standard `expect` API compatibility
- Simpler dependency tree

### 8. Implementation Priority
**Decision:** Game logic → Tests → Rendering.

**Rationale:**
- Core logic has highest complexity
- Test coverage ensures correctness before UI complexity
- 3D rendering can iterate independently
- Definition of Done requires working end-to-end game

## Game Flow

1. **Initialization:** Load or generate new puzzle
2. **3D Rotational View:** User explores cube, rotates with middle-mouse
3. **Face Selection:** Double-click face to enter face-on editing view
4. **Layer Navigation:** Mouse wheel scrolls through depth layers
5. **Cell Editing:** Click cell, type hex value (0-9, a-f)
6. **Validation:** User clicks "Check" button
7. **Win Condition:** All cells filled correctly (no loss condition)

## Data Model

### Cell
```typescript
type HexValue = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'a'|'b'|'c'|'d'|'e'|'f' | null;
type CellType = 'given' | 'editable';

interface Cell {
  position: [i: number, j: number, k: number]; // 0-15 for each axis
  value: HexValue;
  type: CellType;
}
```

### Cube
```typescript
interface Cube {
  cells: Cell[][][]; // 16×16×16 array
  validate(): ValidationResult;
  getRow(i: number, j: number): Cell[];
  getColumn(i: number, k: number): Cell[];
  getBeam(j: number, k: number): Cell[];
  getSubSquare(face: 'i'|'j'|'k', layer: number, subRow: number, subCol: number): Cell[];
}
```

### GameState
```typescript
interface GameState {
  cube: Cube;                           // Current puzzle state with user edits
  solution: HexValue[][][];             // Complete correct solution
  difficulty: 'easy';                   // Start with easy (70% given cells)
  isComplete: boolean;
  isCorrect: boolean | null;            // null = not yet checked
}
```

### CachedPuzzle (Storage Format)
```typescript
interface CachedPuzzle {
  version: number;
  difficulty: 'easy';
  generatedAt: string;
  solution: HexValue[][][];             // Complete 16×16×16 solved cube
  cells: Array<{                        // Only non-empty cells stored
    position: [number, number, number];
    value: HexValue;
    type: CellType;
  }>;
  givenCellCount: number;
  emptyCellCount: number;
}
```

## Testing Strategy

### Unit Tests (*.test.ts)
- **models/Cell.test.ts:** Cell creation, validation
- **models/Cube.test.ts:** Grid operations, indexing
- **services/validator.test.ts:** Constraint checking (table-driven)
- **services/generator.test.ts:** Puzzle uniqueness, solvability
- **services/storage.test.ts:** Serialization round-trips

### Integration Tests
- Full game flow: new game → edit → validate → win
- View transitions: 3D ↔ Face-on ↔ Minimap
- LocalStorage persistence across sessions

## Performance Considerations

- **Cell Count:** 4,096 individual meshes (acceptable for modern GPUs)
- **Validation:** O(n²) per constraint check, run only on user request
- **Rendering:** Translucency requires careful z-sorting
- **Future Optimizations:** InstancedMesh, frustum culling, LOD for distant cells

## Phase 6: Visual Polish (Current Work)

### 9. Subsquare Separator Planes
**Decision:** Thin planar segments to visually delineate 4×4 subsquares.

**Implementation:**
- PlaneGeometry segments (0.02 units thick) at subsquare boundaries
- Magenta color, very translucent in 3D rotational view
- Planes extend through entire cube (internal grid structure)
- In face-on view: only render active layer, fully opaque (appear as 2D lines)
- 3 planes per axis at indices 4, 8, 12 (between subsquares)

### 10. Face-On View 2D Illusion
**Decision:** Face-on view should appear 2D, not 3D.

**Implementation:**
- Only render the "far" face of each cell (face facing camera)
- Empty cells rendered fully opaque (no see-through to layer below)
- Subsquare separators appear as solid lines
- Camera moves with layer changes to maintain consistent presentation

### 11. Minimap Minicube
**Decision:** Always-visible miniature cube for spatial orientation.

**Implementation:**
- Lower-left corner viewport, independent 3D scene
- Always locked to canonical isometric view
- No cell values rendered (color indicates fill level via opacity)
- Highlights active face (gold) when in face-on mode
- Highlights active layer (gold) when editing specific layer
- Double-click returns to 3D rotational view

### 12. Message Panel
**Decision:** Right-side panel for application messages.

**Message Types:**
- LOG: Internal/programmatic (view changes, calculations)
- USER: Player-facing (validation results, win notification)

**Behavior:**
- Checkbox to show/hide LOG messages
- Chronological order, newest at bottom
- Auto-scroll when at bottom, preserve position when scrolled up
- No message count limit

### 13. Validation Highlighting
**Decision:** Color-coded highlighting distinguishes given vs user-entered cells.

**Implementation:**
- Given cells in conflict: GREEN highlight (not their fault)
- User-entered cells with wrong value: RED highlight
- Requires solution storage to know correct values
- USER message sent for each wrong cell with conflict details

### 14. Win Screen Celebration
**Decision:** Fireworks particle effect with auto-rotating cube.

**Implementation:**
- Three.js particle system for fireworks
- Large animated "YOU WIN" text
- Cube auto-rotates slowly in background
- User can dismiss immediately (click anywhere)
- Principle: Minimize frustration, respect user's time

### 15. View State Synchronization
**Decision:** ViewStateManager is single source of truth for camera and active face.

**Implementation:**
- Face view buttons go through ViewStateManager, not directly to SceneManager
- Changing view always synchronizes: camera position AND active face
- Prevents "end-on" view bug where camera and face are misaligned

## Design Principles

1. **User Interactivity First**: User can always dismiss/interrupt. No forced delays.
2. **Consistent Presentation**: Every layer appears identical in size/position.
3. **Visual Clarity**: Given cells clearly distinguished from user-entered cells.
4. **2D Illusion**: Face-on view appears 2D, only showing relevant layer.

## Open Questions / Future Work

- Multiple difficulty levels (Medium, Hard)
- Undo/redo system
- Hint system
- Timer and scoring
- Multiple save slots
- Mobile/touch support
- Deployment strategy (currently local-only)

## Definition of Done

Each commit must pass:
- ✅ `just test` - All unit tests pass
- ✅ `just lint` - ESLint passes
- ✅ `just typecheck` - TypeScript compilation succeeds
- ✅ `just build` - Production build succeeds

Final MVP completion requires:
- ✅ Playable end-to-end game
- ✅ All views functional (3D, face-on, minimap)
- ✅ Win condition detection
- ✅ LocalStorage persistence
- ✅ Comprehensive test coverage
