local ____lualib = require("lualib_bundle")
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__SparseArrayNew = ____lualib.__TS__SparseArrayNew
local __TS__SparseArrayPush = ____lualib.__TS__SparseArrayPush
local __TS__SparseArraySpread = ____lualib.__TS__SparseArraySpread
local ____exports = {}
local getSelectedLocation
local ____dialog_2Dservice = require("planning.dialog-service")
local getDialogOptionsForNpc = ____dialog_2Dservice.getDialogOptionsForNpc
local getQuestDialogPromptsForNpc = ____dialog_2Dservice.getQuestDialogPromptsForNpc
local getStandardDialogForNpc = ____dialog_2Dservice.getStandardDialogForNpc
local ____quest_2Dlog = require("planning.quest-log")
local acceptQuest = ____quest_2Dlog.acceptQuest
local turnInQuest = ____quest_2Dlog.turnInQuest
local ____quest_2Devents = require("planning.quest-events")
local recordNpcInteracted = ____quest_2Devents.recordNpcInteracted
local ____content_2Dregistry = require("planning.content-registry")
local getExplorationFlowById = ____content_2Dregistry.getExplorationFlowById
function getSelectedLocation(self, uiState)
    if uiState.selectedLocationId == nil then
        return nil
    end
    return __TS__ArrayFind(
        uiState.locations,
        function(____, location) return location.id == uiState.selectedLocationId end
    )
end
local function createContinueButton(self, width, height)
    local buttonWidth = math.max(
        220,
        math.floor(width * 0.24)
    )
    local buttonHeight = 56
    return {
        x = math.floor((width - buttonWidth) * 0.5),
        y = height - buttonHeight - 72,
        width = buttonWidth,
        height = buttonHeight
    }
end
local function createGenericButtons(self, width, height)
    local btnH = 48
    local btnY = math.floor(height * 0.77)
    local cx = math.floor(width * 0.5)
    local backW = 160
    local prevW = 152
    local exploreW = 188
    local gap = 14
    return {
        backToMap = {
            x = cx - math.floor(backW / 2),
            y = btnY,
            width = backW,
            height = btnH
        },
        previousArea = {
            x = cx - math.floor(backW / 2) - gap - prevW,
            y = btnY,
            width = prevW,
            height = btnH
        },
        exploreFurther = {
            x = cx + math.ceil(backW / 2) + gap,
            y = btnY,
            width = exploreW,
            height = btnH
        }
    }
end
local function createLocationButtons(self, width, locations)
    local buttonWidth = math.max(
        300,
        math.floor(width * 0.42)
    )
    local buttonHeight = 48
    local x = math.floor(width * 0.06)
    local startY = 170
    local gap = 14
    return __TS__ArrayMap(
        locations,
        function(____, location, index) return {locationId = location.id, rect = {x = x, y = startY + index * (buttonHeight + gap), width = buttonWidth, height = buttonHeight}} end
    )
end
local function createCharacterButtons(self, width, selectedLocation)
    if selectedLocation == nil then
        return {}
    end
    local panelX = math.floor(width * 0.54)
    local buttonWidth = math.floor(width * 0.4) - 32
    local buttonHeight = 38
    local startY = 318
    local gap = 10
    return __TS__ArrayMap(
        selectedLocation.characters,
        function(____, character, index) return {characterId = character.id, rect = {x = panelX + 12, y = startY + index * (buttonHeight + gap), width = buttonWidth, height = buttonHeight}} end
    )
end
local function createDialogButtons(self, width)
    local panelX = math.floor(width * 0.54)
    local detailsWidth = math.floor(width * 0.4)
    local buttonWidth = math.floor((detailsWidth - 36) * 0.5)
    return {standard = {x = panelX + 14, y = 496, width = detailsWidth - 28, height = 36}, quest = {x = panelX + 14, y = 540, width = detailsWidth - 28, height = 36}, yes = {x = panelX + 14, y = 614, width = buttonWidth, height = 34}, no = {x = panelX + 22 + buttonWidth, y = 614, width = buttonWidth, height = 34}}
end
local function createDialogOptionButtons(self, width, options)
    local panelX = math.floor(width * 0.54)
    local detailsWidth = math.floor(width * 0.4)
    local startY = 496
    local buttonHeight = 36
    local gap = 8
    return __TS__ArrayMap(
        options,
        function(____, option, index) return {optionId = option.id, rect = {x = panelX + 14, y = startY + index * (buttonHeight + gap), width = detailsWidth - 28, height = buttonHeight}} end
    )
end
local function getQuestDifficultyColor(self, playerLevel, recommendedLevel)
    local delta = recommendedLevel - playerLevel
    if delta <= -4 then
        return {0.62, 0.62, 0.62}
    end
    if delta <= -2 then
        return {0.3, 0.82, 0.36}
    end
    if delta <= 1 then
        return {1, 0.9, 0.42}
    end
    if delta <= 3 then
        return {1, 0.63, 0.28}
    end
    return {1, 0.34, 0.34}
end
local function getQuestAcceptLabel(self, prompt)
    if prompt == nil then
        return "Accept"
    end
    if prompt.kind == "turn-in" then
        return "Yes, I've done it."
    end
    return "Yes, I'll look into it."
end
local function refreshLayoutIfNeeded(self, uiState)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    if uiState.width == width and uiState.height == height then
        return
    end
    uiState.width = width
    uiState.height = height
    uiState.continueButton = createContinueButton(nil, width, height)
    uiState.genericButtons = createGenericButtons(nil, width, height)
    uiState.locationButtons = createLocationButtons(nil, width, uiState.locations)
    uiState.characterButtons = createCharacterButtons(
        nil,
        width,
        getSelectedLocation(nil, uiState)
    )
    uiState.dialogButtons = createDialogButtons(nil, width)
    uiState.dialogOptionButtons = createDialogOptionButtons(nil, width, uiState.availableDialogOptions)
end
local function isInRect(self, x, y, rect)
    return x >= rect.x and x <= rect.x + rect.width and y >= rect.y and y <= rect.y + rect.height
end
local function getLocationButtonAt(self, uiState, x, y)
    for ____, button in ipairs(uiState.locationButtons) do
        if isInRect(nil, x, y, button.rect) then
            return button
        end
    end
    return nil
end
local function getCharacterButtonAt(self, uiState, x, y)
    for ____, button in ipairs(uiState.characterButtons) do
        if isInRect(nil, x, y, button.rect) then
            return button
        end
    end
    return nil
end
local function getDialogOptionButtonAt(self, uiState, x, y)
    for ____, button in ipairs(uiState.dialogOptionButtons) do
        if isInRect(nil, x, y, button.rect) then
            return button
        end
    end
    return nil
end
local function getSelectedCharacterName(self, uiState)
    local selectedLocation = getSelectedLocation(nil, uiState)
    if selectedLocation == nil or uiState.selectedCharacterId == nil then
        return nil
    end
    local ____opt_0 = __TS__ArrayFind(
        selectedLocation.characters,
        function(____, entry) return entry.id == uiState.selectedCharacterId end
    )
    return ____opt_0 and ____opt_0.name
end
local function getSelectedCharacter(self, uiState)
    local selectedLocation = getSelectedLocation(nil, uiState)
    if selectedLocation == nil or uiState.selectedCharacterId == nil then
        return nil
    end
    return __TS__ArrayFind(
        selectedLocation.characters,
        function(____, entry) return entry.id == uiState.selectedCharacterId end
    )
end
local function refreshDialogForSelection(self, uiState)
    local character = getSelectedCharacter(nil, uiState)
    if character == nil then
        uiState.dialogMode = "none"
        uiState.dialogText = "Select a character to begin dialog."
        uiState.availableDialogOptions = {}
        uiState.availableQuestPrompts = {}
        uiState.selectedQuestPrompt = nil
        uiState.questResponseText = nil
        uiState.dialogOptionButtons = createDialogOptionButtons(nil, uiState.width, uiState.availableDialogOptions)
        return
    end
    if character.npcId == nil then
        uiState.dialogMode = "options"
        uiState.dialogText = "Choose something to say."
        uiState.availableDialogOptions = {{id = "standard:" .. character.id, kind = "standard", playerLine = ("Can you tell me more about " .. character.name) .. "?", npcResponse = character.description}}
        uiState.availableQuestPrompts = {}
        uiState.selectedQuestPrompt = nil
        uiState.questResponseText = nil
        uiState.dialogOptionButtons = createDialogOptionButtons(nil, uiState.width, uiState.availableDialogOptions)
        return
    end
    local lines = getStandardDialogForNpc(nil, character.npcId)
    recordNpcInteracted(nil, character.npcId)
    local prompts = getQuestDialogPromptsForNpc(nil, character.npcId)
    local npcDialogOptions = getDialogOptionsForNpc(nil, character.npcId)
    local isQuestDialogUnlocked = uiState.questDialogUnlockedByCharacterId[character.id] == true
    uiState.dialogMode = "options"
    uiState.dialogText = "Choose something to say."
    local ____uiState_3 = uiState
    local ____array_2 = __TS__SparseArrayNew(unpack(__TS__ArrayMap(
        npcDialogOptions,
        function(____, option) return {
            id = "standard:" .. option.id,
            kind = "standard",
            playerLine = option.playerLine,
            npcResponse = option.npcResponse or lines[1] or character.description,
            questReady = option.questReady
        } end
    )))
    __TS__SparseArrayPush(
        ____array_2,
        unpack(isQuestDialogUnlocked and __TS__ArrayMap(
            prompts,
            function(____, prompt) return {
                id = (("quest:" .. prompt.questId) .. ":") .. prompt.kind,
                kind = "quest",
                playerLine = prompt.playerLine,
                npcResponse = prompt.prompt,
                questPrompt = prompt
            } end
        ) or ({}))
    )
    ____uiState_3.availableDialogOptions = {__TS__SparseArraySpread(____array_2)}
    uiState.availableQuestPrompts = prompts
    uiState.selectedQuestPrompt = nil
    uiState.questResponseText = nil
    uiState.dialogOptionButtons = createDialogOptionButtons(nil, uiState.width, uiState.availableDialogOptions)
end
function ____exports.createEncounterUiState(self, context)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    local tileZone = context and context.tileZone or "forest"
    local locations = context and context.locations or ({})
    local mode = tileZone == "town" and "town" or "generic"
    local explorationFlowId = context and context.explorationFlowId or nil
    local explorationFlow = explorationFlowId ~= nil and getExplorationFlowById(nil, explorationFlowId) or nil
    local flowLevel = context and context.flowLevel or 0
    local maxLevels = explorationFlow ~= nil and #explorationFlow.levels or 0
    local viewLevel = maxLevels > 0 and math.min(flowLevel, maxLevels - 1) or 0
    local ____mode_24 = mode
    local ____temp_25 = context and context.tileName or "Unknown Tile"
    local ____tileZone_26 = tileZone
    local ____temp_27 = context and context.tileDescription or ""
    local ____explorationFlow_28 = explorationFlow
    local ____flowLevel_29 = flowLevel
    local ____viewLevel_30 = viewLevel
    local ____locations_31 = locations
    local ____opt_16 = locations[1]
    local ____temp_32 = ____opt_16 and ____opt_16.id
    local ____opt_20 = locations[1]
    local ____opt_18 = ____opt_20 and ____opt_20.characters[1]
    local initialState = {
        mode = ____mode_24,
        tileName = ____temp_25,
        tileZone = ____tileZone_26,
        tileDescription = ____temp_27,
        explorationFlow = ____explorationFlow_28,
        flowLevel = ____flowLevel_29,
        viewLevel = ____viewLevel_30,
        locations = ____locations_31,
        selectedLocationId = ____temp_32,
        selectedCharacterId = ____opt_18 and ____opt_18.id,
        width = width,
        height = height,
        continueButton = createContinueButton(nil, width, height),
        genericButtons = createGenericButtons(nil, width, height),
        locationButtons = createLocationButtons(nil, width, locations),
        characterButtons = createCharacterButtons(nil, width, locations[1]),
        dialogButtons = createDialogButtons(nil, width),
        dialogOptionButtons = {},
        dialogMode = "none",
        dialogText = "Select a character to begin dialog.",
        availableDialogOptions = {},
        availableQuestPrompts = {},
        selectedQuestPrompt = nil,
        questResponseText = nil,
        playerLevel = math.max(
            1,
            math.floor(context and context.playerLevel or 1)
        ),
        questDialogUnlockedByCharacterId = {},
        hoveredContinue = false,
        hoveredGenericButton = nil,
        hoveredLocationId = nil,
        hoveredCharacterId = nil,
        time = 0
    }
    refreshDialogForSelection(nil, initialState)
    return initialState
end
function ____exports.updateEncounterUiState(self, uiState, dt)
    refreshLayoutIfNeeded(nil, uiState)
    uiState.time = uiState.time + dt
end
function ____exports.onEncounterMouseMoved(self, uiState, x, y)
    refreshLayoutIfNeeded(nil, uiState)
    uiState.hoveredContinue = isInRect(nil, x, y, uiState.continueButton)
    if uiState.mode == "generic" then
        local ____uiState_genericButtons_33 = uiState.genericButtons
        local backToMap = ____uiState_genericButtons_33.backToMap
        local exploreFurther = ____uiState_genericButtons_33.exploreFurther
        local previousArea = ____uiState_genericButtons_33.previousArea
        if isInRect(nil, x, y, backToMap) then
            uiState.hoveredGenericButton = "back"
        elseif isInRect(nil, x, y, exploreFurther) then
            uiState.hoveredGenericButton = "explore"
        elseif isInRect(nil, x, y, previousArea) then
            uiState.hoveredGenericButton = "previous"
        else
            uiState.hoveredGenericButton = nil
        end
    end
    local hoveredLocationButton = getLocationButtonAt(nil, uiState, x, y)
    uiState.hoveredLocationId = hoveredLocationButton and hoveredLocationButton.locationId
    local hoveredCharacterButton = getCharacterButtonAt(nil, uiState, x, y)
    uiState.hoveredCharacterId = hoveredCharacterButton and hoveredCharacterButton.characterId
end
function ____exports.onEncounterMouseReleased(self, uiState, x, y, button)
    if button ~= 1 then
        return false
    end
    refreshLayoutIfNeeded(nil, uiState)
    if uiState.mode == "town" then
        local locationButton = getLocationButtonAt(nil, uiState, x, y)
        if locationButton then
            uiState.selectedLocationId = locationButton.locationId
            local selectedLocation = getSelectedLocation(nil, uiState)
            uiState.characterButtons = createCharacterButtons(nil, uiState.width, selectedLocation)
            local ____uiState_42 = uiState
            local ____opt_38 = selectedLocation and selectedLocation.characters[1]
            ____uiState_42.selectedCharacterId = ____opt_38 and ____opt_38.id
            refreshDialogForSelection(nil, uiState)
            return false
        end
        local characterButton = getCharacterButtonAt(nil, uiState, x, y)
        if characterButton then
            uiState.selectedCharacterId = characterButton.characterId
            refreshDialogForSelection(nil, uiState)
            return false
        end
        if uiState.dialogMode == "quest" and isInRect(nil, x, y, uiState.dialogButtons.yes) then
            if uiState.selectedQuestPrompt ~= nil then
                if uiState.selectedQuestPrompt.kind == "turn-in" then
                    local questName = uiState.selectedQuestPrompt.questName
                    turnInQuest(nil, uiState.selectedQuestPrompt.questId)
                    refreshDialogForSelection(nil, uiState)
                    uiState.questResponseText = "Turned in: " .. questName
                else
                    local questName = uiState.selectedQuestPrompt.questName
                    acceptQuest(nil, uiState.selectedQuestPrompt.questId)
                    refreshDialogForSelection(nil, uiState)
                    uiState.questResponseText = "Accepted: " .. questName
                end
            else
                uiState.questResponseText = "No quest selected."
            end
            return false
        end
        if uiState.dialogMode == "quest" and isInRect(nil, x, y, uiState.dialogButtons.no) then
            if uiState.selectedQuestPrompt ~= nil then
                uiState.questResponseText = "Declined: " .. uiState.selectedQuestPrompt.questName
            else
                uiState.questResponseText = "No quest selected."
            end
            uiState.dialogMode = "options"
            return false
        end
        local optionButton = getDialogOptionButtonAt(nil, uiState, x, y)
        if optionButton ~= nil then
            local option = __TS__ArrayFind(
                uiState.availableDialogOptions,
                function(____, entry) return entry.id == optionButton.optionId end
            )
            if option == nil then
                return false
            end
            if option.kind == "quest" and option.questPrompt ~= nil then
                uiState.dialogMode = "quest"
                uiState.dialogText = option.npcResponse
                uiState.selectedQuestPrompt = option.questPrompt
            else
                local character = getSelectedCharacter(nil, uiState)
                if character ~= nil then
                    local hasQuestPrompts = #uiState.availableQuestPrompts > 0
                    if hasQuestPrompts and option.questReady == true then
                        uiState.questDialogUnlockedByCharacterId[character.id] = true
                        refreshDialogForSelection(nil, uiState)
                    end
                end
                uiState.dialogMode = "standard"
                uiState.dialogText = option.npcResponse
                uiState.selectedQuestPrompt = nil
            end
            uiState.questResponseText = nil
            return false
        end
        if isInRect(nil, x, y, uiState.dialogButtons.standard) then
            local standard = __TS__ArrayFind(
                uiState.availableDialogOptions,
                function(____, entry) return entry.kind == "standard" end
            )
            if standard ~= nil then
                uiState.dialogMode = "standard"
                uiState.dialogText = standard.npcResponse
                uiState.selectedQuestPrompt = nil
                uiState.questResponseText = nil
            end
            return false
        end
        if isInRect(nil, x, y, uiState.dialogButtons.quest) then
            local questOption = __TS__ArrayFind(
                uiState.availableDialogOptions,
                function(____, entry) return entry.kind == "quest" end
            )
            if (questOption and questOption.questPrompt) ~= nil then
                uiState.dialogMode = "quest"
                uiState.dialogText = questOption.npcResponse
                uiState.selectedQuestPrompt = questOption.questPrompt
                uiState.questResponseText = nil
            end
            return false
        end
    end
    if uiState.mode == "generic" then
        local flow = uiState.explorationFlow
        local maxLevels = flow ~= nil and #flow.levels or 0
        local ____uiState_genericButtons_45 = uiState.genericButtons
        local backToMap = ____uiState_genericButtons_45.backToMap
        local exploreFurther = ____uiState_genericButtons_45.exploreFurther
        local previousArea = ____uiState_genericButtons_45.previousArea
        if isInRect(nil, x, y, previousArea) and uiState.viewLevel > 0 then
            uiState.viewLevel = uiState.viewLevel - 1
            return false
        end
        if isInRect(nil, x, y, exploreFurther) and uiState.viewLevel < maxLevels - 1 then
            uiState.viewLevel = uiState.viewLevel + 1
            return false
        end
        if isInRect(nil, x, y, backToMap) then
            return true
        end
        return false
    end
    return isInRect(nil, x, y, uiState.continueButton)
end
function ____exports.drawEncounterUi(self, uiState, visitCount)
    refreshLayoutIfNeeded(nil, uiState)
    love.graphics.setColor(0.1, 0.09, 0.12, 1)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    love.graphics.setColor(0.21, 0.18, 0.28, 0.58)
    love.graphics.circle("fill", uiState.width * 0.5, uiState.height * 0.36, 180)
    if uiState.mode == "town" then
        love.graphics.setColor(0.95, 0.92, 1, 1)
        love.graphics.printf(
            "Town: " .. uiState.tileName,
            0,
            52,
            uiState.width,
            "center",
            0,
            1.2,
            1.2
        )
        love.graphics.setColor(0.82, 0.78, 0.91, 0.95)
        love.graphics.printf(
            "Select a location to view available characters.",
            0,
            96,
            uiState.width,
            "center",
            0,
            0.8,
            0.8
        )
        for ____, button in ipairs(uiState.locationButtons) do
            local isSelected = uiState.selectedLocationId == button.locationId
            local isHovered = uiState.hoveredLocationId == button.locationId
            local location = __TS__ArrayFind(
                uiState.locations,
                function(____, entry) return entry.id == button.locationId end
            )
            local label = location and location.name or button.locationId
            if isSelected then
                love.graphics.setColor(0.38, 0.3, 0.5, 0.98)
            elseif isHovered then
                love.graphics.setColor(0.33, 0.25, 0.45, 0.96)
            else
                love.graphics.setColor(0.26, 0.2, 0.37, 0.93)
            end
            love.graphics.rectangle(
                "fill",
                button.rect.x,
                button.rect.y,
                button.rect.width,
                button.rect.height,
                8,
                8
            )
            love.graphics.setColor(0.86, 0.8, 0.97, 0.9)
            love.graphics.rectangle(
                "line",
                button.rect.x,
                button.rect.y,
                button.rect.width,
                button.rect.height,
                8,
                8
            )
            love.graphics.setColor(1, 1, 1, 1)
            love.graphics.printf(
                label,
                button.rect.x + 12,
                button.rect.y + 13,
                button.rect.width - 24,
                "left",
                0,
                0.7,
                0.7
            )
        end
        local detailsX = math.floor(uiState.width * 0.54)
        local detailsY = 158
        local detailsWidth = math.floor(uiState.width * 0.4)
        local detailsHeight = math.floor(uiState.height * 0.66)
        local selectedLocation = getSelectedLocation(nil, uiState)
        love.graphics.setColor(0.16, 0.14, 0.24, 0.9)
        love.graphics.rectangle(
            "fill",
            detailsX,
            detailsY,
            detailsWidth,
            detailsHeight,
            8,
            8
        )
        love.graphics.setColor(0.76, 0.71, 0.9, 0.72)
        love.graphics.rectangle(
            "line",
            detailsX,
            detailsY,
            detailsWidth,
            detailsHeight,
            8,
            8
        )
        if selectedLocation ~= nil then
            love.graphics.setColor(0.95, 0.92, 1, 1)
            love.graphics.printf(
                selectedLocation.name,
                detailsX + 12,
                detailsY + 12,
                detailsWidth - 24,
                "left",
                0,
                0.8,
                0.8
            )
            love.graphics.setColor(0.82, 0.78, 0.91, 0.92)
            love.graphics.printf(
                selectedLocation.description,
                detailsX + 12,
                detailsY + 36,
                detailsWidth - 24,
                "left",
                0,
                0.62,
                0.62
            )
            love.graphics.setColor(0.88, 0.84, 0.95, 0.96)
            love.graphics.printf(
                "Characters",
                detailsX + 12,
                detailsY + 112,
                detailsWidth - 24,
                "left",
                0,
                0.65,
                0.65
            )
            for ____, button in ipairs(uiState.characterButtons) do
                local character = __TS__ArrayFind(
                    selectedLocation.characters,
                    function(____, entry) return entry.id == button.characterId end
                )
                local isSelectedCharacter = uiState.selectedCharacterId == button.characterId
                local isHoveredCharacter = uiState.hoveredCharacterId == button.characterId
                local label = character and (character.name .. " - ") .. character.role or button.characterId
                if isSelectedCharacter then
                    love.graphics.setColor(0.31, 0.26, 0.42, 0.98)
                elseif isHoveredCharacter then
                    love.graphics.setColor(0.27, 0.22, 0.37, 0.97)
                else
                    love.graphics.setColor(0.22, 0.18, 0.3, 0.95)
                end
                love.graphics.rectangle(
                    "fill",
                    button.rect.x,
                    button.rect.y,
                    button.rect.width,
                    button.rect.height,
                    6,
                    6
                )
                love.graphics.setColor(0.74, 0.69, 0.86, 0.82)
                love.graphics.rectangle(
                    "line",
                    button.rect.x,
                    button.rect.y,
                    button.rect.width,
                    button.rect.height,
                    6,
                    6
                )
                love.graphics.setColor(0.93, 0.9, 0.99, 0.98)
                love.graphics.printf(
                    label,
                    button.rect.x + 8,
                    button.rect.y + 11,
                    button.rect.width - 16,
                    "left",
                    0,
                    0.56,
                    0.56
                )
            end
            love.graphics.setColor(0.9, 0.94, 1, 0.95)
            love.graphics.printf(
                "Dialog",
                detailsX + 12,
                410,
                detailsWidth - 24,
                "left",
                0,
                0.64,
                0.64
            )
            love.graphics.setColor(0.2, 0.19, 0.29, 0.95)
            love.graphics.rectangle(
                "fill",
                detailsX + 12,
                434,
                detailsWidth - 24,
                52,
                6,
                6
            )
            love.graphics.setColor(0.74, 0.69, 0.86, 0.72)
            love.graphics.rectangle(
                "line",
                detailsX + 12,
                434,
                detailsWidth - 24,
                52,
                6,
                6
            )
            love.graphics.setColor(0.92, 0.9, 0.99, 0.96)
            love.graphics.printf(
                uiState.dialogText,
                detailsX + 20,
                444,
                detailsWidth - 40,
                "left",
                0,
                0.55,
                0.55
            )
            if uiState.dialogMode ~= "quest" then
                for ____, optionButton in ipairs(uiState.dialogOptionButtons) do
                    do
                        local option = __TS__ArrayFind(
                            uiState.availableDialogOptions,
                            function(____, entry) return entry.id == optionButton.optionId end
                        )
                        if option == nil then
                            goto __continue103
                        end
                        love.graphics.setColor(0.31, 0.24, 0.43, 0.96)
                        love.graphics.rectangle(
                            "fill",
                            optionButton.rect.x,
                            optionButton.rect.y,
                            optionButton.rect.width,
                            optionButton.rect.height,
                            6,
                            6
                        )
                        love.graphics.setColor(0.79, 0.73, 0.91, 0.85)
                        love.graphics.rectangle(
                            "line",
                            optionButton.rect.x,
                            optionButton.rect.y,
                            optionButton.rect.width,
                            optionButton.rect.height,
                            6,
                            6
                        )
                        love.graphics.setColor(1, 1, 1, 0.98)
                        love.graphics.printf(
                            option.playerLine,
                            optionButton.rect.x + (option.questPrompt ~= nil and 24 or 10),
                            optionButton.rect.y + 10,
                            optionButton.rect.width - (option.questPrompt ~= nil and 34 or 20),
                            "left",
                            0,
                            0.51,
                            0.51
                        )
                        if option.questReady == true then
                            love.graphics.setColor(1, 0.86, 0.25, 0.98)
                            love.graphics.printf(
                                "!",
                                optionButton.rect.x + 8,
                                optionButton.rect.y + 8,
                                12,
                                "center",
                                0,
                                0.72,
                                0.72
                            )
                        end
                    end
                    ::__continue103::
                end
            end
            if uiState.dialogMode == "quest" then
                love.graphics.setColor(0.35, 0.27, 0.47, 0.96)
                love.graphics.rectangle(
                    "fill",
                    uiState.dialogButtons.yes.x,
                    uiState.dialogButtons.yes.y,
                    uiState.dialogButtons.yes.width,
                    uiState.dialogButtons.yes.height,
                    6,
                    6
                )
                love.graphics.setColor(0.83, 0.78, 0.93, 0.86)
                love.graphics.rectangle(
                    "line",
                    uiState.dialogButtons.yes.x,
                    uiState.dialogButtons.yes.y,
                    uiState.dialogButtons.yes.width,
                    uiState.dialogButtons.yes.height,
                    6,
                    6
                )
                love.graphics.setColor(1, 1, 1, 1)
                love.graphics.printf(
                    getQuestAcceptLabel(nil, uiState.selectedQuestPrompt),
                    uiState.dialogButtons.yes.x,
                    uiState.dialogButtons.yes.y + 8,
                    uiState.dialogButtons.yes.width,
                    "center",
                    0,
                    0.55,
                    0.55
                )
                if uiState.selectedQuestPrompt ~= nil and uiState.selectedQuestPrompt.kind == "offer" then
                    local r, g, b = unpack(
                        getQuestDifficultyColor(nil, uiState.playerLevel, uiState.selectedQuestPrompt.recommendedLevel),
                        1,
                        3
                    )
                    love.graphics.setColor(r, g, b, 0.95)
                    love.graphics.printf(
                        "Lv " .. tostring(uiState.selectedQuestPrompt.recommendedLevel),
                        uiState.dialogButtons.yes.x + 8,
                        uiState.dialogButtons.yes.y + 9,
                        uiState.dialogButtons.yes.width - 16,
                        "left",
                        0,
                        0.48,
                        0.48
                    )
                end
                love.graphics.setColor(0.35, 0.27, 0.47, 0.96)
                love.graphics.rectangle(
                    "fill",
                    uiState.dialogButtons.no.x,
                    uiState.dialogButtons.no.y,
                    uiState.dialogButtons.no.width,
                    uiState.dialogButtons.no.height,
                    6,
                    6
                )
                love.graphics.setColor(0.83, 0.78, 0.93, 0.86)
                love.graphics.rectangle(
                    "line",
                    uiState.dialogButtons.no.x,
                    uiState.dialogButtons.no.y,
                    uiState.dialogButtons.no.width,
                    uiState.dialogButtons.no.height,
                    6,
                    6
                )
                love.graphics.setColor(1, 1, 1, 1)
                love.graphics.printf(
                    "Not now.",
                    uiState.dialogButtons.no.x,
                    uiState.dialogButtons.no.y + 8,
                    uiState.dialogButtons.no.width,
                    "center",
                    0,
                    0.55,
                    0.55
                )
            end
            if uiState.questResponseText ~= nil then
                love.graphics.setColor(0.8, 0.9, 0.83, 0.92)
                love.graphics.printf(
                    uiState.questResponseText,
                    detailsX + 12,
                    658,
                    detailsWidth - 24,
                    "left",
                    0,
                    0.52,
                    0.52
                )
            end
            local selectedCharacterName = getSelectedCharacterName(nil, uiState)
            if selectedCharacterName ~= nil then
                love.graphics.setColor(0.79, 0.75, 0.91, 0.94)
                love.graphics.printf(
                    (("Interact: " .. selectedCharacterName) .. "  |  Your level: ") .. tostring(uiState.playerLevel),
                    detailsX + 12,
                    detailsY + detailsHeight - 30,
                    detailsWidth - 24,
                    "left",
                    0,
                    0.57,
                    0.57
                )
            end
        end
    else
        local flow = uiState.explorationFlow
        local maxLevels = flow ~= nil and #flow.levels or 0
        local currentLevel = flow ~= nil and flow.levels[uiState.viewLevel + 1] or nil
        local isFullyExplored = flow ~= nil and uiState.flowLevel >= maxLevels
        local contentW = math.floor(uiState.width * 0.62)
        local contentX = math.floor((uiState.width - contentW) * 0.5)
        love.graphics.setColor(0.58, 0.56, 0.7, 0.72)
        love.graphics.printf(
            uiState.tileName,
            contentX,
            38,
            contentW,
            "left",
            0,
            0.64,
            0.64
        )
        if flow ~= nil and currentLevel ~= nil then
            love.graphics.setColor(0.96, 0.93, 1, 1)
            love.graphics.printf(
                flow.name,
                contentX,
                56,
                contentW,
                "left",
                0,
                1.12,
                1.12
            )
            local badge = isFullyExplored and currentLevel.label .. "  ·  Fully Explored" or currentLevel.label
            love.graphics.setColor(isFullyExplored and 0.68 or 0.62, isFullyExplored and 0.9 or 0.8, isFullyExplored and 0.62 or 1, 0.88)
            love.graphics.printf(
                badge,
                contentX,
                108,
                contentW,
                "left",
                0,
                0.74,
                0.74
            )
            love.graphics.setColor(0.4, 0.36, 0.52, 0.5)
            love.graphics.line(contentX, 136, contentX + contentW, 136)
            love.graphics.setColor(0.94, 0.91, 0.98, 0.94)
            love.graphics.printf(
                currentLevel.hook,
                contentX,
                150,
                contentW,
                "left",
                0,
                0.86,
                0.86
            )
            love.graphics.setColor(0.72, 0.69, 0.84, 0.78)
            love.graphics.printf(
                currentLevel.description,
                contentX,
                196,
                contentW,
                "left",
                0,
                0.74,
                0.74
            )
        else
            love.graphics.setColor(0.96, 0.93, 1, 1)
            love.graphics.printf(
                uiState.tileName,
                0,
                72,
                uiState.width,
                "center",
                0,
                1.12,
                1.12
            )
            love.graphics.setColor(0.72, 0.69, 0.84, 0.78)
            love.graphics.printf(
                uiState.tileDescription,
                contentX,
                160,
                contentW,
                "center",
                0,
                0.76,
                0.76
            )
        end
        local ____uiState_genericButtons_46 = uiState.genericButtons
        local backToMap = ____uiState_genericButtons_46.backToMap
        local exploreFurther = ____uiState_genericButtons_46.exploreFurther
        local previousArea = ____uiState_genericButtons_46.previousArea
        local showPrevious = uiState.viewLevel > 0
        local showExplore = flow ~= nil and uiState.viewLevel < maxLevels - 1
        if showPrevious then
            local hovered = uiState.hoveredGenericButton == "previous"
            love.graphics.setColor(hovered and 0.3 or 0.22, hovered and 0.24 or 0.18, hovered and 0.42 or 0.32, 0.94)
            love.graphics.rectangle(
                "fill",
                previousArea.x,
                previousArea.y,
                previousArea.width,
                previousArea.height,
                8,
                8
            )
            love.graphics.setColor(0.62, 0.56, 0.78, 0.7)
            love.graphics.rectangle(
                "line",
                previousArea.x,
                previousArea.y,
                previousArea.width,
                previousArea.height,
                8,
                8
            )
            love.graphics.setColor(0.82, 0.8, 0.94, 1)
            love.graphics.printf(
                "← Previous Area",
                previousArea.x,
                previousArea.y + 15,
                previousArea.width,
                "center",
                0,
                0.72,
                0.72
            )
        end
        local hoveredBack = uiState.hoveredGenericButton == "back"
        love.graphics.setColor(hoveredBack and 0.28 or 0.2, hoveredBack and 0.22 or 0.16, hoveredBack and 0.38 or 0.28, 0.96)
        love.graphics.rectangle(
            "fill",
            backToMap.x,
            backToMap.y,
            backToMap.width,
            backToMap.height,
            8,
            8
        )
        love.graphics.setColor(0.72, 0.68, 0.88, 0.82)
        love.graphics.rectangle(
            "line",
            backToMap.x,
            backToMap.y,
            backToMap.width,
            backToMap.height,
            8,
            8
        )
        love.graphics.setColor(0.9, 0.88, 0.98, 1)
        love.graphics.printf(
            "Back to Map",
            backToMap.x,
            backToMap.y + 15,
            backToMap.width,
            "center",
            0,
            0.72,
            0.72
        )
        if showExplore then
            local hovered = uiState.hoveredGenericButton == "explore"
            love.graphics.setColor(hovered and 0.22 or 0.16, hovered and 0.34 or 0.26, hovered and 0.52 or 0.42, 0.96)
            love.graphics.rectangle(
                "fill",
                exploreFurther.x,
                exploreFurther.y,
                exploreFurther.width,
                exploreFurther.height,
                8,
                8
            )
            love.graphics.setColor(0.52, 0.72, 0.98, 0.82)
            love.graphics.rectangle(
                "line",
                exploreFurther.x,
                exploreFurther.y,
                exploreFurther.width,
                exploreFurther.height,
                8,
                8
            )
            love.graphics.setColor(0.86, 0.94, 1, 1)
            love.graphics.printf(
                "Explore Further →",
                exploreFurther.x,
                exploreFurther.y + 15,
                exploreFurther.width,
                "center",
                0,
                0.72,
                0.72
            )
        end
    end
    if uiState.mode == "town" then
        if uiState.hoveredContinue then
            love.graphics.setColor(0.36, 0.27, 0.49, 0.98)
        else
            love.graphics.setColor(0.26, 0.2, 0.37, 0.96)
        end
        love.graphics.rectangle(
            "fill",
            uiState.continueButton.x,
            uiState.continueButton.y,
            uiState.continueButton.width,
            uiState.continueButton.height,
            8,
            8
        )
        love.graphics.setColor(0.86, 0.8, 0.97, 0.95)
        love.graphics.rectangle(
            "line",
            uiState.continueButton.x,
            uiState.continueButton.y,
            uiState.continueButton.width,
            uiState.continueButton.height,
            8,
            8
        )
        love.graphics.setColor(1, 1, 1, 1)
        love.graphics.printf(
            "Leave Town",
            uiState.continueButton.x,
            uiState.continueButton.y + 18,
            uiState.continueButton.width,
            "center",
            0,
            0.78,
            0.78
        )
    end
    love.graphics.setColor(0.46, 0.44, 0.58, 0.6)
    love.graphics.printf(
        uiState.mode == "town" and ("Town visits: " .. tostring(visitCount)) .. "  |  Space = Leave" or ("Explore visits: " .. tostring(visitCount)) .. "  |  Space = Back to Map",
        0,
        uiState.height - 38,
        uiState.width,
        "center",
        0,
        0.64,
        0.64
    )
end
return ____exports
