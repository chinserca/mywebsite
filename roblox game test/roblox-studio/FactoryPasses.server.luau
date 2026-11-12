-- Script in ServerScriptService. Perks are granted only after Roblox ownership checks.
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Passes = require(ReplicatedStorage:WaitForChild("FactoryPasses"))
local configured = {}
local ready = {}
local wallet = DataStoreService:GetDataStore("FactoryWallet_v1")
local premium = Passes[1]

local function hasFreeExtras(player)
 return string.lower(player.Name) == "toobiealex123"
end

local function refreshWallet(player, bonus)
 local key = tostring(player.UserId)
 for attempt = 1, 3 do
  local ok, data = pcall(function()
   if not bonus then return wallet:GetAsync(key) end
   return wallet:UpdateAsync(key, function(saved)
    saved = saved or { Money = 1000 }
    if not saved.PremiumBonus then
     saved.Money += premium.Bonus
     saved.PremiumBonus = true
    end
    return saved
   end)
  end)
  if ok then
   if player.Parent == Players and (bonus or not player:GetAttribute("FactoryPass_Premium")) then
    player:SetAttribute("FactoryMoney", data and data.Money or 1000)
   end
   return
  end
  if attempt < 3 then task.wait(attempt * 2) end
 end
 warn("Factory wallet unavailable for user " .. key)
end
for _, pass in Passes do
 if type(pass.Id) == "number" and pass.Id > 0 then
  assert(not configured[pass.Id], "Each Factory pass needs a different ID")
  configured[pass.Id] = pass
 end
end

local function applyPerks(player, character)
 local root = character:FindFirstChild("HumanoidRootPart")
 local head = character:FindFirstChild("Head")
 if not root or not head then return end
 local old = character:FindFirstChild("FactoryPaidCosmetics")
 if old then old:Destroy() end
 -- Keep all cosmetic instances under one folder so refreshes cannot duplicate effects.
 local folder = Instance.new("Folder")
 folder.Name = "FactoryPaidCosmetics"
 folder.Parent = character
 if player:GetAttribute("FactoryPass_VIP") then
  local plate = Instance.new("BillboardGui")
  plate.Size = UDim2.fromOffset(220, 45)
  plate.StudsOffset = Vector3.new(0, 2.6, 0)
  plate.Adornee = head
  plate.AlwaysOnTop = true
  plate.MaxDistance = 80
  plate.Parent = folder
  local text = Instance.new("TextLabel")
  text.Size = UDim2.fromScale(1, 1)
  text.BackgroundTransparency = 1
  text.Text = "VIP FACTORY OWNER"
  text.TextColor3 = Color3.fromRGB(255, 215, 95)
  text.TextStrokeTransparency = 0.3
  text.TextScaled = true
  text.Font = Enum.Font.GothamBold
  text.Parent = plate
  local halo = Instance.new("Highlight")
  halo.Adornee = character
  halo.FillTransparency = 1
  halo.OutlineColor = Color3.fromRGB(255, 215, 95)
  halo.DepthMode = Enum.HighlightDepthMode.Occluded
  halo.Parent = folder
 end
 -- Attachments must be parented to a BasePart; track them by name for cleanup.
 for _, child in root:GetChildren() do
  if child.Name == "FactoryTrailA" or child.Name == "FactoryTrailB" or child.Name == "FactoryNebula" then child:Destroy() end
 end
 if player:GetAttribute("FactoryPass_GoldenTrail") then
  local a = Instance.new("Attachment")
  a.Name = "FactoryTrailA"
  a.Position = Vector3.new(-0.6, 0, 0.4)
  a.Parent = root
  local b = Instance.new("Attachment")
  b.Name = "FactoryTrailB"
  b.Position = Vector3.new(0.6, 0, 0.4)
  b.Parent = root
  local trail = Instance.new("Trail")
  trail.Attachment0 = a
  trail.Attachment1 = b
  trail.Lifetime = 0.65
  trail.MinLength = 0.15
  trail.Color = ColorSequence.new(Color3.fromRGB(255, 218, 105), Color3.fromRGB(255, 146, 63))
  trail.Transparency = NumberSequence.new({NumberSequenceKeypoint.new(0, 0.15), NumberSequenceKeypoint.new(1, 1)})
  trail.FaceCamera = true
  trail.Parent = folder
 end
 if player:GetAttribute("FactoryPass_NebulaAura") then
  local attachment = Instance.new("Attachment")
  attachment.Name = "FactoryNebula"
  attachment.Parent = root
  local particles = Instance.new("ParticleEmitter")
  particles.Texture = "rbxasset://textures/particles/sparkles_main.dds"
  particles.Color = ColorSequence.new(Color3.fromRGB(190, 135, 255), Color3.fromRGB(102, 248, 240))
  particles.Lifetime = NumberRange.new(0.7, 1.3)
  particles.Rate = 10
  particles.Speed = NumberRange.new(0.8, 1.7)
  particles.SpreadAngle = Vector2.new(180, 180)
  particles.LightEmission = 0.7
  particles.Size = NumberSequence.new(0.22)
  particles.Transparency = NumberSequence.new({NumberSequenceKeypoint.new(0, 0.1), NumberSequenceKeypoint.new(1, 1)})
  particles.Parent = attachment
 end
end

local function refreshOwnership(player, pass)
 if player.Parent ~= Players then return end
 local ok, owns = pcall(function()
  return MarketplaceService:UserOwnsGamePassAsync(player.UserId, pass.Id)
 end)
 if not ok then
  warn("Factory could not verify pass " .. pass.Key .. ". No new perk was granted.")
  return
 end
 if player.Parent ~= Players then return end
 if pass.Key == "Premium" then
  if owns then
   player:SetAttribute("FactoryPass_Premium", true)
   for _, extra in Passes do
    if extra.Key ~= "Premium" then player:SetAttribute("FactoryPass_" .. extra.Key, true) end
   end
   task.spawn(refreshWallet, player, true)
  end
 else
  player:SetAttribute("FactoryPass_" .. pass.Key,
   owns == true or hasFreeExtras(player) or player:GetAttribute("FactoryPass_Premium") == true)
 end
 if player.Character then applyPerks(player, player.Character) end
end
local function join(player)
 if ready[player] then return end
 ready[player] = true
 for _, pass in Passes do
  player:SetAttribute("FactoryPass_" .. pass.Key, pass.Key ~= "Premium" and hasFreeExtras(player))
 end
 task.spawn(refreshWallet, player, false)
 player.CharacterAdded:Connect(function(character)
  local root = character:WaitForChild("HumanoidRootPart", 10)
  local head = character:WaitForChild("Head", 10)
  if root and head and player.Character == character then applyPerks(player, character) end
 end)
 if player.Character then
  task.spawn(function()
   local character = player.Character
   if character:WaitForChild("HumanoidRootPart", 10) and character:WaitForChild("Head", 10) then applyPerks(player, character) end
  end)
 end
 for _, pass in configured do task.spawn(refreshOwnership, player, pass) end
end
Players.PlayerAdded:Connect(join)
Players.PlayerRemoving:Connect(function(player) ready[player] = nil end)
for _, player in Players:GetPlayers() do task.spawn(join, player) end
MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, wasPurchased)
 local pass = configured[passId]
 if wasPurchased and pass then refreshOwnership(player, pass) end
end)
