# Hex-Do-Cube Dev Container

This dev container provides a complete development environment for the Hex-Do-Cube project.

## What's Included

The devcontainer is built from a custom Dockerfile that pre-installs all required tools:

- **Node.js 22** - JavaScript runtime (LTS version)
- **Bun** - Fast JavaScript runtime and package manager (installed via Dockerfile)
- **just** - Command runner for development tasks (installed via Dockerfile)
- **bd** - Task tracking tool (installed via Dockerfile)
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

## Task Tracking

This project uses **bd** for task tracking:

```bash
bd init              # Initialize bd (humans run this once)
bd                   # View current tasks
bd add "Task name"   # Add a new task
bd start <id>        # Start working on a task
bd done <id>         # Mark task as complete
```

See AGENTS.md for more details on using bd for task tracking.

## Port Forwarding

The dev container automatically forwards port 5173 (Vite dev server) to your local machine.

## Container Architecture

The devcontainer uses a custom Dockerfile (`.devcontainer/Dockerfile`) that:
1. Starts from the official TypeScript/Node.js devcontainer base image
2. Installs system dependencies (curl, wget, git)
3. Installs Bun as the `node` user
4. Installs just and bd as root to `/usr/local/bin`
5. Verifies all installations during the build

After the container is built, `bun install` runs automatically via `postCreateCommand` to install project dependencies.

## Troubleshooting

### Bun or just not found
If `bun` or `just` commands are not available, the Docker image may need to be rebuilt:
1. Rebuild the container from VS Code: Command Palette → "Dev Containers: Rebuild Container"
2. Or rebuild from command line: `docker build -t hex-do-cube-dev .devcontainer/`

### Bun not in PATH (if manually running containers)
If running outside of the devcontainer setup, ensure:
```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

### Dependencies not installing
The `postCreateCommand` should automatically run `bun install`. If it fails, manually run:
```bash
bun install
```
