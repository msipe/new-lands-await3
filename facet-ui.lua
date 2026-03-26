local ____lualib = require("lualib_bundle")
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local ____exports = {}
local ____player_2Dprogression = require("game.player-progression")
local canInvestInFacet = ____player_2Dprogression.canInvestInFacet
local investInFacet = ____player_2Dprogression.investInFacet
function ____exports.createFacetUiState(self, playerProgression)
    return {
        playerProgression = playerProgression,
        width = love.graphics.getWidth(),
        height = love.graphics.getHeight(),
        selectedFacetId = nil
    }
end
local function isPointInRect(self, x, y, rect)
    return x >= rect.x and x <= rect.x + rect.width and y >= rect.y and y <= rect.y + rect.height
end
local function getLayout(self, uiState)
    local w = uiState.width
    local h = uiState.height
    local colPadding = 32
    local gap = 20
    local totalColWidth = w - colPadding * 2 - gap
    local colWidth = math.floor(totalColWidth / 2)
    local colTop = 90
    local colHeight = h - colTop - 90
    local buttonY = h - 72
    local buttonWidth = 160
    local buttonHeight = 40
    local centerX = math.floor(w / 2)
    return {soldierColumnRect = {x = colPadding, y = colTop, width = colWidth, height = colHeight}, berserkerColumnRect = {x = colPadding + colWidth + gap, y = colTop, width = colWidth, height = colHeight}, investButtonRect = {x = centerX - buttonWidth - 8, y = buttonY, width = buttonWidth, height = buttonHeight}, closeButtonRect = {x = centerX + 8, y = buttonY, width = buttonWidth, height = buttonHeight}}
end
local function canInvestInSelected(self, uiState)
    if not uiState.selectedFacetId then
        return false
    end
    return canInvestInFacet(nil, uiState.playerProgression, uiState.selectedFacetId)
end
local function drawFacetColumn(self, uiState, facet, colRect)
    local isSelected = uiState.selectedFacetId == facet.id
    local ____colRect_0 = colRect
    local colX = ____colRect_0.x
    local colY = ____colRect_0.y
    local colW = ____colRect_0.width
    local colH = ____colRect_0.height
    love.graphics.setColor(0.13, 0.15, 0.22, 1)
    love.graphics.rectangle(
        "fill",
        colX,
        colY - 34,
        colW,
        colH + 34,
        8,
        8
    )
    if isSelected then
        love.graphics.setColor(0.88, 0.78, 0.32, 0.9)
    else
        love.graphics.setColor(0.55, 0.62, 0.82, 0.45)
    end
    love.graphics.rectangle(
        "line",
        colX,
        colY - 34,
        colW,
        colH + 34,
        8,
        8
    )
    love.graphics.setColor(0.98, 0.96, 0.88, 1)
    love.graphics.printf(
        facet.name,
        colX + 12,
        colY - 27,
        colW - 24,
        "left",
        0,
        0.82,
        0.82
    )
    love.graphics.setColor(0.72, 0.82, 0.64, 0.9)
    love.graphics.printf(
        ((tostring(facet.pointsInvested) .. "/") .. tostring(#facet.tiers)) .. " pts",
        colX + 12,
        colY - 27,
        colW - 16,
        "right",
        0,
        0.64,
        0.64
    )
    local rowH = 36
    local rowGap = 5
    local rowIndex = 0
    do
        local tierIndex = 0
        while tierIndex < #facet.tiers do
            local tier = facet.tiers[tierIndex + 1]
            local isNextUnlock = tierIndex == facet.pointsInvested
            for ____, ability in ipairs(tier.abilities) do
                local rowY = colY + rowIndex * (rowH + rowGap)
                if rowY + rowH > colY + colH then
                    break
                end
                local isHighlighted = isNextUnlock and isSelected
                if ability.unlocked then
                    love.graphics.setColor(0.14, 0.26, 0.18, 0.95)
                elseif isHighlighted then
                    love.graphics.setColor(0.18, 0.2, 0.12, 0.92)
                else
                    love.graphics.setColor(0.1, 0.12, 0.18, 0.85)
                end
                love.graphics.rectangle(
                    "fill",
                    colX + 4,
                    rowY,
                    colW - 8,
                    rowH,
                    5,
                    5
                )
                if ability.unlocked then
                    love.graphics.setColor(0.52, 0.88, 0.62, 0.7)
                elseif isHighlighted then
                    love.graphics.setColor(0.9, 0.8, 0.3, 0.8)
                else
                    love.graphics.setColor(0.38, 0.44, 0.6, 0.35)
                end
                love.graphics.rectangle(
                    "line",
                    colX + 4,
                    rowY,
                    colW - 8,
                    rowH,
                    5,
                    5
                )
                if isHighlighted then
                    love.graphics.setColor(0.95, 0.82, 0.28, 1)
                    love.graphics.rectangle(
                        "fill",
                        colX + 4,
                        rowY + 2,
                        3,
                        rowH - 4,
                        2,
                        2
                    )
                end
                local rankLabel = ability.unlocked and "✓" or tostring(tierIndex + 1)
                if ability.unlocked then
                    love.graphics.setColor(0.52, 0.92, 0.64, 0.96)
                else
                    love.graphics.setColor(0.56, 0.62, 0.8, 0.7)
                end
                love.graphics.printf(
                    rankLabel,
                    colX + 8,
                    rowY + 12,
                    20,
                    "left",
                    0,
                    0.58,
                    0.58
                )
                if ability.unlocked then
                    love.graphics.setColor(0.88, 0.97, 0.9, 0.98)
                elseif isNextUnlock then
                    love.graphics.setColor(0.96, 0.94, 0.78, 0.96)
                else
                    love.graphics.setColor(0.62, 0.68, 0.8, 0.72)
                end
                love.graphics.printf(
                    ability.name,
                    colX + 28,
                    rowY + 5,
                    colW - 36,
                    "left",
                    0,
                    0.68,
                    0.68
                )
                if ability.unlocked or isNextUnlock then
                    love.graphics.setColor(0.68, 0.78, 0.9, 0.8)
                else
                    love.graphics.setColor(0.44, 0.5, 0.64, 0.5)
                end
                love.graphics.printf(
                    ability.description,
                    colX + 28,
                    rowY + 21,
                    colW - 36,
                    "left",
                    0,
                    0.58,
                    0.58
                )
                rowIndex = rowIndex + 1
            end
            tierIndex = tierIndex + 1
        end
    end
end
function ____exports.drawFacetUi(self, uiState)
    local ____uiState_1 = uiState
    local w = ____uiState_1.width
    local h = ____uiState_1.height
    local progression = uiState.playerProgression
    local layout = getLayout(nil, uiState)
    love.graphics.setColor(0.07, 0.08, 0.11, 1)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        w,
        h
    )
    love.graphics.setColor(0.98, 0.97, 0.92, 1)
    love.graphics.printf(
        "Facets",
        0,
        18,
        w,
        "center",
        0,
        1.1,
        1.1
    )
    love.graphics.setColor(0.9, 0.88, 0.75, 0.96)
    love.graphics.printf(
        "Unspent facet points: " .. tostring(progression.unspentFacetPoints),
        20,
        18,
        w - 40,
        "right",
        0,
        0.72,
        0.72
    )
    love.graphics.setColor(0.88, 0.8, 0.36, 0.5)
    love.graphics.rectangle(
        "fill",
        20,
        56,
        w - 40,
        1
    )
    local soldier = __TS__ArrayFind(
        progression.facets,
        function(____, f) return f.id == "facet:soldier" end
    )
    local berserker = __TS__ArrayFind(
        progression.facets,
        function(____, f) return f.id == "facet:berserker" end
    )
    if soldier then
        drawFacetColumn(nil, uiState, soldier, layout.soldierColumnRect)
    end
    if berserker then
        drawFacetColumn(nil, uiState, berserker, layout.berserkerColumnRect)
    end
    local canInvest = canInvestInSelected(nil, uiState)
    love.graphics.setColor(canInvest and 0.26 or 0.18, canInvest and 0.5 or 0.2, canInvest and 0.31 or 0.22, canInvest and 0.95 or 0.72)
    love.graphics.rectangle(
        "fill",
        layout.investButtonRect.x,
        layout.investButtonRect.y,
        layout.investButtonRect.width,
        layout.investButtonRect.height,
        7,
        7
    )
    love.graphics.setColor(canInvest and 0.78 or 0.5, canInvest and 0.95 or 0.6, canInvest and 0.84 or 0.65, 0.95)
    love.graphics.rectangle(
        "line",
        layout.investButtonRect.x,
        layout.investButtonRect.y,
        layout.investButtonRect.width,
        layout.investButtonRect.height,
        7,
        7
    )
    love.graphics.setColor(1, 1, 1, canInvest and 0.98 or 0.6)
    love.graphics.printf(
        "Invest",
        layout.investButtonRect.x,
        layout.investButtonRect.y + 12,
        layout.investButtonRect.width,
        "center",
        0,
        0.68,
        0.68
    )
    love.graphics.setColor(0.28, 0.22, 0.22, 0.9)
    love.graphics.rectangle(
        "fill",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y,
        layout.closeButtonRect.width,
        layout.closeButtonRect.height,
        7,
        7
    )
    love.graphics.setColor(0.9, 0.76, 0.76, 0.95)
    love.graphics.rectangle(
        "line",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y,
        layout.closeButtonRect.width,
        layout.closeButtonRect.height,
        7,
        7
    )
    love.graphics.setColor(1, 1, 1, 0.96)
    love.graphics.printf(
        "Close",
        layout.closeButtonRect.x,
        layout.closeButtonRect.y + 12,
        layout.closeButtonRect.width,
        "center",
        0,
        0.68,
        0.68
    )
    local hint = uiState.selectedFacetId and "Press Invest to unlock the next ability." or "Click a facet column to select it, then Invest to unlock."
    love.graphics.setColor(0.72, 0.78, 0.9, 0.8)
    love.graphics.printf(
        hint,
        0,
        h - 30,
        w,
        "center",
        0,
        0.58,
        0.58
    )
end
function ____exports.onFacetKeyPressed(self, uiState, key)
    if key == "escape" then
        return true
    end
    return false
end
function ____exports.onFacetMouseReleased(self, uiState, x, y, button)
    if button ~= 1 then
        return nil
    end
    local layout = getLayout(nil, uiState)
    if isPointInRect(nil, x, y, layout.closeButtonRect) then
        return "close"
    end
    if isPointInRect(nil, x, y, layout.investButtonRect) and canInvestInSelected(nil, uiState) then
        investInFacet(nil, uiState.playerProgression, uiState.selectedFacetId)
        uiState.selectedFacetId = nil
        return nil
    end
    if isPointInRect(nil, x, y, layout.soldierColumnRect) then
        uiState.selectedFacetId = "facet:soldier"
        return nil
    end
    if isPointInRect(nil, x, y, layout.berserkerColumnRect) then
        uiState.selectedFacetId = "facet:berserker"
        return nil
    end
    return nil
end
return ____exports
