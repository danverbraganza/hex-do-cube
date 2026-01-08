HEX = "0123456789abcdef"
SYMS = set(range(16))


def cell_value(r: int, c: int, z: int) -> int:
    """
    Returns a value in 0..15.

    Think of r,c,z as base-4 pairs:
      r = 4*ur + vr, etc., where ur,vr in 0..3.
    We build the symbol as a base-4 pair (us, vs) (each in 0..3),
    then pack to 0..15 as (us<<2)|vs.

    XOR on 0..3 is addition in GF(4) under a 2-bit basis; we only use + by 0/1
    so no multiplication tables are needed.
    """
    ur, vr = divmod(r, 4)
    uc, vc = divmod(c, 4)
    uz, vz = divmod(z, 4)

    us = vr ^ uc ^ uz ^ vz  # high base-4 digit of symbol
    vs = ur ^ vc ^ vz  # low  base-4 digit of symbol

    return (us << 2) | vs  # 0..15


def layer(z: int) -> list[list[int]]:
    return [[cell_value(r, c, z) for c in range(16)] for r in range(16)]


def print_layer(grid: list[list[int]], z: int) -> None:
    print(f"z = {HEX[z]}")
    hbar = "+".join(["-" * (4 * 2 + 3)] * 4)  # crude but readable divider
    for r in range(16):
        if r % 4 == 0 and r != 0:
            print(hbar)
        row_chunks = []
        for bc in range(0, 16, 4):
            chunk = " ".join(HEX[grid[r][c]] for c in range(bc, bc + 4))
            row_chunks.append(chunk)
        print(" | ".join(row_chunks))
    print()


def check_all() -> None:
    # Build cube[z][r][c]
    cube = [
        [[cell_value(r, c, z) for c in range(16)] for r in range(16)] for z in range(16)
    ]

    # beams
    for r in range(16):
        for c in range(16):
            assert set(cube[z][r][c] for z in range(16)) == SYMS

    # XY faces (fixed z): rows/cols/blocks
    for z in range(16):
        g = cube[z]
        for r in range(16):
            assert set(g[r][c] for c in range(16)) == SYMS
        for c in range(16):
            assert set(g[r][c] for r in range(16)) == SYMS
        for br in range(0, 16, 4):
            for bc in range(0, 16, 4):
                blk = [g[r][c] for r in range(br, br + 4) for c in range(bc, bc + 4)]
                assert set(blk) == SYMS

    # XZ faces (fixed c): rows (vary z), cols (vary r), blocks (4x4 in r,z)
    for c in range(16):
        for r in range(16):
            assert set(cube[z][r][c] for z in range(16)) == SYMS
        for z in range(16):
            assert set(cube[z][r][c] for r in range(16)) == SYMS
        for br in range(0, 16, 4):
            for bz in range(0, 16, 4):
                blk = [
                    cube[z][r][c] for r in range(br, br + 4) for z in range(bz, bz + 4)
                ]
                assert set(blk) == SYMS

    # YZ faces (fixed r): rows (vary z), cols (vary c), blocks (4x4 in c,z)
    for r in range(16):
        for c in range(16):
            assert set(cube[z][r][c] for z in range(16)) == SYMS
        for z in range(16):
            assert set(cube[z][r][c] for c in range(16)) == SYMS
        for bc in range(0, 16, 4):
            for bz in range(0, 16, 4):
                blk = [
                    cube[z][r][c] for c in range(bc, bc + 4) for z in range(bz, bz + 4)
                ]
                assert set(blk) == SYMS


if __name__ == "__main__":
    # Optional: uncomment to sanity-check constraints.
    check_all()

    for z in range(16):
        print_layer(layer(z), z)
