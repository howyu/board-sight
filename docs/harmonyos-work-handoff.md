# HarmonyOS Work handoff

Use this checklist when opening BoardSight in ChatGPT Work / a DevEco Studio environment.

## Target branch

- Repository: `howyu/board-sight`
- Branch: `feat/harmonyos-native`
- Draft PR: #12
- HarmonyOS project root: `harmony/`

## Current MVP expected behavior

The native app should:

1. Launch into an 8×8 international-chess starting position.
2. Render white/black pieces correctly.
3. Show the BoardSight control map.
4. Show per-square white/black control counts.
5. Toggle the whole-board control overlay.
6. Flip board orientation.
7. Select any piece by tapping it.
8. Highlight only that piece's controlled squares in yellow.
9. Clear selection by tapping the selected piece again or using the cancel button.
10. Preserve the distinction between controlled squares and legal moves.

Shared reference data exists at:

- `shared/chess/control-fixtures.json`

Web remains the semantic source of truth:

- `src/core/controlMap.ts`
- `src/games/chess/controlAdapter.ts`

## DevEco / SDK debugging sequence

1. Open `harmony/` as the project root in DevEco Studio.
2. Let DevEco resolve/install the matching HarmonyOS SDK.
3. Let DevEco migrate build metadata only when required by the installed SDK.
4. Run project sync / dependency resolution.
5. Build the `entry` debug target.
6. Fix ArkTS strict-mode, ArkUI API, resource, module, Hvigor, and SDK-version errors.
7. Launch Previewer or emulator.
8. Verify all MVP behaviors above.
9. Compare several control squares with `shared/chess/control-fixtures.json`.
10. Commit only required compatibility fixes back to `feat/harmonyos-native`.

## Acceptance criteria before PR #12 leaves Draft

- DevEco project sync succeeds.
- Debug build succeeds with no compile errors.
- App launches in Previewer/emulator.
- Board is visible without overflow on a typical phone viewport.
- Flip and control-overlay toggles work.
- Piece selection works.
- Selected-piece controlled-square highlighting works.
- Starting-position control counts match the shared fixture.
- Existing Web CI remains green.

## Not required for this PR

Do not block this MVP on:

- Stockfish/Pikafish integration
- AI commentary
- PGN import/export
- complete legal-move engine
- training history/database
- Xiangqi native port

Those should be follow-up PRs after the native toolchain is stable.

## Work debugging checkpoint — 2026-09-30

This Work host has Node/npm but no DevEco Studio, HarmonyOS SDK, Hvigor,
`ohpm`, `hdc`, Previewer or emulator. Switching to Work alone does not install
those tools. Project sync, native debug compilation and device/UI acceptance
remain pending; keep PR #12 in Draft.

Completed source checks and fixes:

- Replace indexed-access parameter types with the existing named piece types.
- Remove the product's reference to an absent `default` signing configuration.
  Configure local signing in DevEco before installing on a device.
- Remove the absent obfuscation-rules file reference (obfuscation is disabled).
- Wrap action buttons, bound board width on tablets, allow scrolling on short
  viewports, and increase control-count text from 9 to 12 with a dark backing.
  These layout changes still need Previewer/device inspection.
- Correct the b1 knight fixture to include d2: friendly occupied squares are
  controlled/defended squares even though they are not legal move destinations.
- Add `npm run check:chess-parity` to CI. It executes the native model sources
  via TypeScript transpilation and compares all 64 initial-position counts,
  every starting piece's control range and selected-piece fixtures with Web.
  It is a semantic regression check, **not an ArkTS compiler or UI test**.

Resume with the DevEco/SDK sequence above on a host with that toolchain.
Do not infer SDK compatibility, glyph availability, touch behavior or viewport
acceptance from the Node checks.

Validation on this host: `npm run check:chess-parity`, `npm run build`,
`npm run lint` and `git diff --check` pass. Native compilation remains unverified.
