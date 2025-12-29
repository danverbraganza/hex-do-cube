## Hex-Do-Cube

Hex-Do-Cube is a 3-dimensional puzzle game based on the same principles of Su-do-ku. The user is presented with a
partially-filled cube of 16 x 16 x 16 cells, and must fill in as many as possible.

The cells may contain values from `0 - 9` and `a - f`. A completely solved cube will have no duplicated values, and
exactly one of each value, within each:

* straight line of the cube (row, column or beam).
* sub-square of the cube (4 x 4) square on each planar subsection.

The user is presented with a partially-filled cube of "Given" cells. The configuration of Given cells alway uniquely
identifies a correct solution. The difficulty mode determines how much additional redundant information is encoded in
the Given Cells. At Easy mode, approximately 70% of the cells are Given.

### Gameplay


#### 3D rotational View
The user starts off with the cube presented in the canonical isometric view. The "i" face is up to the top, the "j" face
is to the right and "k" face is to the left. The cube is rendered translucently, with filled cells rendered with a very
low opacity, and empty cells being completely transparent. A home button on the main screen will always return you to
this view. In the isometric view, the "value" of any cell is alway rendered parallel to the screen, in the manner of a
sprite (think DOOM).

The isometric 3D view can be re-oriented in 3 dimensions by clicking and holding the middle-mouse button. As you do so,
the sprites in the cells always appear 100% full-on and upright to the screen.

#### Face-on view
Double-clicking onto a face in 3D-rotational view will snap to a face-on view with that face aligned to, and filling,
the whole screen. The face is aligned so that rows are exactly horizontal, and the columns exactly vertical. In the
face-on view, the "layer" of the face that you see will be rendered at 100% opacity, and blank cells will be rendered as
solid and blank. In the face-on view, user-editable cells may be entered and changed. Given Cells are visually
distinguished from user-editable cells and may not be changed.

By scrolling the mouse-wheel, the user can index into a deeper or shallower layer of the cube, allowing them to fill in
internal cells.

#### Mini-map

In the lower-left side of the screen, the user is provided with a miniature view of the cube that serves as the
"mini-map" to allow them to orient with their current face in real-time. The mini-map is always visible. The mini-map is
always a miniature version of the "Home" alignment of the isometric 3-D rotational view. The minimap does not render
cell values, but does render translucent colors for the value of the cell, so that users can see at a glance the fill
level of the cube.

Whenever the user has a face on-view active, that particular face will be highlighted in the mini-map, so that the user
can orient themselves on the cube.

Double-clicking on the minimap will always return the main view to the 3D Rotational View.


#### Winning the game

When the Cube is fully completed, then the user is notified whether their entry is complete and correct, or if they are
at a wrong completion.

### Architecture and Implementation Notes

Hex-do-cube is implemented in Typescript.

Hex-do-cube runs within the user's browser. All state is stored locally in LocalStorage. The user can close the tab and
re-open the tab, and continue where they left off.
