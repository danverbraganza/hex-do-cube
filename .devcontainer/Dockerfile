FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Switch to node user for installations
USER node

# Install bun (JavaScript runtime and package manager)
RUN curl -fsSL https://bun.sh/install | bash

# Add bun to PATH
ENV BUN_INSTALL="/home/node/.bun"
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

# Switch back to root to install just
USER root

# Install just (command runner)
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Switch back to node user for development
USER node

# Set working directory
WORKDIR /workspace

# Verify installations (these will show in build logs)
RUN bun --version && just --version && node --version && npm --version
