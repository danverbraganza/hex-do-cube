import { describe, expect, it } from 'bun:test';
import {
  countFilledCells,
  createCube,
  getCell,
  isCubeFilled,
  setCell,
} from './Cube.js';
import { createCell, createEmptyCell, type HexValue, type Position } from './Cell.js';

describe('Cube Model', () => {
  describe('createCube', () => {
    it('should create a 16x16x16 cube with empty cells', () => {
      const cube = createCube();
      expect(cube.cells).toBeDefined();
      expect(cube.cells.length).toBe(16);
      expect(cube.cells[0].length).toBe(16);
      expect(cube.cells[0][0].length).toBe(16);
    });

    it('should initialize all cells as empty and editable', () => {
      const cube = createCube();
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            const cell = cube.cells[i][j][k];
            expect(cell.value).toBe(null);
            expect(cell.type).toBe('editable');
            expect(cell.position).toEqual([i, j, k]);
          }
        }
      }
    });

    it('should have all required methods', () => {
      const cube = createCube();
      expect(typeof cube.validate).toBe('function');
      expect(typeof cube.getRow).toBe('function');
      expect(typeof cube.getColumn).toBe('function');
      expect(typeof cube.getBeam).toBe('function');
      expect(typeof cube.getSubSquare).toBe('function');
    });
  });

  describe('getRow', () => {
    it('should return 16 cells for a row (i varies, j and k fixed)', () => {
      const cube = createCube();
      const row = cube.getRow(0, 0);
      expect(row.length).toBe(16);
    });

    it('should return correct cells for a row', () => {
      const cube = createCube();
      const row = cube.getRow(5, 10);
      for (let i = 0; i < 16; i++) {
        expect(row[i]).toBe(cube.cells[i][5][10]);
        expect(row[i].position).toEqual([i, 5, 10]);
      }
    });

    it('should work for boundary coordinates', () => {
      const cube = createCube();
      const row1 = cube.getRow(0, 0);
      const row2 = cube.getRow(15, 15);
      expect(row1.length).toBe(16);
      expect(row2.length).toBe(16);
      expect(row1[0].position).toEqual([0, 0, 0]);
      expect(row2[15].position).toEqual([15, 15, 15]);
    });

    it('should throw for invalid j coordinate', () => {
      const cube = createCube();
      expect(() => cube.getRow(-1, 0)).toThrow('j must be an integer in [0, 15]');
      expect(() => cube.getRow(16, 0)).toThrow('j must be an integer in [0, 15]');
      expect(() => cube.getRow(1.5, 0)).toThrow('j must be an integer in [0, 15]');
    });

    it('should throw for invalid k coordinate', () => {
      const cube = createCube();
      expect(() => cube.getRow(0, -1)).toThrow('k must be an integer in [0, 15]');
      expect(() => cube.getRow(0, 16)).toThrow('k must be an integer in [0, 15]');
      expect(() => cube.getRow(0, 2.5)).toThrow('k must be an integer in [0, 15]');
    });
  });

  describe('getColumn', () => {
    it('should return 16 cells for a column (j varies, i and k fixed)', () => {
      const cube = createCube();
      const column = cube.getColumn(0, 0);
      expect(column.length).toBe(16);
    });

    it('should return correct cells for a column', () => {
      const cube = createCube();
      const column = cube.getColumn(7, 3);
      for (let j = 0; j < 16; j++) {
        expect(column[j]).toBe(cube.cells[7][j][3]);
        expect(column[j].position).toEqual([7, j, 3]);
      }
    });

    it('should work for boundary coordinates', () => {
      const cube = createCube();
      const column1 = cube.getColumn(0, 0);
      const column2 = cube.getColumn(15, 15);
      expect(column1.length).toBe(16);
      expect(column2.length).toBe(16);
      expect(column1[0].position).toEqual([0, 0, 0]);
      expect(column2[15].position).toEqual([15, 15, 15]);
    });

    it('should throw for invalid i coordinate', () => {
      const cube = createCube();
      expect(() => cube.getColumn(-1, 0)).toThrow('i must be an integer in [0, 15]');
      expect(() => cube.getColumn(16, 0)).toThrow('i must be an integer in [0, 15]');
      expect(() => cube.getColumn(1.5, 0)).toThrow('i must be an integer in [0, 15]');
    });

    it('should throw for invalid k coordinate', () => {
      const cube = createCube();
      expect(() => cube.getColumn(0, -1)).toThrow('k must be an integer in [0, 15]');
      expect(() => cube.getColumn(0, 16)).toThrow('k must be an integer in [0, 15]');
      expect(() => cube.getColumn(0, 2.5)).toThrow('k must be an integer in [0, 15]');
    });
  });

  describe('getBeam', () => {
    it('should return 16 cells for a beam (k varies, i and j fixed)', () => {
      const cube = createCube();
      const beam = cube.getBeam(0, 0);
      expect(beam.length).toBe(16);
    });

    it('should return correct cells for a beam', () => {
      const cube = createCube();
      const beam = cube.getBeam(8, 12);
      for (let k = 0; k < 16; k++) {
        expect(beam[k]).toBe(cube.cells[8][12][k]);
        expect(beam[k].position).toEqual([8, 12, k]);
      }
    });

    it('should work for boundary coordinates', () => {
      const cube = createCube();
      const beam1 = cube.getBeam(0, 0);
      const beam2 = cube.getBeam(15, 15);
      expect(beam1.length).toBe(16);
      expect(beam2.length).toBe(16);
      expect(beam1[0].position).toEqual([0, 0, 0]);
      expect(beam2[15].position).toEqual([15, 15, 15]);
    });

    it('should throw for invalid i coordinate', () => {
      const cube = createCube();
      expect(() => cube.getBeam(-1, 0)).toThrow('i must be an integer in [0, 15]');
      expect(() => cube.getBeam(16, 0)).toThrow('i must be an integer in [0, 15]');
      expect(() => cube.getBeam(1.5, 0)).toThrow('i must be an integer in [0, 15]');
    });

    it('should throw for invalid j coordinate', () => {
      const cube = createCube();
      expect(() => cube.getBeam(0, -1)).toThrow('j must be an integer in [0, 15]');
      expect(() => cube.getBeam(0, 16)).toThrow('j must be an integer in [0, 15]');
      expect(() => cube.getBeam(0, 2.5)).toThrow('j must be an integer in [0, 15]');
    });
  });

  describe('getSubSquare', () => {
    it('should return 16 cells for a 4x4 sub-square', () => {
      const cube = createCube();
      const subSquare = cube.getSubSquare('i', 0, 0, 0);
      expect(subSquare.length).toBe(16);
    });

    describe('i-face sub-squares', () => {
      it('should return correct cells for i-face (i constant, j and k vary)', () => {
        const cube = createCube();
        const subSquare = cube.getSubSquare('i', 5, 1, 2);

        // subRow=1, subCol=2 means j starts at 4, k starts at 8
        let index = 0;
        for (let jOffset = 0; jOffset < 4; jOffset++) {
          for (let kOffset = 0; kOffset < 4; kOffset++) {
            const expectedPos: Position = [5, 4 + jOffset, 8 + kOffset];
            expect(subSquare[index].position).toEqual(expectedPos);
            expect(subSquare[index]).toBe(cube.cells[5][4 + jOffset][8 + kOffset]);
            index++;
          }
        }
      });

      it('should work for all i-face sub-square positions', () => {
        const cube = createCube();
        for (let subRow = 0; subRow < 4; subRow++) {
          for (let subCol = 0; subCol < 4; subCol++) {
            const subSquare = cube.getSubSquare('i', 0, subRow, subCol);
            expect(subSquare.length).toBe(16);
          }
        }
      });
    });

    describe('j-face sub-squares', () => {
      it('should return correct cells for j-face (j constant, i and k vary)', () => {
        const cube = createCube();
        const subSquare = cube.getSubSquare('j', 10, 2, 3);

        // subRow=2, subCol=3 means i starts at 8, k starts at 12
        let index = 0;
        for (let iOffset = 0; iOffset < 4; iOffset++) {
          for (let kOffset = 0; kOffset < 4; kOffset++) {
            const expectedPos: Position = [8 + iOffset, 10, 12 + kOffset];
            expect(subSquare[index].position).toEqual(expectedPos);
            expect(subSquare[index]).toBe(cube.cells[8 + iOffset][10][12 + kOffset]);
            index++;
          }
        }
      });

      it('should work for all j-face sub-square positions', () => {
        const cube = createCube();
        for (let subRow = 0; subRow < 4; subRow++) {
          for (let subCol = 0; subCol < 4; subCol++) {
            const subSquare = cube.getSubSquare('j', 0, subRow, subCol);
            expect(subSquare.length).toBe(16);
          }
        }
      });
    });

    describe('k-face sub-squares', () => {
      it('should return correct cells for k-face (k constant, i and j vary)', () => {
        const cube = createCube();
        const subSquare = cube.getSubSquare('k', 15, 0, 1);

        // subRow=0, subCol=1 means i starts at 0, j starts at 4
        let index = 0;
        for (let iOffset = 0; iOffset < 4; iOffset++) {
          for (let jOffset = 0; jOffset < 4; jOffset++) {
            const expectedPos: Position = [0 + iOffset, 4 + jOffset, 15];
            expect(subSquare[index].position).toEqual(expectedPos);
            expect(subSquare[index]).toBe(cube.cells[0 + iOffset][4 + jOffset][15]);
            index++;
          }
        }
      });

      it('should work for all k-face sub-square positions', () => {
        const cube = createCube();
        for (let subRow = 0; subRow < 4; subRow++) {
          for (let subCol = 0; subCol < 4; subCol++) {
            const subSquare = cube.getSubSquare('k', 0, subRow, subCol);
            expect(subSquare.length).toBe(16);
          }
        }
      });
    });

    it('should throw for invalid face', () => {
      const cube = createCube();
      // @ts-expect-error - Testing runtime validation
      expect(() => cube.getSubSquare('x', 0, 0, 0)).toThrow("Invalid face: x. Must be 'i', 'j', or 'k'");
    });

    it('should throw for invalid layer coordinate', () => {
      const cube = createCube();
      expect(() => cube.getSubSquare('i', -1, 0, 0)).toThrow('layer must be an integer in [0, 15]');
      expect(() => cube.getSubSquare('i', 16, 0, 0)).toThrow('layer must be an integer in [0, 15]');
      expect(() => cube.getSubSquare('i', 1.5, 0, 0)).toThrow('layer must be an integer in [0, 15]');
    });

    it('should throw for invalid subRow coordinate', () => {
      const cube = createCube();
      expect(() => cube.getSubSquare('i', 0, -1, 0)).toThrow('subRow must be an integer in [0, 3]');
      expect(() => cube.getSubSquare('i', 0, 4, 0)).toThrow('subRow must be an integer in [0, 3]');
      expect(() => cube.getSubSquare('i', 0, 1.5, 0)).toThrow('subRow must be an integer in [0, 3]');
    });

    it('should throw for invalid subCol coordinate', () => {
      const cube = createCube();
      expect(() => cube.getSubSquare('i', 0, 0, -1)).toThrow('subCol must be an integer in [0, 3]');
      expect(() => cube.getSubSquare('i', 0, 0, 4)).toThrow('subCol must be an integer in [0, 3]');
      expect(() => cube.getSubSquare('i', 0, 0, 1.5)).toThrow('subCol must be an integer in [0, 3]');
    });
  });

  describe('getCell', () => {
    it('should return the cell at the specified position', () => {
      const cube = createCube();
      const cell = getCell(cube, [5, 10, 15]);
      expect(cell).toBe(cube.cells[5][10][15]);
      expect(cell.position).toEqual([5, 10, 15]);
    });

    it('should work for boundary positions', () => {
      const cube = createCube();
      const cell1 = getCell(cube, [0, 0, 0]);
      const cell2 = getCell(cube, [15, 15, 15]);
      expect(cell1.position).toEqual([0, 0, 0]);
      expect(cell2.position).toEqual([15, 15, 15]);
    });

    it('should throw for invalid position coordinates', () => {
      const cube = createCube();
      expect(() => getCell(cube, [-1, 0, 0])).toThrow('i must be an integer in [0, 15]');
      expect(() => getCell(cube, [0, 16, 0])).toThrow('j must be an integer in [0, 15]');
      expect(() => getCell(cube, [0, 0, 20])).toThrow('k must be an integer in [0, 15]');
    });
  });

  describe('setCell', () => {
    it('should set the cell at the specified position', () => {
      const cube = createCube();
      const newCell = createCell([7, 8, 9], 'a', 'editable');
      setCell(cube, [7, 8, 9], newCell);
      expect(cube.cells[7][8][9]).toBe(newCell);
    });

    it('should replace existing cell', () => {
      const cube = createCube();
      const oldCell = cube.cells[3][4][5];
      const newCell = createCell([3, 4, 5], 'b', 'given');
      setCell(cube, [3, 4, 5], newCell);
      expect(cube.cells[3][4][5]).toBe(newCell);
      expect(cube.cells[3][4][5]).not.toBe(oldCell);
    });

    it('should work for boundary positions', () => {
      const cube = createCube();
      const cell1 = createCell([0, 0, 0], 'f', 'editable');
      const cell2 = createCell([15, 15, 15], '0', 'given');
      setCell(cube, [0, 0, 0], cell1);
      setCell(cube, [15, 15, 15], cell2);
      expect(cube.cells[0][0][0]).toBe(cell1);
      expect(cube.cells[15][15][15]).toBe(cell2);
    });

    it('should throw for invalid position coordinates', () => {
      const cube = createCube();
      const cell = createEmptyCell([0, 0, 0]);
      expect(() => setCell(cube, [-1, 0, 0], cell)).toThrow('i must be an integer in [0, 15]');
      expect(() => setCell(cube, [0, 16, 0], cell)).toThrow('j must be an integer in [0, 15]');
      expect(() => setCell(cube, [0, 0, 20], cell)).toThrow('k must be an integer in [0, 15]');
    });
  });

  describe('validate', () => {
    it('should return valid for an empty cube', () => {
      const cube = createCube();
      const result = cube.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect duplicate values in a row', () => {
      const cube = createCube();
      // Set duplicate '5' in row (j=0, k=0)
      cube.cells[0][0][0].value = '5';
      cube.cells[5][0][0].value = '5';

      const result = cube.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const rowError = result.errors.find(e => e.type === 'row' && e.description.includes('j=0, k=0'));
      expect(rowError).toBeDefined();
      expect(rowError?.cells).toContainEqual([0, 0, 0] as Position);
      expect(rowError?.cells).toContainEqual([5, 0, 0] as Position);
    });

    it('should detect duplicate values in a column', () => {
      const cube = createCube();
      // Set duplicate 'a' in column (i=3, k=7)
      cube.cells[3][2][7].value = 'a';
      cube.cells[3][10][7].value = 'a';

      const result = cube.validate();
      expect(result.isValid).toBe(false);

      const columnError = result.errors.find(e => e.type === 'column' && e.description.includes('i=3, k=7'));
      expect(columnError).toBeDefined();
      expect(columnError?.cells).toContainEqual([3, 2, 7] as Position);
      expect(columnError?.cells).toContainEqual([3, 10, 7] as Position);
    });

    it('should detect duplicate values in a beam', () => {
      const cube = createCube();
      // Set duplicate 'f' in beam (i=8, j=4)
      cube.cells[8][4][1].value = 'f';
      cube.cells[8][4][14].value = 'f';

      const result = cube.validate();
      expect(result.isValid).toBe(false);

      const beamError = result.errors.find(e => e.type === 'beam' && e.description.includes('i=8, j=4'));
      expect(beamError).toBeDefined();
      expect(beamError?.cells).toContainEqual([8, 4, 1] as Position);
      expect(beamError?.cells).toContainEqual([8, 4, 14] as Position);
    });

    it('should detect duplicate values in a sub-square', () => {
      const cube = createCube();
      // Set duplicate '7' in i-face sub-square (layer=0, subRow=0, subCol=0)
      cube.cells[0][0][0].value = '7';
      cube.cells[0][1][2].value = '7';

      const result = cube.validate();
      expect(result.isValid).toBe(false);

      const subSquareError = result.errors.find(e => e.type === 'sub-square');
      expect(subSquareError).toBeDefined();
      expect(subSquareError?.cells).toContainEqual([0, 0, 0] as Position);
      expect(subSquareError?.cells).toContainEqual([0, 1, 2] as Position);
    });

    it('should detect multiple violations simultaneously', () => {
      const cube = createCube();
      // Create violations in row, column, and beam
      cube.cells[0][0][0].value = '1';
      cube.cells[1][0][0].value = '1'; // duplicate in row
      cube.cells[0][1][0].value = '2';
      cube.cells[0][2][0].value = '2'; // duplicate in column

      const result = cube.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow all different values in a row', () => {
      const cube = createCube();
      const values: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
      for (let i = 0; i < 16; i++) {
        cube.cells[i][0][0].value = values[i];
      }

      const result = cube.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should allow partially filled cube with no duplicates', () => {
      const cube = createCube();
      cube.cells[0][0][0].value = '1';
      cube.cells[1][1][1].value = '2';
      cube.cells[2][2][2].value = '3';
      cube.cells[5][8][12].value = 'a';

      const result = cube.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('isCubeFilled', () => {
    it('should return false for an empty cube', () => {
      const cube = createCube();
      expect(isCubeFilled(cube)).toBe(false);
    });

    it('should return false for a partially filled cube', () => {
      const cube = createCube();
      cube.cells[0][0][0].value = '5';
      cube.cells[5][10][15].value = 'a';
      expect(isCubeFilled(cube)).toBe(false);
    });

    it('should return true for a completely filled cube', () => {
      const cube = createCube();
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            cube.cells[i][j][k].value = '0';
          }
        }
      }
      expect(isCubeFilled(cube)).toBe(true);
    });

    it('should return false if even one cell is empty', () => {
      const cube = createCube();
      // Fill all cells
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            cube.cells[i][j][k].value = '0';
          }
        }
      }
      // Clear one cell
      cube.cells[7][8][9].value = null;
      expect(isCubeFilled(cube)).toBe(false);
    });
  });

  describe('countFilledCells', () => {
    it('should return 0 for an empty cube', () => {
      const cube = createCube();
      expect(countFilledCells(cube)).toBe(0);
    });

    it('should count filled cells correctly', () => {
      const cube = createCube();
      cube.cells[0][0][0].value = '1';
      cube.cells[1][2][3].value = 'a';
      cube.cells[15][15][15].value = 'f';
      expect(countFilledCells(cube)).toBe(3);
    });

    it('should return 4096 for a completely filled cube', () => {
      const cube = createCube();
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            cube.cells[i][j][k].value = '0';
          }
        }
      }
      expect(countFilledCells(cube)).toBe(4096); // 16*16*16
    });

    it('should count partially filled cube correctly', () => {
      const cube = createCube();
      // Fill first layer (i=0)
      for (let j = 0; j < 16; j++) {
        for (let k = 0; k < 16; k++) {
          cube.cells[0][j][k].value = '5';
        }
      }
      expect(countFilledCells(cube)).toBe(256); // 16*16
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle setting and getting cells at the same position', () => {
      const cube = createCube();
      const position: [number, number, number] = [7, 8, 9];
      const newCell = createCell(position, 'd', 'editable');

      setCell(cube, position, newCell);
      const retrieved = getCell(cube, position);

      expect(retrieved).toBe(newCell);
      expect(retrieved.value).toBe('d');
    });

    it('should maintain data integrity across different access methods', () => {
      const cube = createCube();
      cube.cells[5][10][3].value = 'b';

      // Access via different methods
      const viaRow = cube.getRow(10, 3)[5];
      const viaColumn = cube.getColumn(5, 3)[10];
      const viaBeam = cube.getBeam(5, 10)[3];
      const viaGetCell = getCell(cube, [5, 10, 3]);

      expect(viaRow.value).toBe('b');
      expect(viaColumn.value).toBe('b');
      expect(viaBeam.value).toBe('b');
      expect(viaGetCell.value).toBe('b');

      // All should reference the same cell
      expect(viaRow).toBe(cube.cells[5][10][3]);
      expect(viaColumn).toBe(cube.cells[5][10][3]);
      expect(viaBeam).toBe(cube.cells[5][10][3]);
      expect(viaGetCell).toBe(cube.cells[5][10][3]);
    });

    it('should handle a cube with all valid hex values', () => {
      const cube = createCube();
      const hexValues: HexValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

      // Fill one row with all values
      for (let i = 0; i < 16; i++) {
        cube.cells[i][0][0].value = hexValues[i];
      }

      const row = cube.getRow(0, 0);
      for (let i = 0; i < 16; i++) {
        expect(row[i].value).toBe(hexValues[i]);
      }

      const result = cube.validate();
      expect(result.isValid).toBe(true);
    });
  });

  describe('forEachCell', () => {
    it('should iterate over all 4096 cells', () => {
      const cube = createCube();
      let count = 0;
      cube.forEachCell(() => {
        count++;
      });
      expect(count).toBe(4096); // 16 * 16 * 16
    });

    it('should provide correct cell and position to callback', () => {
      const cube = createCube();
      const positions: Position[] = [];

      cube.forEachCell((cell, position) => {
        positions.push(position);
        // Verify the cell matches the position
        expect(cell).toBe(cube.cells[position[0]][position[1]][position[2]]);
        expect(cell.position).toEqual(position);
      });

      // Verify all positions were visited
      expect(positions.length).toBe(4096);
    });

    it('should iterate in i-j-k order', () => {
      const cube = createCube();
      const positions: Position[] = [];

      cube.forEachCell((cell, position) => {
        positions.push(position);
      });

      // Check first few positions
      expect(positions[0]).toEqual([0, 0, 0]);
      expect(positions[1]).toEqual([0, 0, 1]);
      expect(positions[15]).toEqual([0, 0, 15]);
      expect(positions[16]).toEqual([0, 1, 0]);
      expect(positions[256]).toEqual([1, 0, 0]);

      // Check last position
      expect(positions[4095]).toEqual([15, 15, 15]);
    });

    it('should allow modification of cells during iteration', () => {
      const cube = createCube();

      cube.forEachCell((cell, position) => {
        // Set all cells to their i coordinate as a hex value
        const [i] = position;
        cube.cells[position[0]][position[1]][position[2]].value = i.toString(16) as HexValue;
      });

      // Verify all cells were modified
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            expect(cube.cells[i][j][k].value).toBe(i.toString(16));
          }
        }
      }
    });
  });

  describe('filterCells', () => {
    it('should return empty array when no cells match', () => {
      const cube = createCube();
      const results = cube.filterCells((cell) => cell.value === '5');
      expect(results).toEqual([]);
    });

    it('should return all filled cells', () => {
      const cube = createCube();
      // Fill some cells
      cube.cells[0][0][0].value = '1';
      cube.cells[5][10][15].value = 'a';
      cube.cells[15][15][15].value = 'f';

      const results = cube.filterCells((cell) => cell.value !== null);

      expect(results.length).toBe(3);
      expect(results[0].cell.value).toBe('1');
      expect(results[0].position).toEqual([0, 0, 0]);
      expect(results[1].cell.value).toBe('a');
      expect(results[1].position).toEqual([5, 10, 15]);
      expect(results[2].cell.value).toBe('f');
      expect(results[2].position).toEqual([15, 15, 15]);
    });

    it('should filter cells by type', () => {
      const cube = createCube();
      // Set some cells as given
      cube.cells[0][0][0].type = 'given';
      cube.cells[0][0][0].value = '1';
      cube.cells[1][1][1].type = 'given';
      cube.cells[1][1][1].value = '2';
      cube.cells[2][2][2].value = '3'; // editable

      const givenCells = cube.filterCells((cell) => cell.type === 'given');

      expect(givenCells.length).toBe(2);
      expect(givenCells[0].position).toEqual([0, 0, 0]);
      expect(givenCells[1].position).toEqual([1, 1, 1]);
    });

    it('should filter cells by position predicate', () => {
      const cube = createCube();
      // Filter cells where i === j === k (diagonal)
      const diagonalCells = cube.filterCells((cell, position) => {
        const [i, j, k] = position;
        return i === j && j === k;
      });

      expect(diagonalCells.length).toBe(16);
      for (let i = 0; i < 16; i++) {
        expect(diagonalCells[i].position).toEqual([i, i, i]);
      }
    });

    it('should filter cells by specific value', () => {
      const cube = createCube();
      // Set some cells to value 'a'
      cube.cells[0][0][0].value = 'a';
      cube.cells[1][2][3].value = 'a';
      cube.cells[5][5][5].value = 'b';
      cube.cells[10][10][10].value = 'a';

      const cellsWithA = cube.filterCells((cell) => cell.value === 'a');

      expect(cellsWithA.length).toBe(3);
      expect(cellsWithA[0].position).toEqual([0, 0, 0]);
      expect(cellsWithA[1].position).toEqual([1, 2, 3]);
      expect(cellsWithA[2].position).toEqual([10, 10, 10]);
    });

    it('should return cells in iteration order', () => {
      const cube = createCube();
      // Fill a few cells
      cube.cells[0][0][5].value = '1';
      cube.cells[0][1][0].value = '2';
      cube.cells[1][0][0].value = '3';

      const results = cube.filterCells((cell) => cell.value !== null);

      // Should be in i-j-k order
      expect(results[0].position).toEqual([0, 0, 5]);
      expect(results[1].position).toEqual([0, 1, 0]);
      expect(results[2].position).toEqual([1, 0, 0]);
    });
  });
});
