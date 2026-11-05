# The Factory

A 3D Roblox factory game.

## Starting the game

- Players start with $1,000.
- Show the player's in-game money in the bottom-left corner.
- When players enter, they see a yellow pad labeled "Claim Factory" to claim their factory.

## Conveyor and materials

- A conveyor costs $500. Buying it from the starting balance leaves $500.
- Players go outside the factory to collect materials:
  - PLA
  - TPU
  - Metal
  - PETG
  - PETG-CF
  - PLA-CF
  - TPU-CF
- Players put the collected materials into a funnel next to the conveyor.

## Player guidance

- Show a blue arrow pointing toward the player's next objective.
- Update the arrow as players progress: claim their factory, buy the conveyor, collect materials outside, then put the materials into the funnel.

## Development status

A playable single-player browser prototype is implemented in index.html, game.js, state.js, and style.css. It uses a 3D scene with keyboard and touch controls, factory claiming, conveyor purchasing, material collection, funnel deposits, and local progress saving. It has not been published as a Roblox experience.

Prototype material payouts per spool: PLA $65, TPU $85, Metal $150, PETG $80, PETG-CF $120, PLA-CF $110, TPU-CF $130. The backpack holds 8 spools; collected materials reappear after 8 seconds. Payouts are credited on deposit while the conveyor animates the materials. These values can be changed as the game design develops.
