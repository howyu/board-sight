# BoardSight · 棋势

> See the board. Understand the pressure.

BoardSight is an offline-first board-control visualizer. It turns invisible attack, defence and contested areas into a visible control map. The project supports international chess and Chinese chess (Xiangqi) through a shared TypeScript control-map engine.

## Product positioning

BoardSight is **not trying to become another raw best-move engine**. Mature engines such as Pikafish are already very strong at answering “what is the best move?”. BoardSight focuses on the layer that engines usually leave implicit: **why a move is strong, what changed on the board, which pieces became dangerous or vulnerable, and how control, mobility and king/general safety shifted**.

For Xiangqi, the intended division of labor is:

- **Pikafish** — search, evaluation, candidate moves and principal variations.
- **BoardSight** — visual control maps, attacked/defended counts, danger changes, before/after position comparison, candidate comparison and human-readable explanations.
- **User-facing goal** — turn “best move + score” into “best move + evidence + understandable board changes”.

This distinction is important to the roadmap: engine strength is a foundation, while **explainable board understanding** is the product differentiation.

## Current modes

- **International Chess** — playable board, legal moves, move history, PGN, square-control overlay and analysis tools.
- **Chinese Chess / Xiangqi** — 9×10 initial position, whole-board red/black control map, per-intersection control counts, and click-a-piece control-range highlighting.
- **Offline-first PWA** — designed for phones, tablets and desktop browsers, including travel/offline learning scenarios.

## Architecture

```
src/
├── core/
│   └── controlMap.ts
├── games/
│   ├── chess/
│   └── xiangqi/
├── components/
└── hooks/
```

The core distinction is intentional: **control/attack squares are not always the same as legal moves**. BoardSight visualizes influence first; each game can separately implement move legality.

## Xiangqi rules currently modeled

The Xiangqi control adapter includes chariot rays and blockers, horse-leg blocking, cannon screens/captures, elephant-eye blocking and river restriction, advisor/general palace restriction, flying generals, and soldier river-crossing behavior.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

React 18 + TypeScript + Vite + Tailwind CSS.

## Open-source attribution

BoardSight evolved from **Chess Attack** and retains the original MIT attribution. This repository is based on [razrinn/chess-attack](https://github.com/razrinn/chess-attack), licensed under the MIT License.

- Original project: `razrinn/chess-attack`
- Original copyright notice: Copyright (c) 2024 Chess Attack Contributors
- License: see [LICENSE.md](./LICENSE.md)

The original project was developed with AI-assisted tooling including Claude Sonnet 3.5/Cline and Cursor. BoardSight continues as an AI-assisted open-source project.

## Roadmap

1. Stabilize the shared control-map engine and regression-check international chess.
2. Complete Xiangqi visualization and board interaction.
3. Build the Xiangqi explainability layer: current / after-my-move / after-best-reply views, control-map deltas, Eval/Depth/PV explanations, and candidate-move comparisons.
4. Keep the PWA as the cross-platform offline client.
5. Reuse the TypeScript core in a future HarmonyOS ArkTS/ArkUI native client.

## License

MIT. See [LICENSE.md](./LICENSE.md).
