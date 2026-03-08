local ____lualib = require("lualib_bundle")
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local ____exports = {}
local getSelectedLocation
local ____dialog_2Dservice = require("planning.dialog-service")
local getQuestDialogPromptsForNpc = ____dialog_2Dservice.getQuestDialogPromptsForNpc
local getStandardDialogForNpc = ____dialog_2Dservice.getStandardDialogForNpc
local ____quest_2Dlog = require("planning.quest-log")
local acceptQuest = ____quest_2Dlog.acceptQuest
local turnInQuest = ____quest_2Dlog.turnInQuest
local ____quest_2Devents = require("planning.quest-events")
local recordNpcInteracted = ____quest_2Devents.recordNpcInteracted
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
        y = math.floor(height * 0.7),
        width = buttonWidth,
        height = buttonHeight
    }
end
local function createLocationButtons(self, width, locations)
    local buttonWidth = math.max(
        280,
        math.floor(width * 0.42)
    )
    local buttonHeight = 44
    local x = math.floor(width * 0.08)
    local startY = 186
    local gap = 10
    return __TS__ArrayMap(
        locations,
        function(____, location, index) return {locationId = location.id, rect = {x = x, y = startY + index * (buttonHeight + gap), width = buttonWidth, height = buttonHeight}} end
    )
end
local function createCharacterButtons(self, width, selectedLocation)
    if selectedLocation == nil then
        return {}
    end
    local panelX = math.floor(width * 0.56)
    local buttonWidth = math.floor(width * 0.36) - 24
    local buttonHeight = 34
    local startY = 296
    local gap = 8
    return __TS__ArrayMap(
        selectedLocation.characters,
        function(____, character, index) return {characterId = character.id, rect = {x = panelX + 12, y = startY + index * (buttonHeight + gap), width = buttonWidth, height = buttonHeight}} end
    )
end
local function createDialogButtons(self, width)
    local panelX = math.floor(width * 0.56)
    local detailsWidth = math.floor(width * 0.36)
    local buttonWidth = math.floor((detailsWidth - 32) * 0.5)
    return {standard = {x = panelX + 12, y = 436, width = buttonWidth, height = 34}, quest = {x = panelX + 20 + buttonWidth, y = 436, width = buttonWidth, height = 34}, yes = {x = panelX + 12, y = 514, width = buttonWidth, height = 30}, no = {x = panelX + 20 + buttonWidth, y = 514, width = buttonWidth, height = 30}}
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
    uiState.locationButtons = createLocationButtons(nil, width, uiState.locations)
    uiState.characterButtons = createCharacterButtons(
        nil,
        width,
        getSelectedLocation(nil, uiState)
    )
    uiState.dialogButtons = createDialogButtons(nil, width)
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
        uiState.availableQuestPrompts = {}
        uiState.canQuestTalk = false
        uiState.selectedQuestPrompt = nil
        uiState.questResponseText = nil
        return
    end
    if character.npcId == nil then
        uiState.dialogMode = "standard"
        uiState.dialogText = character.description
        uiState.availableQuestPrompts = {}
        uiState.canQuestTalk = false
        uiState.selectedQuestPrompt = nil
        uiState.questResponseText = nil
        return
    end
    local lines = getStandardDialogForNpc(nil, character.npcId)
    recordNpcInteracted(nil, character.npcId)
    local prompts = getQuestDialogPromptsForNpc(nil, character.npcId)
    uiState.dialogMode = "standard"
    uiState.dialogText = lines[1] or character.description
    uiState.availableQuestPrompts = prompts
    uiState.canQuestTalk = #prompts > 0
    uiState.selectedQuestPrompt = prompts[1]
    uiState.questResponseText = nil
end
function ____exports.createEncounterUiState(self, context)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    local tileZone = context and context.tileZone or "forest"
    local locations = context and context.locations or ({})
    local mode = tileZone == "town" and "town" or "generic"
    local ____mode_14 = mode
    local ____temp_15 = context and context.tileName or "Unknown Tile"
    local ____tileZone_16 = tileZone
    local ____locations_17 = locations
    local ____opt_8 = locations[1]
    local ____temp_18 = ____opt_8 and ____opt_8.id
    local ____opt_12 = locations[1]
    local ____opt_10 = ____opt_12 and ____opt_12.characters[1]
    local initialState = {
        mode = ____mode_14,
        tileName = ____temp_15,
        tileZone = ____tileZone_16,
        locations = ____locations_17,
        selectedLocationId = ____temp_18,
        selectedCharacterId = ____opt_10 and ____opt_10.id,
        width = width,
        height = height,
        continueButton = createContinueButton(nil, width, height),
        locationButtons = createLocationButtons(nil, width, locations),
        characterButtons = createCharacterButtons(nil, width, locations[1]),
        dialogButtons = createDialogButtons(nil, width),
        dialogMode = "none",
        dialogText = "Select a character to begin dialog.",
        availableQuestPrompts = {},
        canQuestTalk = false,
        selectedQuestPrompt = nil,
        questResponseText = nil,
        hoveredContinue = false,
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
            local ____uiState_27 = uiState
            local ____opt_23 = selectedLocation and selectedLocation.characters[1]
            ____uiState_27.selectedCharacterId = ____opt_23 and ____opt_23.id
            refreshDialogForSelection(nil, uiState)
            return false
        end
        local characterButton = getCharacterButtonAt(nil, uiState, x, y)
        if characterButton then
            uiState.selectedCharacterId = characterButton.characterId
            refreshDialogForSelection(nil, uiState)
            return false
        end
        if isInRect(nil, x, y, uiState.dialogButtons.standard) then
            local character = getSelectedCharacter(nil, uiState)
            if (character and character.npcId) ~= nil then
                local lines = getStandardDialogForNpc(nil, character.npcId)
                uiState.dialogMode = "standard"
                uiState.dialogText = lines[1] or character.description
            elseif character ~= nil then
                uiState.dialogMode = "standard"
                uiState.dialogText = character.description
            end
            uiState.questResponseText = nil
            return false
        end
        if isInRect(nil, x, y, uiState.dialogButtons.quest) then
            if not uiState.canQuestTalk then
                return false
            end
            local character = getSelectedCharacter(nil, uiState)
            if (character and character.npcId) ~= nil then
                uiState.selectedQuestPrompt = uiState.availableQuestPrompts[1]
            end
            if uiState.selectedQuestPrompt ~= nil then
                uiState.dialogMode = "quest"
                uiState.dialogText = uiState.selectedQuestPrompt.prompt
            else
                uiState.dialogMode = "quest"
                uiState.dialogText = "No quest dialog is currently available for this character."
            end
            uiState.questResponseText = nil
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
            return false
        end
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
        local detailsX = math.floor(uiState.width * 0.56)
        local detailsY = 186
        local detailsWidth = math.floor(uiState.width * 0.36)
        local detailsHeight = math.floor(uiState.height * 0.46)
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
                detailsY + 94,
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
            local selectedCharacterName = getSelectedCharacterName(nil, uiState)
            if selectedCharacterName ~= nil then
                love.graphics.setColor(0.79, 0.75, 0.91, 0.94)
                love.graphics.printf(
                    "Interact: " .. selectedCharacterName,
                    detailsX + 12,
                    detailsY + detailsHeight - 30,
                    detailsWidth - 24,
                    "left",
                    0,
                    0.57,
                    0.57
                )
            end
            love.graphics.setColor(0.9, 0.94, 1, 0.95)
            love.graphics.printf(
                "Dialog",
                detailsX + 12,
                394,
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
                414,
                detailsWidth - 24,
                92,
                6,
                6
            )
            love.graphics.setColor(0.74, 0.69, 0.86, 0.72)
            love.graphics.rectangle(
                "line",
                detailsX + 12,
                414,
                detailsWidth - 24,
                92,
                6,
                6
            )
            love.graphics.setColor(0.92, 0.9, 0.99, 0.96)
            love.graphics.printf(
                uiState.dialogText,
                detailsX + 20,
                422,
                detailsWidth - 40,
                "left",
                0,
                0.55,
                0.55
            )
            love.graphics.setColor(0.31, 0.24, 0.43, 0.96)
            love.graphics.rectangle(
                "fill",
                uiState.dialogButtons.standard.x,
                uiState.dialogButtons.standard.y,
                uiState.dialogButtons.standard.width,
                uiState.dialogButtons.standard.height,
                6,
                6
            )
            love.graphics.setColor(0.79, 0.73, 0.91, 0.85)
            love.graphics.rectangle(
                "line",
                uiState.dialogButtons.standard.x,
                uiState.dialogButtons.standard.y,
                uiState.dialogButtons.standard.width,
                uiState.dialogButtons.standard.height,
                6,
                6
            )
            love.graphics.setColor(1, 1, 1, 0.98)
            love.graphics.printf(
                "Standard Talk",
                uiState.dialogButtons.standard.x,
                uiState.dialogButtons.standard.y + 10,
                uiState.dialogButtons.standard.width,
                "center",
                0,
                0.56,
                0.56
            )
            if uiState.canQuestTalk then
                love.graphics.setColor(0.31, 0.24, 0.43, 0.96)
                love.graphics.rectangle(
                    "fill",
                    uiState.dialogButtons.quest.x,
                    uiState.dialogButtons.quest.y,
                    uiState.dialogButtons.quest.width,
                    uiState.dialogButtons.quest.height,
                    6,
                    6
                )
                love.graphics.setColor(0.79, 0.73, 0.91, 0.85)
                love.graphics.rectangle(
                    "line",
                    uiState.dialogButtons.quest.x,
                    uiState.dialogButtons.quest.y,
                    uiState.dialogButtons.quest.width,
                    uiState.dialogButtons.quest.height,
                    6,
                    6
                )
                love.graphics.setColor(1, 1, 1, 0.98)
                love.graphics.printf(
                    "Quest Talk",
                    uiState.dialogButtons.quest.x,
                    uiState.dialogButtons.quest.y + 10,
                    uiState.dialogButtons.quest.width,
                    "center",
                    0,
                    0.56,
                    0.56
                )
            end
            if uiState.canQuestTalk and uiState.dialogMode == "quest" then
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
                    "Yes",
                    uiState.dialogButtons.yes.x,
                    uiState.dialogButtons.yes.y + 8,
                    uiState.dialogButtons.yes.width,
                    "center",
                    0,
                    0.55,
                    0.55
                )
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
                    "No",
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
                    548,
                    detailsWidth - 24,
                    "left",
                    0,
                    0.52,
                    0.52
                )
            end
        end
    else
        love.graphics.setColor(0.95, 0.92, 1, 1)
        love.graphics.printf(
            "Encounter (Prototype)",
            0,
            120,
            uiState.width,
            "center",
            0,
            1.26,
            1.26
        )
        love.graphics.setColor(0.82, 0.78, 0.91, 0.95)
        love.graphics.printf(
            ((("Tile: " .. uiState.tileName) .. " (") .. uiState.tileZone) .. ")\nEncounter content is not implemented yet.",
            0,
            190,
            uiState.width,
            "center",
            0,
            0.82,
            0.82
        )
    end
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
        uiState.mode == "town" and "Leave Town" or "Continue",
        uiState.continueButton.x,
        uiState.continueButton.y + 18,
        uiState.continueButton.width,
        "center",
        0,
        0.78,
        0.78
    )
    love.graphics.setColor(0.78, 0.75, 0.9, 0.88)
    love.graphics.printf(
        ("Encounter visits: " .. tostring(visitCount)) .. "  |  Space = Continue",
        0,
        uiState.height - 38,
        uiState.width,
        "center",
        0,
        0.68,
        0.68
    )
end
return ____exports
