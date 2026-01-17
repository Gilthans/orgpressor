# Orgpressor

Organizational structure documentation tool for network analysis researchers.

## Project Overview

A system that allows researchers to build and document organizational hierarchies (org charts) as part of organizational network analysis work. The researcher documents findings about who reports to whom based on their analysis of underlying data.

## Tech Stack

- **Monorepo**: Turborepo with pnpm
- **UI**: React + TypeScript + Vite
- **Graph Visualization**: vis.js (POC) / ReGraph v4.3.0 (production - integration constraint)

## Data

- **POC**: Static JSON file with node labels
- **Production**: Nodes loaded from integrated system, hierarchy persisted back

## Core Concepts

### Nodes
- Each node represents a person in the organization
- Nodes have labels (names/identifiers)
- Nodes start spread randomly on the canvas

### Hierarchy Roots
- Special region at the top of the graph canvas
- Dragging a node into this region designates it as a hierarchy root
- Multiple roots are supported (for multiple org trees or divisions)

### Connections
- Drag a node onto a root node (or any connected node) to create a parent-child relationship
- The graph auto-layouts to display the hierarchy cleanly
- Connections are directional: parent -> child (superior -> subordinate)

### Disconnection
- Nodes already in a hierarchy can be "snapped out" by dragging them away
- This disconnects them from their parent, allowing reconnection elsewhere

## UI Behavior

1. **Initial state**: All nodes displayed randomly spread on canvas
2. **Creating roots**: Drag node to top "root region" -> becomes hierarchy root
3. **Connecting**: Drag node onto another node -> creates parent-child link
4. **Reorganizing**: Drag connected node away -> disconnects, can reconnect elsewhere
5. **Auto-layout**: Hierarchy renders in a clean tree structure

## Directory Structure

```
apps/
  orgpressor-ui/    # Main React application
packages/           # Shared packages (future)
```

## Commands

From monorepo root:
```bash
pnpm dev      # Start all dev servers
pnpm build    # Build all packages
pnpm lint     # Run linting
```

See `apps/orgpressor-ui/CLAUDE.md` for app-specific commands and implementation details.
