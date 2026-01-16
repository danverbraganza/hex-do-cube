# Hex-Do-Cube Testing Guide

## Overview

This document provides a comprehensive manual testing plan for Hex-Do-Cube, a 3D hexadecimal Sudoku puzzle game. Since the game runs in a browser with 3D rendering, many aspects require manual verification that cannot be easily automated.

This guide is intended for:
- QA testers performing pre-release validation
- Developers verifying feature implementations
- Anyone conducting browser compatibility testing

## Prerequisites

Before testing:
1. Build the project: `just build`
2. Start the dev server: `just dev`
3. Open a browser to the local development URL (typically `http://localhost:5173`)
4. Have a text editor ready to track test results
5. Clear browser cache/localStorage before critical test runs

## Test Environment Matrix

### Recommended Test Browsers

| Browser | Minimum Version | Priority | Notes |
|---------|----------------|----------|-------|
| Chrome | 90+ | P0 | Primary development target |
| Firefox | 88+ | P0 | WebGL compatibility varies |
| Safari | 14+ | P1 | Apple Silicon support |
| Edge | 90+ | P1 | Chromium-based |
| Opera | 76+ | P2 | Alternative testing |

### Screen Resolutions to Test

- **Desktop:** 1920x1080 (P0), 1366x768 (P1), 2560x1440 (P1), 3840x2160/4K (P2)
- **Tablet:** 1024x768, 1280x800 (P2 - touch support not yet implemented)
- **Mobile:** Not currently supported (future work)

## Automated Test Coverage

Before manual testing, ensure all automated tests pass:

```bash
# Run all unit and integration tests
bun test src/models/ src/services/validator.test.ts src/services/storage.test.ts src/integration.test.ts

# Run all quality gates
just lint
just type-check
just build
```

**Automated tests cover:**
- ✅ Cell model validation and constraints
- ✅ Cube data structure operations
- ✅ GameState management logic
- ✅ Puzzle generator correctness
- ✅ Validation logic (rows, columns, beams, sub-squares)
- ✅ LocalStorage persistence (serialization/deserialization)
- ✅ Integration: full game flow (new game → edit → validate → win)
- ✅ Error handling across modules

**What requires manual testing:**
- ❌ 3D rendering and visual appearance
- ❌ Mouse/keyboard interactions
- ❌ View transitions and animations
- ❌ Camera controls and minimap
- ❌ User experience flows
- ❌ Performance under load
- ❌ Browser-specific quirks

---

## Manual Test Categories

### 1. Initial Load & State Persistence

#### Test 1.1: Fresh Installation (No Saved Game)
**Priority:** P0

**Steps:**
1. Clear browser localStorage: Open DevTools → Application → Local Storage → Clear
2. Refresh the page
3. Observe initial state

**Expected Results:**
- ✓ Game loads without errors (check console)
- ✓ Empty cube is displayed in isometric 3D view
- ✓ Minimap shows empty cube in lower-left corner
- ✓ All cells are transparent (no values visible)
- ✓ Camera is positioned at canonical isometric view (i=up, j=right, k=left)
- ✓ Console log: "No saved game found, creating new empty game"

**Pass/Fail:** _____ **Notes:**

---

#### Test 1.2: Resume from Saved Game
**Priority:** P0

**Steps:**
1. Start a new game or edit some cells
2. Wait for auto-save (check console for "Game state auto-saved")
3. Close the browser tab completely
4. Reopen the application URL
5. Observe loaded state

**Expected Results:**
- ✓ Previously filled cells are restored with correct values
- ✓ Cell types (given vs editable) are preserved
- ✓ Game state (isComplete, isCorrect) is restored
- ✓ Validation state matches saved state
- ✓ Console log: "Loaded saved game from storage"

**Pass/Fail:** _____ **Notes:**

---

#### Test 1.3: Corrupted LocalStorage Recovery
**Priority:** P1

**Steps:**
1. Open DevTools → Application → Local Storage
2. Find the game state key (typically "hex-do-cube-gamestate")
3. Manually edit the JSON to make it invalid (e.g., remove closing brace)
4. Refresh the page

**Expected Results:**
- ✓ Application doesn't crash
- ✓ Error logged to console: "Failed to load saved game"
- ✓ Falls back to creating new empty game
- ✓ User can continue playing

**Pass/Fail:** _____ **Notes:**

---

### 2. New Game Generation

#### Test 2.1: Generate Easy Puzzle
**Priority:** P0

**Steps:**
1. Click "New Game" button (or equivalent UI control)
2. Select "Easy" difficulty
3. Wait for puzzle generation (2-5 minutes expected)
4. Observe generated puzzle

**Expected Results:**
- ✓ Loading state is shown during generation
- ✓ Puzzle generates successfully without errors
- ✓ Approximately 95% of cells are filled with "given" values
- ✓ Given cells are visually distinct (different color/styling)
- ✓ Given cells contain valid hex values (0-9, a-f)
- ✓ Empty cells are transparent/blank
- ✓ Puzzle is solvable and has unique solution (verified by generator logic)
- ✓ Console log: "New puzzle generated successfully!"

**Pass/Fail:** _____ **Notes:**

---

#### Test 2.2: Generation Cancellation/Interruption
**Priority:** P2

**Steps:**
1. Start generating a new puzzle
2. During generation (before completion), refresh the page or close tab
3. Reopen application

**Expected Results:**
- ✓ Previous game state is preserved (generation was not saved mid-process)
- ✓ OR empty game is shown if no previous state existed
- ✓ No corrupted state

**Pass/Fail:** _____ **Notes:**

---

### 3. 3D Rotational View (Isometric View)

#### Test 3.1: Initial Camera Position
**Priority:** P0

**Steps:**
1. Load game in fresh state
2. Observe initial camera orientation

**Expected Results:**
- ✓ Cube is visible in isometric perspective
- ✓ "i" face (top) faces upward
- ✓ "j" face (right) faces to the right
- ✓ "k" face (left) faces to the left
- ✓ Entire cube fits in viewport

**Pass/Fail:** _____ **Notes:**

---

#### Test 3.2: Middle-Mouse Rotation (Orbit Controls)
**Priority:** P0

**Steps:**
1. Click and hold middle mouse button (wheel button)
2. Drag mouse in various directions
3. Release middle mouse button

**Expected Results:**
- ✓ Cube rotates smoothly following mouse movement
- ✓ Rotation feels natural and responsive
- ✓ Cube stays centered in view
- ✓ Cell values (sprites) always face camera (billboard effect)
- ✓ No jittering or stuttering during rotation
- ✓ Rotation stops when mouse button is released

**Pass/Fail:** _____ **Notes:**

---

#### Test 3.3: Home Button (Reset Camera)
**Priority:** P0

**Steps:**
1. Rotate cube to arbitrary orientation
2. Click "Home" button (or equivalent UI control)

**Expected Results:**
- ✓ Camera smoothly transitions back to canonical isometric view
- ✓ Animation is smooth (no instant snap)
- ✓ Final orientation matches initial view (i=up, j=right, k=left)

**Pass/Fail:** _____ **Notes:**

---

#### Test 3.4: Cell Value Rendering (Billboard Sprites)
**Priority:** P0

**Steps:**
1. Generate or load a puzzle with some filled cells
2. Rotate cube to various angles
3. Observe cell values during rotation

**Expected Results:**
- ✓ Hex values (0-9, a-f) are always parallel to screen
- ✓ Text remains upright and readable from any angle
- ✓ Sprites face camera like DOOM sprites
- ✓ No text rotation or distortion
- ✓ Values are clearly visible against cell backgrounds

**Pass/Fail:** _____ **Notes:**

---

#### Test 3.5: Translucency in Isometric View
**Priority:** P0

**Steps:**
1. View cube with mix of filled and empty cells
2. Observe rendering of different cell states

**Expected Results:**
- ✓ Filled cells are rendered with low opacity (translucent)
- ✓ Empty cells are completely transparent
- ✓ Given cells are distinguishable from editable cells
- ✓ Can see "through" the cube to internal structure
- ✓ Depth perception is maintained

**Pass/Fail:** _____ **Notes:**

---

#### Test 3.6: Mouse Wheel Zoom (if implemented)
**Priority:** P2

**Steps:**
1. Use mouse wheel to scroll up/down while in 3D view

**Expected Results:**
- ✓ Camera zooms in/out smoothly
- ✓ Zoom is bounded (doesn't clip through cube or go infinitely far)
- ✓ OR no action (zoom not implemented - acceptable)

**Pass/Fail:** _____ **Notes:**

---

### 4. Face-On Editing View

#### Test 4.1: Enter Face-On View via Double-Click
**Priority:** P0

**Steps:**
1. Start in 3D rotational view
2. Double-click on any visible face of the cube
3. Observe transition

**Expected Results:**
- ✓ View smoothly transitions to face-on view
- ✓ Selected face fills screen and aligns with viewport
- ✓ Rows are exactly horizontal
- ✓ Columns are exactly vertical
- ✓ Current layer is rendered at 100% opacity
- ✓ Blank cells are solid and visible (not transparent)
- ✓ Given cells remain visually distinct
- ✓ Minimap highlights the selected face
- ✓ Animation is smooth and professional

**Pass/Fail:** _____ **Notes:**

---

#### Test 4.2: Layer Navigation via Mouse Wheel
**Priority:** P0

**Steps:**
1. Enter face-on view on any face
2. Scroll mouse wheel forward (away from user)
3. Scroll mouse wheel backward (toward user)
4. Observe layer changes

**Expected Results:**
- ✓ Scrolling forward moves to next layer (deeper into cube)
- ✓ Scrolling backward moves to previous layer (shallower)
- ✓ Layer transition animates smoothly with opacity fade
- ✓ At layer boundary, scrolling stops (no wrapping)
- ✓ New layer appears at 100% opacity
- ✓ Previous layer fades to 0% opacity
- ✓ User sees exactly one layer at any time (discrete layers)
- ✓ Layer index is indicated somewhere in UI

**Pass/Fail:** _____ **Notes:**

---

#### Test 4.3: Exit Face-On View (Return to 3D)
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Double-click on minimap
3. Observe transition

**Expected Results:**
- ✓ View transitions back to 3D rotational view
- ✓ Camera returns to canonical isometric orientation
- ✓ Cube is rendered in full 3D with translucency
- ✓ Minimap no longer highlights any face
- ✓ Animation is smooth

**Pass/Fail:** _____ **Notes:**

---

#### Test 4.4: Cell Selection in Face-On View
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Click on an empty editable cell
3. Click on a given cell
4. Click outside cells

**Expected Results:**
- ✓ Clicking editable cell selects it (visual highlight/border)
- ✓ Clicking given cell does NOT select it (or shows "unselectable" feedback)
- ✓ Only one cell selected at a time
- ✓ Clicking outside cells deselects current selection
- ✓ Selection persists across layer changes

**Pass/Fail:** _____ **Notes:**

---

### 5. Cell Editing

#### Test 5.1: Edit Editable Cell with Keyboard
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Click an empty editable cell to select it
3. Type valid hex values: "0", "5", "a", "f"
4. Press backspace or delete to clear

**Expected Results:**
- ✓ Typed values appear immediately in cell
- ✓ Only accepts valid hex characters (0-9, a-f)
- ✓ Lowercase letters (a-f) are rendered in consistent case
- ✓ Invalid characters (g-z, symbols) are ignored
- ✓ Backspace/Delete clears cell value
- ✓ Cell updates visually in real-time
- ✓ Auto-save triggers (check console: "Game state auto-saved")

**Pass/Fail:** _____ **Notes:**

---

#### Test 5.2: Cannot Edit Given Cells
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Click a given cell (pre-filled)
3. Attempt to type values

**Expected Results:**
- ✓ Given cell cannot be selected for editing
- ✓ OR if selected, typing does nothing
- ✓ Cell value remains unchanged
- ✓ No error messages (silent rejection is acceptable)

**Pass/Fail:** _____ **Notes:**

---

#### Test 5.3: Edit Multiple Cells in Sequence
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Select cell A, type "3"
3. Select cell B, type "a"
4. Select cell C, type "f"
5. Navigate to different layer
6. Return to original layer

**Expected Results:**
- ✓ All values persist correctly
- ✓ Each cell shows correct value
- ✓ Values survive layer navigation
- ✓ Auto-save triggers after each edit

**Pass/Fail:** _____ **Notes:**

---

#### Test 5.4: Edit Cells Across Multiple Layers
**Priority:** P1

**Steps:**
1. Enter face-on view
2. Fill cell in layer 0
3. Scroll to layer 5, fill cell
4. Scroll to layer 15, fill cell
5. Validate game or save/reload

**Expected Results:**
- ✓ All cells across layers are saved correctly
- ✓ Each layer maintains its own cell values
- ✓ No cross-layer contamination
- ✓ 3D view shows filled cells at correct depths

**Pass/Fail:** _____ **Notes:**

---

#### Test 5.5: Clear Cell Values
**Priority:** P1

**Steps:**
1. Fill a cell with value "7"
2. Select the same cell again
3. Press Delete or Backspace

**Expected Results:**
- ✓ Cell value is cleared (becomes null/empty)
- ✓ Cell renders as blank
- ✓ Auto-save triggers

**Pass/Fail:** _____ **Notes:**

---

### 6. Validation (Check Button)

#### Test 6.1: Validate Empty Cube
**Priority:** P0

**Steps:**
1. Start with empty cube (no filled cells)
2. Click "Check" button

**Expected Results:**
- ✓ Validation completes without errors
- ✓ Game is marked as "correct" (no conflicts)
- ✓ Game is NOT complete (not all cells filled)
- ✓ No win condition triggered
- ✓ No error highlights shown

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.2: Validate Partial Cube (No Errors)
**Priority:** P0

**Steps:**
1. Fill some cells without creating duplicates
2. Example: Fill row 0 with unique values "0", "1", "2", "3", "4"
3. Click "Check" button

**Expected Results:**
- ✓ Validation passes (isCorrect = true)
- ✓ Game is NOT complete
- ✓ No error highlights
- ✓ Success feedback shown (e.g., "No errors found!")

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.3: Detect Row Conflict
**Priority:** P0

**Steps:**
1. Fill two cells in the same row with same value
2. Example: Set cell [0,0,0] = "5" and cell [5,0,0] = "5"
3. Click "Check" button

**Expected Results:**
- ✓ Validation fails (isCorrect = false)
- ✓ Error message displayed indicating row conflict
- ✓ Conflicting cells are highlighted in red (or error color)
- ✓ Error details specify: row, positions, duplicate value

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.4: Detect Column Conflict
**Priority:** P0

**Steps:**
1. Fill two cells in the same column with same value
2. Example: Set cell [0,0,0] = "a" and cell [0,5,0] = "a"
3. Click "Check" button

**Expected Results:**
- ✓ Validation fails
- ✓ Column conflict error shown
- ✓ Conflicting cells highlighted

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.5: Detect Beam (Depth) Conflict
**Priority:** P0

**Steps:**
1. Fill two cells in the same beam (depth line) with same value
2. Example: Set cell [0,0,0] = "3" and cell [0,0,10] = "3"
3. Click "Check" button

**Expected Results:**
- ✓ Validation fails
- ✓ Beam conflict error shown
- ✓ Conflicting cells highlighted

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.6: Detect Sub-Square Conflict
**Priority:** P0

**Steps:**
1. Fill two cells in the same 4×4 sub-square with same value
2. Example: On face k=0, set cell [0,0,0] = "b" and cell [2,2,0] = "b"
3. Click "Check" button

**Expected Results:**
- ✓ Validation fails
- ✓ Sub-square conflict error shown
- ✓ Conflicting cells highlighted
- ✓ Sub-square boundaries are correctly calculated

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.7: Multiple Simultaneous Errors
**Priority:** P1

**Steps:**
1. Create multiple conflicts:
   - Row conflict: [0,0,0] = "5", [5,0,0] = "5"
   - Column conflict: [1,0,0] = "a", [1,5,0] = "a"
   - Beam conflict: [2,1,0] = "3", [2,1,5] = "3"
2. Click "Check" button

**Expected Results:**
- ✓ All conflicts are detected and reported
- ✓ All conflicting cells are highlighted
- ✓ Error list shows all errors (not just first one)
- ✓ User can identify each error type

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.8: Validate After Fixing Errors
**Priority:** P0

**Steps:**
1. Create a row conflict: [0,0,0] = "5", [5,0,0] = "5"
2. Click "Check" - observe error
3. Change [5,0,0] to "6" (different value)
4. Click "Check" again

**Expected Results:**
- ✓ First validation shows error
- ✓ After fix, second validation passes
- ✓ Error highlights are cleared
- ✓ Success message shown

**Pass/Fail:** _____ **Notes:**

---

#### Test 6.9: Validation State Persistence
**Priority:** P1

**Steps:**
1. Create errors and validate (errors shown)
2. Save game (auto-save or explicit)
3. Reload page
4. Observe validation state

**Expected Results:**
- ✓ Validation state (isCorrect) is preserved
- ✓ Errors are NOT highlighted until user clicks "Check" again
- ✓ User must re-validate after reload to see highlights

**Pass/Fail:** _____ **Notes:**

---

### 7. Win Condition Detection

#### Test 7.1: Complete and Valid Cube
**Priority:** P0

**Steps:**
1. Fill entire cube with valid solution (no conflicts)
2. Note: Use a generated puzzle and solve it, or use test fixture
3. Click "Check" button

**Expected Results:**
- ✓ Validation passes (isCorrect = true)
- ✓ Game is marked complete (isComplete = true)
- ✓ Win condition triggered (isGameWon = true)
- ✓ Victory message/modal displayed
- ✓ Celebration animation or visual feedback (if implemented)
- ✓ Option to start new game is presented

**Pass/Fail:** _____ **Notes:**

---

#### Test 7.2: Complete but Invalid Cube
**Priority:** P0

**Steps:**
1. Fill entire cube with values, including at least one conflict
2. Example: Fill everything with "0" (all duplicates)
3. Click "Check" button

**Expected Results:**
- ✓ Validation fails (isCorrect = false)
- ✓ Game is marked complete (isComplete = true)
- ✓ Win condition NOT triggered (isGameWon = false)
- ✓ Error message: "Puzzle is complete but has errors"
- ✓ Errors are highlighted
- ✓ User can continue editing to fix errors

**Pass/Fail:** _____ **Notes:**

---

#### Test 7.3: Win After Fixing Errors
**Priority:** P1

**Steps:**
1. Fill cube completely but with errors
2. Validate - see errors
3. Fix all errors
4. Validate again

**Expected Results:**
- ✓ First validation fails
- ✓ After fixes, second validation passes and triggers win
- ✓ Win condition correctly detected after correction

**Pass/Fail:** _____ **Notes:**

---

### 8. Minimap Functionality

#### Test 8.1: Minimap Rendering
**Priority:** P0

**Steps:**
1. Load game with mix of filled/empty cells
2. Observe minimap in lower-left corner

**Expected Results:**
- ✓ Minimap is visible and sized appropriately
- ✓ Minimap shows miniature cube in canonical orientation
- ✓ Minimap does NOT show cell values (only colors)
- ✓ Filled cells show translucent colors
- ✓ Empty cells are transparent
- ✓ Minimap updates when cells are edited

**Pass/Fail:** _____ **Notes:**

---

#### Test 8.2: Minimap Face Highlighting
**Priority:** P0

**Steps:**
1. Enter face-on view by double-clicking a face
2. Observe minimap

**Expected Results:**
- ✓ Currently active face is highlighted in minimap
- ✓ Highlight is visually distinct (border, glow, or different color)
- ✓ Highlight matches the face being edited
- ✓ Highlight updates when switching faces

**Pass/Fail:** _____ **Notes:**

---

#### Test 8.3: Exit Face-On View via Minimap Double-Click
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Double-click anywhere on minimap

**Expected Results:**
- ✓ View returns to 3D rotational view
- ✓ Transition is smooth
- ✓ Camera resets to canonical orientation

**Pass/Fail:** _____ **Notes:**

---

#### Test 8.4: Minimap Always Visible
**Priority:** P1

**Steps:**
1. Test in 3D view
2. Test in face-on view
3. Test while rotating cube
4. Test at different zoom levels (if zoom implemented)

**Expected Results:**
- ✓ Minimap is always visible in all view modes
- ✓ Minimap doesn't overlap with critical UI elements
- ✓ Minimap position is fixed in corner

**Pass/Fail:** _____ **Notes:**

---

### 9. Keyboard Input & Shortcuts

#### Test 9.1: Hex Value Input (0-9, a-f)
**Priority:** P0

**Steps:**
1. Select a cell in face-on view
2. Type each valid character: 0-9, a-f, A-F

**Expected Results:**
- ✓ All valid hex digits are accepted
- ✓ Both lowercase and uppercase letters work
- ✓ Values are rendered consistently (all lowercase or all uppercase)

**Pass/Fail:** _____ **Notes:**

---

#### Test 9.2: Invalid Character Rejection
**Priority:** P0

**Steps:**
1. Select a cell
2. Type invalid characters: g, z, !, @, space, etc.

**Expected Results:**
- ✓ Invalid characters are silently ignored
- ✓ Cell value doesn't change
- ✓ No error messages (silent rejection is acceptable)

**Pass/Fail:** _____ **Notes:**

---

#### Test 9.3: Delete/Backspace to Clear Cell
**Priority:** P0

**Steps:**
1. Select a cell with a value
2. Press Delete key
3. Select another cell with value
4. Press Backspace key

**Expected Results:**
- ✓ Both Delete and Backspace clear cell values
- ✓ Cell becomes empty (renders blank)

**Pass/Fail:** _____ **Notes:**

---

#### Test 9.4: Keyboard Shortcuts (if implemented)
**Priority:** P2

**Steps:**
1. Try common shortcuts:
   - Esc: Exit face-on view
   - H: Home (reset camera)
   - N: New game
   - C: Check/validate
   - Space: Select next cell

**Expected Results:**
- ✓ Documented shortcuts work as described
- ✓ OR shortcuts not implemented (acceptable for MVP)

**Pass/Fail:** _____ **Notes:**

---

### 10. Mouse Interactions

#### Test 10.1: Cell Click Selection
**Priority:** P0

**Steps:**
1. In face-on view, click various cells

**Expected Results:**
- ✓ Click selects cell
- ✓ Visual feedback (border/highlight)
- ✓ Only editable cells are selectable
- ✓ Given cells don't select

**Pass/Fail:** _____ **Notes:**

---

#### Test 10.2: Face Double-Click to Enter Face-On View
**Priority:** P0

**Steps:**
1. In 3D view, double-click each face (i, j, k faces, positive and negative)

**Expected Results:**
- ✓ All six faces are clickable
- ✓ Double-click enters face-on view for that face
- ✓ Correct face orientation is displayed

**Pass/Fail:** _____ **Notes:**

---

#### Test 10.3: Middle-Mouse Drag Rotation
**Priority:** P0

**Steps:**
1. Click and hold middle mouse button
2. Drag in various directions
3. Release

**Expected Results:**
- ✓ Smooth rotation following mouse
- ✓ Works in all directions
- ✓ No lag or stutter

**Pass/Fail:** _____ **Notes:**

---

#### Test 10.4: Minimap Double-Click
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Double-click minimap

**Expected Results:**
- ✓ Returns to 3D view
- ✓ Smooth transition

**Pass/Fail:** _____ **Notes:**

---

#### Test 10.5: Scroll Wheel in Face-On View
**Priority:** P0

**Steps:**
1. Enter face-on view
2. Scroll mouse wheel forward and backward

**Expected Results:**
- ✓ Changes layers (depth navigation)
- ✓ Forward = deeper, backward = shallower
- ✓ Smooth layer transitions

**Pass/Fail:** _____ **Notes:**

---

### 11. LocalStorage Persistence

#### Test 11.1: Auto-Save After Cell Edit
**Priority:** P0

**Steps:**
1. Edit a cell value
2. Check console for auto-save message
3. Open DevTools → Application → Local Storage
4. Inspect stored game state JSON

**Expected Results:**
- ✓ Console logs: "Game state auto-saved"
- ✓ LocalStorage contains game state key
- ✓ JSON includes edited cell with correct value
- ✓ Save triggers within 1 second of edit

**Pass/Fail:** _____ **Notes:**

---

#### Test 11.2: Persistence Across Browser Sessions
**Priority:** P0

**Steps:**
1. Edit several cells
2. Close browser completely (not just tab)
3. Reopen browser and navigate to game

**Expected Results:**
- ✓ All edits are preserved
- ✓ Game state identical to before closing

**Pass/Fail:** _____ **Notes:**

---

#### Test 11.3: New Game Overwrites Previous Save
**Priority:** P1

**Steps:**
1. Play game A, make edits
2. Generate new game B
3. Reload page

**Expected Results:**
- ✓ Game B is loaded (not game A)
- ✓ Only one save slot exists
- ✓ Previous game is lost (expected behavior per spec)

**Pass/Fail:** _____ **Notes:**

---

#### Test 11.4: LocalStorage Full/Unavailable Handling
**Priority:** P2

**Steps:**
1. Simulate localStorage quota exceeded (fill with large data)
2. Edit cells in game
3. Observe behavior

**Expected Results:**
- ✓ Error logged to console
- ✓ Game continues to function
- ✓ User is notified (optional)
- ✓ No crash

**Pass/Fail:** _____ **Notes:**

---

### 12. View Transitions & Animations

#### Test 12.1: 3D to Face-On Transition Smoothness
**Priority:** P1

**Steps:**
1. From 3D view, double-click a face
2. Observe transition animation

**Expected Results:**
- ✓ Camera smoothly moves to face-on position
- ✓ No jerky movements or visual glitches
- ✓ Transition completes in reasonable time (< 1 second)
- ✓ Face aligns perfectly with viewport

**Pass/Fail:** _____ **Notes:**

---

#### Test 12.2: Layer Switching Animation
**Priority:** P1

**Steps:**
1. In face-on view, scroll through multiple layers
2. Observe opacity transitions

**Expected Results:**
- ✓ Current layer fades out smoothly
- ✓ Next layer fades in smoothly
- ✓ User sees discrete layers (no "stuck between" states)
- ✓ Animation feels responsive, not laggy

**Pass/Fail:** _____ **Notes:**

---

#### Test 12.3: Return to 3D View Transition
**Priority:** P1

**Steps:**
1. From face-on view, return to 3D (via minimap or home button)
2. Observe transition

**Expected Results:**
- ✓ Smooth camera movement
- ✓ No visual artifacts
- ✓ Returns to canonical orientation

**Pass/Fail:** _____ **Notes:**

---

### 13. Performance & Stress Testing

#### Test 13.1: Rendering Performance (60 FPS)
**Priority:** P1

**Steps:**
1. Load game with many filled cells
2. Rotate cube continuously in 3D view
3. Open browser DevTools → Performance tab
4. Monitor FPS counter

**Expected Results:**
- ✓ Maintains 60 FPS during rotation
- ✓ No dropped frames or stuttering
- ✓ Smooth animations
- ✓ Acceptable on recommended hardware

**Pass/Fail:** _____ **Notes:**

---

#### Test 13.2: Memory Leaks (Long Session)
**Priority:** P2

**Steps:**
1. Play game for extended period (30+ minutes)
2. Edit cells, switch views, validate repeatedly
3. Monitor browser memory usage in DevTools

**Expected Results:**
- ✓ Memory usage remains stable
- ✓ No continuous growth (leak)
- ✓ Garbage collection works properly

**Pass/Fail:** _____ **Notes:**

---

#### Test 13.3: Large State Save/Load Performance
**Priority:** P2

**Steps:**
1. Fill entire cube (4,096 cells)
2. Trigger auto-save
3. Reload page and measure load time

**Expected Results:**
- ✓ Save completes quickly (< 1 second)
- ✓ Load completes quickly (< 2 seconds)
- ✓ No UI freeze during save/load

**Pass/Fail:** _____ **Notes:**

---

#### Test 13.4: Rapid Input Handling
**Priority:** P2

**Steps:**
1. Select cells and type values very rapidly
2. Switch layers quickly while editing
3. Rotate cube rapidly while rendering many cells

**Expected Results:**
- ✓ All inputs are registered correctly
- ✓ No dropped keystrokes
- ✓ No race conditions
- ✓ Auto-save doesn't block UI

**Pass/Fail:** _____ **Notes:**

---

### 14. Edge Cases & Error Scenarios

#### Test 14.1: Empty Puzzle Generation (Impossible)
**Priority:** P3

**Steps:**
1. This should not occur, but verify generator doesn't produce empty puzzle

**Expected Results:**
- ✓ Generated puzzles always have given cells
- ✓ Easy mode: ~70% filled

**Pass/Fail:** _____ **Notes:**

---

#### Test 14.2: Double-Click Spam
**Priority:** P2

**Steps:**
1. Rapidly double-click faces multiple times
2. Double-click minimap repeatedly

**Expected Results:**
- ✓ Only one transition triggers per double-click
- ✓ No multiple overlapping transitions
- ✓ No crashes or visual glitches

**Pass/Fail:** _____ **Notes:**

---

#### Test 14.3: Editing During View Transition
**Priority:** P2

**Steps:**
1. Initiate transition from 3D to face-on
2. During animation, attempt to edit cells or click faces

**Expected Results:**
- ✓ Inputs during transition are ignored or queued
- ✓ No errors or undefined behavior
- ✓ Transition completes cleanly

**Pass/Fail:** _____ **Notes:**

---

#### Test 14.4: Browser Zoom Level Changes
**Priority:** P2

**Steps:**
1. Load game at 100% browser zoom
2. Change zoom to 150%, 200%, 50%
3. Test interactions at each zoom level

**Expected Results:**
- ✓ Game remains playable at all zoom levels
- ✓ Click targets scale correctly
- ✓ Minimap remains visible
- ✓ Text remains readable

**Pass/Fail:** _____ **Notes:**

---

#### Test 14.5: Window Resize Handling
**Priority:** P1

**Steps:**
1. Load game in full screen
2. Resize browser window to various sizes
3. Test interactions after resize

**Expected Results:**
- ✓ Game canvas resizes to fit window
- ✓ Aspect ratio is maintained (or adjusted gracefully)
- ✓ Minimap repositions correctly
- ✓ No layout breakage

**Pass/Fail:** _____ **Notes:**

---

#### Test 14.6: Browser Tab Visibility Changes
**Priority:** P2

**Steps:**
1. Play game with auto-save
2. Switch to another browser tab for 5+ minutes
3. Return to game tab

**Expected Results:**
- ✓ Game state is preserved
- ✓ Animations resume smoothly
- ✓ No errors in console
- ✓ Auto-save still works

**Pass/Fail:** _____ **Notes:**

---

### 15. Browser Compatibility

#### Test 15.1: Chrome/Chromium
**Priority:** P0

**Steps:**
1. Run full test suite on latest Chrome
2. Note version number

**Expected Results:**
- ✓ All features work
- ✓ 60 FPS performance
- ✓ No console errors

**Chrome Version:** _____ **Pass/Fail:** _____ **Notes:**

---

#### Test 15.2: Firefox
**Priority:** P0

**Steps:**
1. Run full test suite on latest Firefox
2. Note version number

**Expected Results:**
- ✓ All features work
- ✓ WebGL rendering correct
- ✓ Performance acceptable (may vary from Chrome)

**Firefox Version:** _____ **Pass/Fail:** _____ **Notes:**

---

#### Test 15.3: Safari
**Priority:** P1

**Steps:**
1. Run full test suite on latest Safari (macOS)
2. Note version number

**Expected Results:**
- ✓ All features work
- ✓ Three.js renders correctly
- ✓ LocalStorage works
- ✓ Mouse interactions work (note: Mac has no middle button typically - use option+click or equivalent)

**Safari Version:** _____ **Pass/Fail:** _____ **Notes:**

---

#### Test 15.4: Edge
**Priority:** P1

**Steps:**
1. Run full test suite on latest Edge
2. Note version number

**Expected Results:**
- ✓ All features work (Chromium-based, should match Chrome)

**Edge Version:** _____ **Pass/Fail:** _____ **Notes:**

---

### 16. User Experience & Usability

#### Test 16.1: First-Time User Experience
**Priority:** P1

**Steps:**
1. Give game to user who has never seen it before
2. Observe without instructions
3. Ask them to try to play

**Expected Results:**
- ✓ User can figure out how to rotate cube
- ✓ User discovers double-click to enter face-on view
- ✓ User understands how to edit cells
- ✓ Controls feel intuitive
- ✓ Console log on load: "Hex-Do-Cube ready! Double-click on a face to enter editing view." helps

**Pass/Fail:** _____ **Notes:**

---

#### Test 16.2: Visual Clarity
**Priority:** P1

**Steps:**
1. View game on different monitor types (LCD, OLED, etc.)
2. Check readability at various angles

**Expected Results:**
- ✓ Cell values are readable
- ✓ Given vs editable cells are distinguishable
- ✓ Error highlights are obvious
- ✓ Colors don't clash or confuse

**Pass/Fail:** _____ **Notes:**

---

#### Test 16.3: Accessibility (Basic)
**Priority:** P2

**Steps:**
1. Check color contrast for text
2. Test with larger system fonts
3. Test with high contrast mode (if applicable)

**Expected Results:**
- ✓ Text passes WCAG contrast guidelines (or note issues)
- ✓ Game works with larger fonts
- ✓ Note: Full accessibility (screen readers, etc.) is future work

**Pass/Fail:** _____ **Notes:**

---

### 17. Console & DevTools Verification

#### Test 17.1: No Console Errors in Happy Path
**Priority:** P0

**Steps:**
1. Open DevTools console
2. Play through normal game flow: load → edit → validate → new game
3. Monitor for errors, warnings

**Expected Results:**
- ✓ No red errors in console
- ✓ Warnings are acceptable if documented
- ✓ Info/log messages are present and helpful

**Pass/Fail:** _____ **Notes:**

---

#### Test 17.2: Console Logging Clarity
**Priority:** P2

**Steps:**
1. Review all console.log messages during gameplay

**Expected Results:**
- ✓ Logs are informative for debugging
- ✓ No excessive logging (spam)
- ✓ Critical events are logged (save, load, validation, errors)

**Pass/Fail:** _____ **Notes:**

---

#### Test 17.3: Network Tab (No Unexpected Requests)
**Priority:** P2

**Steps:**
1. Open DevTools → Network tab
2. Play game for several minutes

**Expected Results:**
- ✓ No unexpected network requests (game is local-only)
- ✓ Only initial resource loads (HTML, JS, CSS)

**Pass/Fail:** _____ **Notes:**

---

## Test Execution Summary

### Overall Test Results

- **Total Tests:** 90+
- **Tests Passed:** _____
- **Tests Failed:** _____
- **Tests Skipped/N/A:** _____
- **Pass Rate:** _____%

### Critical Issues Found

| ID | Severity | Description | Test(s) |
|----|----------|-------------|---------|
| 1  |          |             |         |
| 2  |          |             |         |
| 3  |          |             |         |

### Known Limitations (As Per Spec)

1. **No mobile/touch support** - Desktop only (future work)
2. **Single difficulty level** - Only "Easy" implemented (Medium/Hard future work)
3. **No undo/redo** - Future work
4. **No hint system** - Future work
5. **Single save slot** - No multiple saves
6. **No timer/scoring** - Future work
7. **Puzzle generation is slow** - 2-5 minutes expected for Easy difficulty

### Recommended Browsers

Based on testing:
- ✅ **Chrome 90+** (Primary)
- ✅ **Firefox 88+** (Recommended)
- ✅ **Safari 14+** (macOS only)
- ✅ **Edge 90+** (Chromium)

### Test Environment Details

- **Date Tested:** _____
- **Tester Name:** _____
- **Build Version/Commit:** _____
- **Operating System:** _____
- **Primary Browser Tested:** _____

---

## Appendix: Quick Smoke Test Checklist

For rapid verification after builds, run this abbreviated test:

- [ ] Load game - no console errors
- [ ] Rotate cube with middle mouse - smooth
- [ ] Double-click face - enter face-on view
- [ ] Edit cell - value appears
- [ ] Scroll wheel - layer changes
- [ ] Create duplicate - validate shows error
- [ ] Fix duplicate - validate passes
- [ ] Double-click minimap - return to 3D
- [ ] Reload page - edits persist
- [ ] Generate new puzzle - completes successfully

**Smoke Test Time:** ~5 minutes

---

## Appendix: Bug Report Template

```markdown
### Bug Report

**Title:** [Brief description]

**Severity:** [Critical / High / Medium / Low]

**Test Case:** [Test ID from this document]

**Environment:**
- Browser: [Name & version]
- OS: [Operating system]
- Screen Resolution: [e.g., 1920x1080]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots/Video:**
[If applicable]

**Console Errors:**
```
[Paste any errors here]
```

**Frequency:** [Always / Sometimes / Rare]

**Workaround:** [If known]

**Notes:**
[Any additional context]
```

---

## Document Metadata

- **Version:** 1.0
- **Last Updated:** 2026-01-07
- **Author:** Sculptor (Imbue Agent)
- **Related Docs:** `/code/ARCHITECTURE.md`, `/code/README.md`, `/code/AGENTS.md`
- **Test Coverage:** Manual testing plan for Hex-Do-Cube MVP
- **Task ID:** code-8j2.5
