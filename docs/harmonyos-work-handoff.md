# HarmonyOS Work handoff

Use this checklist when opening BoardSight in ChatGPT Work / a DevEco Studio environment.

## Current status — native build verified on 2026-09-30

- Official Linux Command Line Tools **26.0.0.851** installed in Work.
- HarmonyOS SDK **26.0.0 Release**, Hvigor **6.26.8**.
- `ohpm install`, project sync and entry debug `assembleHap` succeed.
- ArkTS compilation, resource compilation and HAP packing pass.
- Fresh build after deleting generated caches: **33 tasks executed, 0 up-to-date**.
- Web build/lint, chess parity and required-resource checks all pass.
- Downloaded the official phone image **HarmonyOS 7.0.0(26.0.0)**,
  software version **7.0.0.107**; created `BoardSightPhone` successfully.
- Headless emulator startup fails with **`KVM device not found`** and
  **`KVM is not available.`** This host has no `/dev/kvm`; the instance remains
  stopped and no device is connected. Runtime/UI acceptance is still unverified.
- Output is **unsigned**; signing and emulator/real-device launch remain pending.
- PR #12 stays Draft until the runtime/UI acceptance criteria are verified.
- Historical notes below describe earlier checkpoints, not the current blocker.

Reproduce on a host with this official toolchain:

```bash
cd harmony
export DEVECO_CLI_CLT_PATH=/absolute/path/to/command-line-tools
devecocli build --modules entry --build-mode debug
```

Keep the minimum compatible SDK at `6.0.0(20)`; target SDK is explicitly
`26.0.0`, using the new SDK version notation. Compilation uses the installed
SDK. This build does not establish runtime compatibility with older devices.

Fixes required by the actual compiler:

- Remove Hvigor packages from `oh-package.json5` application dependencies;
  add `hvigor/hvigor-config.json5` using the matching project model version.
- Give pawn/knight position object literals explicit `Position` types.
- Replace inferred `Array.from` initialization with typed loops for control
  cells and initial board rows.
- Replace `Blank` children of `Stack` with empty `Row` background layers;
  `Blank` is only supported under Row, Column or Flex.
- Ignore local build/cache outputs in Git.

### Emulator attempt on 2026-09-30

After reviewing and accepting the emulator agreements, the official 2.09 GB
phone image downloaded successfully. Reproduce instance creation and startup:

```bash
devecocli emulator image download --device-type phone --os-version 'HarmonyOS 7.0.0(26.0.0)'
devecocli emulator create BoardSightPhone --device-type phone --os-version 'HarmonyOS 7.0.0(26.0.0)'
"$DEVECO_CLI_CLT_PATH/emulator/Emulator" -start BoardSightPhone -noWindow
"$DEVECO_CLI_CLT_PATH/emulator/Emulator" -list -details
```

The launcher can return exit code 0 while printing the KVM failure; verify
`isRunning` and an actual HDC connection rather than treating exit code as
successful boot. Here `isRunning` is `false`. Continue on a host exposing KVM
to the emulator, or on a connected HarmonyOS device with appropriate signing.
Do not mark the display/touch checklist complete based on compilation alone.

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

## Toolchain and launch-resource checkpoint — 2026-09-30

Installed official `@deveco/deveco-cli` 1.3.0-stable in this Work session.
Running `devecocli build --modules entry --build-mode debug` on Linux stops
with: `DevEco Studio is not available on Linux. Set DEVECO_CLI_CLT_PATH to a
Command Line Tools installation.` The CLI alone does not install that toolchain.
The official download page is reachable, but the installation archive has not
been obtained. The container also has no `/dev/kvm` device.

Found a manifest bug by checking the official documentation bundled in DevEco
CLI (`app-configuration-file` and `module-configuration-file`): app.icon,
EntryAbility.startWindowIcon and EntryAbility.startWindowBackground were absent
although mandatory. Added a shared SVG app icon and launch background color.
`npm run check:harmony-resources` now checks these resource references in CI.
The original manifests fail this check; the corrected manifests pass.
This is a configuration/resource check, not a native build or launch result.
