# BoardSight architecture

This branch begins the migration from a chess-specific PWA to a reusable board-control visualizer.

## Layers

- `core/controlMap.ts`: game-agnostic control aggregation.
- `games/chess/`: international chess adapter.
- `games/xiangqi/`: Chinese chess board model and control adapter.
- React hooks/components remain compatibility layers for the current PWA while the migration proceeds.

The current web UI remains international-chess-first. Xiangqi is introduced at the engine layer before any UI switch is added, so existing behavior can be regression-tested independently.

## Control semantics

A control map represents squares/intersections influenced or defended by a piece, not necessarily legal moves after king-safety constraints. This distinction is intentional and is especially important for pinned pieces and Xiangqi cannon/general rules.
