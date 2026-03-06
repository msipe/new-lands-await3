--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function isPointInsideRect(self, x, y, rect)
    return x >= rect.x and x <= rect.x + rect.width and y >= rect.y and y <= rect.y + rect.height
end
local function createContinueButton(self, width, height)
    local buttonWidth = math.max(
        250,
        math.min(
            360,
            math.floor(width * 0.32)
        )
    )
    local buttonHeight = 64
    local x = math.floor((width - buttonWidth) * 0.5)
    local y = math.floor(height * 0.78)
    return {id = "continue", label = "Begin Expedition", description = "Confirm class and race", rect = {x = x, y = y, width = buttonWidth, height = buttonHeight}}
end
local function getCardRect(self, width, height, side)
    local cardWidth = math.max(
        260,
        math.min(
            380,
            math.floor(width * 0.28)
        )
    )
    local cardHeight = math.max(
        180,
        math.min(
            230,
            math.floor(height * 0.34)
        )
    )
    local gap = 28
    local totalWidth = cardWidth * 2 + gap
    local left = math.floor((width - totalWidth) * 0.5)
    local y = math.floor(height * 0.33)
    return {x = side == "class" and left or left + cardWidth + gap, y = y, width = cardWidth, height = cardHeight}
end
local function createOptionRect(self, cardRect)
    return {x = cardRect.x + 16, y = cardRect.y + 54, width = cardRect.width - 32, height = cardRect.height - 70}
end
local function createClassOptions(self, width, height)
    return {{
        id = "class:warrior",
        label = "Warrior",
        description = "Frontline bruiser with reliable durability and direct offense.",
        rect = createOptionRect(
            nil,
            getCardRect(nil, width, height, "class")
        )
    }}
end
local function createRaceOptions(self, width, height)
    return {{
        id = "race:human",
        label = "Human",
        description = "Adaptable adventurer with balanced growth and broad potential.",
        rect = createOptionRect(
            nil,
            getCardRect(nil, width, height, "race")
        )
    }}
end
local function getOptionKey(self, group, optionId)
    return (group .. ":") .. optionId
end
local function getClassOptionAt(self, uiState, x, y)
    for ____, option in ipairs(uiState.classOptions) do
        if isPointInsideRect(nil, x, y, option.rect) then
            return option
        end
    end
    return nil
end
local function getRaceOptionAt(self, uiState, x, y)
    for ____, option in ipairs(uiState.raceOptions) do
        if isPointInsideRect(nil, x, y, option.rect) then
            return option
        end
    end
    return nil
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
    uiState.classOptions = createClassOptions(nil, width, height)
    uiState.raceOptions = createRaceOptions(nil, width, height)
end
local function getButtonAt(self, uiState, x, y)
    if isPointInsideRect(nil, x, y, uiState.continueButton.rect) then
        return uiState.continueButton
    end
    return nil
end
function ____exports.createCharacterSetupUiState(self)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    return {
        selectedClassId = "class:warrior",
        selectedRaceId = "race:human",
        classOptions = createClassOptions(nil, width, height),
        raceOptions = createRaceOptions(nil, width, height),
        continueButton = createContinueButton(nil, width, height),
        hoveredButtonId = nil,
        pressedButtonId = nil,
        hoveredOptionKey = nil,
        pressedOptionKey = nil,
        width = width,
        height = height,
        time = 0
    }
end
function ____exports.updateCharacterSetupUiState(self, uiState, dt)
    refreshLayoutIfNeeded(nil, uiState)
    uiState.time = uiState.time + dt
end
function ____exports.onCharacterSetupKeyPressed(self, uiState, key)
    if key == "space" or key == "return" or key == "kpenter" then
        return {kind = "confirm-character", classId = uiState.selectedClassId, raceId = uiState.selectedRaceId}
    end
    return nil
end
function ____exports.onCharacterSetupMouseMoved(self, uiState, x, y)
    refreshLayoutIfNeeded(nil, uiState)
    local ____uiState_2 = uiState
    local ____opt_0 = getButtonAt(nil, uiState, x, y)
    ____uiState_2.hoveredButtonId = ____opt_0 and ____opt_0.id
    local hoveredClassOption = getClassOptionAt(nil, uiState, x, y)
    if hoveredClassOption then
        uiState.hoveredOptionKey = getOptionKey(nil, "class", hoveredClassOption.id)
        return
    end
    local hoveredRaceOption = getRaceOptionAt(nil, uiState, x, y)
    if hoveredRaceOption then
        uiState.hoveredOptionKey = getOptionKey(nil, "race", hoveredRaceOption.id)
        return
    end
    uiState.hoveredOptionKey = nil
end
function ____exports.onCharacterSetupMousePressed(self, uiState, x, y, button)
    if button ~= 1 then
        return
    end
    refreshLayoutIfNeeded(nil, uiState)
    local ____uiState_5 = uiState
    local ____opt_3 = getButtonAt(nil, uiState, x, y)
    ____uiState_5.pressedButtonId = ____opt_3 and ____opt_3.id
    local classOption = getClassOptionAt(nil, uiState, x, y)
    if classOption then
        uiState.pressedOptionKey = getOptionKey(nil, "class", classOption.id)
        return
    end
    local raceOption = getRaceOptionAt(nil, uiState, x, y)
    if raceOption then
        uiState.pressedOptionKey = getOptionKey(nil, "race", raceOption.id)
        return
    end
    uiState.pressedOptionKey = nil
end
function ____exports.onCharacterSetupMouseReleased(self, uiState, x, y, button)
    if button ~= 1 then
        return nil
    end
    refreshLayoutIfNeeded(nil, uiState)
    local releasedClassOption = getClassOptionAt(nil, uiState, x, y)
    if releasedClassOption and uiState.pressedOptionKey == getOptionKey(nil, "class", releasedClassOption.id) then
        uiState.selectedClassId = releasedClassOption.id
        uiState.pressedOptionKey = nil
        return nil
    end
    local releasedRaceOption = getRaceOptionAt(nil, uiState, x, y)
    if releasedRaceOption and uiState.pressedOptionKey == getOptionKey(nil, "race", releasedRaceOption.id) then
        uiState.selectedRaceId = releasedRaceOption.id
        uiState.pressedOptionKey = nil
        return nil
    end
    uiState.pressedOptionKey = nil
    local releasedOn = getButtonAt(nil, uiState, x, y)
    local isClick = releasedOn and releasedOn.id == uiState.pressedButtonId
    uiState.pressedButtonId = nil
    if not isClick then
        return nil
    end
    return {kind = "confirm-character", classId = uiState.selectedClassId, raceId = uiState.selectedRaceId}
end
local function drawRadioOption(self, uiState, group, option, isSelected)
    local optionKey = getOptionKey(nil, group, option.id)
    local isHovered = uiState.hoveredOptionKey == optionKey
    if isSelected then
        love.graphics.setColor(0.18, 0.33, 0.5, 0.98)
    elseif isHovered then
        love.graphics.setColor(0.2, 0.26, 0.38, 0.96)
    else
        love.graphics.setColor(0.17, 0.24, 0.33, 0.95)
    end
    love.graphics.rectangle(
        "fill",
        option.rect.x,
        option.rect.y,
        option.rect.width,
        option.rect.height,
        8,
        8
    )
    love.graphics.setColor(0.73, 0.84, 0.98, isSelected and 1 or 0.82)
    love.graphics.rectangle(
        "line",
        option.rect.x,
        option.rect.y,
        option.rect.width,
        option.rect.height,
        8,
        8
    )
    love.graphics.setColor(0.98, 0.99, 1, 1)
    local selectedLabel = isSelected and option.label .. " (Selected)" or option.label
    love.graphics.printf(
        selectedLabel,
        option.rect.x + 14,
        option.rect.y + 10,
        option.rect.width - 20,
        "left",
        0,
        0.9,
        0.9
    )
    love.graphics.setColor(0.78, 0.86, 0.98, 0.94)
    love.graphics.printf(
        option.description,
        option.rect.x + 14,
        option.rect.y + 34,
        option.rect.width - 20,
        "left",
        0,
        0.62,
        0.62
    )
end
local function drawSelectionCard(self, title, options, selectedId, rect, pulse, uiState, group)
    love.graphics.setColor(0.14, 0.19, 0.29, 0.95)
    love.graphics.rectangle(
        "fill",
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        10,
        10
    )
    love.graphics.setColor(0.74, 0.84, 0.98, 0.86 * pulse)
    love.graphics.rectangle(
        "line",
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        10,
        10
    )
    love.graphics.setColor(0.74, 0.84, 0.98, 0.92)
    love.graphics.printf(
        title .. " (choose one)",
        rect.x + 18,
        rect.y + 18,
        rect.width - 36,
        "left",
        0,
        0.66,
        0.66
    )
    for ____, option in ipairs(options) do
        drawRadioOption(
            nil,
            uiState,
            group,
            option,
            option.id == selectedId
        )
    end
end
local function drawContinueButton(self, uiState)
    local button = uiState.continueButton
    local isHovered = uiState.hoveredButtonId == button.id
    local isPressed = uiState.pressedButtonId == button.id
    if isPressed then
        love.graphics.setColor(0.18, 0.25, 0.37, 0.98)
    elseif isHovered then
        love.graphics.setColor(0.24, 0.34, 0.5, 0.98)
    else
        love.graphics.setColor(0.16, 0.22, 0.33, 0.96)
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
    love.graphics.setColor(0.82, 0.91, 1, 0.98)
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
        button.label,
        button.rect.x,
        button.rect.y + 16,
        button.rect.width,
        "center",
        0,
        0.86,
        0.86
    )
    love.graphics.setColor(0.78, 0.87, 0.98, 0.95)
    love.graphics.printf(
        button.description,
        button.rect.x,
        button.rect.y + 40,
        button.rect.width,
        "center",
        0,
        0.6,
        0.6
    )
end
function ____exports.drawCharacterSetupUi(self, uiState, runCount)
    refreshLayoutIfNeeded(nil, uiState)
    local pulse = math.sin(uiState.time * 1.2) * 0.06 + 0.94
    love.graphics.setColor(0.06, 0.08, 0.12, 1)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        uiState.width,
        uiState.height
    )
    love.graphics.setColor(0.12, 0.19, 0.32, 0.42)
    love.graphics.circle("fill", uiState.width * 0.22, uiState.height * 0.22, 160)
    love.graphics.setColor(0.14, 0.28, 0.42, 0.34)
    love.graphics.circle("fill", uiState.width * 0.8, uiState.height * 0.24, 200)
    love.graphics.setColor(0.88, 0.94, 1, 0.98)
    love.graphics.printf(
        "Choose Your Origin",
        0,
        54,
        uiState.width,
        "center",
        0,
        1.18,
        1.18
    )
    love.graphics.setColor(0.75, 0.84, 0.97, 0.92)
    love.graphics.printf(
        "Start each run by locking your class and race. More options will unlock as progression expands.",
        0,
        98,
        uiState.width,
        "center",
        0,
        0.7,
        0.7
    )
    drawSelectionCard(
        nil,
        "Class",
        uiState.classOptions,
        uiState.selectedClassId,
        getCardRect(nil, uiState.width, uiState.height, "class"),
        pulse,
        uiState,
        "class"
    )
    drawSelectionCard(
        nil,
        "Race",
        uiState.raceOptions,
        uiState.selectedRaceId,
        getCardRect(nil, uiState.width, uiState.height, "race"),
        pulse,
        uiState,
        "race"
    )
    drawContinueButton(nil, uiState)
    love.graphics.setColor(0.75, 0.84, 0.97, 0.9)
    love.graphics.printf(
        ("Run " .. tostring(runCount)) .. " | Keyboard: Space/Enter to confirm",
        0,
        uiState.height - 34,
        uiState.width,
        "center",
        0,
        0.7,
        0.7
    )
end
return ____exports
