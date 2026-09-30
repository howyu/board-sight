# BoardSight HarmonyOS native client

BoardSight keeps the existing React/Vite PWA as the Web mainline and adds a native HarmonyOS client under `harmony/`.

## Goal

The HarmonyOS client is not a WebView wrapper. It uses ArkTS + ArkUI and preserves the same product concept as the PWA:

- visualize attacked / defended / contested squares;
- keep control-map semantics separate from legal-move semantics;
- share chess rules, training data and algorithm contracts across platforms;
- let Web/PWA and HarmonyOS evolve in the same repository.

## Current MVP

The first native slice contains:

- an 8×8 international-chess starting position;
- the same control-square semantics as `src/games/chess/controlAdapter.ts`;
- per-square white/black control counts;
- blue/red control-pressure overlay;
- board flipping;
- a control-map visibility toggle.

This is deliberately smaller than the current Web UI. PGN, full legal moves, engine analysis, training positions and Xiangqi remain follow-up work.

## Repository layout

```
board-sight/
├── src/                 # existing Web/PWA
├── harmony/             # native HarmonyOS app
│   ├── AppScope/
│   └── entry/src/main/
│       ├── ets/
│       │   ├── entryability/
│       │   ├── model/
│       │   └── pages/
│       └── resources/
└── docs/
```

## DevEco Studio

Open the `harmony/` directory as the HarmonyOS project. DevEco Studio should resolve the local HarmonyOS SDK and signing configuration for your machine.

The checked-in project targets the Stage model and ArkTS/ArkUI. If the installed DevEco/SDK version upgrades the generated build metadata, keep source code under `entry/src/main/ets` stable and commit only the required build-file migration.

## Shared-core direction

The Web implementation is currently the source of truth for chess control semantics:

- `src/core/controlMap.ts`
- `src/games/chess/controlAdapter.ts`
- `src/types.ts`

The HarmonyOS MVP mirrors those contracts in ArkTS. The next refactor should move platform-neutral fixtures and training-position JSON into a root `shared/` package so both clients consume the same data instead of duplicating it. Algorithm behavior should be protected by cross-platform fixture tests before moving more logic.

## Next milestones

1. Add shared control-map fixtures and parity tests. **Fixture source now exists at `shared/chess/control-fixtures.json`; automated runners are the next step.**
2. Add native piece selection and legal moves. **Piece selection/control-range highlighting is now implemented; legal moves remain next.**
3. Add training-position JSON shared by Web and HarmonyOS.
4. Add “why is this square controlled?” explanations.
5. Integrate optional engine analysis after the interaction loop is stable.
6. Port Xiangqi only after the international-chess native path is reliable.
