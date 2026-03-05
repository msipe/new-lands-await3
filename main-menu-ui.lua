--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function isPointInsideRect(self, x, y, rect)
    return x >= rect.x and x <= rect.x + rect.width and y >= rect.y and y <= rect.y + rect.height
end
local function createButtons(self, width, height)
    local buttonWidth = math.max(
        260,
        math.min(
            430,
            math.floor(width * 0.36)
        )
    )
    local buttonHeight = 68
    local gap = 16
    local startY = math.floor(height * 0.52)
    local x = math.floor((width - buttonWidth) * 0.5)
    return {{
        id = "start-run",
        label = "Start Run",
        description = "Enter the wilds and begin a new expedition.",
        action = "start-run",
        rect = {x = x, y = startY, width = buttonWidth, height = buttonHeight}
    }, {
        id = "quit",
        label = "Quit",
        description = "Leave for now and return when the dice call again.",
        action = "quit",
        rect = {x = x, y = startY + buttonHeight + gap, width = buttonWidth, height = buttonHeight}
    }}
end
local function refreshLayoutIfNeeded(self, uiState)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    if uiState.width == width and uiState.height == height then
        return
    end
    uiState.width = width
    uiState.height = height
    uiState.buttons = createButtons(nil, width, height)
end
local function getButtonAt(self, uiState, x, y)
    for ____, button in ipairs(uiState.buttons) do
        if isPointInsideRect(nil, x, y, button.rect) then
            return button
        end
    end
    return nil
end
function ____exports.createMainMenuUiState(self)
    local width = love.graphics.getWidth()
    local height = love.graphics.getHeight()
    return {
        buttons = createButtons(nil, width, height),
        hoveredButtonId = nil,
        pressedButtonId = nil,
        time = 0,
        width = width,
        height = height
    }
end
function ____exports.updateMainMenuUiState(self, uiState, dt)
    refreshLayoutIfNeeded(nil, uiState)
    uiState.time = uiState.time + dt
end
function ____exports.onMainMenuMouseMoved(self, uiState, x, y)
    refreshLayoutIfNeeded(nil, uiState)
    local ____uiState_2 = uiState
    local ____opt_0 = getButtonAt(nil, uiState, x, y)
    ____uiState_2.hoveredButtonId = ____opt_0 and ____opt_0.id
end
function ____exports.onMainMenuMousePressed(self, uiState, x, y, button)
    if button ~= 1 then
        return
    end
    refreshLayoutIfNeeded(nil, uiState)
    local ____uiState_5 = uiState
    local ____opt_3 = getButtonAt(nil, uiState, x, y)
    ____uiState_5.pressedButtonId = ____opt_3 and ____opt_3.id
end
function ____exports.onMainMenuMouseReleased(self, uiState, x, y, button)
    if button ~= 1 then
        return nil
    end
    refreshLayoutIfNeeded(nil, uiState)
    local releasedOn = getButtonAt(nil, uiState, x, y)
    local isClick = releasedOn and releasedOn.id == uiState.pressedButtonId
    uiState.pressedButtonId = nil
    if not isClick or not releasedOn then
        return nil
    end
    return releasedOn.action
end
local function drawButton(self, uiState, button)
    local isHovered = uiState.hoveredButtonId == button.id
    local isPressed = uiState.pressedButtonId == button.id
    local hoverLift = isHovered and -2 or 0
    local x = button.rect.x
    local y = button.rect.y + hoverLift
    local width = button.rect.width
    local height = button.rect.height
    if isPressed then
        love.graphics.setColor(0.18, 0.25, 0.37, 0.96)
    elseif isHovered then
        love.graphics.setColor(0.24, 0.34, 0.5, 0.97)
    else
        love.graphics.setColor(0.16, 0.22, 0.33, 0.95)
    end
    love.graphics.rectangle(
        "fill",
        x,
        y,
        width,
        height,
        8,
        8
    )
    if isHovered then
        love.graphics.setColor(0.85, 0.94, 1, 1)
    else
        love.graphics.setColor(0.7, 0.81, 0.96, 0.9)
    end
    love.graphics.rectangle(
        "line",
        x,
        y,
        width,
        height,
        8,
        8
    )
    love.graphics.setColor(1, 1, 1, 0.98)
    love.graphics.printf(
        button.label,
        x,
        y + 17,
        width,
        "center",
        0,
        1.02,
        1.02
    )
    love.graphics.setColor(0.76, 0.85, 0.96, 0.95)
    love.graphics.printf(
        button.description,
        x,
        y + 43,
        width,
        "center",
        0,
        0.66,
        0.66
    )
end
function ____exports.drawMainMenuUi(self, uiState, runCount)
    refreshLayoutIfNeeded(nil, uiState)
    local width = uiState.width
    local height = uiState.height
    love.graphics.setColor(0.05, 0.08, 0.13, 1)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        width,
        height
    )
    local drift = math.sin(uiState.time * 0.8) * 18
    love.graphics.setColor(0.12, 0.2, 0.32, 0.45)
    love.graphics.circle("fill", width * 0.18 + drift, height * 0.2, 170)
    love.graphics.setColor(0.16, 0.28, 0.44, 0.38)
    love.graphics.circle("fill", width * 0.82 - drift, height * 0.24, 190)
    love.graphics.setColor(0.2, 0.14, 0.32, 0.26)
    love.graphics.circle("fill", width * 0.5, height * 0.78, 250)
    love.graphics.setColor(0.86, 0.93, 1, 0.16)
    love.graphics.rectangle(
        "fill",
        42,
        38,
        width - 84,
        120,
        14,
        14
    )
    love.graphics.setColor(0.72, 0.82, 0.95, 0.48)
    love.graphics.rectangle(
        "line",
        42,
        38,
        width - 84,
        120,
        14,
        14
    )
    love.graphics.setColor(1, 1, 1, 0.98)
    love.graphics.printf(
        "NEW LANDS AWAIT",
        58,
        58,
        width - 116,
        "left",
        0,
        1.45,
        1.45
    )
    love.graphics.setColor(0.8, 0.88, 0.98, 0.95)
    love.graphics.printf(
        "Forge enchanted dice, discover broken synergies, and push your run deeper.",
        60,
        112,
        width - 120,
        "left",
        0,
        0.78,
        0.78
    )
    for ____, button in ipairs(uiState.buttons) do
        drawButton(nil, uiState, button)
    end
    love.graphics.setColor(0.74, 0.83, 0.95, 0.9)
    love.graphics.printf(
        ("Runs started: " .. tostring(runCount)) .. "  |  Keyboard: Space = Start",
        0,
        height - 34,
        width,
        "center",
        0,
        0.72,
        0.72
    )
end
return ____exports
