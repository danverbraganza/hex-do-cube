#!/usr/bin/env python3
"""
Generate a cached easy puzzle for Hex-Do-Cube.
This script uses the mathematical Latin cube construction from generate_cube.py
to instantly generate a valid 16x16x16 cube, then applies difficulty settings
and outputs a JSON file ready for the game.
"""

import json
import random
from datetime import datetime
from pathlib import Path
from generate_cube import cell_value, check_all

# Hex mapping
HEX = "0123456789abcdef"

def generate_full_cube():
    """
    Generate a complete 16x16x16 cube using the mathematical construction.
    Returns: 3D list cube[z][r][c] with values 0-15
    """
    cube = [
        [[cell_value(r, c, z) for c in range(16)] for r in range(16)]
        for z in range(16)
    ]
    return cube

def apply_difficulty(cube, difficulty='easy'):
    """
    Apply difficulty by randomly removing cells.
    For 'easy': keep ~70% of cells as 'given'

    Returns: list of cell objects with position, value, and type
    """
    total_cells = 16 * 16 * 16  # 4096 cells

    if difficulty == 'easy':
        given_ratio = 0.70
    elif difficulty == 'medium':
        given_ratio = 0.50
    elif difficulty == 'hard':
        given_ratio = 0.30
    else:
        given_ratio = 0.70

    target_given_count = int(total_cells * given_ratio)

    # Create list of all positions
    all_positions = [
        (z, r, c)
        for z in range(16)
        for r in range(16)
        for c in range(16)
    ]

    # Randomly select which cells will be 'given'
    random.shuffle(all_positions)
    given_positions = set(all_positions[:target_given_count])

    cells = []
    given_count = 0
    empty_count = 0

    for z, r, c in all_positions:
        value_int = cube[z][r][c]
        value_hex = HEX[value_int]

        if (z, r, c) in given_positions:
            # This is a 'given' cell
            cells.append({
                'position': [r, c, z],  # Note: using [r, c, z] order
                'value': value_hex,
                'type': 'given'
            })
            given_count += 1
        else:
            # This is an empty 'editable' cell (we don't store it)
            empty_count += 1

    return cells, given_count, empty_count

def generate_cached_puzzle(difficulty='easy', output_path='src/data/cached-puzzle.json'):
    """
    Main function to generate and save the cached puzzle.
    """
    print('=' * 60)
    print('Hex-Do-Cube: Generating Cached Easy Puzzle')
    print('=' * 60)
    print()

    # Step 1: Generate the cube
    print('[1/4] Generating 16x16x16 cube using mathematical construction...')
    cube = generate_full_cube()
    print('      ✓ Cube generated')

    # Step 2: Validate the cube
    print('[2/4] Validating all constraints...')
    try:
        check_all()
        print('      ✓ All constraints validated successfully')
    except AssertionError as e:
        print(f'      ✗ Validation failed: {e}')
        return False

    # Step 3: Apply difficulty
    print(f'[3/4] Applying difficulty level: {difficulty}')
    cells, given_count, empty_count = apply_difficulty(cube, difficulty)
    print(f'      ✓ Created puzzle with {given_count} given cells (~{given_count*100//4096}%)')
    print(f'        - Given cells: {given_count}')
    print(f'        - Empty cells: {empty_count}')

    # Step 4: Create JSON structure
    cached_puzzle = {
        'version': 1,
        'difficulty': difficulty,
        'generatedAt': datetime.utcnow().isoformat() + 'Z',
        'cells': cells,
        'givenCellCount': given_count,
        'emptyCellCount': empty_count
    }

    # Write to file
    print(f'[4/4] Writing to {output_path}...')
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    json_str = json.dumps(cached_puzzle, indent=2)
    output_file.write_text(json_str)

    json_size_kb = len(json_str) / 1024
    print(f'      ✓ Written to {output_file.absolute()}')
    print(f'        - JSON size: {json_size_kb:.1f} KB')

    print()
    print('=' * 60)
    print('✓ Success! Cached puzzle generated and validated.')
    print('=' * 60)
    print()
    print('The cached puzzle is ready to use.')
    print('The game can now start instantly without waiting for generation.')

    return True

if __name__ == '__main__':
    # Set random seed for reproducibility (optional - remove for true randomness)
    random.seed(42)

    success = generate_cached_puzzle(difficulty='easy')
    exit(0 if success else 1)
