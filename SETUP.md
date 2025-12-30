# Hex-Do-Cube Setup Guide

This document describes the configuration setup for the Hex-Do-Cube project.

## Configuration Files

The following configuration files have been set up:

### Core Configuration
- **package.json** - Node.js/Bun package configuration with dependencies
- **tsconfig.json** - TypeScript compiler configuration
- **vite.config.ts** - Vite build tool configuration
- **bunfig.toml** - Bun runtime configuration
- **.eslintrc.json** - ESLint linting rules configuration
- **justfile** - Task runner with common project commands

### Project Structure
```
hex-do-cube/
├── .devcontainer/      # Development container configuration
├── src/                # Source code directory
│   └── main.ts        # Application entry point
├── dist/              # Build output directory (generated)
├── node_modules/      # Dependencies (generated)
├── index.html         # Main HTML entry point
└── [config files]     # Configuration files listed above
```

## Available Commands

### Using npm (current environment)
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Using just (when installed)
```bash
just install         # Install dependencies using bun
just dev            # Start development server
just build          # Build for production
just type-check     # Run TypeScript type checking
just lint           # Run ESLint
just preview        # Preview production build
just check          # Run all checks (type-check + lint)
just clean          # Clean build artifacts
just rebuild        # Full rebuild (clean + install + build)
```

## Validation Results

All configuration files have been validated:

✓ **TypeScript Configuration** - Type checking passes
✓ **ESLint Configuration** - Linting passes with no warnings
✓ **Vite Configuration** - Build completes successfully
✓ **Project Structure** - All directories and files in place

## Dependencies

### Runtime Dependencies
- **three** (^0.160.0) - 3D graphics library for WebGL rendering

### Development Dependencies
- **typescript** (^5.3.3) - TypeScript compiler
- **vite** (^5.0.10) - Fast build tool and dev server
- **eslint** (^8.56.0) - JavaScript/TypeScript linter
- **@typescript-eslint/eslint-plugin** & **@typescript-eslint/parser** - TypeScript ESLint support
- **@types/node** & **@types/three** - TypeScript type definitions

## Next Steps

1. Install bun runtime: `curl -fsSL https://bun.sh/install | bash` (optional)
2. Install just task runner: `cargo install just` or use package manager (optional)
3. Start development: `npm run dev` or `just dev`
4. Begin implementing game logic in `src/` directory

## Notes

- The project is configured to use ES modules (type: "module" in package.json)
- TypeScript is set to strict mode for better type safety
- Vite dev server runs on port 3000
- Build output includes source maps for debugging
- Three.js is configured as a separate chunk for optimal loading
