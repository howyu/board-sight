# Xiangqi Explainability Roadmap

BoardSight should treat Pikafish as the search/evaluation engine and differentiate on explanation.

## Product goal

Turn an engine answer such as “炮二平五, +0.4” into an explanation a player can inspect:

1. current position,
2. position after the candidate move,
3. position after the opponent's best reply,
4. what changed in control, danger, mobility, king safety, and tactical pressure,
5. which parts are direct engine output versus BoardSight's own derived explanation.

## Proposed UI

Use one main board with switchable views rather than several full-size boards at once:

- 当前局面
- 我方走后
- 对手最佳回应后
- 势力差分
- 危险子
- 关键线路

A candidate move card should show the engine evidence compactly and allow expansion into explanation details.

## Core terminology

### Evaluation / Eval

The engine's numerical estimate of the position. A positive score normally means the side represented as positive is better; a negative score means the other side is better. For centipawn-style scores, +100 is conventionally treated as roughly one pawn of advantage, but this is not a literal material count and should not be presented as a win probability.

BoardSight should display:
- the raw engine score,
- whose perspective the score uses,
- a qualitative label such as roughly equal / slight advantage / clear advantage,
- a separate explanation of the visible factors behind that score.

### Depth

How deep the engine reports that it searched, measured in plies (half-moves), after all pruning, extensions, reductions, and selective-search effects. Depth is useful evidence of search effort, but it is not a guarantee that every branch was searched uniformly to that many plies.

BoardSight should expose depth as secondary technical information, not as the main user-facing signal.

### PV — Principal Variation

The engine's current best line: the sequence of moves it expects if both sides follow the engine's preferred continuation. With MultiPV, the engine returns several candidate principal variations.

BoardSight should translate PV into:
- candidate move,
- opponent's best reply,
- the following continuation,
- and the control/danger changes caused by that line.

### MultiPV

Ask the engine for several top candidate lines instead of only one. MultiPV is useful for BoardSight because the product can compare *why* candidate A is stronger than B or C.

### Centipawn / cp

A common engine score unit. 100 cp is roughly one pawn-equivalent in evaluation scale, but the relationship is nonlinear and position-dependent. It is not a literal material balance.

### Mate score

An engine signal that it sees a forced mate within a certain number of plies/moves. This should be shown separately from centipawn scores.

### Search nodes / NPS

Nodes are positions visited by the search. NPS is nodes per second. These measure engine work and speed, not directly the quality of the explanation.

## Explanation model

For each candidate/PV, derive a before/after feature delta:

- material
- square/control coverage
- attacked vs defended pieces
- hanging or overloaded pieces
- mobility
- king/general safety
- tactical threats
- initiative/tempo

Important: these are BoardSight-derived explanatory features. They must not be presented as a decomposition of Pikafish's internal NNUE evaluation unless a real attribution method is implemented.

## First implementation milestone

1. Keep Pikafish MultiPV=3.
2. Add a three-state position viewer: 当前 / 我走后 / 对手回应后.
3. Compute control-map deltas for each state.
4. Generate concise explanation bullets from deterministic rules.
5. Add expandable engine evidence: Eval, Depth, PV.
6. Add “为什么 B 不如 A” comparison using feature deltas.
7. Later: add counterfactual analysis for user-selected moves.

## Research track

Do not try to replace Pikafish initially. Experiment separately with an interpretable evaluation model that predicts Pikafish scores while exposing intermediate concepts such as mobility, king safety, control, hanging pieces, and initiative.
