# Phase 6: Visual Polish and UX Improvements

## Overview

This phase addresses visual polish, UX improvements, and critical bug fixes identified during playtesting. The work is organized into logical feature groups with dependencies clearly marked.

## Feature Groups

### 1. Solution Storage (Critical - Blocking Other Features)

**Problem**: Currently, we only store the puzzle state, not the original solution. This prevents us from knowing if user-entered values are correct (vs just non-conflicting).

**Solution**:
- Amend `CachedPuzzle` interface to include `solution: HexValue[][][]`
- Update `generate_cached_puzzle.py` to output the full solution
- Update `GameState` to track: solution, given cells, user guesses
- Update storage serialization to persist solution
- Regenerate cached puzzle with solution included

**Beads**:
- `code-30`: Add solution storage to puzzle format
- `code-30.1`: Write tests for solution storage

---

### 2. Subsquare Separator Planes

**Problem**: Users have difficulty visually identifying the 4×4 subsquare boundaries.

**Solution**:
- Create thin (0.02 units) PlaneGeometry segments at subsquare boundaries
- Magenta color, very translucent in 3D view
- Planes extend through entire cube (internal grid)
- In face-on view: render only active layer, fully opaque (appear as lines)

**Implementation**:
- New class: `SubsquareSeparatorRenderer`
- Integrates with `FaceRenderer` for layer-specific visibility
- 3 sets of planes (one per axis), each with 3 separator positions (at indices 4, 8, 12)

**Beads**:
- `code-31`: Implement SubsquareSeparatorRenderer
- `code-31.1`: Write tests for separator visibility logic

---

### 3. Minimap Minicube Fix

**Problem**: Minimap is not visible despite code existing. Need to diagnose and fix.

**Solution**:
- Diagnose why MinimapRenderer output is not visible
- Fix rendering pipeline issues
- Ensure minimap is always locked to isometric view
- Generalize highlighting to support both face AND layer highlighting
- Active layer shown in orange/gold when in face-on view

**Beads**:
- `code-32`: Diagnose and fix minimap visibility
- `code-32.1`: Add layer highlighting to minimap
- `code-32.2`: Write tests for minimap highlighting

---

### 4. Face-On View Improvements

**Problem**: Multiple UX issues with face-on editing view.

**Sub-problems**:
1. Cells render all 6 sides instead of appearing 2D
2. Empty cells should be opaque (not transparent showing layer below)
3. No layer number indicator
4. Camera doesn't move with layer scrolling (layers appear different sizes)
5. Subsquare separators should appear as opaque lines

**Solutions**:
1. In face-on mode, render only the "far" face of each cell (the face facing the camera)
2. Set empty cell opacity to 1.0 in face-on mode
3. Add layer indicator overlay (e.g., "Layer 7/16") positioned to not obscure cube
4. Move camera along face-normal axis as layer changes, maintaining consistent distance
5. Coordinate with SubsquareSeparatorRenderer for layer-specific rendering

**Beads**:
- `code-33`: Implement 2D cell rendering for face-on view
- `code-33.1`: Make empty cells opaque in face-on view
- `code-33.2`: Add layer number indicator overlay
- `code-33.3`: Implement camera movement with layer scrolling
- `code-33.4`: Write tests for face-on view rendering

---

### 5. Face View Button / Active Face Synchronization

**Problem**: Face view buttons change camera but don't update active face, resulting in "end-on" view of selected face.

**Solution**:
- Refactor to tie camera view and active face together
- When face view button clicked: set camera AND enter face-on mode for that face
- ViewStateManager should be single source of truth
- Face buttons should go through ViewStateManager, not directly to SceneManager

**Beads**:
- `code-34`: Refactor face view buttons to synchronize with active face
- `code-34.1`: Write tests for view synchronization

---

### 6. Message Panel

**Problem**: No way to communicate log messages or user messages to the player.

**Solution**:
- Right-side panel with scrollable message list
- Two message types: LOG (internal/programmatic) and USER (player-facing)
- Checkbox to show/hide LOG messages
- Chronological order, newest at bottom
- Auto-scroll when at bottom, preserve position when scrolled up
- No message limit

**Message Examples**:
- LOG: "View changed to XY face, layer 7"
- LOG: "Calculating new cube..."
- USER: "Found 3 wrong cells"
- USER: "Cell (5,3,7) with value 'a' is wrong. Conflicts with cell (5,3,2)"
- USER: "You win!"

**Beads**:
- `code-35`: Implement MessagePanel UI component
- `code-35.1`: Add LOG messages for view changes
- `code-35.2`: Write tests for MessagePanel

---

### 7. Validation Highlighting Improvements

**Problem**:
- All conflicting cells shown in red (should distinguish given vs user-entered)
- Wrong cells that don't conflict aren't identified
- No user message about specific conflicts

**Solution** (requires solution storage from code-30):
- Given cells in conflict: GREEN highlight
- User-entered cells with wrong value: RED highlight
- Visually distinguish given cells from user-entered cells (existing, verify working)
- Send USER message for each wrong cell with conflict details

**Beads**:
- `code-36`: Implement green/red validation highlighting (depends on code-30)
- `code-36.1`: Add USER messages for wrong cells
- `code-36.2`: Write tests for validation highlighting

---

### 8. Win Screen with Fireworks

**Problem**: Current win notification is basic. Need celebratory feedback.

**Solution**:
- Large "YOU WIN" text, flashing/animated
- Three.js particle system for fireworks effect
- Cube auto-rotates slowly in background
- User can dismiss immediately (click anywhere)
- Respect user's time - no forced delays

**Beads**:
- `code-37`: Implement fireworks particle system
- `code-37.1`: Add auto-rotating cube during win
- `code-37.2`: Create animated YOU WIN overlay
- `code-37.3`: Write tests for win screen

---

### 9. Code Health

**Problem**: Opportunities for reducing coupling and duplication.

**Areas to Review**:
- Face view button handlers duplicate logic (should use ViewStateManager)
- Camera animation logic could be extracted to reusable utility
- Validation error handling scattered across components
- Config duplication (already partially addressed in code-22/23)

**Beads**:
- `code-38`: Audit and refactor coupling issues
- `code-38.1`: Extract camera animation utilities
- `code-38.2`: Consolidate validation error handling

---

## Dependency Graph

```
code-30 (Solution Storage)
    └── code-36 (Validation Highlighting)

code-31 (Subsquare Separators)
    └── code-33 (Face-On View) - for layer-specific rendering

code-32 (Minimap Fix)
    └── code-32.1 (Layer Highlighting)

code-34 (Face View Sync)
    └── code-33 (Face-On View) - shared view state management

code-35 (Message Panel)
    └── code-36.1 (Validation Messages)
    └── code-33.2 (Layer Indicator) - could share positioning logic

code-37 (Win Screen) - independent
code-38 (Code Health) - can be done incrementally
```

## Priority Order

1. **P0 - Critical/Blocking**:
   - code-30: Solution storage (blocks validation improvements)
   - code-32: Minimap visibility fix (core feature broken)
   - code-34: Face view synchronization (UX bug)

2. **P1 - Important UX**:
   - code-33: Face-on view improvements (core editing experience)
   - code-31: Subsquare separators (visual clarity)
   - code-36: Validation highlighting (gameplay feedback)

3. **P2 - Polish**:
   - code-35: Message panel (communication)
   - code-37: Win screen (celebration)
   - code-38: Code health (maintainability)

## Design Principles (from user feedback)

1. **User Interactivity First**: Minimize frustration and delays. User can always dismiss/interrupt.
2. **Consistent Presentation**: Every layer in face-on view should appear identical in size/position.
3. **Visual Clarity**: Given cells vs user cells must be clearly distinguishable.
4. **2D Illusion**: Face-on view should "appear" 2D - only render far face of cells.
