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

## Camera and material research

- Drag to orbit the camera; scroll or pinch to zoom. Movement follows the camera direction. A Reset camera button restores the initial angle.
- A blue research bench inside the factory lets players study each material once.
- Studying consumes one spool of that material and permanently increases its selling value by 50%, rounded to the nearest whole dollar. No money is charged for research.
- Research upgrades save with the player’s existing progress.

## Upgrade shop

A purple shop inside the factory offers permanent purchases using in-game money, unlocked after buying the conveyor:

- Bigger backpack: $250, increases capacity from 8 to 12 spools.
- Running boots: $350, increases movement speed by 25%.
- Conveyor upgrade: $750, increases all material payouts by 25%, combined with research before rounding.
- Each upgrade can be purchased once and saves with progress.

## Rocket and alien research

- A rocket beside the factory costs $1,000 in game money, purchased once after the conveyor.
- Ride the rocket to a separate International Alien Lab, with a free return pad back to Earth.
- Pick up a free alien net in the material yard. Equip it to catch nearby Jade Hoppers, Violet Floaters, and Solar Sprouts.
- Carry up to 6 aliens separately from materials. Aliens reappear after 20 seconds.
- Study and release captured aliens at the lab bench for a $1,000 research grant per specimen. Track the number of studies for each species.
- A Guide: Aliens button directs the blue arrow to the net, aliens, rocket, study bench, and return pad.
- Rocket ownership, net ownership, captures, and research counts save with existing progress.

## Pause and restart

- Escape or the Pause button opens a menu with Resume and Restart.
- Pausing freezes movement, animations, respawn timers, and rocket travel.
- Resume (or Escape again) continues the current game.
- Restart explains that saved progress will be cleared and asks for confirmation before resetting to $1,000.

## Adventure expansion

- Colorful campus paths, glowing station rings, trees, flowers, lamps, factory steam, space-lab specimens, stars, and an observation planet.
- Delivery jobs at the orange desk pay 60% above current material value and consume the requested materials. Orders can be repeated.
- Eight hidden energy crystals: five on Earth reward $250 each, three in the orbital lab reward $500 each. Each crystal pays once per saved game.
- BEE-BOT costs $1,500 at the upgrade shop and automatically collects available material spools within 5 units while there is backpack space.
- Space or Sprint gives a 1.5-second speed boost, available every 6 seconds. Pausing freezes its timers.
- Guide cycles through Materials, Aliens, Deliveries, and Crystals. Cargo toggles the material and alien panels.
- Delivery totals and crystal discoveries persist with existing saves; no progress reset is required.

## Future Roblox monetization

- Optional permanent cosmetic passes: VIP Factory Owner (suggested 99 Robux), Golden Comet Trail (49 Robux), and Nebula Aura (79 Robux). Actual prices are set in Roblox.
- The browser game shows an inactive preview with a creator setup guide and downloadable Roblox Studio scripts. It never accepts Robux or grants paid ownership locally.
- The Roblox package checks ownership on the server and reapplies perks on respawn/rejoin. All pass IDs default to zero so purchase prompts remain disabled until configured.
- A published Roblox experience and the creator’s real game pass IDs are still required. This package does not convert the browser game into a Roblox place.

## Mouse locking

- On desktop, click the game or Lock mouse to capture the cursor and look around with mouse movement.
- The first Escape releases the cursor without pausing. Press Escape again while unlocked to open the pause menu. Dialogs release the cursor to allow button use.
- Clicking Resume attempts to lock again; the player can also click the scene to lock.
- Touch devices keep drag camera controls, and unsupported browsers retain drag controls.

- Visible + and − zoom buttons sit on the right above movement controls. Keyboard + and − also zoom, including while the mouse is locked. Camera distance remains within safe limits.
