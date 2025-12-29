#!/bin/bash
set -e

echo "Setting up Hex-Do-Cube development environment..."

# Install bun (JavaScript runtime and package manager)
echo "Installing Bun..."
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Install just (command runner)
echo "Installing just..."
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Verify installations
echo "Verifying installations..."
bun --version
just --version
node --version
npm --version

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
  echo "Installing project dependencies with bun..."
  bun install
else
  echo "No package.json found - skipping dependency installation"
fi

echo "Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  just dev       - Start development server"
echo "  just test      - Run tests"
echo "  just lint      - Run linter"
echo "  just typecheck - Run TypeScript type checking"
echo "  just build     - Build production assets"
echo "  bun --help     - Bun help"
