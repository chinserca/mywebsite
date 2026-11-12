# The Factory: Roblox cosmetic passes

These scripts add a Roblox-native pass shop and three server-verified cosmetic perks and the Premium Pass to a Roblox experience. They do not convert the browser game into a Roblox game. The browser HTML and Three.js files cannot be uploaded as a playable Roblox place; its world and gameplay must be built in Roblox Studio separately.

## Included extras

- Premium Pass: all three cosmetics and a one-time $10,000 Factory money bonus. Set its price to 300 Robux.
- Roblox username `toobiealex123` receives all three cosmetics free. The cash bonus is tied to Premium Pass ownership.

- VIP Factory Owner: gold VIP nameplate and character outline. Suggested price: 99 Robux.
- Golden Comet Trail: a golden trail while moving. Suggested price: 49 Robux.
- Nebula Aura: violet and cyan space particles. Suggested price: 79 Robux.

Each is a permanent game pass. Suggestions are not active prices: set actual prices in Creator Hub. The client fetches live Roblox prices and opens Roblox's own purchase prompt. No website password, payment details, Roblox cookies, or API keys are needed.

## Install

1. Build and publish your Roblox experience in Roblox Studio. Use the Roblox account or group that should receive its earnings.
2. In Creator Hub, select that experience, open Monetization > Passes, and create the four passes. Configure them for sale and set their prices.
3. Copy each pass ID. This is a game pass ID, not a place, asset image, or developer product ID.
4. In Studio's ReplicatedStorage, create a ModuleScript named `FactoryPasses`. Paste `FactoryPasses.luau` into it. Replace the four `Id = 0` values with the corresponding real pass IDs. Keep each ID unique.
5. In ServerScriptService, create a Script named `FactoryPassesServer` and paste `FactoryPasses.server.luau` into it.
6. In StarterPlayer > StarterPlayerScripts, create a LocalScript named `FactoryShopClient` and paste `FactoryShop.client.luau` into it.
7. Publish the updated place. The Robux Extras button opens the shop. Unconfigured or unavailable passes stay disabled.

## Factory money

The included Roblox shop starts the wallet at $1,000 and displays it on screen. The server stores the balance and bonus receipt together in `FactoryWallet_v1` under the player's user ID. If you already have a Roblox economy, connect the grant and receipt to that economy’s saved wallet before publishing. The browser game uses its own save.

## Verify before announcing sales

- Check the correct name, price, benefit, and owner for every pass in Creator Hub.
- Confirm unowned passes do not grant perks just by opening the shop or canceling a prompt.
- Confirm a buyer receives the matching cosmetic and keeps it after respawning or rejoining.
- Confirm owned passes show Owned rather than requesting a second purchase.
- Verify purchase behavior in your published Roblox experience. These scripts have not been run in Roblox Studio in this workspace.

Ownership is checked with UserOwnsGamePassAsync on the server. There is no client remote granting ownership and no localStorage purchase flag. Roblox owns pass persistence, purchase processing, and creator earnings. Never test using account credentials entered into the website.

## Current status

The Vercel website only displays an inactive preview. Real purchases and earnings require your published Roblox experience, correctly configured passes, and Roblox's normal eligibility and transaction rules. This package does not activate sales in your account or promise earnings.

Official guide: https://create.roblox.com/docs/production/monetization/passes
