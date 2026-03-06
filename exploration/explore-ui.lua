local ____lualib = require("lualib_bundle")
local __TS__StringPadStart = ____lualib.__TS__StringPadStart
local __TS__New = ____lualib.__TS__New
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
    return {{branch = "combat", rect = {x = x, y = top, width = buttonWidth, height = buttonHeight}}, {branch = "encounter", rect = {x = x, y = top + buttonHeight + 14, width = buttonWidth, height = buttonHeight}}}
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
function ____exports.createExploreUiState(self, initialSeedIndex)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    local plannerSeedIndex = math.max(
        1,
        math.floor(initialSeedIndex or 1)
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
        isPlannerDebugOpen = false
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
    local hovered = getTileAt(nil, uiState, x, y)
    uiState.hoveredTileKey = hovered and hovered.key
end
function ____exports.onExploreMouseReleased(self, uiState, x, y, button)
    if button ~= 1 then
        return nil
    end
    refreshLayoutIfNeeded(nil, uiState)
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
        "Movement: click neighboring hexes only | P: Planner Debug | R: Reroll Plan",
        panelX + 14,
        uiState.height - 62,
        panelWidth - 28,
        "left",
        0,
        0.66,
        0.66
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
    drawActionPanel(nil, uiState)
    if uiState.isPlannerDebugOpen then
        drawPlannerDebugOverlay(nil, uiState)
    end
end
return ____exports
