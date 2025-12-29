# Hex-Do-Cube Dev Container

This dev container provides a complete development environment for the Hex-Do-Cube project.

## What's Included

- **Node.js 22** - JavaScript runtime (LTS version)
- **Bun** - Fast JavaScript runtime and package manager
- **just** - Command runner for development tasks
- **Git** - Version control
- **GitHub CLI** - GitHub integration
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast development server (configured for port 5173)

## VS Code Extensions

The container automatically installs:
- ESLint - Code linting
- Prettier - Code formatting
- TypeScript - Language support
- Jest - Test runner integration
- Error Lens - Inline error display
- Tailwind CSS IntelliSense - CSS utility support
- Auto Close/Rename Tag - HTML/JSX helpers

## Getting Started

1. Open this repository in VS Code
2. When prompted, click "Reopen in Container" (or use Command Palette: "Dev Containers: Reopen in Container")
3. Wait for the container to build and setup to complete
4. Start developing!

## Development Commands

The project uses `just` as the task runner. Common commands:

```bash
just dev       # Start development server (http://localhost:5173)
just test      # Run unit tests
just lint      # Run ESLint
just typecheck # Run TypeScript compiler checks
just build     # Build production assets
just fmt       # Format code with Prettier
```

## Package Management

This project uses **Bun** as the package manager:

```bash
bun install          # Install dependencies
bun add <package>    # Add a dependency
bun add -d <package> # Add a dev dependency
bun remove <package> # Remove a dependency
bun run <script>     # Run a package.json script
```

## Port Forwarding

The dev container automatically forwards port 5173 (Vite dev server) to your local machine.

## Troubleshooting

### Setup script fails
If the post-create setup fails, you can manually run:
```bash
bash .devcontainer/setup.sh
```

### Bun not in PATH
Reload your shell or run:
```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

### Dependencies not installing
Manually install with:
```bash
bun install
```
