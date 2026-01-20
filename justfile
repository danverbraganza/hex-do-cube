# Justfile for Hex-Do-Cube project
# Run `just --list` to see all available commands

# Default recipe to display help
default:
    @just --list

# Install dependencies using bun
install:
    bun install

# Run development server
dev:
    bun run dev

# Build the project for production
build:
    bun run build

# Run type checking
type-check:
    bun run type-check

# Run linting
lint:
    bun run lint

# Run tests
test:
    bun test

# Preview production build
preview:
    bun run preview

# Clean build artifacts
clean:
    rm -rf dist node_modules .bun-cache

# Run all checks (type-check and lint)
check: type-check lint
    @echo "✓ All checks passed!"

# Full rebuild (clean, install, and build)
rebuild: clean install build
    @echo "✓ Full rebuild complete!"

# Generate cached puzzle for fast game startup
generate-puzzle:
    bun run scripts/generate-puzzle.ts

# Deploys to a local website
deploy: build
    cp ./dist/assets/* ../website/assets/
    cp ./dist/index.html ../website/hex-do-cube.html
    

