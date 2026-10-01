# BoardSight · 棋势

> See the board. Understand the pressure.

BoardSight is an offline-first board-control visualizer. It turns invisible attack, defence, contested areas and hidden-information risk into visible maps. International chess and Chinese chess share a deterministic TypeScript control-map core; Junqi adds a separate belief/risk layer for imperfect information.

## Current modes

- **International Chess** — playable board, legal moves, move history, PGN, square-control overlay and analysis tools.
- **Chinese Chess / Xiangqi** — 9×10 initial position, whole-board red/black control map, per-intersection control counts, and click-a-piece control-range highlighting.
- **Chinese Junqi / Military Chess** — playable 12×5 hidden-information mode with roads/railways/camps/headquarters, probabilistic hidden-piece beliefs, risk heatmap, direct influence overlay, combat inference, move history, explainable candidate moves and a local AI opponent.
- **Offline-first PWA** — designed for phones, tablets and desktop browsers, including travel/offline learning scenarios.

## Architecture

```
src/
├── core/
│   └── controlMap.ts
├── games/
│   ├── chess/
│   ├── xiangqi/
│   └── junqi/
├── components/
└── hooks/
```

The core distinction is intentional: **control/attack squares are not always the same as legal moves**. BoardSight visualizes influence first; each game separately implements move legality. Junqi extends this further: hidden-piece identity is modeled as a probability distribution, so the UI can display probabilistic control without reading the concealed true identity.

## Xiangqi rules currently modeled

The Xiangqi control adapter includes chariot rays and blockers, horse-leg blocking, cannon screens/captures, elephant-eye blocking and river restriction, advisor/general palace restriction, flying generals, and soldier river-crossing behavior.

## Junqi rules and inference currently modeled

The Junqi mode includes standard 12×5 terrain, camps, headquarters, the railway network and engineer turns; mine/flag/headquarters immobility; protected occupied camps; rank, bomb and mine combat; three center crossings; flag capture; and flag exposure after the marshal is lost. Hidden-piece beliefs use setup constraints, observed movement, engineer-only rail turns, combat outcomes and remaining-inventory coupling.

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

1. Keep chess/Xiangqi deterministic control maps regression-safe.
2. Refine Junqi belief calibration and candidate scoring with recorded positions.
3. Add training positions and explain-why-this-square-is-controlled interactions across games.
4. Benchmark optional Jev/search policies against the transparent Junqi baseline before adopting them.
5. Keep the PWA as the cross-platform offline client and reuse the TypeScript core in HarmonyOS ArkTS/ArkUI.

## License

MIT. See [LICENSE.md](./LICENSE.md).
