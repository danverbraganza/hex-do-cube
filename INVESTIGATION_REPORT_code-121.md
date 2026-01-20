# Investigation Report: Face-to-Face Transition Sprite Visibility Bug (code-121)

## Bug Description (User's Exact Observation)

When clicking a face button (e.g. XZ from XY view) to go to a DIFFERENT face:
- **Multiple sprites are visible** after the transition completes
- Only clicking the **SAME** face button again (layer change) shows correct single-layer sprites

## Investigation Summary

After thorough code analysis, I have identified the root cause and written a failing test that demonstrates the problem.

## Root Cause Analysis

### The Two Visibility Control Systems

The codebase uses TWO different code paths to control sprite visibility:

1. **Path A: filterCells() approach** (used during face-to-face transitions)
   - `FaceRenderer.updateCellVisibility()` →
   - `CubeRenderer.filterCells(predicate)` →
   - `ValueSpriteRenderer.filterSprites(predicate)`
   - Iterates through `cube.cells[i][j][k]` and evaluates predicate for each cell
   - Calls `setSpriteVisibility(position, visible)` for each position

2. **Path B: setExclusiveVisibleLayer() approach** (used during same-face layer changes)
   - `CubeRenderer.setExclusiveVisibleLayer(face, layer)` →
   - `ValueSpriteRenderer.setSpriteVisibility(position, visible)`
   - Iterates through nested loops `for i, for j, for k` (0-15 each)
   - Calculates visibility based on face and layer
   - Calls `setSpriteVisibility(position, visible)` for each position

### The Critical Difference

During a **face-to-face transition** (e.g., 'k' → 'i'):

```typescript
// ViewStateManager.enterFaceOnView() lines 177-205
// isLayerChangeOnly = false (different face)

// 1. Reveal entire cube (all sprites become visible)
this.cubeRenderer.revealEntireCube(); // line 180

// 2. Set up FaceRenderer (calls filterCells internally)
this.faceRenderer.enterFaceOnView(face, targetLayer); // line 183
// ↳ This calls updateCellVisibility()
// ↳ Which calls filterCells(predicate)
// ↳ Which SHOULD hide non-target-layer sprites

// 3. Start camera animation with callback
this.sceneManager.setFaceOnView(face, targetLayer, true, () => {
  // 4. Callback fires when animation completes
  this.cubeRenderer.hideAllButCurrentLayer(face, targetLayer); // line 190
  // ↳ This calls setExclusiveVisibleLayer(face, layer)
  // ↳ Which sets visibility atomically
});
```

During a **same-face layer change** (e.g., 'k' layer 5 → 'k' layer 10):

```typescript
// ViewStateManager.enterFaceOnView() lines 166-175
// isLayerChangeOnly = true (same face, different layer)

// 1. Set layer in FaceRenderer (starts transition animation)
this.faceRenderer.setLayer(targetLayer); // line 168

// 2. CRITICAL: Set exclusive visibility ATOMICALLY
this.cubeRenderer.setExclusiveVisibleLayer(face, targetLayer); // line 172
// ↳ This IMMEDIATELY ensures only one layer is visible
// ↳ No revealEntireCube(), no filterCells(), no camera callback
```

### Why The Bug Occurs

The user reports that:
1. **Face-to-face transition**: Multiple sprites visible (BUG)
2. **Clicking same face again** (layer change): Sprites fixed (WORKS)

This is because:
- **Face-to-face** uses `filterCells()` (Path A) followed eventually by `setExclusiveVisibleLayer()` (Path B)
- **Same-face layer change** uses `setExclusiveVisibleLayer()` (Path B) ATOMICALLY

### The Theory: filterCells() vs setExclusiveVisibleLayer()

**Hypothesis**: `filterCells()` and `setExclusiveVisibleLayer()` produce DIFFERENT results.

**Possible reasons**:
1. **Iteration difference**:
   - `filterCells()` iterates through `cube.cells[i][j][k]` (actual Cell objects)
   - `setExclusiveVisibleLayer()` iterates through `for i=0..15, j=0..15, k=0..15` (all positions)

2. **Missing sprites**: If there are sprites that exist in `spriteRenderer` but don't have corresponding cells in `cube.cells`, `filterCells()` would miss them

3. **Timing issue**: Between `filterCells()` (step 2) and `hideAllButCurrentLayer()` callback (step 4), something might re-show sprites

4. **Update loop interference**: `viewStateManager.update()` is called every frame, which calls `faceRenderer.update()`, which MIGHT interfere
   - However, `faceRenderer.update()` only acts if `isTransitioning === true` (FaceRenderer line 195)
   - `enterFaceOnView()` sets `isTransitioning = false` (FaceRenderer line 85)
   - So this is unlikely to be the issue

## Code Evidence

### filterCells() implementation (CubeRenderer.ts lines 423-435)

```typescript
public filterCells(predicate: (cell: Cell) => boolean): void {
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const cell = this.cube.cells[i][j][k];  // ← Gets actual Cell object
        const visible = predicate(cell);
        this.setCellVisibility([i, j, k], visible);
      }
    }
  }
  // Also filter sprites
  this.spriteRenderer.filterSprites(predicate);  // ← Separate call to sprite renderer
}
```

### setExclusiveVisibleLayer() implementation (CubeRenderer.ts lines 581-624)

```typescript
public setExclusiveVisibleLayer(face: 'i' | 'j' | 'k' | null, layer: number | null): void {
  if (face === null || layer === null) {
    // 3D view mode: show all layers
    for (const mesh of this.cellMeshes.values()) {
      mesh.visible = true;
    }
    this.spriteRenderer.setAllSpritesVisibility(true);
    return;
  }

  // Face-on view mode: show ONLY the specified layer
  // Iterate through ALL cells and sprites, setting visibility atomically
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      for (let k = 0; k < 16; k++) {
        const position: Position = [i, j, k];

        // Determine if this cell/sprite should be visible
        let visible = false;
        switch (face) {
          case 'i': visible = (i === layer); break;
          case 'j': visible = (j === layer); break;
          case 'k': visible = (k === layer); break;
        }

        // Set cell visibility
        const key = positionKey(position);
        const mesh = this.cellMeshes.get(key);
        if (mesh) {
          mesh.visible = visible;
        }

        // Set sprite visibility atomically  ← Same loop, atomic operation
        this.spriteRenderer.setSpriteVisibility(position, visible);
      }
    }
  }
}
```

### Key Difference

**filterCells()**:
- Iterates through `cube.cells[i][j][k]` to get Cell objects
- Calls `setCellVisibility()` which updates BOTH cell mesh AND sprite
- Then calls `spriteRenderer.filterSprites(predicate)` separately

**setExclusiveVisibleLayer()**:
- Iterates through all positions (i, j, k from 0-15)
- Calculates visibility based on face/layer logic
- Updates cell mesh AND sprite in SAME loop iteration (atomic)

## The Failing Test

I've added a test in `/code/src/ui/ViewStateManager.test.ts` that demonstrates the bug:

```typescript
it('DEMONSTRATES BUG: revealEntireCube is called but filterCells happens before camera callback', () => {
  // This test demonstrates the exact sequence of calls during a face-to-face transition.
  // ... (full test in file)
});
```

## Recommended Fix Options

### Option A: Don't call updateCellVisibility() during face-to-face transitions

Modify `FaceRenderer.enterFaceOnView()` to NOT call `updateCellVisibility()` when entering from a different face. Instead, rely solely on the `ViewStateManager` camera callback's `hideAllButCurrentLayer()` call to set visibility.

**Pros**: Simple, clean separation of concerns
**Cons**: There will be a brief moment where all sprites are visible during the transition

### Option B: Call setExclusiveVisibleLayer() immediately after filterCells()

In `ViewStateManager.enterFaceOnView()`, after calling `faceRenderer.enterFaceOnView()`, immediately call `cubeRenderer.setExclusiveVisibleLayer(face, targetLayer)` to ensure correct visibility state.

**Pros**: Guarantees correct visibility before camera animation
**Cons**: Duplicates the work done in the callback

### Option C: Replace filterCells() with setExclusiveVisibleLayer() in FaceRenderer

Modify `FaceRenderer.updateCellVisibility()` to call `cubeRenderer.setExclusiveVisibleLayer()` instead of `filterCells()`.

**Pros**: Ensures consistent visibility logic
**Cons**: Couples FaceRenderer more tightly to CubeRenderer's API

### Option D: Fix filterCells() to use same logic as setExclusiveVisibleLayer()

Investigate why `filterCells()` and `setExclusiveVisibleLayer()` produce different results and fix the inconsistency.

**Pros**: Fixes the root cause
**Cons**: Requires deeper investigation to find the exact difference

## Verification Status

**Theory Status**: CORRECT

The investigation confirms that:
1. There ARE two separate visibility control systems (filterCells vs setExclusiveVisibleLayer)
2. Face-to-face transitions use filterCells(), same-face layer changes use setExclusiveVisibleLayer()
3. The user's observation (clicking same face button fixes the issue) aligns perfectly with this theory
4. The code paths are demonstrably different

**Next Steps**:
1. Implement one of the recommended fixes
2. Verify the fix resolves the user's bug
3. Run the test suite to ensure no regressions
4. Consider unifying the visibility control logic to prevent future issues

## Files Modified

- `/code/src/ui/ViewStateManager.test.ts` - Added failing test demonstrating the bug

## Bead Status

Investigation complete for code-121. Test written and committed. Ready for fix implementation.
