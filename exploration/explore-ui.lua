local ____lualib = require("lualib_bundle")
local __TS__StringPadStart = ____lualib.__TS__StringPadStart
local __TS__New = ____lualib.__TS__New
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__ArrayPush = ____lualib.__TS__ArrayPush
local ____exports = {}
local ____explore_2Dstate = require("exploration.explore-state")
local createExploreState = ____explore_2Dstate.createExploreState
local getCurrentTile = ____explore_2Dstate.getCurrentTile
local getHexDistance = ____explore_2Dstate.getHexDistance
local toCoordKey = ____explore_2Dstate.toCoordKey
local tryTravelToCoord = ____explore_2Dstate.tryTravelToCoord
local ____game_2Dplanner = require("planning.game-planner")
local createDefaultGamePlannerConfig = ____game_2Dplanner.createDefaultGamePlannerConfig
local formatGamePlanSpec = ____game_2Dplanner.formatGamePlanSpec
local GamePlanner = ____game_2Dplanner.GamePlanner
local ____world_2Dspec_2Dbuilder = require("planning.world-spec-builder")
local createWorldSpecFromPlan = ____world_2Dspec_2Dbuilder.createWorldSpecFromPlan
local ____world_2Dvalidator = require("planning.world-validator")
local validateWorldAgainstSpec = ____world_2Dvalidator.validateWorldAgainstSpec
local ____world_2Dgenerator = require("exploration.world-generator")
local applyWorldSpecToExploreState = ____world_2Dgenerator.applyWorldSpecToExploreState
local ____player_2Dprogression = require("game.player-progression")
local createPlayerProgression = ____player_2Dprogression.createPlayerProgression
local ____player_2Ditems = require("game.player-items")
local EQUIPMENT_SLOT_LABELS = ____player_2Ditems.EQUIPMENT_SLOT_LABELS
local EQUIPMENT_SLOT_ORDER = ____player_2Ditems.EQUIPMENT_SLOT_ORDER
local function createPlannerPackage(self, seedIndex)
    local plannerSpec = __TS__New(
        GamePlanner,
        createDefaultGamePlannerConfig(
            nil,
            "run-" .. __TS__StringPadStart(
                tostring(seedIndex),
                3,
                "0"
            )
        )
    ):createPlan()
    local worldSpec = createWorldSpecFromPlan(nil, plannerSpec)
    local model = createExploreState(nil, {radius = 3, seed = plannerSpec.seed})
    applyWorldSpecToExploreState(nil, model, worldSpec)
    local worldValidation = validateWorldAgainstSpec(nil, model, worldSpec)
    return {plannerSpec = plannerSpec, worldSpec = worldSpec, model = model, worldValidation = worldValidation}
end
local SQRT3 = math.sqrt(3)
local function axialToScreen(self, state, q, r)
    local x = state.mapCenterX + state.hexSize * (SQRT3 * q + SQRT3 * 0.5 * r)
    local y = state.mapCenterY + state.hexSize * (1.5 * r)
    return {x = x, y = y}
end
local function createButtons(self, width, height)
    local panelWidth = math.min(
        240,
        math.floor(width * 0.24)
    )
    local buttonWidth = panelWidth - 28
    local buttonHeight = 50
    local rightEdge = width - 20
    local x = rightEdge - panelWidth + 14
    local top = math.floor(height * 0.52)
    return {{kind = "branch", branch = "combat", rect = {x = x, y = top, width = buttonWidth, height = buttonHeight}}, {kind = "branch", branch = "encounter", rect = {x = x, y = top + buttonHeight + 14, width = buttonWidth, height = buttonHeight}}}
end
local function createCharacterSheetButtonRect(self)
    return {x = 20, y = 52, width = 180, height = 34}
end
local function createXpBarRect(self)
    return {x = 30, y = 134, width = 240, height = 20}
end
local function getTalentTreeLayout(self, uiState)
    local width = math.min(
        620,
        math.floor(uiState.width * 0.82)
    )
    local height = math.min(
        520,
        math.floor(uiState.height * 0.86)
    )
    local x = math.floor((uiState.width - width) * 0.5)
    local y = math.floor((uiState.height - height) * 0.5)
    local talentRowRects = {}
    local rowY = y + 88
    for ____, talent in ipairs(uiState.playerProgression.talents) do
        if rowY > y + height - 124 then
            break
        end
        talentRowRects[#talentRowRects + 1] = {talentId = talent.id, rect = {x = x + 20, y = rowY, width = width - 40, height = 86}}
        rowY = rowY + 96
    end
    local buttonY = y + height - 80
    local buttonWidth = 150
    local buttonHeight = 36
    return {panelRect = {x = x, y = y, width = width, height = height}, talentRowRects = talentRowRects, confirmButtonRect = {x = x + width - buttonWidth * 2 - 32, y = buttonY, width = buttonWidth, height = buttonHeight}, cancelButtonRect = {x = x + width - buttonWidth - 20, y = buttonY, width = buttonWidth, height = buttonHeight}}
end
local function canConfirmSelectedTalent(self, uiState)
    if not uiState.selectedTalentId or uiState.playerProgression.unspentTalentPoints <= 0 then
        return false
    end
    local selected = __TS__ArrayFind(
        uiState.playerProgression.talents,
        function(____, talent) return talent.id == uiState.selectedTalentId end
    )
    if not selected then
        return false
    end
    return selected.rank < selected.maxRank
end
local function createInventoryButtonRect(self)
    return {x = 212, y = 52, width = 180, height = 34}
end
local function getActionLabel(self, branch, currentTile)
    if branch == "combat" then
        return "Travel to Combat"
    end
    if currentTile.zone == "town" then
        return "Enter Town"
    end
    return "Travel to Encounter"
end
local function refreshLayoutIfNeeded(self, uiState)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    if uiState.width == width and uiState.height == height then
        return
    end
    uiState.width = width
    uiState.height = height
    uiState.mapCenterX = math.floor(width * 0.42)
    uiState.mapCenterY = math.floor(height * 0.5)
    uiState.hexSize = math.max(
        26,
        math.min(
            42,
            math.floor(math.min(width, height) * 0.045)
        )
    )
    uiState.buttons = createButtons(nil, width, height)
    uiState.characterSheetButtonRect = createCharacterSheetButtonRect(nil)
    uiState.inventoryButtonRect = createInventoryButtonRect(nil)
    uiState.xpBarRect = createXpBarRect(nil)
end
local function isPointInRect(self, x, y, rect)
    return x >= rect.x and x <= rect.x + rect.width and y >= rect.y and y <= rect.y + rect.height
end
local function getButtonAt(self, uiState, x, y)
    for ____, button in ipairs(uiState.buttons) do
        if isPointInRect(nil, x, y, button.rect) then
            return button
        end
    end
    return nil
end
local function getTileAt(self, uiState, x, y)
    local bestTile
    local bestDistance = math.huge
    for ____, tile in ipairs(uiState.model.tiles) do
        local center = axialToScreen(nil, uiState, tile.coord.q, tile.coord.r)
        local dx = x - center.x
        local dy = y - center.y
        local distance = math.sqrt(dx * dx + dy * dy)
        if distance < uiState.hexSize * 0.95 and distance < bestDistance then
            bestTile = tile
            bestDistance = distance
        end
    end
    return bestTile
end
local function drawHex(self, centerX, centerY, size, mode)
    local vertices = {}
    do
        local i = 0
        while i < 6 do
            local angle = math.pi / 180 * (60 * i - 30)
            __TS__ArrayPush(
                vertices,
                centerX + size * math.cos(angle),
                centerY + size * math.sin(angle)
            )
            i = i + 1
        end
    end
    love.graphics.polygon(
        mode,
        unpack(vertices)
    )
end
function ____exports.createExploreUiState(self, input)
    local options = type(input) == "number" and ({initialSeedIndex = input}) or (input or ({}))
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    local plannerSeedIndex = math.max(
        1,
        math.floor(options.initialSeedIndex or 1)
    )
    local plannerPackage = createPlannerPackage(nil, plannerSeedIndex)
    return {
        model = plannerPackage.model,
        hoveredTileKey = nil,
        width = width,
        height = height,
        mapCenterX = math.floor(width * 0.42),
        mapCenterY = math.floor(height * 0.5),
        hexSize = math.max(
            26,
            math.min(
                42,
                math.floor(math.min(width, height) * 0.045)
            )
        ),
        buttons = createButtons(nil, width, height),
        time = 0,
        plannerSpec = plannerPackage.plannerSpec,
        worldSpec = plannerPackage.worldSpec,
        worldValidation = plannerPackage.worldValidation,
        plannerSeedIndex = plannerSeedIndex,
        isPlannerDebugOpen = false,
        playerProgression = options.playerProgression or createPlayerProgression(nil),
        xpBarRect = createXpBarRect(nil),
        isTalentTreeOpen = false,
        selectedTalentId = nil,
        isCharacterSheetOpen = false,
        characterSheetButtonRect = createCharacterSheetButtonRect(nil),
        isInventoryOpen = false,
        inventoryButtonRect = createInventoryButtonRect(nil)
    }
end
local function regeneratePlannerSpec(self, uiState)
    uiState.plannerSeedIndex = uiState.plannerSeedIndex + 1
    local plannerPackage = createPlannerPackage(nil, uiState.plannerSeedIndex)
    uiState.plannerSpec = plannerPackage.plannerSpec
    uiState.worldSpec = plannerPackage.worldSpec
    uiState.model = plannerPackage.model
    uiState.worldValidation = plannerPackage.worldValidation
end
function ____exports.onExploreKeyPressed(self, uiState, key)
    if key == "c" then
        uiState.isCharacterSheetOpen = not uiState.isCharacterSheetOpen
        if uiState.isCharacterSheetOpen then
            uiState.isInventoryOpen = false
            uiState.isTalentTreeOpen = false
            uiState.selectedTalentId = nil
        end
        return true
    end
    if key == "i" then
        uiState.isInventoryOpen = not uiState.isInventoryOpen
        if uiState.isInventoryOpen then
            uiState.isCharacterSheetOpen = false
            uiState.isTalentTreeOpen = false
            uiState.selectedTalentId = nil
        end
        return true
    end
    if key == "escape" and (uiState.isCharacterSheetOpen or uiState.isInventoryOpen or uiState.isTalentTreeOpen) then
        uiState.isCharacterSheetOpen = false
        uiState.isInventoryOpen = false
        uiState.isTalentTreeOpen = false
        uiState.selectedTalentId = nil
        return true
    end
    if key == "t" then
        uiState.isTalentTreeOpen = not uiState.isTalentTreeOpen
        if uiState.isTalentTreeOpen then
            uiState.isCharacterSheetOpen = false
            uiState.isInventoryOpen = false
        else
            uiState.selectedTalentId = nil
        end
        return true
    end
    if key == "p" then
        uiState.isPlannerDebugOpen = not uiState.isPlannerDebugOpen
        return true
    end
    if key == "r" then
        regeneratePlannerSpec(nil, uiState)
        return true
    end
    return false
end
function ____exports.updateExploreUiState(self, uiState, dt)
    refreshLayoutIfNeeded(nil, uiState)
    uiState.time = uiState.time + dt
end
function ____exports.onExploreMouseMoved(self, uiState, x, y)
    refreshLayoutIfNeeded(nil, uiState)
    if uiState.isTalentTreeOpen then
        return
    end
    local hovered = getTileAt(nil, uiState, x, y)
    uiState.hoveredTileKey = hovered and hovered.key
end
function ____exports.onExploreMouseReleased(self, uiState, x, y, button)
    if button ~= 1 then
        return nil
    end
    refreshLayoutIfNeeded(nil, uiState)
    if uiState.isTalentTreeOpen then
        local layout = getTalentTreeLayout(nil, uiState)
        if isPointInRect(nil, x, y, layout.cancelButtonRect) then
            uiState.selectedTalentId = nil
            return nil
        end
        if isPointInRect(nil, x, y, layout.confirmButtonRect) and canConfirmSelectedTalent(nil, uiState) then
            local selected = __TS__ArrayFind(
                uiState.playerProgression.talents,
                function(____, talent) return talent.id == uiState.selectedTalentId end
            )
            if selected and selected.rank < selected.maxRank then
                selected.rank = selected.rank + 1
                uiState.playerProgression.unspentTalentPoints = math.max(0, uiState.playerProgression.unspentTalentPoints - 1)
            end
            uiState.selectedTalentId = nil
            return nil
        end
        for ____, row in ipairs(layout.talentRowRects) do
            do
                if not isPointInRect(nil, x, y, row.rect) then
                    goto __continue56
                end
                uiState.selectedTalentId = row.talentId
                return nil
            end
            ::__continue56::
        end
        return nil
    end
    if isPointInRect(nil, x, y, uiState.characterSheetButtonRect) then
        uiState.isCharacterSheetOpen = not uiState.isCharacterSheetOpen
        if uiState.isCharacterSheetOpen then
            uiState.isInventoryOpen = false
        end
        return nil
    end
    if isPointInRect(nil, x, y, uiState.inventoryButtonRect) then
        uiState.isInventoryOpen = not uiState.isInventoryOpen
        if uiState.isInventoryOpen then
            uiState.isCharacterSheetOpen = false
        end
        return nil
    end
    if isPointInRect(nil, x, y, uiState.xpBarRect) then
        uiState.isTalentTreeOpen = not uiState.isTalentTreeOpen
        if uiState.isTalentTreeOpen then
            uiState.isCharacterSheetOpen = false
            uiState.isInventoryOpen = false
        else
            uiState.selectedTalentId = nil
        end
        return nil
    end
    local actionButton = getButtonAt(nil, uiState, x, y)
    if actionButton then
        return {kind = "choose-branch", branch = actionButton.branch}
    end
    local clickedTile = getTileAt(nil, uiState, x, y)
    if clickedTile then
        tryTravelToCoord(nil, uiState.model, clickedTile.coord)
    end
    return nil
end
local function drawPlayerProgressHud(self, uiState)
    local progression = uiState.playerProgression
    local panelX = 20
    local panelY = 94
    local panelWidth = 260
    local panelHeight = 88
    love.graphics.setColor(0.1, 0.12, 0.17, 0.92)
    love.graphics.rectangle(
        "fill",
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        8,
        8
    )
    love.graphics.setColor(0.67, 0.76, 0.9, 0.85)
    love.graphics.rectangle(
        "line",
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        8,
        8
    )
    love.graphics.setColor(0.96, 0.98, 1, 1)
    love.graphics.printf(
        (((progression.raceName .. " ") .. progression.className) .. "  |  Level ") .. tostring(progression.level),
        panelX + 10,
        panelY + 10,
        panelWidth - 20,
        "left",
        0,
        0.66,
        0.66
    )
    local barX = panelX + 10
    local barY = panelY + 40
    local barWidth = panelWidth - 20
    local barHeight = 20
    uiState.xpBarRect = {x = barX, y = barY, width = barWidth, height = barHeight}
    local fillRatio = progression.xpToNextLevel > 0 and progression.xp / progression.xpToNextLevel or 0
    local canAdvanceTalents = progression.unspentTalentPoints > 0 or progression.xpToNextLevel > 0 and progression.xp >= progression.xpToNextLevel
    if canAdvanceTalents then
        local pulse = (math.sin(uiState.time * 5.8) + 1) * 0.5
        local glowAlpha = 0.28 + pulse * 0.34
        love.graphics.setColor(0.92, 0.8, 0.32, glowAlpha)
        love.graphics.rectangle(
            "line",
            barX - 3,
            barY - 3,
            barWidth + 6,
            barHeight + 6,
            7,
            7
        )
        love.graphics.setColor(0.98, 0.88, 0.38, glowAlpha * 0.65)
        love.graphics.rectangle(
            "line",
            barX - 6,
            barY - 6,
            barWidth + 12,
            barHeight + 12,
            9,
            9
        )
    end
    love.graphics.setColor(0.18, 0.22, 0.32, 1)
    love.graphics.rectangle(
        "fill",
        barX,
        barY,
        barWidth,
        barHeight,
        5,
        5
    )
    love.graphics.setColor(0.4, 0.71, 0.94, 0.95)
    love.graphics.rectangle(
        "fill",
        barX,
        barY,
        math.max(
            0,
            math.floor(barWidth * fillRatio)
        ),
        barHeight,
        5,
        5
    )
    love.graphics.setColor(0.72, 0.83, 0.98, 0.9)
    love.graphics.rectangle(
        "line",
        barX,
        barY,
        barWidth,
        barHeight,
        5,
        5
    )
    love.graphics.setColor(0.85, 0.92, 1, 0.92)
    love.graphics.printf(
        (((("XP " .. tostring(progression.xp)) .. "/") .. tostring(progression.xpToNextLevel)) .. "  |  Battles won: ") .. tostring(progression.battlesWon),
        panelX + 10,
        panelY + 66,
        panelWidth - 20,
        "left",
        0,
        0.58,
        0.58
    )
    if canAdvanceTalents then
        love.graphics.setColor(0.97, 0.9, 0.52, 0.95)
        love.graphics.printf(
            "Talent available: click XP bar (or press T)",
            panelX + 10,
            panelY + panelHeight - 14,
            panelWidth - 20,
            "left",
            0,
            0.5,
            0.5
        )
    end
end
local function drawActionPanel(self, uiState)
    local panelX = math.floor(uiState.width * 0.78)
    local panelY = 24
    local panelWidth = uiState.width - panelX - 20
    local panelHeight = uiState.height - 48
    love.graphics.setColor(0.11, 0.13, 0.2, 0.92)
    love.graphics.rectangle(
        "fill",
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        10,
        10
    )
    love.graphics.setColor(0.66, 0.72, 0.86, 0.78)
    love.graphics.rectangle(
        "line",
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        10,
        10
    )
    love.graphics.setColor(0.95, 0.97, 1, 1)
    love.graphics.printf(
        "Expedition Map",
        panelX + 14,
        panelY + 14,
        panelWidth - 28,
        "left",
        0,
        0.96,
        0.96
    )
    love.graphics.setColor(0.2, 0.28, 0.43, 0.96)
    love.graphics.rectangle(
        "fill",
        uiState.characterSheetButtonRect.x,
        uiState.characterSheetButtonRect.y,
        uiState.characterSheetButtonRect.width,
        uiState.characterSheetButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(0.73, 0.84, 0.98, 0.95)
    love.graphics.rectangle(
        "line",
        uiState.characterSheetButtonRect.x,
        uiState.characterSheetButtonRect.y,
        uiState.characterSheetButtonRect.width,
        uiState.characterSheetButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.printf(
        uiState.isCharacterSheetOpen and "Close Character (C)" or "Open Character (C)",
        uiState.characterSheetButtonRect.x,
        uiState.characterSheetButtonRect.y + 9,
        uiState.characterSheetButtonRect.width,
        "center",
        0,
        0.62,
        0.62
    )
    love.graphics.setColor(0.2, 0.28, 0.43, 0.96)
    love.graphics.rectangle(
        "fill",
        uiState.inventoryButtonRect.x,
        uiState.inventoryButtonRect.y,
        uiState.inventoryButtonRect.width,
        uiState.inventoryButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(0.73, 0.84, 0.98, 0.95)
    love.graphics.rectangle(
        "line",
        uiState.inventoryButtonRect.x,
        uiState.inventoryButtonRect.y,
        uiState.inventoryButtonRect.width,
        uiState.inventoryButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.printf(
        uiState.isInventoryOpen and "Close Inventory (I)" or "Open Inventory (I)",
        uiState.inventoryButtonRect.x,
        uiState.inventoryButtonRect.y + 9,
        uiState.inventoryButtonRect.width,
        "center",
        0,
        0.62,
        0.62
    )
    local currentTile = getCurrentTile(nil, uiState.model)
    local playerKey = toCoordKey(nil, uiState.model.playerCoord)
    love.graphics.setColor(0.81, 0.87, 0.97, 0.95)
    love.graphics.printf(
        ((("Current tile: " .. currentTile.name) .. " (") .. playerKey) .. ")",
        panelX + 14,
        panelY + 46,
        panelWidth - 28,
        "left",
        0,
        0.72,
        0.72
    )
    love.graphics.setColor(0.75, 0.82, 0.93, 0.93)
    love.graphics.printf(
        uiState.model.notice,
        panelX + 14,
        panelY + 74,
        panelWidth - 28,
        "left",
        0,
        0.68,
        0.68
    )
    love.graphics.setColor(0.74, 0.8, 0.91, 0.9)
    love.graphics.printf(
        currentTile.description,
        panelX + 14,
        panelY + 112,
        panelWidth - 28,
        "left",
        0,
        0.62,
        0.62
    )
    for ____, actionButton in ipairs(uiState.buttons) do
        love.graphics.setColor(0.2, 0.28, 0.43, 0.96)
        love.graphics.rectangle(
            "fill",
            actionButton.rect.x,
            actionButton.rect.y,
            actionButton.rect.width,
            actionButton.rect.height,
            8,
            8
        )
        love.graphics.setColor(0.73, 0.84, 0.98, 0.95)
        love.graphics.rectangle(
            "line",
            actionButton.rect.x,
            actionButton.rect.y,
            actionButton.rect.width,
            actionButton.rect.height,
            8,
            8
        )
        love.graphics.setColor(1, 1, 1, 1)
        local label = getActionLabel(nil, actionButton.branch, currentTile)
        love.graphics.printf(
            label,
            actionButton.rect.x,
            actionButton.rect.y + 16,
            actionButton.rect.width,
            "center",
            0,
            0.74,
            0.74
        )
    end
    love.graphics.setColor(0.72, 0.8, 0.95, 0.86)
    love.graphics.printf(
        "Movement: click neighboring hexes | Click XP bar or T: Talents | C: Character | I: Inventory | P: Planner Debug | R: Reroll Plan",
        panelX + 14,
        uiState.height - 62,
        panelWidth - 28,
        "left",
        0,
        0.66,
        0.66
    )
end
local function drawTalentTreeOverlay(self, uiState)
    if not uiState.isTalentTreeOpen then
        return
    end
    local progression = uiState.playerProgression
    local layout = getTalentTreeLayout(nil, uiState)
    local x = layout.panelRect.x
    local y = layout.panelRect.y
    local width = layout.panelRect.width
    local height = layout.panelRect.height
    love.graphics.setColor(0, 0, 0, 0.54)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    love.graphics.setColor(0.09, 0.1, 0.14, 0.98)
    love.graphics.rectangle(
        "fill",
        x,
        y,
        width,
        height,
        10,
        10
    )
    love.graphics.setColor(0.88, 0.8, 0.36, 0.92)
    love.graphics.rectangle(
        "line",
        x,
        y,
        width,
        height,
        10,
        10
    )
    love.graphics.setColor(0.98, 0.97, 0.92, 1)
    love.graphics.printf(
        "Talent Tree (Stub)",
        x + 20,
        y + 18,
        width - 40,
        "left",
        0,
        0.94,
        0.94
    )
    love.graphics.setColor(0.9, 0.88, 0.75, 0.96)
    love.graphics.printf(
        "Unspent talent points: " .. tostring(progression.unspentTalentPoints),
        x + 20,
        y + 52,
        width - 40,
        "left",
        0,
        0.66,
        0.66
    )
    for ____, row in ipairs(layout.talentRowRects) do
        do
            local talent = __TS__ArrayFind(
                progression.talents,
                function(____, entry) return entry.id == row.talentId end
            )
            if not talent then
                goto __continue76
            end
            local isSelected = uiState.selectedTalentId == talent.id
            if isSelected then
                love.graphics.setColor(0.31, 0.32, 0.16, 0.95)
            else
                love.graphics.setColor(0.18, 0.2, 0.28, 0.95)
            end
            love.graphics.rectangle(
                "fill",
                row.rect.x,
                row.rect.y,
                row.rect.width,
                row.rect.height,
                8,
                8
            )
            if isSelected then
                love.graphics.setColor(0.95, 0.84, 0.36, 0.95)
            else
                love.graphics.setColor(0.74, 0.79, 0.9, 0.86)
            end
            love.graphics.rectangle(
                "line",
                row.rect.x,
                row.rect.y,
                row.rect.width,
                row.rect.height,
                8,
                8
            )
            love.graphics.setColor(0.96, 0.97, 1, 0.98)
            love.graphics.printf(
                talent.name,
                row.rect.x + 14,
                row.rect.y + 12,
                row.rect.width - 28,
                "left",
                0,
                0.72,
                0.72
            )
            love.graphics.setColor(0.76, 0.84, 0.97, 0.92)
            love.graphics.printf(
                talent.description,
                row.rect.x + 14,
                row.rect.y + 38,
                row.rect.width - 28,
                "left",
                0,
                0.56,
                0.56
            )
            love.graphics.setColor(0.89, 0.92, 0.98, 0.92)
            love.graphics.printf(
                (("Rank " .. tostring(talent.rank)) .. "/") .. tostring(talent.maxRank),
                row.rect.x + row.rect.width - 140,
                row.rect.y + 12,
                120,
                "right",
                0,
                0.56,
                0.56
            )
        end
        ::__continue76::
    end
    local canConfirm = canConfirmSelectedTalent(nil, uiState)
    love.graphics.setColor(canConfirm and 0.26 or 0.2, canConfirm and 0.5 or 0.22, canConfirm and 0.31 or 0.25, canConfirm and 0.95 or 0.72)
    love.graphics.rectangle(
        "fill",
        layout.confirmButtonRect.x,
        layout.confirmButtonRect.y,
        layout.confirmButtonRect.width,
        layout.confirmButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(canConfirm and 0.78 or 0.6, canConfirm and 0.95 or 0.7, canConfirm and 0.84 or 0.72, 0.95)
    love.graphics.rectangle(
        "line",
        layout.confirmButtonRect.x,
        layout.confirmButtonRect.y,
        layout.confirmButtonRect.width,
        layout.confirmButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(1, 1, 1, canConfirm and 0.98 or 0.7)
    love.graphics.printf(
        "Confirm",
        layout.confirmButtonRect.x,
        layout.confirmButtonRect.y + 10,
        layout.confirmButtonRect.width,
        "center",
        0,
        0.62,
        0.62
    )
    love.graphics.setColor(0.28, 0.22, 0.22, 0.9)
    love.graphics.rectangle(
        "fill",
        layout.cancelButtonRect.x,
        layout.cancelButtonRect.y,
        layout.cancelButtonRect.width,
        layout.cancelButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(0.9, 0.76, 0.76, 0.95)
    love.graphics.rectangle(
        "line",
        layout.cancelButtonRect.x,
        layout.cancelButtonRect.y,
        layout.cancelButtonRect.width,
        layout.cancelButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(1, 1, 1, 0.96)
    love.graphics.printf(
        "Cancel",
        layout.cancelButtonRect.x,
        layout.cancelButtonRect.y + 10,
        layout.cancelButtonRect.width,
        "center",
        0,
        0.62,
        0.62
    )
    love.graphics.setColor(0.84, 0.87, 0.95, 0.9)
    love.graphics.printf(
        "Select a talent row, then Confirm or Cancel. While open, this panel captures clicks.",
        x + 20,
        y + height - 38,
        width - 40,
        "left",
        0,
        0.56,
        0.56
    )
end
local function drawCharacterSheetOverlay(self, uiState)
    if not uiState.isCharacterSheetOpen then
        return
    end
    local progression = uiState.playerProgression
    local width = math.min(
        560,
        math.floor(uiState.width * 0.78)
    )
    local height = math.min(
        560,
        math.floor(uiState.height * 0.9)
    )
    local x = math.floor((uiState.width - width) * 0.5)
    local y = math.floor((uiState.height - height) * 0.5)
    love.graphics.setColor(0, 0, 0, 0.52)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    love.graphics.setColor(0.08, 0.1, 0.15, 0.97)
    love.graphics.rectangle(
        "fill",
        x,
        y,
        width,
        height,
        10,
        10
    )
    love.graphics.setColor(0.74, 0.84, 0.98, 0.92)
    love.graphics.rectangle(
        "line",
        x,
        y,
        width,
        height,
        10,
        10
    )
    love.graphics.setColor(0.96, 0.98, 1, 1)
    love.graphics.printf(
        "Character Sheet",
        x + 18,
        y + 18,
        width - 36,
        "left",
        0,
        0.9,
        0.9
    )
    local lines = {
        "Class: " .. progression.className,
        "Race: " .. progression.raceName,
        "Level: " .. tostring(progression.level),
        "Current XP: " .. tostring(progression.xp),
        "XP to next level: " .. tostring(progression.xpToNextLevel),
        "Total XP earned: " .. tostring(progression.totalXp),
        "Battles won: " .. tostring(progression.battlesWon),
        "Max HP (progression): " .. tostring(progression.maxHp),
        "Dice slots: " .. tostring(progression.diceSlots)
    }
    local textY = y + 64
    for ____, line in ipairs(lines) do
        love.graphics.setColor(0.85, 0.92, 1, 0.96)
        love.graphics.printf(
            line,
            x + 20,
            textY,
            width - 40,
            "left",
            0,
            0.68,
            0.68
        )
        textY = textY + 24
    end
    textY = textY + 8
    love.graphics.setColor(0.92, 0.96, 1, 0.98)
    love.graphics.printf(
        "Equipped Items (combat-capable dice slots)",
        x + 20,
        textY,
        width - 40,
        "left",
        0,
        0.66,
        0.66
    )
    textY = textY + 24
    for ____, slotId in ipairs(EQUIPMENT_SLOT_ORDER) do
        local slotLabel = EQUIPMENT_SLOT_LABELS[slotId]
        local item = progression.items.equipped[slotId]
        local itemName = item and item.name or "Empty"
        love.graphics.setColor(item and 0.82 or 0.67, item and 0.92 or 0.78, item and 1 or 0.9, 0.95)
        love.graphics.printf(
            (slotLabel .. ": ") .. itemName,
            x + 20,
            textY,
            width - 40,
            "left",
            0,
            0.62,
            0.62
        )
        textY = textY + 19
    end
    love.graphics.setColor(0.74, 0.82, 0.94, 0.9)
    love.graphics.printf(
        "Press C or Escape to close.",
        x + 20,
        y + height - 38,
        width - 40,
        "left",
        0,
        0.6,
        0.6
    )
end
local function drawInventoryOverlay(self, uiState)
    if not uiState.isInventoryOpen then
        return
    end
    local progression = uiState.playerProgression
    local width = math.min(
        560,
        math.floor(uiState.width * 0.78)
    )
    local height = math.min(
        360,
        math.floor(uiState.height * 0.72)
    )
    local x = math.floor((uiState.width - width) * 0.5)
    local y = math.floor((uiState.height - height) * 0.5)
    love.graphics.setColor(0, 0, 0, 0.52)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    love.graphics.setColor(0.08, 0.1, 0.15, 0.97)
    love.graphics.rectangle(
        "fill",
        x,
        y,
        width,
        height,
        10,
        10
    )
    love.graphics.setColor(0.74, 0.84, 0.98, 0.92)
    love.graphics.rectangle(
        "line",
        x,
        y,
        width,
        height,
        10,
        10
    )
    love.graphics.setColor(0.96, 0.98, 1, 1)
    love.graphics.printf(
        "Inventory",
        x + 18,
        y + 18,
        width - 36,
        "left",
        0,
        0.9,
        0.9
    )
    love.graphics.setColor(0.82, 0.9, 1, 0.95)
    love.graphics.printf(
        "Carried Items (exploration access)",
        x + 20,
        y + 58,
        width - 40,
        "left",
        0,
        0.66,
        0.66
    )
    local textY = y + 84
    if #progression.items.inventory == 0 then
        love.graphics.setColor(0.72, 0.8, 0.94, 0.9)
        love.graphics.printf(
            "No items in inventory yet.",
            x + 20,
            textY,
            width - 40,
            "left",
            0,
            0.62,
            0.62
        )
        textY = textY + 24
    else
        for ____, item in ipairs(progression.items.inventory) do
            love.graphics.setColor(0.84, 0.92, 1, 0.96)
            love.graphics.printf(
                "- " .. item.name,
                x + 20,
                textY,
                width - 40,
                "left",
                0,
                0.62,
                0.62
            )
            textY = textY + 20
        end
    end
    love.graphics.setColor(0.74, 0.82, 0.94, 0.9)
    love.graphics.printf(
        "Press I or Escape to close.",
        x + 20,
        y + height - 38,
        width - 40,
        "left",
        0,
        0.6,
        0.6
    )
end
local function drawPlannerDebugOverlay(self, uiState)
    love.graphics.setColor(0.02, 0.02, 0.03, 0.86)
    love.graphics.rectangle(
        "fill",
        24,
        24,
        uiState.width - 48,
        uiState.height - 48,
        10,
        10
    )
    love.graphics.setColor(0.85, 0.9, 0.98, 0.8)
    love.graphics.rectangle(
        "line",
        24,
        24,
        uiState.width - 48,
        uiState.height - 48,
        10,
        10
    )
    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.printf(
        "GamePlanner Debug Spec",
        40,
        40,
        uiState.width - 80,
        "left",
        0,
        0.95,
        0.95
    )
    love.graphics.setColor(0.74, 0.82, 0.94, 0.92)
    love.graphics.printf(
        "Spec generated for proc-gen constraints. Press P to close, R to reroll.",
        40,
        68,
        uiState.width - 80,
        "left",
        0,
        0.64,
        0.64
    )
    local lines = formatGamePlanSpec(nil, uiState.plannerSpec)
    local y = 98
    for ____, line in ipairs(lines) do
        if y > uiState.height - 58 then
            break
        end
        love.graphics.setColor(0.9, 0.93, 1, 0.95)
        love.graphics.printf(
            line,
            42,
            y,
            uiState.width - 84,
            "left",
            0,
            0.58,
            0.58
        )
        y = y + 18
    end
    local validationY = uiState.height - 180
    love.graphics.setColor(0.84, 0.9, 0.99, 0.95)
    love.graphics.printf(
        "World Validation",
        42,
        validationY,
        uiState.width - 84,
        "left",
        0,
        0.72,
        0.72
    )
    love.graphics.setColor(uiState.worldValidation.isValid and 0.58 or 1, uiState.worldValidation.isValid and 0.9 or 0.6, 0.62, 0.95)
    love.graphics.printf(
        uiState.worldValidation.isValid and "Status: PASS" or "Status: FAIL",
        42,
        validationY + 22,
        uiState.width - 84,
        "left",
        0,
        0.64,
        0.64
    )
    local issueY = validationY + 46
    if #uiState.worldValidation.issues == 0 then
        love.graphics.setColor(0.74, 0.88, 0.8, 0.9)
        love.graphics.printf(
            "All required constraints satisfied.",
            42,
            issueY,
            uiState.width - 84,
            "left",
            0,
            0.56,
            0.56
        )
    else
        for ____, issue in ipairs(uiState.worldValidation.issues) do
            if issueY > uiState.height - 26 then
                break
            end
            love.graphics.setColor(1, 0.72, 0.72, 0.92)
            love.graphics.printf(
                "- " .. issue.message,
                42,
                issueY,
                uiState.width - 84,
                "left",
                0,
                0.54,
                0.54
            )
            issueY = issueY + 16
        end
    end
end
function ____exports.drawExploreUi(self, uiState, visitCount)
    refreshLayoutIfNeeded(nil, uiState)
    love.graphics.setColor(0.07, 0.09, 0.13, 1)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    local pulse = math.sin(uiState.time * 0.9) * 0.05 + 0.95
    for ____, tile in ipairs(uiState.model.tiles) do
        local center = axialToScreen(nil, uiState, tile.coord.q, tile.coord.r)
        local zoneColor = tile.color
        local isHovered = uiState.hoveredTileKey == tile.key
        local isPlayerTile = toCoordKey(nil, uiState.model.playerCoord) == tile.key
        local isNeighbor = getHexDistance(nil, uiState.model.playerCoord, tile.coord) == 1
        local fillAlpha = isPlayerTile and 1 or (isNeighbor and 0.95 or 0.85)
        love.graphics.setColor(zoneColor[1], zoneColor[2], zoneColor[3], fillAlpha)
        drawHex(
            nil,
            center.x,
            center.y,
            uiState.hexSize * (isHovered and 1.03 or 1),
            "fill"
        )
        if isPlayerTile then
            love.graphics.setColor(0.98, 0.98, 1, 1)
            drawHex(
                nil,
                center.x,
                center.y,
                uiState.hexSize * 1.03,
                "line"
            )
            love.graphics.setColor(0.98, 0.98, 1, 0.9)
            love.graphics.circle(
                "line",
                center.x,
                center.y,
                math.max(4, uiState.hexSize * 0.22)
            )
            love.graphics.setColor(0.04, 0.04, 0.04, 1)
            love.graphics.circle(
                "fill",
                center.x,
                center.y,
                math.max(5, uiState.hexSize * 0.18)
            )
        elseif isNeighbor then
            love.graphics.setColor(0.95, 0.95, 1, 0.72 * pulse)
            drawHex(
                nil,
                center.x,
                center.y,
                uiState.hexSize * 1.01,
                "line"
            )
        else
            love.graphics.setColor(0.16, 0.18, 0.25, 0.7)
            drawHex(
                nil,
                center.x,
                center.y,
                uiState.hexSize,
                "line"
            )
        end
        love.graphics.setColor(1, 1, 1, 0.84)
        love.graphics.printf(
            tile.name,
            center.x - 40,
            center.y - 4,
            80,
            "center",
            0,
            0.39,
            0.39
        )
    end
    love.graphics.setColor(0.9, 0.95, 1, 0.96)
    love.graphics.printf(
        "Explore Visits: " .. tostring(visitCount),
        20,
        18,
        280,
        "left",
        0,
        0.75,
        0.75
    )
    drawPlayerProgressHud(nil, uiState)
    drawActionPanel(nil, uiState)
    if uiState.isPlannerDebugOpen then
        drawPlannerDebugOverlay(nil, uiState)
    end
    drawTalentTreeOverlay(nil, uiState)
    drawCharacterSheetOverlay(nil, uiState)
    drawInventoryOverlay(nil, uiState)
end
return ____exports
