-- LocalScript in StarterPlayer > StarterPlayerScripts.
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local Passes = require(ReplicatedStorage:WaitForChild("FactoryPasses"))
local gui = Instance.new("ScreenGui")
gui.Name = "FactoryRobuxShop"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local toggle = Instance.new("TextButton")
toggle.Size = UDim2.fromOffset(150, 42)
toggle.Position = UDim2.new(1, -165, 0, 75)
toggle.Text = "Robux Extras"
toggle.BackgroundColor3 = Color3.fromRGB(28, 49, 69)
toggle.TextColor3 = Color3.fromRGB(255, 220, 135)
toggle.Font = Enum.Font.GothamBold
toggle.TextSize = 15
toggle.Parent = gui
Instance.new("UICorner", toggle).CornerRadius = UDim.new(0, 10)
local panel = Instance.new("ScrollingFrame")
panel.Size = UDim2.new(0.9, 0, 0.7, 0)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.AnchorPoint = Vector2.new(0.5, 0.5)
local limit = Instance.new("UISizeConstraint")
limit.MaxSize = Vector2.new(490, 550)
limit.Parent = panel
panel.BackgroundColor3 = Color3.fromRGB(20, 34, 56)
panel.BorderSizePixel = 0
panel.Visible = false
panel.ScrollBarThickness = 5
panel.CanvasSize = UDim2.fromOffset(0, 105 + #Passes * 115 + 35)
panel.Parent = gui
Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 14)
local function text(value, y, height, size)
 local label = Instance.new("TextLabel")
 label.Position = UDim2.new(0, 18, 0, y)
 label.Size = UDim2.new(1, -36, 0, height)
 label.BackgroundTransparency = 1
 label.Text = value
 label.TextColor3 = Color3.fromRGB(220, 240, 244)
 label.TextWrapped = true
 label.Font = Enum.Font.Gotham
 label.TextSize = size
 label.Parent = panel
 return label
end
text("THE FACTORY · ROBUX EXTRAS", 15, 35, 19)
text("Optional permanent cosmetics. No game money or account password needed.", 55, 42, 13)
local premium = Passes[1]
local premiumButton = toggle:Clone()
premiumButton.Name = "PremiumPass"
premiumButton.AnchorPoint = Vector2.new(1, 0.5)
premiumButton.Position = UDim2.new(1, -15, 0.5, 0)
premiumButton.Size = UDim2.fromOffset(200, 48)
premiumButton.Text = "Premium Pass · " .. premium.Price .. " Robux"
premiumButton.Parent = gui

local balance = Instance.new("TextLabel")
balance.Position = UDim2.new(0, 15, 1, -65)
balance.Size = UDim2.fromOffset(150, 40)
balance.BackgroundColor3 = Color3.fromRGB(28, 49, 69)
balance.TextColor3 = Color3.fromRGB(232, 252, 244)
balance.Font = Enum.Font.GothamBold
balance.TextSize = 16
balance.Parent = gui
Instance.new("UICorner", balance).CornerRadius = UDim.new(0, 10)
local function updateBalance()
 local money = player:GetAttribute("FactoryMoney")
 balance.Text = money and ("$" .. tostring(money)) or "Loading money…"
end
player:GetAttributeChangedSignal("FactoryMoney"):Connect(updateBalance)
updateBalance()

local prompting = false
local updateButtons = {}
for i, pass in Passes do
 local y = 105 + (i - 1) * 115
 text(pass.Name, y, 25, 16)
 text(pass.Description, y + 27, 32, 12)
 local buy = Instance.new("TextButton")
 buy.Position = UDim2.new(0, 18, 0, y + 62)
 buy.Size = UDim2.new(1, -36, 0, 37)
 buy.BackgroundColor3 = Color3.fromRGB(255, 215, 117)
 buy.TextColor3 = Color3.fromRGB(20, 34, 56)
 buy.Font = Enum.Font.GothamBold
 buy.TextSize = 14
 buy.Text = "Not connected yet"
 buy.AutoButtonColor = false
 buy.Parent = panel
 Instance.new("UICorner", buy).CornerRadius = UDim.new(0, 8)
 local available = false
 local price = nil
 local function update()
  local owned = player:GetAttribute("FactoryPass_" .. pass.Key) == true
  buy.Text = owned and "Owned ✓" or (available and ("Buy · " .. tostring(price) .. " Robux") or "Unavailable / not connected")
  if pass.Key == "Premium" then
   premiumButton.Text = owned and "Premium Pass · Owned" or
    ("Premium Pass · " .. tostring(price or premium.Price) .. " Robux")
  end
  buy.AutoButtonColor = available and not owned and not prompting
  buy.BackgroundColor3 = owned and Color3.fromRGB(135, 232, 198) or Color3.fromRGB(255, 215, 117)
 end
 table.insert(updateButtons, update)
 player:GetAttributeChangedSignal("FactoryPass_" .. pass.Key):Connect(update)
 if type(pass.Id) == "number" and pass.Id > 0 then
  task.spawn(function()
   local ok, info = pcall(function() return MarketplaceService:GetProductInfoAsync(pass.Id, Enum.InfoType.GamePass) end)
   if ok and info.IsForSale and type(info.PriceInRobux) == "number" then available = true; price = info.PriceInRobux end
   update()
  end)
 end
 local function promptPurchase()
  if not available or prompting or player:GetAttribute("FactoryPass_" .. pass.Key) then return end
  prompting = true
  local ok = pcall(function() MarketplaceService:PromptGamePassPurchase(player, pass.Id) end)
  if not ok then prompting = false;buy.Text = "Could not open Roblox purchase. Try again." end
 end
 buy.Activated:Connect(promptPurchase)
 if pass.Key == "Premium" then
  premiumButton.Activated:Connect(function()
   if available and not player:GetAttribute("FactoryPass_Premium") then
    promptPurchase()
   else
    panel.Visible = not panel.Visible
   end
  end)
 end
 update()
end
MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(who)
 if who == player then prompting = false;for _, update in updateButtons do update() end end
end)
text("Use the Robux Extras button to close this shop.", 105 + #Passes * 115, 25, 12)
toggle.Activated:Connect(function() panel.Visible = not panel.Visible end)
