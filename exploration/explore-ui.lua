local ____lualib = require("lualib_bundle")
local __TS__StringPadStart = ____lualib.__TS__StringPadStart
local __TS__New = ____lualib.__TS__New
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArraySome = ____lualib.__TS__ArraySome
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ArrayIncludes = ____lualib.__TS__ArrayIncludes
local __TS__NumberToFixed = ____lualib.__TS__NumberToFixed
local __TS__ArrayFindIndex = ____lualib.__TS__ArrayFindIndex
local __TS__ArrayPush = ____lualib.__TS__ArrayPush
local ____exports = {}
local isPointInRect, asAdjustableShopSide, getShopDieTargetRects, syncShopVisualDice, getShopVisualDieAt, getShopFaceTiles, getShopFaceTileAt
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
local ____quest_2Devents = require("planning.quest-events")
local recordTileVisited = ____quest_2Devents.recordTileVisited
local ____content_2Dregistry = require("planning.content-registry")
local getQuestById = ____content_2Dregistry.getQuestById
local ____quest_2Dlog = require("planning.quest-log")
local listQuestEntries = ____quest_2Dlog.listQuestEntries
local ____world_2Dgenerator = require("exploration.world-generator")
local applyWorldSpecToExploreState = ____world_2Dgenerator.applyWorldSpecToExploreState
local ____player_2Dprogression = require("game.player-progression")
local buildGeneratedFaceId = ____player_2Dprogression.buildGeneratedFaceId
local recordAppendFaceCopy = ____player_2Dprogression.recordAppendFaceCopy
local recordFaceAdjustment = ____player_2Dprogression.recordFaceAdjustment
local recordRemoveFace = ____player_2Dprogression.recordRemoveFace
local createPlayerProgression = ____player_2Dprogression.createPlayerProgression
local ____player_2Dcombat_2Ddice = require("game.player-combat-dice")
local createPlayerCombatDiceLoadout = ____player_2Dcombat_2Ddice.createPlayerCombatDiceLoadout
local ____face_2Dadjustments = require("game.face-adjustments")
local appendCopiedFaceEntry = ____face_2Dadjustments.appendCopiedFaceEntry
local applyFaceAdjustmentEntry = ____face_2Dadjustments.applyFaceAdjustmentEntry
local removeFaceEntry = ____face_2Dadjustments.removeFaceEntry
local ____player_2Ditems = require("game.player-items")
local EQUIPMENT_SLOT_LABELS = ____player_2Ditems.EQUIPMENT_SLOT_LABELS
local EQUIPMENT_SLOT_ORDER = ____player_2Ditems.EQUIPMENT_SLOT_ORDER
local ____faces = require("game.faces.index")
local FaceAdjustmentModalityType = ____faces.FaceAdjustmentModalityType
function isPointInRect(self, x, y, rect)
    return x >= rect.x and x <= rect.x + rect.width and y >= rect.y and y <= rect.y + rect.height
end
function asAdjustableShopSide(self, side)
    if not side then
        return nil
    end
    local candidate = side
    if type(candidate.getAdjustmentProperties) ~= "function" then
        return nil
    end
    return candidate
end
function getShopDieTargetRects(self, layout, dice)
    local listRect = layout.dieListRect
    local count = #dice
    if count <= 0 then
        return {}
    end
    local horizontalPadding = 16
    local topPadding = 56
    local bottomPadding = 28
    local gap = 14
    local availableWidth = math.max(80, listRect.width - horizontalPadding * 2)
    local availableHeight = math.max(80, listRect.height - topPadding - bottomPadding)
    local columns = count <= 3 and count or (count <= 6 and 3 or 4)
    local rows = math.max(
        1,
        math.ceil(count / columns)
    )
    local tileSize = math.max(
        38,
        math.min(
            78,
            math.floor((availableWidth - gap * math.max(0, columns - 1)) / math.max(1, columns)),
            math.floor((availableHeight - gap * math.max(0, rows - 1)) / rows)
        )
    )
    local usedWidth = tileSize * columns + gap * math.max(0, columns - 1)
    local usedHeight = tileSize * rows + gap * math.max(0, rows - 1)
    local startX = listRect.x + math.floor((listRect.width - usedWidth) * 0.5)
    local startY = listRect.y + topPadding + math.floor((availableHeight - usedHeight) * 0.5)
    return __TS__ArrayMap(
        dice,
        function(____, die, index)
            local col = index % columns
            local row = math.floor(index / columns)
            local rectX = startX + col * (tileSize + gap)
            local rectY = startY + row * (tileSize + gap)
            return {id = die.id, rect = {x = rectX, y = rectY, width = tileSize, height = tileSize}}
        end
    )
end
function syncShopVisualDice(self, uiState, dice, layout, _forceRespawn)
    if _forceRespawn == nil then
        _forceRespawn = false
    end
    local targetRects = getShopDieTargetRects(nil, layout, dice)
    local nextVisuals = {}
    for ____, target in ipairs(targetRects) do
        do
            local die = __TS__ArrayFind(
                dice,
                function(____, entry) return entry.id == target.id end
            )
            if not die then
                goto __continue152
            end
            local targetX = target.rect.x + target.rect.width * 0.5
            local targetY = target.rect.y + target.rect.height * 0.5
            nextVisuals[#nextVisuals + 1] = {
                id = target.id,
                label = die.name,
                x = targetX,
                y = targetY,
                size = target.rect.width
            }
        end
        ::__continue152::
    end
    uiState.shopVisualDice = nextVisuals
end
function getShopVisualDieAt(self, uiState, x, y)
    do
        local index = #uiState.shopVisualDice - 1
        while index >= 0 do
            local die = uiState.shopVisualDice[index + 1]
            local half = die.size * 0.5
            if x >= die.x - half and x <= die.x + half and y >= die.y - half and y <= die.y + half then
                return die
            end
            index = index - 1
        end
    end
    return nil
end
function getShopFaceTiles(self, layout, selectedDie)
    if not selectedDie or #selectedDie.sides <= 0 then
        return {}
    end
    local count = #selectedDie.sides
    local listRect = layout.faceListRect
    local topPadding = 56
    local bottomPadding = 36
    local horizontalPadding = 14
    local gap = 10
    local availableWidth = math.max(80, listRect.width - horizontalPadding * 2)
    local availableHeight = math.max(80, listRect.height - topPadding - bottomPadding)
    local columns = count <= 3 and 1 or (count <= 8 and 2 or 3)
    local rows = math.max(
        1,
        math.ceil(count / columns)
    )
    local tileSize = math.max(
        34,
        math.min(
            64,
            math.floor((availableWidth - gap * math.max(0, columns - 1)) / math.max(1, columns)),
            math.floor((availableHeight - gap * math.max(0, rows - 1)) / rows)
        )
    )
    local usedWidth = tileSize * columns + gap * math.max(0, columns - 1)
    local usedHeight = tileSize * rows + gap * math.max(0, rows - 1)
    local startX = listRect.x + math.floor((listRect.width - usedWidth) * 0.5)
    local startY = listRect.y + topPadding + math.floor((availableHeight - usedHeight) * 0.5)
    return __TS__ArrayMap(
        selectedDie.sides,
        function(____, side, index)
            local col = index % columns
            local row = math.floor(index / columns)
            return {id = side.id, rect = {x = startX + col * (tileSize + gap), y = startY + row * (tileSize + gap), width = tileSize, height = tileSize}}
        end
    )
end
function getShopFaceTileAt(self, layout, selectedDie, x, y)
    local tiles = getShopFaceTiles(nil, layout, selectedDie)
    for ____, tile in ipairs(tiles) do
        if isPointInRect(nil, x, y, tile.rect) then
            return tile
        end
    end
    return nil
end
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
local function createCraftShopButtonRect(self)
    return {x = 404, y = 52, width = 200, height = 34}
end
local function createQuestMenuButtonRect(self)
    return {x = 616, y = 52, width = 180, height = 34}
end
local function createCraftsfolkOptions(self)
    return {{id = "craft:up-down-smith", name = "Up/Down Smith", description = "Simple face tuning specialist for upgrade and downgrade work."}, {id = "craft:face-smith", name = "Face Smith", description = "Copies an existing face onto a die or removes a selected face."}}
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
    uiState.craftShopButtonRect = createCraftShopButtonRect(nil)
    uiState.questMenuButtonRect = createQuestMenuButtonRect(nil)
    uiState.xpBarRect = createXpBarRect(nil)
end
local function getButtonAt(self, uiState, x, y)
    for ____, button in ipairs(uiState.buttons) do
        if isPointInRect(nil, x, y, button.rect) then
            return button
        end
    end
    return nil
end
local function listQuestEntriesForCategory(self, category)
    return __TS__ArrayFilter(
        listQuestEntries(nil),
        function(____, entry) return entry.category == category end
    )
end
local function ensureQuestSelection(self, uiState)
    local entries = listQuestEntriesForCategory(nil, uiState.selectedQuestCategory)
    if #entries == 0 then
        uiState.selectedQuestId = nil
        return
    end
    local selectedExists = __TS__ArraySome(
        entries,
        function(____, entry) return entry.questId == uiState.selectedQuestId end
    )
    if not selectedExists then
        local ____uiState_2 = uiState
        local ____opt_0 = entries[1]
        ____uiState_2.selectedQuestId = ____opt_0 and ____opt_0.questId
    end
end
local function getSelectedQuestEntry(self, uiState)
    ensureQuestSelection(nil, uiState)
    if uiState.selectedQuestId == nil then
        return nil
    end
    return __TS__ArrayFind(
        listQuestEntriesForCategory(nil, uiState.selectedQuestCategory),
        function(____, entry) return entry.questId == uiState.selectedQuestId end
    )
end
local function getQuestMenuLayout(self, uiState)
    local panelWidth = math.min(
        860,
        math.floor(uiState.width * 0.88)
    )
    local panelHeight = math.min(
        560,
        math.floor(uiState.height * 0.9)
    )
    local panelX = math.floor((uiState.width - panelWidth) * 0.5)
    local panelY = math.floor((uiState.height - panelHeight) * 0.5)
    local categories = {"main", "side", "town"}
    local categoryTabs = __TS__ArrayMap(
        categories,
        function(____, category, index) return {category = category, rect = {x = panelX + 20 + index * 132, y = panelY + 56, width = 120, height = 32}} end
    )
    local questRows = {}
    local rowY = panelY + 104
    local entries = listQuestEntriesForCategory(nil, uiState.selectedQuestCategory)
    for ____, entry in ipairs(entries) do
        if rowY > panelY + panelHeight - 64 then
            break
        end
        questRows[#questRows + 1] = {questId = entry.questId, rect = {x = panelX + 20, y = rowY, width = 280, height = 34}}
        rowY = rowY + 42
    end
    local objectiveGoToButtons = {}
    local selectedQuest = getSelectedQuestEntry(nil, uiState)
    if selectedQuest ~= nil then
        local quest = getQuestById(nil, selectedQuest.questId)
        local objectiveY = panelY + 146
        for ____, objective in ipairs(quest.objectives) do
            if objectiveY > panelY + panelHeight - 64 then
                break
            end
            if objective.kind == "visit-tile" then
                objectiveGoToButtons[#objectiveGoToButtons + 1] = {objectiveId = objective.id, rect = {x = panelX + panelWidth - 180, y = objectiveY - 2, width = 120, height = 24}}
            end
            objectiveY = objectiveY + 52
        end
    end
    return {
        panelRect = {x = panelX, y = panelY, width = panelWidth, height = panelHeight},
        closeButtonRect = {x = panelX + panelWidth - 50, y = panelY + 12, width = 34, height = 24},
        clearGoToRect = {x = panelX + panelWidth - 220, y = panelY + 56, width = 140, height = 32},
        categoryTabs = categoryTabs,
        questRows = questRows,
        objectiveGoToButtons = objectiveGoToButtons
    }
end
local function tileMatchesGoToMode(self, uiState, tile)
    if not uiState.isGoToTileMode then
        return false
    end
    if uiState.goToTileZone ~= nil and tile.zone ~= uiState.goToTileZone then
        return false
    end
    if uiState.goToTileIds ~= nil and #uiState.goToTileIds > 0 then
        local specialTileId = type(tile.metadata.specialTileId) == "string" and tile.metadata.specialTileId or nil
        if specialTileId == nil then
            return false
        end
        return __TS__ArrayIncludes(uiState.goToTileIds, specialTileId)
    end
    return true
end
local function getCraftShopLayout(self, uiState, dice)
    local panelWidth = math.min(
        960,
        math.floor(uiState.width * 0.92)
    )
    local panelHeight = math.min(
        560,
        math.floor(uiState.height * 0.9)
    )
    local panelX = math.floor((uiState.width - panelWidth) * 0.5)
    local panelY = math.floor((uiState.height - panelHeight) * 0.5)
    local craftsfolkRows = {}
    local craftsfolkY = panelY + 74
    for ____, option in ipairs(uiState.availableCraftsfolk) do
        craftsfolkRows[#craftsfolkRows + 1] = {id = option.id, rect = {x = panelX + 20, y = craftsfolkY, width = panelWidth - 40, height = 42}}
        craftsfolkY = craftsfolkY + 50
    end
    local dieListRect = {
        x = panelX + 20,
        y = craftsfolkY + 12,
        width = math.floor((panelWidth - 60) * 0.45),
        height = panelHeight - (craftsfolkY - panelY) - 36
    }
    local faceListRect = {
        x = dieListRect.x + dieListRect.width + 20,
        y = dieListRect.y,
        width = math.floor((panelWidth - (dieListRect.width + 80)) * 0.58),
        height = dieListRect.height
    }
    local propertyListRect = {x = faceListRect.x + faceListRect.width + 20, y = faceListRect.y, width = panelX + panelWidth - (faceListRect.x + faceListRect.width + 20) - 20, height = faceListRect.height}
    local rowTopInset = 36
    local rowBottomInset = 10
    local dieRowHeight = 28
    local dieRowGap = 4
    local faceRowHeight = 28
    local faceRowGap = 4
    local propertyRowHeight = 46
    local propertyRowGap = 6
    local dieVisibleCount = math.max(
        1,
        math.floor((dieListRect.height - rowTopInset - rowBottomInset) / (dieRowHeight + dieRowGap))
    )
    local clampedDieStart = math.max(
        0,
        math.min(
            uiState.shopDieScrollIndex,
            math.max(0, #dice - dieVisibleCount)
        )
    )
    uiState.shopDieScrollIndex = clampedDieStart
    local dieRows = {}
    local dieY = dieListRect.y + rowTopInset
    do
        local index = clampedDieStart
        while index < #dice and #dieRows < dieVisibleCount do
            local die = dice[index + 1]
            dieRows[#dieRows + 1] = {id = die.id, rect = {x = dieListRect.x + 10, y = dieY, width = dieListRect.width - 20, height = dieRowHeight}}
            dieY = dieY + (dieRowHeight + dieRowGap)
            index = index + 1
        end
    end
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, die) return die.id == uiState.selectedUpgradeDieId end
    ) or dice[1]
    local faceRows = {}
    local faceY = faceListRect.y + rowTopInset
    local totalFaceCount = selectedDie and #selectedDie.sides or 0
    local faceVisibleCount = math.max(
        1,
        math.floor((faceListRect.height - rowTopInset - rowBottomInset) / (faceRowHeight + faceRowGap))
    )
    local clampedFaceStart = math.max(
        0,
        math.min(
            uiState.shopFaceScrollIndex,
            math.max(0, totalFaceCount - faceVisibleCount)
        )
    )
    uiState.shopFaceScrollIndex = clampedFaceStart
    if selectedDie ~= nil then
        do
            local index = clampedFaceStart
            while index < #selectedDie.sides and #faceRows < faceVisibleCount do
                local side = selectedDie.sides[index + 1]
                faceRows[#faceRows + 1] = {id = side.id, rect = {x = faceListRect.x + 10, y = faceY, width = faceListRect.width - 20, height = faceRowHeight}}
                faceY = faceY + (faceRowHeight + faceRowGap)
                index = index + 1
            end
        end
    end
    local ____opt_5 = selectedDie
    local selectedSide = ____opt_5 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    local adjustableSide = asAdjustableShopSide(nil, selectedSide)
    local propertyRows = {}
    local propertyY = propertyListRect.y + rowTopInset
    local properties = adjustableSide and adjustableSide:getAdjustmentProperties() or ({})
    local actionButtonHeight = 28
    local actionRowGap = 8
    local footerHeight = 58
    local footerBottomInset = 16
    local actionAndFooterReservedHeight = actionButtonHeight + actionRowGap + footerHeight + footerBottomInset
    local propertyVisibleCount = math.max(
        1,
        math.floor((propertyListRect.height - rowTopInset - actionAndFooterReservedHeight) / (propertyRowHeight + propertyRowGap))
    )
    local clampedPropertyStart = math.max(
        0,
        math.min(
            uiState.shopPropertyScrollIndex,
            math.max(0, #properties - propertyVisibleCount)
        )
    )
    uiState.shopPropertyScrollIndex = clampedPropertyStart
    if adjustableSide ~= nil then
        do
            local index = clampedPropertyStart
            while index < #properties and #propertyRows < propertyVisibleCount do
                local property = properties[index + 1]
                propertyRows[#propertyRows + 1] = {id = property.id, rect = {x = propertyListRect.x + 10, y = propertyY, width = propertyListRect.width - 20, height = propertyRowHeight}}
                propertyY = propertyY + (propertyRowHeight + propertyRowGap)
                index = index + 1
            end
        end
    end
    local actionButtonWidth = math.max(
        90,
        math.floor((propertyListRect.width - 30) * 0.5)
    )
    local footerTopY = panelY + panelHeight - footerHeight - footerBottomInset
    local actionButtonY = footerTopY - actionButtonHeight - actionRowGap
    local primaryActionButtonRect = {x = propertyListRect.x + 10, y = actionButtonY, width = actionButtonWidth, height = actionButtonHeight}
    local secondaryActionButtonRect = {x = propertyListRect.x + propertyListRect.width - actionButtonWidth - 10, y = actionButtonY, width = actionButtonWidth, height = actionButtonHeight}
    return {
        panelRect = {x = panelX, y = panelY, width = panelWidth, height = panelHeight},
        closeButtonRect = {x = panelX + panelWidth - 126, y = panelY + 14, width = 106, height = 34},
        dieListRect = dieListRect,
        faceListRect = faceListRect,
        propertyListRect = propertyListRect,
        primaryActionButtonRect = primaryActionButtonRect,
        secondaryActionButtonRect = secondaryActionButtonRect,
        visibleDieCount = dieVisibleCount,
        visibleFaceCount = faceVisibleCount,
        visiblePropertyCount = propertyVisibleCount,
        totalDieCount = #dice,
        totalFaceCount = totalFaceCount,
        totalPropertyCount = #properties,
        dieStartIndex = clampedDieStart,
        faceStartIndex = clampedFaceStart,
        propertyStartIndex = clampedPropertyStart,
        craftsfolkRows = craftsfolkRows,
        dieRows = dieRows,
        faceRows = faceRows,
        propertyRows = propertyRows
    }
end
local function formatGold(self, value)
    local roundedToTenth = math.floor(value * 10 + 0.5) / 10
    if math.abs(roundedToTenth - math.floor(roundedToTenth)) < 0.001 then
        return tostring(math.floor(roundedToTenth))
    end
    return __TS__NumberToFixed(roundedToTenth, 1)
end
local FACE_APPEND_COST = 12
local FACE_REMOVE_REFUND = 4
local function isUpDownSmithSelected(self, uiState)
    return uiState.selectedCraftsfolkId == "craft:up-down-smith"
end
local function isFaceSmithSelected(self, uiState)
    return uiState.selectedCraftsfolkId == "craft:face-smith"
end
local function applyShopPropertyAdjustment(self, uiState, dice, operationType)
    if not isUpDownSmithSelected(nil, uiState) then
        uiState.shopStatusText = "Select the Up/Down Smith to adjust face properties."
        return
    end
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, die) return die.id == uiState.selectedUpgradeDieId end
    )
    local ____opt_11 = selectedDie
    local selectedSide = ____opt_11 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    local adjustableSide = asAdjustableShopSide(nil, selectedSide)
    if not selectedDie or not selectedSide or not adjustableSide then
        uiState.shopStatusText = "Select an adjustable die face first."
        return
    end
    local selectedProperty = __TS__ArrayFind(
        adjustableSide:getAdjustmentProperties(),
        function(____, property) return property.id == uiState.selectedUpgradePropertyId end
    )
    if not selectedProperty then
        uiState.shopStatusText = "Select a property before upgrading or downgrading."
        return
    end
    local operation = {propertyId = selectedProperty.id, type = operationType, steps = 1}
    local result = applyFaceAdjustmentEntry(nil, dice, {dieId = selectedDie.id, sideId = selectedSide.id, operation = operation})
    if not result.applied then
        uiState.shopStatusText = result.reason or "Adjustment failed."
        return
    end
    local nextGold = uiState.playerProgression.gold + result.resourceDelta
    if nextGold < 0 then
        local rollbackType = operationType == FaceAdjustmentModalityType.Improve and FaceAdjustmentModalityType.Reduce or FaceAdjustmentModalityType.Improve
        applyFaceAdjustmentEntry(nil, dice, {dieId = selectedDie.id, sideId = selectedSide.id, operation = {propertyId = selectedProperty.id, type = rollbackType, steps = 1}})
        uiState.shopStatusText = "Not enough gold for that adjustment."
        return
    end
    uiState.playerProgression.gold = nextGold
    uiState.shopGoldPulseTimer = 0.55
    uiState.shopAwaitingRemoveConfirm = false
    recordFaceAdjustment(nil, uiState.playerProgression, {dieId = selectedDie.id, sideId = selectedSide.id, operation = operation})
    local deltaText = result.resourceDelta < 0 and ("Spent " .. formatGold(
        nil,
        math.abs(result.resourceDelta)
    )) .. " gold." or ("Refunded " .. formatGold(nil, result.resourceDelta)) .. " gold."
    uiState.shopStatusText = ((deltaText .. " Gold now ") .. formatGold(nil, uiState.playerProgression.gold)) .. "."
end
local function appendCopiedFaceInShop(self, uiState, dice)
    if not isFaceSmithSelected(nil, uiState) then
        uiState.shopStatusText = "Select the Face Smith to copy or remove die faces."
        return
    end
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, die) return die.id == uiState.selectedUpgradeDieId end
    )
    local ____opt_15 = selectedDie
    local selectedSide = ____opt_15 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    if not selectedDie or not selectedSide then
        uiState.shopStatusText = "Select a die and face to copy first."
        return
    end
    if uiState.playerProgression.gold < FACE_APPEND_COST then
        uiState.shopStatusText = "Not enough gold to copy that face."
        return
    end
    local newSideId = buildGeneratedFaceId(nil, uiState.playerProgression, selectedDie.id)
    local result = appendCopiedFaceEntry(nil, dice, {dieId = selectedDie.id, sourceSideId = selectedSide.id, newSideId = newSideId})
    if not result.applied then
        uiState.shopStatusText = result.reason or "Could not copy selected face."
        return
    end
    local ____uiState_playerProgression_19, ____gold_20 = uiState.playerProgression, "gold"
    ____uiState_playerProgression_19[____gold_20] = ____uiState_playerProgression_19[____gold_20] - FACE_APPEND_COST
    uiState.shopGoldPulseTimer = 0.55
    uiState.shopAwaitingRemoveConfirm = false
    recordAppendFaceCopy(nil, uiState.playerProgression, {dieId = selectedDie.id, sourceSideId = selectedSide.id, newSideId = newSideId})
    uiState.selectedUpgradeSideId = newSideId
    uiState.selectedUpgradePropertyId = nil
    uiState.shopStatusText = ((("Copied face onto die. Spent " .. tostring(FACE_APPEND_COST)) .. " gold. Gold now ") .. formatGold(nil, uiState.playerProgression.gold)) .. "."
end
local function removeFaceInShop(self, uiState, dice)
    if not isFaceSmithSelected(nil, uiState) then
        uiState.shopStatusText = "Select the Face Smith to copy or remove die faces."
        return
    end
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, die) return die.id == uiState.selectedUpgradeDieId end
    )
    local ____opt_21 = selectedDie
    local selectedSide = ____opt_21 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    if not selectedDie or not selectedSide then
        uiState.shopStatusText = "Select a die face to remove."
        return
    end
    if #selectedDie.sides <= 1 then
        uiState.shopStatusText = "A die must keep at least one face."
        return
    end
    local result = removeFaceEntry(nil, dice, {dieId = selectedDie.id, sideId = selectedSide.id})
    if not result.applied then
        uiState.shopStatusText = result.reason or "Could not remove selected face."
        return
    end
    local ____uiState_playerProgression_25, ____gold_26 = uiState.playerProgression, "gold"
    ____uiState_playerProgression_25[____gold_26] = ____uiState_playerProgression_25[____gold_26] + FACE_REMOVE_REFUND
    uiState.shopGoldPulseTimer = 0.55
    uiState.shopAwaitingRemoveConfirm = false
    recordRemoveFace(nil, uiState.playerProgression, {dieId = selectedDie.id, sideId = selectedSide.id})
    local remainingSide = selectedDie.sides[1]
    uiState.selectedUpgradeSideId = remainingSide and remainingSide.id
    local adjustableSide = asAdjustableShopSide(nil, remainingSide)
    local ____uiState_33 = uiState
    local ____opt_29 = adjustableSide and adjustableSide:getAdjustmentProperties()[1]
    ____uiState_33.selectedUpgradePropertyId = ____opt_29 and ____opt_29.id
    uiState.shopStatusText = ((("Removed face. Refunded " .. tostring(FACE_REMOVE_REFUND)) .. " gold. Gold now ") .. formatGold(nil, uiState.playerProgression.gold)) .. "."
end
local function clearShopHoverState(self, uiState)
    uiState.shopHoveredCraftsfolkId = nil
    uiState.shopHoveredDieId = nil
    uiState.shopHoveredFaceId = nil
    uiState.shopHoveredPropertyId = nil
    uiState.shopHoveredAction = nil
end
local function openCraftShop(self, uiState)
    uiState.isCraftShopOpen = true
    uiState.isCharacterSheetOpen = false
    uiState.isInventoryOpen = false
    uiState.isTalentTreeOpen = false
    uiState.selectedTalentId = nil
    uiState.shopFocusedColumn = "craftsfolk"
    uiState.shopFocusedAction = "primary"
    uiState.shopAwaitingRemoveConfirm = false
    local ____uiState_37 = uiState
    local ____uiState_selectedCraftsfolkId_36 = uiState.selectedCraftsfolkId
    if ____uiState_selectedCraftsfolkId_36 == nil then
        local ____opt_34 = uiState.availableCraftsfolk[1]
        ____uiState_selectedCraftsfolkId_36 = ____opt_34 and ____opt_34.id
    end
    ____uiState_37.selectedCraftsfolkId = ____uiState_selectedCraftsfolkId_36
    local dice = createPlayerCombatDiceLoadout(nil, uiState.playerProgression)
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, die) return die.id == uiState.selectedUpgradeDieId end
    ) or dice[1]
    uiState.selectedUpgradeDieId = selectedDie and selectedDie.id
    local ____uiState_51 = uiState
    local ____opt_42 = selectedDie
    local ____opt_40 = ____opt_42 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    local ____temp_50 = ____opt_40 and ____opt_40.id
    if ____temp_50 == nil then
        local ____opt_46 = selectedDie and selectedDie.sides[1]
        ____temp_50 = ____opt_46 and ____opt_46.id
    end
    ____uiState_51.selectedUpgradeSideId = ____temp_50
    local ____opt_52 = selectedDie
    local selectedSide = ____opt_52 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    local selectedAdjustableSide = asAdjustableShopSide(nil, selectedSide)
    local ____uiState_67 = uiState
    local ____opt_58 = selectedAdjustableSide
    local ____opt_56 = ____opt_58 and __TS__ArrayFind(
        selectedAdjustableSide and selectedAdjustableSide:getAdjustmentProperties(),
        function(____, entry) return entry.id == uiState.selectedUpgradePropertyId end
    )
    local ____temp_66 = ____opt_56 and ____opt_56.id
    if ____temp_66 == nil then
        local ____opt_62 = selectedAdjustableSide and selectedAdjustableSide:getAdjustmentProperties()[1]
        ____temp_66 = ____opt_62 and ____opt_62.id
    end
    ____uiState_67.selectedUpgradePropertyId = ____temp_66
    local layout = getCraftShopLayout(nil, uiState, dice)
    syncShopVisualDice(
        nil,
        uiState,
        dice,
        layout,
        true
    )
end
local function closeCraftShop(self, uiState)
    uiState.isCraftShopOpen = false
    uiState.shopAwaitingRemoveConfirm = false
    uiState.shopVisualDice = {}
    clearShopHoverState(nil, uiState)
end
local function getShopActionState(self, uiState, dice)
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, die) return die.id == uiState.selectedUpgradeDieId end
    )
    local ____opt_68 = selectedDie
    local selectedSide = ____opt_68 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    if isFaceSmithSelected(nil, uiState) then
        if not selectedDie or not selectedSide then
            return {canPrimary = false, canSecondary = false, primaryReason = "Select a die face to copy.", secondaryReason = "Select a die face to remove."}
        end
        local ____temp_74 = uiState.playerProgression.gold >= FACE_APPEND_COST
        local ____temp_75 = #selectedDie.sides > 1
        local ____temp_72
        if uiState.playerProgression.gold >= FACE_APPEND_COST then
            ____temp_72 = nil
        else
            ____temp_72 = ("Need " .. tostring(FACE_APPEND_COST)) .. " gold to copy a face."
        end
        local ____temp_73
        if #selectedDie.sides > 1 then
            ____temp_73 = nil
        else
            ____temp_73 = "A die must keep at least one face."
        end
        return {canPrimary = ____temp_74, canSecondary = ____temp_75, primaryReason = ____temp_72, secondaryReason = ____temp_73}
    end
    if not isUpDownSmithSelected(nil, uiState) then
        return {canPrimary = false, canSecondary = false, primaryReason = "Select the Up/Down Smith.", secondaryReason = "Select the Up/Down Smith."}
    end
    local canAdjust = uiState.selectedUpgradePropertyId ~= nil
    local ____canAdjust_76
    if canAdjust then
        ____canAdjust_76 = nil
    else
        ____canAdjust_76 = "Select a face property first."
    end
    local ____canAdjust_77
    if canAdjust then
        ____canAdjust_77 = nil
    else
        ____canAdjust_77 = "Select a face property first."
    end
    return {canPrimary = canAdjust, canSecondary = canAdjust, primaryReason = ____canAdjust_76, secondaryReason = ____canAdjust_77}
end
local function triggerPrimaryShopAction(self, uiState, dice)
    local actionState = getShopActionState(nil, uiState, dice)
    if not actionState.canPrimary then
        uiState.shopStatusText = actionState.primaryReason or "Action unavailable."
        return
    end
    if isFaceSmithSelected(nil, uiState) then
        appendCopiedFaceInShop(nil, uiState, dice)
        return
    end
    applyShopPropertyAdjustment(nil, uiState, dice, FaceAdjustmentModalityType.Improve)
end
local function triggerSecondaryShopAction(self, uiState, dice)
    local actionState = getShopActionState(nil, uiState, dice)
    if not actionState.canSecondary then
        uiState.shopStatusText = actionState.secondaryReason or "Action unavailable."
        return
    end
    if isFaceSmithSelected(nil, uiState) then
        if not uiState.shopAwaitingRemoveConfirm then
            uiState.shopAwaitingRemoveConfirm = true
            uiState.shopStatusText = "Press Remove Face again to confirm."
            return
        end
        removeFaceInShop(nil, uiState, dice)
        return
    end
    applyShopPropertyAdjustment(nil, uiState, dice, FaceAdjustmentModalityType.Reduce)
end
local function setShopHoverFromPoint(self, uiState, layout, dice, x, y)
    clearShopHoverState(nil, uiState)
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, entry) return entry.id == uiState.selectedUpgradeDieId end
    ) or dice[1]
    if isPointInRect(nil, x, y, layout.closeButtonRect) then
        uiState.shopHoveredAction = "close"
        return
    end
    for ____, row in ipairs(layout.craftsfolkRows) do
        if isPointInRect(nil, x, y, row.rect) then
            uiState.shopHoveredCraftsfolkId = row.id
            return
        end
    end
    local hoveredVisualDie = getShopVisualDieAt(nil, uiState, x, y)
    if hoveredVisualDie then
        uiState.shopHoveredDieId = hoveredVisualDie.id
        return
    end
    local hoveredFaceTile = getShopFaceTileAt(
        nil,
        layout,
        selectedDie,
        x,
        y
    )
    if hoveredFaceTile then
        uiState.shopHoveredFaceId = hoveredFaceTile.id
        return
    end
    for ____, row in ipairs(layout.propertyRows) do
        if isPointInRect(nil, x, y, row.rect) then
            uiState.shopHoveredPropertyId = row.id
            return
        end
    end
    if isPointInRect(nil, x, y, layout.primaryActionButtonRect) then
        uiState.shopHoveredAction = "primary"
        return
    end
    if isPointInRect(nil, x, y, layout.secondaryActionButtonRect) then
        uiState.shopHoveredAction = "secondary"
    end
end
local function changeShopSelectionByStep(self, currentId, ids, direction)
    if #ids == 0 then
        return nil
    end
    if not currentId then
        return ids[1]
    end
    local currentIndex = __TS__ArrayFindIndex(
        ids,
        function(____, id) return id == currentId end
    )
    if currentIndex == -1 then
        return ids[1]
    end
    local nextIndex = math.max(
        0,
        math.min(#ids - 1, currentIndex + direction)
    )
    return ids[nextIndex + 1]
end
local function clampShopScrollAfterSelection(self, uiState, layout, dice)
    local dieIndex = math.max(
        0,
        __TS__ArrayFindIndex(
            dice,
            function(____, entry) return entry.id == uiState.selectedUpgradeDieId end
        )
    )
    if dieIndex < layout.dieStartIndex then
        uiState.shopDieScrollIndex = dieIndex
    elseif dieIndex >= layout.dieStartIndex + layout.visibleDieCount then
        uiState.shopDieScrollIndex = dieIndex - layout.visibleDieCount + 1
    end
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, entry) return entry.id == uiState.selectedUpgradeDieId end
    )
    local faces = selectedDie and selectedDie.sides or ({})
    local faceIndex = math.max(
        0,
        __TS__ArrayFindIndex(
            faces,
            function(____, entry) return entry.id == uiState.selectedUpgradeSideId end
        )
    )
    if faceIndex < layout.faceStartIndex then
        uiState.shopFaceScrollIndex = faceIndex
    elseif faceIndex >= layout.faceStartIndex + layout.visibleFaceCount then
        uiState.shopFaceScrollIndex = faceIndex - layout.visibleFaceCount + 1
    end
    local ____asAdjustableShopSide_84 = asAdjustableShopSide
    local ____opt_80 = selectedDie
    local selectedAdjustableSide = ____asAdjustableShopSide_84(
        nil,
        ____opt_80 and __TS__ArrayFind(
            selectedDie and selectedDie.sides,
            function(____, entry) return entry.id == uiState.selectedUpgradeSideId end
        )
    )
    local properties = selectedAdjustableSide and selectedAdjustableSide:getAdjustmentProperties() or ({})
    local propertyIndex = math.max(
        0,
        __TS__ArrayFindIndex(
            properties,
            function(____, entry) return entry.id == uiState.selectedUpgradePropertyId end
        )
    )
    if propertyIndex < layout.propertyStartIndex then
        uiState.shopPropertyScrollIndex = propertyIndex
    elseif propertyIndex >= layout.propertyStartIndex + layout.visiblePropertyCount then
        uiState.shopPropertyScrollIndex = propertyIndex - layout.visiblePropertyCount + 1
    end
end
local function drawShopScrollIndicator(self, x, y, width, height, startIndex, visibleCount, totalCount)
    if totalCount <= visibleCount then
        return
    end
    local trackX = x + width - 7
    local trackY = y + 34
    local trackHeight = math.max(20, height - 44)
    local handleHeight = math.max(
        18,
        math.floor(visibleCount / totalCount * trackHeight)
    )
    local maxStart = math.max(1, totalCount - visibleCount)
    local ratio = math.max(
        0,
        math.min(1, startIndex / maxStart)
    )
    local handleY = trackY + math.floor((trackHeight - handleHeight) * ratio)
    love.graphics.setColor(0.22, 0.26, 0.34, 0.85)
    love.graphics.rectangle(
        "fill",
        trackX,
        trackY,
        3,
        trackHeight,
        2,
        2
    )
    love.graphics.setColor(0.82, 0.88, 0.98, 0.92)
    love.graphics.rectangle(
        "fill",
        trackX,
        handleY,
        3,
        handleHeight,
        2,
        2
    )
end
local function updateShopVisualDice(self, _uiState, _layout, _dt)
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
        inventoryButtonRect = createInventoryButtonRect(nil),
        isCraftShopOpen = false,
        craftShopButtonRect = createCraftShopButtonRect(nil),
        isQuestMenuOpen = false,
        questMenuButtonRect = createQuestMenuButtonRect(nil),
        selectedQuestCategory = "main",
        selectedQuestId = nil,
        isGoToTileMode = false,
        goToTileZone = nil,
        goToTileIds = nil,
        goToTileHint = nil,
        availableCraftsfolk = createCraftsfolkOptions(nil),
        selectedCraftsfolkId = nil,
        selectedUpgradeDieId = nil,
        selectedUpgradeSideId = nil,
        selectedUpgradePropertyId = nil,
        shopStatusText = nil,
        shopHoveredCraftsfolkId = nil,
        shopHoveredDieId = nil,
        shopHoveredFaceId = nil,
        shopHoveredPropertyId = nil,
        shopHoveredAction = nil,
        shopFocusedColumn = "craftsfolk",
        shopFocusedAction = "primary",
        shopDieScrollIndex = 0,
        shopFaceScrollIndex = 0,
        shopPropertyScrollIndex = 0,
        shopGoldPulseTimer = 0,
        shopAwaitingRemoveConfirm = false,
        shopVisualDice = {}
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
    if uiState.isQuestMenuOpen then
        if key == "escape" or key == "q" then
            uiState.isQuestMenuOpen = false
            return true
        end
        if key == "left" or key == "right" then
            local categories = {"main", "side", "town"}
            local currentIndex = __TS__ArrayFindIndex(
                categories,
                function(____, category) return category == uiState.selectedQuestCategory end
            )
            local delta = key == "left" and -1 or 1
            local nextIndex = math.max(
                0,
                math.min(#categories - 1, currentIndex + delta)
            )
            uiState.selectedQuestCategory = categories[nextIndex + 1] or uiState.selectedQuestCategory
            ensureQuestSelection(nil, uiState)
            return true
        end
        return true
    end
    if uiState.isCraftShopOpen then
        if key == "escape" or key == "u" then
            closeCraftShop(nil, uiState)
            return true
        end
        local dice = createPlayerCombatDiceLoadout(nil, uiState.playerProgression)
        local selectedDie = __TS__ArrayFind(
            dice,
            function(____, die) return die.id == uiState.selectedUpgradeDieId end
        ) or dice[1]
        local ____opt_87 = selectedDie
        local selectedSide = ____opt_87 and __TS__ArrayFind(
            selectedDie and selectedDie.sides,
            function(____, side) return side.id == uiState.selectedUpgradeSideId end
        )
        local selectedAdjustableSide = asAdjustableShopSide(nil, selectedSide)
        local craftsfolkIds = __TS__ArrayMap(
            uiState.availableCraftsfolk,
            function(____, entry) return entry.id end
        )
        local dieIds = __TS__ArrayMap(
            dice,
            function(____, entry) return entry.id end
        )
        local ____opt_91 = selectedDie
        local faceIds = ____opt_91 and __TS__ArrayMap(
            selectedDie and selectedDie.sides,
            function(____, entry) return entry.id end
        ) or ({})
        local ____opt_95 = selectedAdjustableSide
        local propertyIds = ____opt_95 and __TS__ArrayMap(
            selectedAdjustableSide and selectedAdjustableSide:getAdjustmentProperties(),
            function(____, entry) return entry.id end
        ) or ({})
        local layout = getCraftShopLayout(nil, uiState, dice)
        if key == "left" then
            if uiState.shopFocusedColumn == "actions" then
                uiState.shopFocusedColumn = "properties"
            elseif uiState.shopFocusedColumn == "properties" then
                uiState.shopFocusedColumn = "faces"
            elseif uiState.shopFocusedColumn == "faces" then
                uiState.shopFocusedColumn = "dice"
            elseif uiState.shopFocusedColumn == "dice" then
                uiState.shopFocusedColumn = "craftsfolk"
            end
            return true
        end
        if key == "right" then
            if uiState.shopFocusedColumn == "craftsfolk" then
                uiState.shopFocusedColumn = "dice"
            elseif uiState.shopFocusedColumn == "dice" then
                uiState.shopFocusedColumn = "faces"
            elseif uiState.shopFocusedColumn == "faces" then
                uiState.shopFocusedColumn = "properties"
            elseif uiState.shopFocusedColumn == "properties" then
                uiState.shopFocusedColumn = "actions"
            end
            return true
        end
        if key == "tab" then
            if uiState.shopFocusedColumn == "craftsfolk" then
                uiState.shopFocusedColumn = "dice"
            elseif uiState.shopFocusedColumn == "dice" then
                uiState.shopFocusedColumn = "faces"
            elseif uiState.shopFocusedColumn == "faces" then
                uiState.shopFocusedColumn = "properties"
            elseif uiState.shopFocusedColumn == "properties" then
                uiState.shopFocusedColumn = "actions"
            else
                uiState.shopFocusedColumn = "craftsfolk"
            end
            return true
        end
        if key == "up" or key == "down" then
            local direction = key == "up" and -1 or 1
            if uiState.shopFocusedColumn == "actions" then
                uiState.shopFocusedAction = uiState.shopFocusedAction == "primary" and "secondary" or "primary"
                return true
            end
            if uiState.shopFocusedColumn == "craftsfolk" then
                uiState.selectedCraftsfolkId = changeShopSelectionByStep(nil, uiState.selectedCraftsfolkId, craftsfolkIds, direction)
            elseif uiState.shopFocusedColumn == "dice" then
                local nextDieId = changeShopSelectionByStep(nil, uiState.selectedUpgradeDieId, dieIds, direction)
                if nextDieId and nextDieId ~= uiState.selectedUpgradeDieId then
                    uiState.selectedUpgradeDieId = nextDieId
                    local nextDie = __TS__ArrayFind(
                        dice,
                        function(____, entry) return entry.id == nextDieId end
                    )
                    local ____uiState_103 = uiState
                    local ____opt_99 = nextDie and nextDie.sides[1]
                    ____uiState_103.selectedUpgradeSideId = ____opt_99 and ____opt_99.id
                    local nextAdjustableSide = asAdjustableShopSide(nil, nextDie and nextDie.sides[1])
                    local ____uiState_110 = uiState
                    local ____opt_106 = nextAdjustableSide and nextAdjustableSide:getAdjustmentProperties()[1]
                    ____uiState_110.selectedUpgradePropertyId = ____opt_106 and ____opt_106.id
                    uiState.shopAwaitingRemoveConfirm = false
                end
            elseif uiState.shopFocusedColumn == "faces" then
                local nextFaceId = changeShopSelectionByStep(nil, uiState.selectedUpgradeSideId, faceIds, direction)
                if nextFaceId and nextFaceId ~= uiState.selectedUpgradeSideId then
                    uiState.selectedUpgradeSideId = nextFaceId
                    local ____opt_111 = selectedDie
                    local nextSide = ____opt_111 and __TS__ArrayFind(
                        selectedDie and selectedDie.sides,
                        function(____, entry) return entry.id == nextFaceId end
                    )
                    local nextAdjustableSide = asAdjustableShopSide(nil, nextSide)
                    local ____uiState_119 = uiState
                    local ____opt_115 = nextAdjustableSide and nextAdjustableSide:getAdjustmentProperties()[1]
                    ____uiState_119.selectedUpgradePropertyId = ____opt_115 and ____opt_115.id
                    uiState.shopAwaitingRemoveConfirm = false
                end
            elseif uiState.shopFocusedColumn == "properties" then
                uiState.selectedUpgradePropertyId = changeShopSelectionByStep(nil, uiState.selectedUpgradePropertyId, propertyIds, direction)
            end
            clampShopScrollAfterSelection(nil, uiState, layout, dice)
            return true
        end
        if key == "return" or key == "kpenter" or key == "space" then
            if uiState.shopFocusedColumn == "actions" then
                if uiState.shopFocusedAction == "primary" then
                    triggerPrimaryShopAction(nil, uiState, dice)
                else
                    triggerSecondaryShopAction(nil, uiState, dice)
                end
            else
                triggerPrimaryShopAction(nil, uiState, dice)
            end
            return true
        end
        if key == "backspace" or key == "delete" then
            triggerSecondaryShopAction(nil, uiState, dice)
            return true
        end
        return true
    end
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
    if key == "u" then
        if uiState.isCraftShopOpen then
            closeCraftShop(nil, uiState)
        else
            openCraftShop(nil, uiState)
        end
        return true
    end
    if key == "q" then
        uiState.isQuestMenuOpen = not uiState.isQuestMenuOpen
        if uiState.isQuestMenuOpen then
            uiState.isCharacterSheetOpen = false
            uiState.isInventoryOpen = false
            uiState.isTalentTreeOpen = false
            uiState.selectedTalentId = nil
            uiState.isCraftShopOpen = false
            ensureQuestSelection(nil, uiState)
        end
        return true
    end
    if key == "g" and uiState.isGoToTileMode then
        uiState.isGoToTileMode = false
        uiState.goToTileZone = nil
        uiState.goToTileIds = nil
        uiState.goToTileHint = nil
        return true
    end
    if key == "escape" and (uiState.isCharacterSheetOpen or uiState.isInventoryOpen or uiState.isTalentTreeOpen) then
        uiState.isCharacterSheetOpen = false
        uiState.isInventoryOpen = false
        uiState.isTalentTreeOpen = false
        uiState.selectedTalentId = nil
        return true
    end
    if key == "escape" and uiState.isCraftShopOpen then
        closeCraftShop(nil, uiState)
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
    if uiState.shopGoldPulseTimer > 0 then
        uiState.shopGoldPulseTimer = math.max(0, uiState.shopGoldPulseTimer - dt)
    end
    if uiState.isCraftShopOpen then
        local dice = createPlayerCombatDiceLoadout(nil, uiState.playerProgression)
        local layout = getCraftShopLayout(nil, uiState, dice)
        syncShopVisualDice(nil, uiState, dice, layout)
        updateShopVisualDice(nil, uiState, layout, dt)
    end
end
function ____exports.onExploreMouseMoved(self, uiState, x, y)
    refreshLayoutIfNeeded(nil, uiState)
    if uiState.isQuestMenuOpen then
        return
    end
    if uiState.isCraftShopOpen then
        local dice = createPlayerCombatDiceLoadout(nil, uiState.playerProgression)
        local layout = getCraftShopLayout(nil, uiState, dice)
        syncShopVisualDice(nil, uiState, dice, layout)
        setShopHoverFromPoint(
            nil,
            uiState,
            layout,
            dice,
            x,
            y
        )
        return
    end
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
    if uiState.isQuestMenuOpen then
        local layout = getQuestMenuLayout(nil, uiState)
        if isPointInRect(nil, x, y, layout.closeButtonRect) then
            uiState.isQuestMenuOpen = false
            return nil
        end
        if isPointInRect(nil, x, y, layout.clearGoToRect) then
            uiState.isGoToTileMode = false
            uiState.goToTileZone = nil
            uiState.goToTileIds = nil
            uiState.goToTileHint = nil
            return nil
        end
        for ____, tab in ipairs(layout.categoryTabs) do
            do
                if not isPointInRect(nil, x, y, tab.rect) then
                    goto __continue251
                end
                uiState.selectedQuestCategory = tab.category
                ensureQuestSelection(nil, uiState)
                return nil
            end
            ::__continue251::
        end
        for ____, row in ipairs(layout.questRows) do
            do
                if not isPointInRect(nil, x, y, row.rect) then
                    goto __continue254
                end
                uiState.selectedQuestId = row.questId
                return nil
            end
            ::__continue254::
        end
        for ____, goToButton in ipairs(layout.objectiveGoToButtons) do
            do
                if not isPointInRect(nil, x, y, goToButton.rect) then
                    goto __continue257
                end
                local selectedQuest = getSelectedQuestEntry(nil, uiState)
                if selectedQuest == nil then
                    return nil
                end
                local quest = getQuestById(nil, selectedQuest.questId)
                local objective = __TS__ArrayFind(
                    quest.objectives,
                    function(____, candidate) return candidate.id == goToButton.objectiveId end
                )
                if (objective and objective.kind) ~= "visit-tile" then
                    return nil
                end
                uiState.isGoToTileMode = true
                uiState.goToTileZone = objective.zone
                uiState.goToTileIds = objective.tileIds ~= nil and ({unpack(objective.tileIds)}) or nil
                uiState.goToTileHint = objective.goToTileHint
                uiState.isQuestMenuOpen = false
                return nil
            end
            ::__continue257::
        end
        return nil
    end
    if uiState.isCraftShopOpen then
        local dice = createPlayerCombatDiceLoadout(nil, uiState.playerProgression)
        local layout = getCraftShopLayout(nil, uiState, dice)
        syncShopVisualDice(nil, uiState, dice, layout)
        local selectedDie = __TS__ArrayFind(
            dice,
            function(____, die) return die.id == uiState.selectedUpgradeDieId end
        ) or dice[1]
        if isPointInRect(nil, x, y, layout.closeButtonRect) then
            closeCraftShop(nil, uiState)
            return nil
        end
        for ____, row in ipairs(layout.craftsfolkRows) do
            do
                if not isPointInRect(nil, x, y, row.rect) then
                    goto __continue266
                end
                uiState.selectedCraftsfolkId = row.id
                uiState.shopAwaitingRemoveConfirm = false
                local ____uiState_126 = uiState
                local ____opt_124 = __TS__ArrayFind(
                    uiState.availableCraftsfolk,
                    function(____, entry) return entry.id == row.id end
                )
                ____uiState_126.shopStatusText = "Selected craftsfolk: " .. (____opt_124 and ____opt_124.name or row.id)
                return nil
            end
            ::__continue266::
        end
        local clickedVisualDie = getShopVisualDieAt(nil, uiState, x, y)
        if clickedVisualDie then
            uiState.selectedUpgradeDieId = clickedVisualDie.id
            local clickedDie = __TS__ArrayFind(
                dice,
                function(____, die) return die.id == clickedVisualDie.id end
            )
            local ____uiState_131 = uiState
            local ____opt_127 = clickedDie and clickedDie.sides[1]
            ____uiState_131.selectedUpgradeSideId = ____opt_127 and ____opt_127.id
            local initialAdjustableSide = asAdjustableShopSide(nil, clickedDie and clickedDie.sides[1])
            local ____uiState_138 = uiState
            local ____opt_134 = initialAdjustableSide and initialAdjustableSide:getAdjustmentProperties()[1]
            ____uiState_138.selectedUpgradePropertyId = ____opt_134 and ____opt_134.id
            uiState.shopAwaitingRemoveConfirm = false
            uiState.shopStatusText = "Selected die: " .. (clickedDie and clickedDie.name or clickedVisualDie.id)
            return nil
        end
        local selectedFaceTile = getShopFaceTileAt(
            nil,
            layout,
            selectedDie,
            x,
            y
        )
        if selectedFaceTile then
            uiState.selectedUpgradeSideId = selectedFaceTile.id
            local ____opt_141 = selectedDie
            local selectedSide = ____opt_141 and __TS__ArrayFind(
                selectedDie and selectedDie.sides,
                function(____, side) return side.id == selectedFaceTile.id end
            )
            local adjustableSide = asAdjustableShopSide(nil, selectedSide)
            local ____uiState_149 = uiState
            local ____opt_145 = adjustableSide and adjustableSide:getAdjustmentProperties()[1]
            ____uiState_149.selectedUpgradePropertyId = ____opt_145 and ____opt_145.id
            uiState.shopAwaitingRemoveConfirm = false
            uiState.shopStatusText = "Selected die face."
            return nil
        end
        for ____, row in ipairs(layout.propertyRows) do
            do
                if not isPointInRect(nil, x, y, row.rect) then
                    goto __continue274
                end
                uiState.selectedUpgradePropertyId = row.id
                uiState.shopAwaitingRemoveConfirm = false
                uiState.shopStatusText = "Selected face property."
                return nil
            end
            ::__continue274::
        end
        if isPointInRect(nil, x, y, layout.primaryActionButtonRect) then
            uiState.shopFocusedAction = "primary"
            triggerPrimaryShopAction(nil, uiState, dice)
            return nil
        end
        if isPointInRect(nil, x, y, layout.secondaryActionButtonRect) then
            uiState.shopFocusedAction = "secondary"
            triggerSecondaryShopAction(nil, uiState, dice)
            return nil
        end
        return nil
    end
    refreshLayoutIfNeeded(nil, uiState)
    if uiState.isTalentTreeOpen then
        local layout = getTalentTreeLayout(nil, uiState)
        if isPointInRect(nil, x, y, layout.cancelButtonRect) then
            uiState.selectedTalentId = nil
            uiState.isTalentTreeOpen = false
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
            uiState.isTalentTreeOpen = false
            return nil
        end
        for ____, row in ipairs(layout.talentRowRects) do
            do
                if not isPointInRect(nil, x, y, row.rect) then
                    goto __continue284
                end
                uiState.selectedTalentId = row.talentId
                return nil
            end
            ::__continue284::
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
    if isPointInRect(nil, x, y, uiState.craftShopButtonRect) then
        if uiState.isCraftShopOpen then
            closeCraftShop(nil, uiState)
        else
            openCraftShop(nil, uiState)
        end
        return nil
    end
    if isPointInRect(nil, x, y, uiState.questMenuButtonRect) then
        uiState.isQuestMenuOpen = not uiState.isQuestMenuOpen
        if uiState.isQuestMenuOpen then
            uiState.isCharacterSheetOpen = false
            uiState.isInventoryOpen = false
            uiState.isTalentTreeOpen = false
            uiState.selectedTalentId = nil
            uiState.isCraftShopOpen = false
            ensureQuestSelection(nil, uiState)
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
        local traveled = tryTravelToCoord(nil, uiState.model, clickedTile.coord)
        if traveled then
            local activeTile = getCurrentTile(nil, uiState.model)
            local progress = recordTileVisited(
                nil,
                {
                    tileKey = activeTile.key,
                    zone = activeTile.zone,
                    specialTileId = type(activeTile.metadata.specialTileId) == "string" and activeTile.metadata.specialTileId or nil
                }
            )
            if #progress > 0 then
                local first = progress[1]
                if first ~= nil then
                    uiState.model.notice = ((((uiState.model.notice .. " Quest progress: ") .. tostring(first.currentCount)) .. "/") .. tostring(first.targetCount)) .. "."
                end
            end
        end
    end
    return nil
end
function ____exports.onExploreWheelMoved(self, uiState, wheelY)
    if not uiState.isCraftShopOpen or wheelY == 0 then
        return false
    end
    local dice = createPlayerCombatDiceLoadout(nil, uiState.playerProgression)
    local layout = getCraftShopLayout(nil, uiState, dice)
    local mouseX, mouseY = love.mouse.getPosition()
    local scrollStep = wheelY > 0 and -1 or 1
    if isPointInRect(nil, mouseX, mouseY, layout.propertyListRect) then
        local maxStart = math.max(0, layout.totalPropertyCount - layout.visiblePropertyCount)
        uiState.shopPropertyScrollIndex = math.max(
            0,
            math.min(maxStart, uiState.shopPropertyScrollIndex + scrollStep)
        )
        return true
    end
    return false
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
    love.graphics.setColor(0.2, 0.28, 0.43, 0.96)
    love.graphics.rectangle(
        "fill",
        uiState.craftShopButtonRect.x,
        uiState.craftShopButtonRect.y,
        uiState.craftShopButtonRect.width,
        uiState.craftShopButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(0.73, 0.84, 0.98, 0.95)
    love.graphics.rectangle(
        "line",
        uiState.craftShopButtonRect.x,
        uiState.craftShopButtonRect.y,
        uiState.craftShopButtonRect.width,
        uiState.craftShopButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.printf(
        uiState.isCraftShopOpen and "Close Upgrade Shop (U)" or "Open Upgrade Shop (U)",
        uiState.craftShopButtonRect.x,
        uiState.craftShopButtonRect.y + 9,
        uiState.craftShopButtonRect.width,
        "center",
        0,
        0.62,
        0.62
    )
    love.graphics.setColor(0.2, 0.28, 0.43, 0.96)
    love.graphics.rectangle(
        "fill",
        uiState.questMenuButtonRect.x,
        uiState.questMenuButtonRect.y,
        uiState.questMenuButtonRect.width,
        uiState.questMenuButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(0.73, 0.84, 0.98, 0.95)
    love.graphics.rectangle(
        "line",
        uiState.questMenuButtonRect.x,
        uiState.questMenuButtonRect.y,
        uiState.questMenuButtonRect.width,
        uiState.questMenuButtonRect.height,
        8,
        8
    )
    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.printf(
        uiState.isQuestMenuOpen and "Close Quests (Q)" or "Open Quests (Q)",
        uiState.questMenuButtonRect.x,
        uiState.questMenuButtonRect.y + 9,
        uiState.questMenuButtonRect.width,
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
        "Movement: click neighboring hexes | Q: Quest Menu | Click XP bar or T: Talents | C: Character | I: Inventory | U: Upgrade Shop | P: Planner Debug | R: Reroll Plan",
        panelX + 14,
        uiState.height - 62,
        panelWidth - 28,
        "left",
        0,
        0.66,
        0.66
    )
    if uiState.isGoToTileMode then
        love.graphics.setColor(0.95, 0.89, 0.52, 0.96)
        love.graphics.printf(
            uiState.goToTileHint or "Go To Tile mode active. Follow highlighted tiles. Press G to clear.",
            panelX + 14,
            uiState.height - 86,
            panelWidth - 28,
            "left",
            0,
            0.6,
            0.6
        )
    end
end
local function drawQuestMenuOverlay(self, uiState)
    if not uiState.isQuestMenuOpen then
        return
    end
    local layout = getQuestMenuLayout(nil, uiState)
    local entries = listQuestEntriesForCategory(nil, uiState.selectedQuestCategory)
    local selectedEntry = getSelectedQuestEntry(nil, uiState)
    local selectedQuest = selectedEntry ~= nil and getQuestById(nil, selectedEntry.questId) or nil
    love.graphics.setColor(0, 0, 0, 0.54)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    love.graphics.setColor(0.08, 0.1, 0.15, 0.98)
    love.graphics.rectangle(
        "fill",
        layout.panelRect.x,
        layout.panelRect.y,
        layout.panelRect.width,
        layout.panelRect.height,
        10,
        10
    )
    love.graphics.setColor(0.8, 0.88, 0.98, 0.88)
    love.graphics.rectangle(
        "line",
        layout.panelRect.x,
        layout.panelRect.y,
        layout.panelRect.width,
        layout.panelRect.height,
        10,
        10
    )
    love.graphics.setColor(0.96, 0.98, 1, 1)
    love.graphics.printf(
        "Quest Journal",
        layout.panelRect.x + 20,
        layout.panelRect.y + 16,
        260,
        "left",
        0,
        0.9,
        0.9
    )
    love.graphics.setColor(0.32, 0.24, 0.24, 0.94)
    love.graphics.rectangle(
        "fill",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y,
        layout.closeButtonRect.width,
        layout.closeButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(0.95, 0.77, 0.77, 0.98)
    love.graphics.rectangle(
        "line",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y,
        layout.closeButtonRect.width,
        layout.closeButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(1, 1, 1, 0.98)
    love.graphics.printf(
        "X",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y + 5,
        layout.closeButtonRect.width,
        "center",
        0,
        0.62,
        0.62
    )
    for ____, tab in ipairs(layout.categoryTabs) do
        local selected = tab.category == uiState.selectedQuestCategory
        love.graphics.setColor(selected and 0.26 or 0.17, selected and 0.38 or 0.24, selected and 0.5 or 0.35, 0.95)
        love.graphics.rectangle(
            "fill",
            tab.rect.x,
            tab.rect.y,
            tab.rect.width,
            tab.rect.height,
            7,
            7
        )
        love.graphics.setColor(selected and 0.88 or 0.7, selected and 0.94 or 0.8, 1, 0.95)
        love.graphics.rectangle(
            "line",
            tab.rect.x,
            tab.rect.y,
            tab.rect.width,
            tab.rect.height,
            7,
            7
        )
        love.graphics.setColor(1, 1, 1, 1)
        love.graphics.printf(
            string.upper(tab.category),
            tab.rect.x,
            tab.rect.y + 9,
            tab.rect.width,
            "center",
            0,
            0.56,
            0.56
        )
    end
    love.graphics.setColor(0.25, 0.31, 0.42, 0.85)
    love.graphics.rectangle(
        "fill",
        layout.clearGoToRect.x,
        layout.clearGoToRect.y,
        layout.clearGoToRect.width,
        layout.clearGoToRect.height,
        7,
        7
    )
    love.graphics.setColor(0.78, 0.85, 0.96, 0.95)
    love.graphics.rectangle(
        "line",
        layout.clearGoToRect.x,
        layout.clearGoToRect.y,
        layout.clearGoToRect.width,
        layout.clearGoToRect.height,
        7,
        7
    )
    love.graphics.setColor(1, 1, 1, 0.96)
    love.graphics.printf(
        "Clear Go To (G)",
        layout.clearGoToRect.x,
        layout.clearGoToRect.y + 9,
        layout.clearGoToRect.width,
        "center",
        0,
        0.52,
        0.52
    )
    for ____, row in ipairs(layout.questRows) do
        do
            local entry = __TS__ArrayFind(
                entries,
                function(____, candidate) return candidate.questId == row.questId end
            )
            if not entry then
                goto __continue318
            end
            local selected = row.questId == uiState.selectedQuestId
            love.graphics.setColor(selected and 0.24 or 0.16, selected and 0.35 or 0.21, selected and 0.46 or 0.3, 0.96)
            love.graphics.rectangle(
                "fill",
                row.rect.x,
                row.rect.y,
                row.rect.width,
                row.rect.height,
                7,
                7
            )
            love.graphics.setColor(selected and 0.86 or 0.68, selected and 0.92 or 0.78, 1, 0.95)
            love.graphics.rectangle(
                "line",
                row.rect.x,
                row.rect.y,
                row.rect.width,
                row.rect.height,
                7,
                7
            )
            love.graphics.setColor(1, 1, 1, 0.98)
            love.graphics.printf(
                entry.questName,
                row.rect.x + 8,
                row.rect.y + 8,
                row.rect.width - 84,
                "left",
                0,
                0.52,
                0.52
            )
            love.graphics.setColor(0.88, 0.94, 1, 0.9)
            love.graphics.printf(
                entry.status,
                row.rect.x + row.rect.width - 74,
                row.rect.y + 8,
                66,
                "right",
                0,
                0.48,
                0.48
            )
        end
        ::__continue318::
    end
    if selectedEntry == nil or selectedQuest == nil then
        love.graphics.setColor(0.82, 0.88, 0.96, 0.88)
        love.graphics.printf(
            "No quests in this category yet.",
            layout.panelRect.x + 340,
            layout.panelRect.y + 126,
            460,
            "left",
            0,
            0.64,
            0.64
        )
        return
    end
    love.graphics.setColor(0.96, 0.98, 1, 1)
    love.graphics.printf(
        selectedQuest.name,
        layout.panelRect.x + 340,
        layout.panelRect.y + 108,
        460,
        "left",
        0,
        0.78,
        0.78
    )
    love.graphics.setColor(0.78, 0.87, 0.98, 0.92)
    love.graphics.printf(
        selectedQuest.summary,
        layout.panelRect.x + 340,
        layout.panelRect.y + 132,
        460,
        "left",
        0,
        0.56,
        0.56
    )
    local objectiveY = layout.panelRect.y + 174
    for ____, objective in ipairs(selectedQuest.objectives) do
        local progress = __TS__ArrayFind(
            selectedEntry.objectives,
            function(____, candidate) return candidate.id == objective.id end
        )
        local progressText = progress and (tostring(progress.currentCount) .. "/") .. tostring(progress.targetCount) or "0/" .. tostring(objective.targetCount)
        love.graphics.setColor(0.2, 0.26, 0.36, 0.92)
        love.graphics.rectangle(
            "fill",
            layout.panelRect.x + 330,
            objectiveY - 6,
            470,
            42,
            7,
            7
        )
        love.graphics.setColor(0.7, 0.82, 0.95, 0.9)
        love.graphics.rectangle(
            "line",
            layout.panelRect.x + 330,
            objectiveY - 6,
            470,
            42,
            7,
            7
        )
        love.graphics.setColor(0.96, 0.98, 1, 0.98)
        love.graphics.printf(
            objective.description,
            layout.panelRect.x + 344,
            objectiveY + 2,
            300,
            "left",
            0,
            0.54,
            0.54
        )
        love.graphics.setColor(0.84, 0.91, 1, 0.95)
        love.graphics.printf(
            progressText,
            layout.panelRect.x + 658,
            objectiveY + 2,
            120,
            "right",
            0,
            0.54,
            0.54
        )
        if objective.kind == "visit-tile" then
            local button = __TS__ArrayFind(
                layout.objectiveGoToButtons,
                function(____, candidate) return candidate.objectiveId == objective.id end
            )
            if button ~= nil then
                love.graphics.setColor(0.32, 0.36, 0.2, 0.96)
                love.graphics.rectangle(
                    "fill",
                    button.rect.x,
                    button.rect.y,
                    button.rect.width,
                    button.rect.height,
                    6,
                    6
                )
                love.graphics.setColor(0.92, 0.88, 0.56, 0.95)
                love.graphics.rectangle(
                    "line",
                    button.rect.x,
                    button.rect.y,
                    button.rect.width,
                    button.rect.height,
                    6,
                    6
                )
                love.graphics.setColor(1, 1, 1, 0.98)
                love.graphics.printf(
                    "Go To",
                    button.rect.x,
                    button.rect.y + 6,
                    button.rect.width,
                    "center",
                    0,
                    0.5,
                    0.5
                )
            end
        end
        objectiveY = objectiveY + 52
        if objectiveY > layout.panelRect.y + layout.panelRect.height - 40 then
            break
        end
    end
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
                goto __continue332
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
        ::__continue332::
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
    love.graphics.setColor(0.96, 0.87, 0.42, 0.98)
    love.graphics.printf(
        "Gold: " .. tostring(progression.gold),
        x + 18,
        y + 38,
        width - 36,
        "left",
        0,
        0.7,
        0.7
    )
    love.graphics.setColor(0.82, 0.9, 1, 0.95)
    love.graphics.printf(
        "Carried Items (exploration access)",
        x + 20,
        y + 64,
        width - 40,
        "left",
        0,
        0.66,
        0.66
    )
    local textY = y + 90
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
        "Press I or Escape to close. Press U for upgrade shop.",
        x + 20,
        y + height - 38,
        width - 40,
        "left",
        0,
        0.6,
        0.6
    )
end
local function drawCraftShopOverlay(self, uiState)
    if not uiState.isCraftShopOpen then
        return
    end
    local dice = createPlayerCombatDiceLoadout(nil, uiState.playerProgression)
    local layout = getCraftShopLayout(nil, uiState, dice)
    local selectedDie = __TS__ArrayFind(
        dice,
        function(____, die) return die.id == uiState.selectedUpgradeDieId end
    ) or dice[1]
    if not uiState.selectedUpgradeDieId and selectedDie then
        uiState.selectedUpgradeDieId = selectedDie.id
    end
    local ____opt_152 = selectedDie
    local selectedSide = ____opt_152 and __TS__ArrayFind(
        selectedDie and selectedDie.sides,
        function(____, side) return side.id == uiState.selectedUpgradeSideId end
    )
    local actionState = getShopActionState(nil, uiState, dice)
    love.graphics.setColor(0, 0, 0, 0.56)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    love.graphics.setColor(0.08, 0.1, 0.15, 0.98)
    love.graphics.rectangle(
        "fill",
        layout.panelRect.x,
        layout.panelRect.y,
        layout.panelRect.width,
        layout.panelRect.height,
        10,
        10
    )
    love.graphics.setColor(0.92, 0.78, 0.45, 0.94)
    love.graphics.rectangle(
        "line",
        layout.panelRect.x,
        layout.panelRect.y,
        layout.panelRect.width,
        layout.panelRect.height,
        10,
        10
    )
    love.graphics.setColor(0.98, 0.96, 0.9, 1)
    love.graphics.printf(
        "Craftsfolk Upgrade Shop",
        layout.panelRect.x + 20,
        layout.panelRect.y + 18,
        layout.panelRect.width - 180,
        "left",
        0,
        0.92,
        0.92
    )
    do
        local stripe = 0
        while stripe < 8 do
            local stripeY = layout.panelRect.y + 66 + stripe * 14
            love.graphics.setColor(0.15, 0.18, 0.26, stripe % 2 == 0 and 0.18 or 0.09)
            love.graphics.rectangle(
                "fill",
                layout.panelRect.x + 12,
                stripeY,
                layout.panelRect.width - 24,
                8,
                4,
                4
            )
            stripe = stripe + 1
        end
    end
    local goldPulse = uiState.shopGoldPulseTimer > 0 and 1 + 0.12 * math.sin((0.55 - uiState.shopGoldPulseTimer) * 24) or 1
    love.graphics.setColor(0.96, 0.88, 0.42, 0.98)
    love.graphics.printf(
        "Gold: " .. formatGold(nil, uiState.playerProgression.gold),
        layout.panelRect.x + 20,
        layout.panelRect.y + 42,
        layout.panelRect.width - 200,
        "left",
        0,
        0.66 * goldPulse,
        0.66 * goldPulse
    )
    local isCloseHovered = uiState.shopHoveredAction == "close"
    love.graphics.setColor(isCloseHovered and 0.34 or 0.27, isCloseHovered and 0.22 or 0.19, isCloseHovered and 0.2 or 0.19, 0.95)
    love.graphics.rectangle(
        "fill",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y,
        layout.closeButtonRect.width,
        layout.closeButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(isCloseHovered and 1 or 0.95, isCloseHovered and 0.85 or 0.75, isCloseHovered and 0.85 or 0.75, 0.98)
    love.graphics.rectangle(
        "line",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y,
        layout.closeButtonRect.width,
        layout.closeButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(1, 1, 1, 0.98)
    love.graphics.printf(
        "Close",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y + 9,
        layout.closeButtonRect.width,
        "center",
        0,
        0.6,
        0.6
    )
    love.graphics.setColor(0.85, 0.9, 0.98, 0.94)
    love.graphics.printf(
        "[I] Choose Craftsfolk",
        layout.panelRect.x + 20,
        layout.panelRect.y + 56,
        layout.panelRect.width - 40,
        "left",
        0,
        0.58,
        0.58
    )
    for ____, row in ipairs(layout.craftsfolkRows) do
        local option = __TS__ArrayFind(
            uiState.availableCraftsfolk,
            function(____, entry) return entry.id == row.id end
        )
        local isSelected = uiState.selectedCraftsfolkId == row.id
        local isHovered = uiState.shopHoveredCraftsfolkId == row.id
        local isFocused = uiState.shopFocusedColumn == "craftsfolk"
        love.graphics.setColor(isSelected and 0.3 or (isHovered and 0.25 or 0.19), isSelected and 0.29 or (isHovered and 0.25 or 0.2), isSelected and 0.17 or (isHovered and 0.2 or 0.27), 0.95)
        love.graphics.rectangle(
            "fill",
            row.rect.x,
            row.rect.y,
            row.rect.width,
            row.rect.height,
            7,
            7
        )
        love.graphics.setColor(isSelected and 0.96 or (isHovered and 0.88 or 0.75), isSelected and 0.84 or (isHovered and 0.86 or 0.8), isSelected and 0.49 or (isHovered and 0.98 or 0.93), 0.96)
        love.graphics.rectangle(
            "line",
            row.rect.x,
            row.rect.y,
            row.rect.width,
            row.rect.height,
            7,
            7
        )
        if isFocused then
            love.graphics.setColor(0.96, 0.91, 0.62, isSelected and 0.35 or 0.2)
            love.graphics.rectangle(
                "line",
                row.rect.x - 2,
                row.rect.y - 2,
                row.rect.width + 4,
                row.rect.height + 4,
                8,
                8
            )
        end
        love.graphics.setColor(0.98, 0.98, 1, 1)
        love.graphics.printf(
            ((option and option.name or row.id) .. " - ") .. (option and option.description or ""),
            row.rect.x + 10,
            row.rect.y + 12,
            row.rect.width - 20,
            "left",
            0,
            0.54,
            0.54
        )
    end
    love.graphics.setColor(0.14, 0.16, 0.22, 0.95)
    love.graphics.rectangle(
        "fill",
        layout.dieListRect.x,
        layout.dieListRect.y,
        layout.dieListRect.width,
        layout.dieListRect.height,
        8,
        8
    )
    love.graphics.setColor(0.75, 0.83, 0.96, 0.93)
    love.graphics.rectangle(
        "line",
        layout.dieListRect.x,
        layout.dieListRect.y,
        layout.dieListRect.width,
        layout.dieListRect.height,
        8,
        8
    )
    if uiState.shopFocusedColumn == "dice" then
        love.graphics.setColor(0.95, 0.89, 0.62, 0.46)
        love.graphics.rectangle(
            "line",
            layout.dieListRect.x - 2,
            layout.dieListRect.y - 2,
            layout.dieListRect.width + 4,
            layout.dieListRect.height + 4,
            9,
            9
        )
    end
    love.graphics.setColor(0.95, 0.97, 1, 1)
    love.graphics.printf(
        "[II] Current Dice",
        layout.dieListRect.x + 10,
        layout.dieListRect.y + 10,
        layout.dieListRect.width - 20,
        "left",
        0,
        0.62,
        0.62
    )
    for ____, visualDie in ipairs(uiState.shopVisualDice) do
        local half = visualDie.size * 0.5
        local isSelected = uiState.selectedUpgradeDieId == visualDie.id
        local isHovered = uiState.shopHoveredDieId == visualDie.id
        local dieLabelScale = math.max(
            0.54,
            math.min(0.72, visualDie.size / 92)
        )
        love.graphics.setColor(isSelected and 0.96 or (isHovered and 0.9 or 0.93), isSelected and 0.93 or (isHovered and 0.93 or 0.95), isSelected and 0.82 or (isHovered and 0.87 or 0.98), 0.98)
        love.graphics.rectangle(
            "fill",
            visualDie.x - half,
            visualDie.y - half,
            visualDie.size,
            visualDie.size,
            6,
            6
        )
        love.graphics.setColor(isSelected and 0.98 or 0.1, isSelected and 0.88 or 0.12, isSelected and 0.58 or 0.16, 0.98)
        love.graphics.rectangle(
            "line",
            visualDie.x - half,
            visualDie.y - half,
            visualDie.size,
            visualDie.size,
            6,
            6
        )
        love.graphics.setColor(0.08, 0.1, 0.14, 0.98)
        love.graphics.printf(
            visualDie.label,
            visualDie.x - half + 4,
            visualDie.y - 10,
            visualDie.size - 8,
            "center",
            0,
            dieLabelScale,
            dieLabelScale
        )
        if isSelected then
            love.graphics.setColor(0.98, 0.9, 0.6, 0.62)
            love.graphics.circle("line", visualDie.x, visualDie.y, half + 7)
            love.graphics.setColor(0.98, 0.9, 0.6, 0.24)
            love.graphics.circle("line", visualDie.x, visualDie.y, half + 11)
        end
    end
    love.graphics.setColor(0.14, 0.16, 0.22, 0.95)
    love.graphics.rectangle(
        "fill",
        layout.faceListRect.x,
        layout.faceListRect.y,
        layout.faceListRect.width,
        layout.faceListRect.height,
        8,
        8
    )
    love.graphics.setColor(0.75, 0.83, 0.96, 0.93)
    love.graphics.rectangle(
        "line",
        layout.faceListRect.x,
        layout.faceListRect.y,
        layout.faceListRect.width,
        layout.faceListRect.height,
        8,
        8
    )
    if uiState.shopFocusedColumn == "faces" then
        love.graphics.setColor(0.95, 0.89, 0.62, 0.46)
        love.graphics.rectangle(
            "line",
            layout.faceListRect.x - 2,
            layout.faceListRect.y - 2,
            layout.faceListRect.width + 4,
            layout.faceListRect.height + 4,
            9,
            9
        )
    end
    love.graphics.setColor(0.95, 0.97, 1, 1)
    love.graphics.printf(
        "[III] Die Faces (Unfolded)",
        layout.faceListRect.x + 10,
        layout.faceListRect.y + 10,
        layout.faceListRect.width - 20,
        "left",
        0,
        0.62,
        0.62
    )
    local faceTiles = getShopFaceTiles(nil, layout, selectedDie)
    for ____, tile in ipairs(faceTiles) do
        local ____opt_160 = selectedDie
        local side = ____opt_160 and __TS__ArrayFind(
            selectedDie and selectedDie.sides,
            function(____, entry) return entry.id == tile.id end
        )
        local isSelected = uiState.selectedUpgradeSideId == tile.id
        local isHovered = uiState.shopHoveredFaceId == tile.id
        local faceLabelScale = math.max(
            0.52,
            math.min(0.68, tile.rect.width / 86)
        )
        love.graphics.setColor(isSelected and 0.97 or (isHovered and 0.91 or 0.93), isSelected and 0.9 or (isHovered and 0.92 or 0.95), isSelected and 0.74 or (isHovered and 0.82 or 0.98), 0.98)
        love.graphics.rectangle(
            "fill",
            tile.rect.x,
            tile.rect.y,
            tile.rect.width,
            tile.rect.height,
            6,
            6
        )
        love.graphics.setColor(isSelected and 0.98 or 0.12, isSelected and 0.86 or 0.14, isSelected and 0.56 or 0.2, 0.98)
        love.graphics.rectangle(
            "line",
            tile.rect.x,
            tile.rect.y,
            tile.rect.width,
            tile.rect.height,
            6,
            6
        )
        love.graphics.setColor(0.08, 0.1, 0.14, 0.98)
        love.graphics.printf(
            side and side.label or tile.id,
            tile.rect.x + 4,
            tile.rect.y + tile.rect.height * 0.34,
            tile.rect.width - 8,
            "center",
            0,
            faceLabelScale,
            faceLabelScale
        )
    end
    love.graphics.setColor(0.14, 0.16, 0.22, 0.95)
    love.graphics.rectangle(
        "fill",
        layout.propertyListRect.x,
        layout.propertyListRect.y,
        layout.propertyListRect.width,
        layout.propertyListRect.height,
        8,
        8
    )
    love.graphics.setColor(0.75, 0.83, 0.96, 0.93)
    love.graphics.rectangle(
        "line",
        layout.propertyListRect.x,
        layout.propertyListRect.y,
        layout.propertyListRect.width,
        layout.propertyListRect.height,
        8,
        8
    )
    love.graphics.setColor(0.95, 0.97, 1, 1)
    love.graphics.printf(
        isFaceSmithSelected(nil, uiState) and "[IV] Face Operations" or "[IV] Adjustable Properties",
        layout.propertyListRect.x + 10,
        layout.propertyListRect.y + 10,
        layout.propertyListRect.width - 20,
        "left",
        0,
        0.62,
        0.62
    )
    if uiState.shopFocusedColumn == "properties" then
        love.graphics.setColor(0.95, 0.89, 0.62, 0.46)
        love.graphics.rectangle(
            "line",
            layout.propertyListRect.x - 2,
            layout.propertyListRect.y - 2,
            layout.propertyListRect.width + 4,
            layout.propertyListRect.height + 4,
            9,
            9
        )
    end
    if not isFaceSmithSelected(nil, uiState) then
        love.graphics.setColor(0.72, 0.8, 0.93, 0.86)
        love.graphics.printf(
            (((tostring(math.min(layout.totalPropertyCount, layout.propertyStartIndex + 1)) .. "-") .. tostring(math.min(layout.totalPropertyCount, layout.propertyStartIndex + layout.visiblePropertyCount))) .. " / ") .. tostring(layout.totalPropertyCount),
            layout.propertyListRect.x + 10,
            layout.propertyListRect.y + layout.propertyListRect.height - 20,
            layout.propertyListRect.width - 20,
            "right",
            0,
            0.44,
            0.44
        )
    end
    drawShopScrollIndicator(
        nil,
        layout.propertyListRect.x,
        layout.propertyListRect.y,
        layout.propertyListRect.width,
        layout.propertyListRect.height,
        layout.propertyStartIndex,
        layout.visiblePropertyCount,
        layout.totalPropertyCount
    )
    local selectedAdjustableSide = asAdjustableShopSide(nil, selectedSide)
    if isFaceSmithSelected(nil, uiState) then
        love.graphics.setColor(0.87, 0.91, 0.98, 0.94)
        love.graphics.printf(
            "Copy duplicates the selected face onto this die. Remove deletes the selected face.",
            layout.propertyListRect.x + 10,
            layout.propertyListRect.y + 42,
            layout.propertyListRect.width - 20,
            "left",
            0,
            0.5,
            0.5
        )
        love.graphics.setColor(0.79, 0.85, 0.95, 0.92)
        love.graphics.printf(
            ((("Copy Cost: " .. tostring(FACE_APPEND_COST)) .. " gold | Remove Refund: ") .. tostring(FACE_REMOVE_REFUND)) .. " gold",
            layout.propertyListRect.x + 10,
            layout.propertyListRect.y + 70,
            layout.propertyListRect.width - 20,
            "left",
            0,
            0.5,
            0.5
        )
    else
        for ____, row in ipairs(layout.propertyRows) do
            local ____opt_166 = selectedAdjustableSide
            local property = ____opt_166 and __TS__ArrayFind(
                selectedAdjustableSide and selectedAdjustableSide:getAdjustmentProperties(),
                function(____, entry) return entry.id == row.id end
            )
            local isSelected = uiState.selectedUpgradePropertyId == row.id
            local isHovered = uiState.shopHoveredPropertyId == row.id
            love.graphics.setColor(isSelected and 0.29 or (isHovered and 0.25 or 0.22), isSelected and 0.32 or (isHovered and 0.29 or 0.25), isSelected and 0.16 or (isHovered and 0.2 or 0.31), 0.95)
            love.graphics.rectangle(
                "fill",
                row.rect.x,
                row.rect.y,
                row.rect.width,
                row.rect.height,
                6,
                6
            )
            love.graphics.setColor(isSelected and 0.97 or (isHovered and 0.88 or 0.78), isSelected and 0.87 or (isHovered and 0.86 or 0.82), isSelected and 0.55 or (isHovered and 0.98 or 0.94), 0.95)
            love.graphics.rectangle(
                "line",
                row.rect.x,
                row.rect.y,
                row.rect.width,
                row.rect.height,
                6,
                6
            )
            love.graphics.setColor(1, 1, 1, 0.98)
            local pointSuffix = (property and property.pointValue) ~= nil and " | Pts " .. formatGold(nil, property.pointValue) or ""
            love.graphics.printf(
                (((property and property.label or row.id) .. ": ") .. tostring(property and property.value or "?")) .. pointSuffix,
                row.rect.x + 8,
                row.rect.y + 8,
                row.rect.width - 16,
                "left",
                0,
                0.5,
                0.5
            )
            if property and property.description then
                love.graphics.setColor(0.78, 0.84, 0.95, 0.9)
                love.graphics.printf(
                    property.description,
                    row.rect.x + 8,
                    row.rect.y + 24,
                    row.rect.width - 16,
                    "left",
                    0,
                    0.44,
                    0.44
                )
            end
        end
    end
    local isPrimaryHovered = uiState.shopHoveredAction == "primary"
    local isSecondaryHovered = uiState.shopHoveredAction == "secondary"
    local isActionFocused = uiState.shopFocusedColumn == "actions"
    love.graphics.setColor(actionState.canPrimary and (isPrimaryHovered and 0.27 or 0.22) or 0.2, actionState.canPrimary and (isPrimaryHovered and 0.51 or 0.43) or 0.22, actionState.canPrimary and (isPrimaryHovered and 0.33 or 0.26) or 0.24, actionState.canPrimary and 0.95 or 0.7)
    love.graphics.rectangle(
        "fill",
        layout.primaryActionButtonRect.x,
        layout.primaryActionButtonRect.y,
        layout.primaryActionButtonRect.width,
        layout.primaryActionButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(actionState.canPrimary and 0.73 or 0.6, actionState.canPrimary and 0.95 or 0.7, actionState.canPrimary and 0.78 or 0.72, 0.95)
    love.graphics.rectangle(
        "line",
        layout.primaryActionButtonRect.x,
        layout.primaryActionButtonRect.y,
        layout.primaryActionButtonRect.width,
        layout.primaryActionButtonRect.height,
        6,
        6
    )
    if isActionFocused and uiState.shopFocusedAction == "primary" then
        love.graphics.setColor(0.98, 0.92, 0.64, 0.46)
        love.graphics.rectangle(
            "line",
            layout.primaryActionButtonRect.x - 2,
            layout.primaryActionButtonRect.y - 2,
            layout.primaryActionButtonRect.width + 4,
            layout.primaryActionButtonRect.height + 4,
            8,
            8
        )
    end
    love.graphics.setColor(1, 1, 1, actionState.canPrimary and 1 or 0.74)
    love.graphics.printf(
        isFaceSmithSelected(nil, uiState) and "Copy Face" or "Upgrade",
        layout.primaryActionButtonRect.x,
        layout.primaryActionButtonRect.y + 8,
        layout.primaryActionButtonRect.width,
        "center",
        0,
        0.52,
        0.52
    )
    love.graphics.setColor(actionState.canSecondary and (isSecondaryHovered and 0.32 or 0.26) or 0.2, actionState.canSecondary and (isSecondaryHovered and 0.29 or 0.25) or 0.22, actionState.canSecondary and (isSecondaryHovered and 0.2 or 0.16) or 0.24, actionState.canSecondary and 0.95 or 0.7)
    love.graphics.rectangle(
        "fill",
        layout.secondaryActionButtonRect.x,
        layout.secondaryActionButtonRect.y,
        layout.secondaryActionButtonRect.width,
        layout.secondaryActionButtonRect.height,
        6,
        6
    )
    love.graphics.setColor(actionState.canSecondary and 0.96 or 0.6, actionState.canSecondary and 0.86 or 0.7, actionState.canSecondary and 0.6 or 0.72, 0.95)
    love.graphics.rectangle(
        "line",
        layout.secondaryActionButtonRect.x,
        layout.secondaryActionButtonRect.y,
        layout.secondaryActionButtonRect.width,
        layout.secondaryActionButtonRect.height,
        6,
        6
    )
    if isActionFocused and uiState.shopFocusedAction == "secondary" then
        love.graphics.setColor(0.98, 0.92, 0.64, 0.46)
        love.graphics.rectangle(
            "line",
            layout.secondaryActionButtonRect.x - 2,
            layout.secondaryActionButtonRect.y - 2,
            layout.secondaryActionButtonRect.width + 4,
            layout.secondaryActionButtonRect.height + 4,
            8,
            8
        )
    end
    love.graphics.setColor(1, 1, 1, actionState.canSecondary and 1 or 0.74)
    love.graphics.printf(
        isFaceSmithSelected(nil, uiState) and (uiState.shopAwaitingRemoveConfirm and "Confirm Remove" or "Remove Face") or "Downgrade",
        layout.secondaryActionButtonRect.x,
        layout.secondaryActionButtonRect.y + 8,
        layout.secondaryActionButtonRect.width,
        "center",
        0,
        0.52,
        0.52
    )
    local footerRect = {x = layout.panelRect.x + 16, y = layout.panelRect.y + layout.panelRect.height - 74, width = layout.panelRect.width - 32, height = 58}
    local statusText = uiState.shopStatusText or actionState.primaryReason or actionState.secondaryReason or "Select a craftsfolk, then choose a die and a face."
    love.graphics.setColor(0.08, 0.11, 0.18, 0.96)
    love.graphics.rectangle(
        "fill",
        footerRect.x,
        footerRect.y,
        footerRect.width,
        footerRect.height,
        7,
        7
    )
    love.graphics.setColor(0.82, 0.89, 0.99, 0.92)
    love.graphics.rectangle(
        "line",
        footerRect.x,
        footerRect.y,
        footerRect.width,
        footerRect.height,
        7,
        7
    )
    love.graphics.setColor(0.95, 0.98, 1, 0.98)
    love.graphics.printf(
        "Status: " .. statusText,
        footerRect.x + 10,
        footerRect.y + 7,
        footerRect.width - 20,
        "left",
        0,
        0.58,
        0.58
    )
    love.graphics.setColor(0.9, 0.94, 1, 0.96)
    love.graphics.printf(
        "Selected Face: " .. (selectedSide and selectedSide.label or "none"),
        footerRect.x + 10,
        footerRect.y + 25,
        footerRect.width - 20,
        "left",
        0,
        0.54,
        0.54
    )
    love.graphics.setColor(0.8, 0.87, 0.99, 0.92)
    love.graphics.printf(
        "Keyboard: Left/Right columns | Up/Down move | Enter primary | Backspace secondary | Esc close",
        footerRect.x + 10,
        footerRect.y + 41,
        footerRect.width - 20,
        "left",
        0,
        0.46,
        0.46
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
        if tileMatchesGoToMode(nil, uiState, tile) then
            love.graphics.setColor(0.95, 0.86, 0.45, 0.94)
            drawHex(
                nil,
                center.x,
                center.y,
                uiState.hexSize * 1.08,
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
    drawCraftShopOverlay(nil, uiState)
    drawQuestMenuOverlay(nil, uiState)
end
return ____exports
