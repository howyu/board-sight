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


## Analysis layer

BoardSight keeps move legality, board-control explanation, and engine search as separate layers:

- rules: whether a move is legal;
- control map: who attacks, protects, or contests each point;
- analysis engine: which move is strongest after searching future replies;
- explanation UI: translates an engine candidate into visible BoardSight concepts such as captured material, check, escaping attack, added protection, and changed control.

The first UI prototype uses a deliberately lightweight local evaluator only to validate the interaction model (Top 3 suggestions + board preview). It must not be presented as professional engine strength.

### Pikafish target

The production Xiangqi analysis backend should use Pikafish through UCI in a Web Worker/WebAssembly boundary. The intended flow is:

1. serialize the current BoardSight position to Xiangqi FEN;
2. request MultiPV=3 from Pikafish;
3. parse score/depth/PV lines;
4. map the engine moves back to BoardSight coordinates and Chinese notation;
5. compute BoardSight control-map deltas for each candidate so the UI can explain *why* the move is interesting.

As of the 2026-09-06 Pikafish release, upstream documents WebAssembly targets. Before bundling the official NNUE weights in a distributable or commercial build, verify and satisfy the upstream NNUE license terms; the current upstream license states commercial use requires permission. For that reason this branch does not vendor Pikafish binaries or NNUE assets yet.
