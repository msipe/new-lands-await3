local ____lualib = require("lualib_bundle")
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__ObjectValues = ____lualib.__TS__ObjectValues
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__SparseArrayNew = ____lualib.__TS__SparseArrayNew
local __TS__SparseArrayPush = ____lualib.__TS__SparseArrayPush
local __TS__SparseArraySpread = ____lualib.__TS__SparseArraySpread
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayIncludes = ____lualib.__TS__ArrayIncludes
local __TS__ArrayPushArray = ____lualib.__TS__ArrayPushArray
local __TS__StringSlice = ____lualib.__TS__StringSlice
local ____exports = {}
local getDieFromInspector
function getDieFromInspector(self, uiState, state)
    if not uiState.inspector then
        return nil
    end
    local dice = uiState.inspector.owner == "player" and state.player.dice or state.enemy.dice
    return __TS__ArrayFind(
        dice,
        function(____, die)
            local ____die_id_10 = die.id
            local ____opt_8 = uiState.inspector
            return ____die_id_10 == (____opt_8 and ____opt_8.combatDieId)
        end
    )
end
local BACKGROUND = {r = 0.16, g = 0.16, b = 0.16}
local WHITE = {r = 1, g = 1, b = 1}
local GREEN = {r = 0.2, g = 0.72, b = 0.33}
local BLACK = {r = 0, g = 0, b = 0}
local RESOLVE_FLASH_DURATION = 0.26
local function createLayout(self)
    local width = love.graphics.getWidth()
    return {
        playerNameX = 50,
        playerNameY = 28,
        enemyNameX = width - 280,
        enemyNameY = 28,
        hpBarWidth = 140,
        hpBarHeight = 18,
        arenaX = 35,
        arenaY = 125,
        arenaWidth = width - 70,
        arenaHeight = 230,
        poolX = 40,
        poolY = 420,
        poolWidth = width - 80,
        poolHeight = 165
    }
end
local function makePoolPosition(self, layout, slotIndex)
    local spacing = 140
    return {x = layout.poolX + 70 + slotIndex * spacing, y = layout.poolY + 105}
end
local function getSideLabel(self, state, dieId, sideId)
    local die = __TS__ArrayFind(
        state.enemy.dice,
        function(____, entry) return entry.id == dieId end
    )
    if not die then
        return "?"
    end
    local side = __TS__ArrayFind(
        die.sides,
        function(____, entry) return entry.id == sideId end
    )
    return side and side.label or "?"
end
local function spawnEnemyThrowDice(self, uiState, state)
    uiState.enemyArenaDice = {}
    uiState.enemyParkedDice = {}
    uiState.enemyPendingDice = {}
    local uniqueByDieId = {}
    for ____, event in ipairs(state.enemyIntent.events) do
        if not uniqueByDieId[event.dieId] then
            uniqueByDieId[event.dieId] = {dieId = event.dieId, sideId = event.sideId}
        end
    end
    local entries = __TS__ObjectValues(uniqueByDieId)
    local laneWidth = uiState.layout.hpBarWidth
    local minGap = 4
    local maxPreviewSize = 46
    local availablePerDie = #entries > 0 and (laneWidth - minGap * (#entries - 1)) / #entries or maxPreviewSize
    local parkedSize = math.max(
        18,
        math.min(maxPreviewSize, availablePerDie)
    )
    local totalWidth = parkedSize * #entries + minGap * math.max(0, #entries - 1)
    local parkStartX = uiState.layout.enemyNameX + (laneWidth - totalWidth) * 0.5 + parkedSize * 0.5
    local parkY = uiState.layout.enemyNameY + 26 + uiState.layout.hpBarHeight + 24
    do
        local index = 0
        while index < #entries do
            local entry = entries[index + 1]
            local spawnX = uiState.layout.arenaX + uiState.layout.arenaWidth * 0.5 + (math.random() - 0.5) * (uiState.layout.arenaWidth * 0.3)
            local spawnY = uiState.layout.arenaY + 30 + math.random() * 18
            local ____uiState_enemyPendingDice_0 = uiState.enemyPendingDice
            ____uiState_enemyPendingDice_0[#____uiState_enemyPendingDice_0 + 1] = {
                id = (("enemy-preview-" .. tostring(state.round)) .. "-") .. entry.dieId,
                owner = "enemy",
                combatDieId = entry.dieId,
                label = getSideLabel(nil, state, entry.dieId, entry.sideId),
                x = spawnX,
                y = spawnY,
                vx = (math.random() - 0.5) * 360,
                vy = 220 + math.random() * 180,
                angle = 0,
                spin = (math.random() - 0.5) * 12,
                size = maxPreviewSize,
                state = "arena",
                parkX = parkStartX + index * (parkedSize + minGap),
                parkY = parkY,
                parkSize = parkedSize
            }
            index = index + 1
        end
    end
    uiState.enemySpawnTimer = 0
    uiState.enemySettleTimer = 0
    uiState.enemyThrowResolvedForRound = 0
end
local function ensurePlayerDice(self, uiState, state)
    if #uiState.playerDice > 0 and uiState.roundSeen == state.round then
        return
    end
    uiState.playerDice = __TS__ArrayMap(
        state.player.dice,
        function(____, die, index)
            local position = makePoolPosition(nil, uiState.layout, index)
            return {
                id = "player-pool-" .. die.id,
                owner = "player",
                combatDieId = die.id,
                label = die.name,
                x = position.x,
                y = position.y,
                vx = 0,
                vy = 0,
                angle = 0,
                spin = 0,
                size = 54,
                state = "parked",
                slotIndex = index,
                parkX = position.x,
                parkY = position.y
            }
        end
    )
end
local function isInsideArena(self, uiState, x, y)
    local l = uiState.layout
    return x >= l.arenaX and x <= l.arenaX + l.arenaWidth and y >= l.arenaY and y <= l.arenaY + l.arenaHeight
end
local function applyWallBounce(self, layout, die)
    local half = die.size / 2
    local minX = layout.arenaX + half
    local maxX = layout.arenaX + layout.arenaWidth - half
    local minY = layout.arenaY + half
    local maxY = layout.arenaY + layout.arenaHeight - half
    if die.x < minX then
        die.x = minX
        die.vx = math.abs(die.vx) * 0.85
        die.spin = die.spin + die.vx * 0.005
    elseif die.x > maxX then
        die.x = maxX
        die.vx = -math.abs(die.vx) * 0.85
        die.spin = die.spin + die.vx * 0.005
    end
    if die.y < minY then
        die.y = minY
        die.vy = math.abs(die.vy) * 0.85
        die.spin = die.spin + die.vy * 0.005
    elseif die.y > maxY then
        die.y = maxY
        die.vy = -math.abs(die.vy) * 0.85
        die.spin = die.spin + die.vy * 0.005
    end
end
local function resolvePairCollision(self, a, b)
    local dx = b.x - a.x
    local dy = b.y - a.y
    local distanceSq = dx * dx + dy * dy
    local minDist = (a.size + b.size) * 0.5
    if distanceSq <= 0.0001 or distanceSq > minDist * minDist then
        return
    end
    local distance = math.sqrt(distanceSq)
    local nx = dx / distance
    local ny = dy / distance
    local overlap = minDist - distance
    a.x = a.x - nx * overlap * 0.5
    a.y = a.y - ny * overlap * 0.5
    b.x = b.x + nx * overlap * 0.5
    b.y = b.y + ny * overlap * 0.5
    local rvx = b.vx - a.vx
    local rvy = b.vy - a.vy
    local velAlongNormal = rvx * nx + rvy * ny
    if velAlongNormal > 0 then
        return
    end
    local impulse = -(1 + 0.88) * velAlongNormal / 2
    local ix = impulse * nx
    local iy = impulse * ny
    a.vx = a.vx - ix
    a.vy = a.vy - iy
    b.vx = b.vx + ix
    b.vy = b.vy + iy
    local tx = -ny
    local ty = nx
    local tangentSpeed = rvx * tx + rvy * ty
    a.spin = a.spin - tangentSpeed * 0.01
    b.spin = b.spin + tangentSpeed * 0.01
end
local function updateArenaDice(self, uiState, dt)
    local ____array_1 = __TS__SparseArrayNew(unpack(uiState.enemyArenaDice))
    __TS__SparseArrayPush(
        ____array_1,
        unpack(uiState.arenaPlayerDice)
    )
    local dynamicDice = __TS__ArrayFilter(
        {__TS__SparseArraySpread(____array_1)},
        function(____, die) return die.state == "arena" end
    )
    for ____, die in ipairs(dynamicDice) do
        die.x = die.x + die.vx * dt
        die.y = die.y + die.vy * dt
        die.angle = die.angle + die.spin * dt
        die.vx = die.vx * 0.993
        die.vy = die.vy * 0.993
        die.spin = die.spin * 0.99
        applyWallBounce(nil, uiState.layout, die)
    end
    do
        local left = 0
        while left < #dynamicDice do
            do
                local right = left + 1
                while right < #dynamicDice do
                    resolvePairCollision(nil, dynamicDice[left + 1], dynamicDice[right + 1])
                    right = right + 1
                end
            end
            left = left + 1
        end
    end
end
local function updateDieFlashes(self, uiState, dt)
    local ____array_2 = __TS__SparseArrayNew(unpack(uiState.playerDice))
    __TS__SparseArrayPush(
        ____array_2,
        unpack(uiState.enemyArenaDice)
    )
    __TS__SparseArrayPush(
        ____array_2,
        unpack(uiState.enemyPendingDice)
    )
    __TS__SparseArrayPush(
        ____array_2,
        unpack(uiState.enemyParkedDice)
    )
    local allDice = {__TS__SparseArraySpread(____array_2)}
    for ____, die in ipairs(allDice) do
        do
            if die.flashTimer == nil or die.flashTimer <= 0 then
                goto __continue35
            end
            die.flashTimer = math.max(0, die.flashTimer - dt)
        end
        ::__continue35::
    end
end
local function parkEnemyDice(self, uiState)
    for ____, die in ipairs(uiState.enemyArenaDice) do
        do
            if die.parkX == nil or die.parkY == nil then
                goto __continue39
            end
            die.state = "parked"
            die.vx = 0
            die.vy = 0
            die.spin = 0
            die.angle = 0
            die.size = die.parkSize or die.size
            die.x = die.parkX
            die.y = die.parkY
            local ____uiState_enemyParkedDice_3 = uiState.enemyParkedDice
            ____uiState_enemyParkedDice_3[#____uiState_enemyParkedDice_3 + 1] = die
        end
        ::__continue39::
    end
    for ____, die in ipairs(uiState.enemyPendingDice) do
        do
            if die.parkX == nil or die.parkY == nil then
                goto __continue42
            end
            die.state = "parked"
            die.vx = 0
            die.vy = 0
            die.spin = 0
            die.angle = 0
            die.size = die.parkSize or die.size
            die.x = die.parkX
            die.y = die.parkY
            local ____uiState_enemyParkedDice_4 = uiState.enemyParkedDice
            ____uiState_enemyParkedDice_4[#____uiState_enemyParkedDice_4 + 1] = die
        end
        ::__continue42::
    end
    uiState.enemyArenaDice = {}
    uiState.enemyPendingDice = {}
end
function ____exports.createCombatUiState(self, state)
    local uiState = {
        layout = createLayout(nil),
        enemyArenaDice = {},
        enemyParkedDice = {},
        enemyPendingDice = {},
        playerDice = {},
        arenaPlayerDice = {},
        roundSeen = state.round,
        pendingRound = nil,
        playerResetDelay = 2.35,
        playerResetTimer = 0,
        enemySpawnTimer = 0,
        enemySpawnInterval = 0.33,
        enemySettleTimer = 0,
        enemySettleDelay = 1.9,
        enemyThrowResolvedForRound = 0,
        rolledPlayerDieIds = {},
        pendingPlayerDieIds = {},
        settledPlayerDieIds = {},
        inspector = nil
    }
    ensurePlayerDice(nil, uiState, state)
    spawnEnemyThrowDice(nil, uiState, state)
    return uiState
end
local function finalizeRoundTransition(self, uiState, state)
    uiState.roundSeen = state.round
    uiState.pendingRound = nil
    uiState.playerResetTimer = 0
    uiState.drag = nil
    uiState.arenaPlayerDice = {}
    uiState.rolledPlayerDieIds = {}
    uiState.pendingPlayerDieIds = {}
    uiState.settledPlayerDieIds = {}
    for ____, die in ipairs(uiState.playerDice) do
        if die.parkX ~= nil and die.parkY ~= nil then
            die.x = die.parkX
            die.y = die.parkY
        end
        die.vx = 0
        die.vy = 0
        die.spin = 0
        die.angle = 0
        die.state = "parked"
    end
    ensurePlayerDice(nil, uiState, state)
    spawnEnemyThrowDice(nil, uiState, state)
end
local function areDiceSettled(self, dice)
    for ____, die in ipairs(dice) do
        local speed = math.sqrt(die.vx * die.vx + die.vy * die.vy)
        if speed > 60 or math.abs(die.spin) > 1.3 then
            return false
        end
    end
    return true
end
local function isDieSettled(self, die)
    local speed = math.sqrt(die.vx * die.vx + die.vy * die.vy)
    return speed <= 60 and math.abs(die.spin) <= 1.3
end
local function enqueueSettledPlayerDice(self, uiState)
    local remaining = {}
    for ____, dieId in ipairs(uiState.pendingPlayerDieIds) do
        do
            local visualDie = __TS__ArrayFind(
                uiState.arenaPlayerDice,
                function(____, entry) return entry.combatDieId == dieId end
            )
            if not visualDie then
                goto __continue56
            end
            if not isDieSettled(nil, visualDie) then
                remaining[#remaining + 1] = dieId
                goto __continue56
            end
            visualDie.vx = 0
            visualDie.vy = 0
            visualDie.spin = 0
            visualDie.flashTimer = RESOLVE_FLASH_DURATION
            if not __TS__ArrayIncludes(uiState.settledPlayerDieIds, dieId) then
                local ____uiState_settledPlayerDieIds_5 = uiState.settledPlayerDieIds
                ____uiState_settledPlayerDieIds_5[#____uiState_settledPlayerDieIds_5 + 1] = dieId
            end
        end
        ::__continue56::
    end
    uiState.pendingPlayerDieIds = remaining
end
local function settleAllPendingPlayerDice(self, uiState)
    for ____, dieId in ipairs(uiState.pendingPlayerDieIds) do
        local visualDie = __TS__ArrayFind(
            uiState.arenaPlayerDice,
            function(____, entry) return entry.combatDieId == dieId end
        )
        if visualDie then
            visualDie.vx = 0
            visualDie.vy = 0
            visualDie.spin = 0
        end
        if not __TS__ArrayIncludes(uiState.settledPlayerDieIds, dieId) then
            local ____uiState_settledPlayerDieIds_6 = uiState.settledPlayerDieIds
            ____uiState_settledPlayerDieIds_6[#____uiState_settledPlayerDieIds_6 + 1] = dieId
        end
    end
    uiState.pendingPlayerDieIds = {}
end
local function updateEnemyPresentation(self, uiState, state, dt)
    if uiState.enemyThrowResolvedForRound == state.round then
        return
    end
    uiState.enemySpawnTimer = uiState.enemySpawnTimer + dt
    while #uiState.enemyPendingDice > 0 and uiState.enemySpawnTimer >= uiState.enemySpawnInterval do
        uiState.enemySpawnTimer = uiState.enemySpawnTimer - uiState.enemySpawnInterval
        local next = table.remove(uiState.enemyPendingDice, 1)
        if next then
            local ____uiState_enemyArenaDice_7 = uiState.enemyArenaDice
            ____uiState_enemyArenaDice_7[#____uiState_enemyArenaDice_7 + 1] = next
        end
    end
    if #uiState.enemyPendingDice == 0 then
        uiState.enemySettleTimer = uiState.enemySettleTimer + dt
        if uiState.enemySettleTimer >= uiState.enemySettleDelay and areDiceSettled(nil, uiState.enemyArenaDice) or uiState.enemySettleTimer >= uiState.enemySettleDelay + 1.5 then
            parkEnemyDice(nil, uiState)
            uiState.enemyThrowResolvedForRound = state.round
        end
    end
end
function ____exports.fastForwardCombatUi(self, uiState, state)
    if #uiState.pendingPlayerDieIds > 0 then
        settleAllPendingPlayerDice(nil, uiState)
        return
    end
    if uiState.pendingRound == state.round then
        finalizeRoundTransition(nil, uiState, state)
        return
    end
    if uiState.enemyThrowResolvedForRound ~= state.round then
        parkEnemyDice(nil, uiState)
        uiState.enemyThrowResolvedForRound = state.round
    end
end
function ____exports.updateCombatUiState(self, uiState, state, dt)
    if state.round ~= uiState.roundSeen and uiState.pendingRound ~= state.round then
        uiState.pendingRound = state.round
        uiState.playerResetTimer = 0
    end
    if uiState.pendingRound == state.round then
        uiState.playerResetTimer = uiState.playerResetTimer + dt
        if uiState.playerResetTimer >= uiState.playerResetDelay and areDiceSettled(nil, uiState.arenaPlayerDice) or uiState.playerResetTimer >= uiState.playerResetDelay + 2.1 then
            finalizeRoundTransition(nil, uiState, state)
        end
    end
    updateEnemyPresentation(nil, uiState, state, dt)
    updateArenaDice(nil, uiState, dt)
    updateDieFlashes(nil, uiState, dt)
    enqueueSettledPlayerDice(nil, uiState)
end
function ____exports.drainSettledPlayerDieIds(self, uiState)
    if #uiState.settledPlayerDieIds == 0 then
        return {}
    end
    local settled = {unpack(uiState.settledPlayerDieIds)}
    uiState.settledPlayerDieIds = {}
    return settled
end
function ____exports.canPlayerThrow(self, uiState, state)
    return state.phase == "player-turn" and uiState.pendingRound == nil and uiState.enemyThrowResolvedForRound == state.round and #uiState.enemyArenaDice == 0
end
local function isPointInsideRect(self, x, y, rect)
    return x >= rect.x and x <= rect.x + rect.width and y >= rect.y and y <= rect.y + rect.height
end
local function isPointInsideDie(self, x, y, die)
    local half = die.size / 2
    return x >= die.x - half and x <= die.x + half and y >= die.y - half and y <= die.y + half
end
local function findInteractiveDieAt(self, uiState, x, y)
    local drawOrder = {}
    __TS__ArrayPushArray(drawOrder, uiState.enemyArenaDice)
    __TS__ArrayPushArray(drawOrder, uiState.enemyParkedDice)
    __TS__ArrayPushArray(
        drawOrder,
        __TS__ArrayFilter(
            uiState.arenaPlayerDice,
            function(____, die) return die.state == "arena" end
        )
    )
    __TS__ArrayPushArray(
        drawOrder,
        __TS__ArrayFilter(
            uiState.playerDice,
            function(____, die) return die.state == "parked" or die.state == "dragging" end
        )
    )
    do
        local index = #drawOrder - 1
        while index >= 0 do
            local die = drawOrder[index + 1]
            if isPointInsideDie(nil, x, y, die) then
                return die
            end
            index = index - 1
        end
    end
    return nil
end
local function getInspectorRect(self)
    local screenWidth = love.graphics.getWidth()
    local screenHeight = love.graphics.getHeight()
    local width = math.max(
        580,
        math.min(980, screenWidth - 70)
    )
    local height = math.max(
        420,
        math.min(560, screenHeight - 60)
    )
    return {x = (screenWidth - width) * 0.5, y = (screenHeight - height) * 0.5, width = width, height = height}
end
local function getInspectorLayout(self, faceCount)
    local panel = getInspectorRect(nil)
    local headerHeight = 72
    local closeButtonRect = {x = panel.x + panel.width - 42, y = panel.y + 10, width = 28, height = 28}
    local detailsHeight = math.min(
        160,
        math.max(118, panel.height * 0.24)
    )
    local diagramRect = {x = panel.x + 22, y = panel.y + headerHeight, width = panel.width - 44, height = panel.height - headerHeight - detailsHeight - 20}
    local detailsRect = {x = panel.x + 22, y = diagramRect.y + diagramRect.height + 10, width = panel.width - 44, height = detailsHeight}
    local resolvedFaceCount = math.max(1, faceCount)
    local areaPadding = 20
    local aspect = diagramRect.width / math.max(1, diagramRect.height)
    local columnCount = math.max(
        1,
        math.min(
            resolvedFaceCount,
            math.ceil(math.sqrt(resolvedFaceCount * aspect))
        )
    )
    local rowCount = math.max(
        1,
        math.ceil(resolvedFaceCount / columnCount)
    )
    local gap = math.max(
        4,
        math.min(
            14,
            math.floor(math.min(diagramRect.width, diagramRect.height) * 0.02)
        )
    )
    local availableWidth = math.max(24, diagramRect.width - areaPadding * 2 - gap * (columnCount - 1))
    local availableHeight = math.max(24, diagramRect.height - areaPadding * 2 - gap * (rowCount - 1))
    local tileSize = math.max(
        16,
        math.floor(math.min(availableWidth / columnCount, availableHeight / rowCount))
    )
    local contentWidth = columnCount * tileSize + (columnCount - 1) * gap
    local contentHeight = rowCount * tileSize + (rowCount - 1) * gap
    local startX = diagramRect.x + (diagramRect.width - contentWidth) * 0.5
    local startY = diagramRect.y + (diagramRect.height - contentHeight) * 0.5
    local tiles = {}
    do
        local index = 0
        while index < faceCount do
            local column = index % columnCount
            local row = math.floor(index / columnCount)
            local x = startX + column * (tileSize + gap)
            local y = startY + row * (tileSize + gap)
            tiles[#tiles + 1] = {sideIndex = index, rect = {x = x, y = y, width = tileSize, height = tileSize}}
            index = index + 1
        end
    end
    return {
        panel = panel,
        diagramRect = diagramRect,
        detailsRect = detailsRect,
        closeButtonRect = closeButtonRect,
        tiles = tiles,
        denseMode = faceCount > 20
    }
end
local function getInspectorSideIndexAt(self, uiState, state, x, y)
    local die = getDieFromInspector(nil, uiState, state)
    if not die then
        return nil
    end
    local layout = getInspectorLayout(nil, #die.sides)
    for ____, tile in ipairs(layout.tiles) do
        if isPointInsideRect(nil, x, y, tile.rect) then
            return tile.sideIndex
        end
    end
    return nil
end
local function describeDieSide(self, side)
    if type(side.describe) == "function" then
        return side:describe()
    end
    return side.label
end
local function drawDieInspector(self, uiState, state)
    local die = getDieFromInspector(nil, uiState, state)
    if not die then
        uiState.inspector = nil
        return
    end
    local layout = getInspectorLayout(nil, #die.sides)
    local panel = layout.panel
    local diagramRect = layout.diagramRect
    local detailsRect = layout.detailsRect
    local closeButtonRect = layout.closeButtonRect
    love.graphics.setColor(0, 0, 0, 0.64)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        love.graphics.getWidth(),
        love.graphics.getHeight()
    )
    love.graphics.setColor(0.08, 0.1, 0.13, 0.98)
    love.graphics.rectangle(
        "fill",
        panel.x,
        panel.y,
        panel.width,
        panel.height,
        8,
        8
    )
    love.graphics.setColor(0.75, 0.82, 0.91, 0.95)
    love.graphics.rectangle(
        "line",
        panel.x,
        panel.y,
        panel.width,
        panel.height,
        8,
        8
    )
    local ____opt_11 = uiState.inspector
    local ownerLabel = (____opt_11 and ____opt_11.owner) == "player" and "Ally" or "Enemy"
    love.graphics.setColor(1, 1, 1)
    love.graphics.print((ownerLabel .. " Die: ") .. die.name, panel.x + 20, panel.y + 14)
    love.graphics.setColor(0.78, 0.83, 0.9)
    love.graphics.print(
        tostring(#die.sides) .. " faces",
        panel.x + 20,
        panel.y + 40
    )
    love.graphics.setColor(0.2, 0.24, 0.31, 0.95)
    love.graphics.rectangle(
        "fill",
        closeButtonRect.x,
        closeButtonRect.y,
        closeButtonRect.width,
        closeButtonRect.height,
        5,
        5
    )
    love.graphics.setColor(0.75, 0.82, 0.91, 0.95)
    love.graphics.rectangle(
        "line",
        closeButtonRect.x,
        closeButtonRect.y,
        closeButtonRect.width,
        closeButtonRect.height,
        5,
        5
    )
    love.graphics.setColor(1, 1, 1, 0.98)
    love.graphics.printf(
        "X",
        closeButtonRect.x,
        closeButtonRect.y + 6,
        closeButtonRect.width,
        "center",
        0,
        0.88,
        0.88
    )
    love.graphics.setColor(0.14, 0.17, 0.22, 0.92)
    love.graphics.rectangle(
        "fill",
        diagramRect.x,
        diagramRect.y,
        diagramRect.width,
        diagramRect.height,
        6,
        6
    )
    love.graphics.setColor(0.62, 0.69, 0.8)
    love.graphics.rectangle(
        "line",
        diagramRect.x,
        diagramRect.y,
        diagramRect.width,
        diagramRect.height,
        6,
        6
    )
    local ____opt_13 = uiState.inspector
    local ____temp_17 = ____opt_13 and ____opt_13.hoveredSideIndex
    if ____temp_17 == nil then
        local ____opt_15 = uiState.inspector
        ____temp_17 = ____opt_15 and ____opt_15.selectedSideIndex
    end
    local activeSideIndex = ____temp_17
    for ____, tile in ipairs(layout.tiles) do
        local side = die.sides[tile.sideIndex + 1]
        local label = layout.denseMode and tostring(tile.sideIndex + 1) or side.label
        local tileLabelScale = layout.denseMode and 0.6 or 0.8
        local isActive = activeSideIndex == tile.sideIndex
        if isActive then
            love.graphics.setColor(1, 0.96, 0.82, 1)
        else
            love.graphics.setColor(0.94, 0.97, 1, 1)
        end
        love.graphics.rectangle(
            "fill",
            tile.rect.x,
            tile.rect.y,
            tile.rect.width,
            tile.rect.height,
            4,
            4
        )
        love.graphics.setColor(0.08, 0.1, 0.14, 1)
        love.graphics.rectangle(
            "line",
            tile.rect.x,
            tile.rect.y,
            tile.rect.width,
            tile.rect.height,
            4,
            4
        )
        love.graphics.setColor(0.08, 0.1, 0.14, 1)
        love.graphics.printf(
            label,
            tile.rect.x + 4,
            tile.rect.y + tile.rect.height * 0.42,
            tile.rect.width - 8,
            "center",
            0,
            tileLabelScale,
            tileLabelScale
        )
    end
    love.graphics.setColor(0.14, 0.17, 0.22, 0.9)
    love.graphics.rectangle(
        "fill",
        detailsRect.x,
        detailsRect.y,
        detailsRect.width,
        detailsRect.height,
        6,
        6
    )
    love.graphics.setColor(0.62, 0.69, 0.8)
    love.graphics.rectangle(
        "line",
        detailsRect.x,
        detailsRect.y,
        detailsRect.width,
        detailsRect.height,
        6,
        6
    )
    love.graphics.setColor(0.88, 0.93, 1)
    local detailsTextScale = 0.86
    if activeSideIndex == nil then
        love.graphics.printf(
            "Hover or click a face above to view its effect details.",
            detailsRect.x + 14,
            detailsRect.y + 24,
            detailsRect.width - 28,
            "left",
            0,
            detailsTextScale,
            detailsTextScale
        )
    else
        local activeSide = die.sides[activeSideIndex + 1]
        local detailsLine = (((("Face " .. tostring(activeSideIndex + 1)) .. ": ") .. activeSide.label) .. " - ") .. describeDieSide(nil, activeSide)
        love.graphics.printf(
            detailsLine,
            detailsRect.x + 14,
            detailsRect.y + 20,
            detailsRect.width - 28,
            "left",
            0,
            detailsTextScale,
            detailsTextScale
        )
    end
end
local function openInspectorForDie(self, uiState, die)
    if not die.combatDieId then
        return
    end
    uiState.inspector = {owner = die.owner, combatDieId = die.combatDieId, selectedSideIndex = nil, hoveredSideIndex = nil}
end
function ____exports.closeCombatInspector(self, uiState)
    uiState.inspector = nil
end
function ____exports.isCombatInspectorOpen(self, uiState)
    return uiState.inspector ~= nil
end
function ____exports.onCombatMousePressed(self, uiState, state, x, y, button)
    if button == 2 then
        local clickedDie = findInteractiveDieAt(nil, uiState, x, y)
        if clickedDie then
            openInspectorForDie(nil, uiState, clickedDie)
            return
        end
        if uiState.inspector then
            local inspectorRect = getInspectorRect(nil)
            if not isPointInsideRect(nil, x, y, inspectorRect) then
                uiState.inspector = nil
            end
        end
        return
    end
    if button ~= 1 then
        return
    end
    if uiState.inspector then
        local die = getDieFromInspector(nil, uiState, state)
        if not die then
            uiState.inspector = nil
            return
        end
        local inspectorLayout = getInspectorLayout(nil, #die.sides)
        if isPointInsideRect(nil, x, y, inspectorLayout.closeButtonRect) then
            uiState.inspector = nil
            uiState.drag = nil
            return
        end
        local selectedIndex = getInspectorSideIndexAt(
            nil,
            uiState,
            state,
            x,
            y
        )
        if selectedIndex ~= nil then
            uiState.inspector.selectedSideIndex = selectedIndex
            return
        end
        local inspectorRect = getInspectorRect(nil)
        if not isPointInsideRect(nil, x, y, inspectorRect) then
            uiState.inspector = nil
        end
        uiState.drag = nil
        return
    end
    if not ____exports.canPlayerThrow(nil, uiState, state) then
        return
    end
    for ____, die in ipairs(uiState.playerDice) do
        do
            if die.state == "arena" then
                goto __continue131
            end
            local half = die.size / 2
            local inside = x >= die.x - half and x <= die.x + half and y >= die.y - half and y <= die.y + half
            if not inside then
                goto __continue131
            end
            die.state = "dragging"
            die.x = x
            die.y = y
            uiState.drag = {
                dieId = die.id,
                startX = x,
                startY = y,
                lastX = x,
                lastY = y,
                lastDt = 1 / 60
            }
            return
        end
        ::__continue131::
    end
end
function ____exports.onCombatMouseMoved(self, uiState, state, x, y, dx, dy)
    if uiState.inspector then
        local inspectorRect = getInspectorRect(nil)
        if isPointInsideRect(nil, x, y, inspectorRect) then
            uiState.inspector.hoveredSideIndex = getInspectorSideIndexAt(
                nil,
                uiState,
                state,
                x,
                y
            )
        else
            uiState.inspector.hoveredSideIndex = nil
        end
        return
    end
    if not uiState.drag then
        return
    end
    local dragged = __TS__ArrayFind(
        uiState.playerDice,
        function(____, die)
            local ____die_id_20 = die.id
            local ____opt_18 = uiState.drag
            return ____die_id_20 == (____opt_18 and ____opt_18.dieId)
        end
    )
    if not dragged then
        return
    end
    dragged.x = x
    dragged.y = y
    uiState.drag.lastX = x
    uiState.drag.lastY = y
    uiState.drag.lastDt = math.max(
        1 / 120,
        math.min(
            1 / 15,
            math.sqrt(dx * dx + dy * dy) / 500
        )
    )
end
function ____exports.onCombatMouseReleased(self, uiState, state, x, y, button)
    if button ~= 1 or not uiState.drag then
        return
    end
    local drag = uiState.drag
    uiState.drag = nil
    local dragged = __TS__ArrayFind(
        uiState.playerDice,
        function(____, die) return die.id == drag.dieId end
    )
    if not dragged or dragged.slotIndex == nil or not dragged.combatDieId then
        return
    end
    if __TS__ArrayIncludes(uiState.rolledPlayerDieIds, dragged.combatDieId) or not ____exports.canPlayerThrow(nil, uiState, state) or not isInsideArena(nil, uiState, x, y) then
        dragged.state = "parked"
        if dragged.parkX ~= nil and dragged.parkY ~= nil then
            dragged.x = dragged.parkX
            dragged.y = dragged.parkY
        end
        return
    end
    dragged.state = "arena"
    dragged.x = x
    dragged.y = y
    local vx = (x - drag.startX) * 4.3
    local vy = (y - drag.startY) * 4.3
    dragged.vx = math.abs(vx) < 20 and 40 or vx
    dragged.vy = math.abs(vy) < 20 and -220 or vy
    dragged.spin = (dragged.vx - dragged.vy) * 0.01
    dragged.angle = 0
    if not __TS__ArrayFind(
        uiState.arenaPlayerDice,
        function(____, entry) return entry.id == dragged.id end
    ) then
        local ____uiState_arenaPlayerDice_21 = uiState.arenaPlayerDice
        ____uiState_arenaPlayerDice_21[#____uiState_arenaPlayerDice_21 + 1] = dragged
    end
    local ____uiState_rolledPlayerDieIds_22 = uiState.rolledPlayerDieIds
    ____uiState_rolledPlayerDieIds_22[#____uiState_rolledPlayerDieIds_22 + 1] = dragged.combatDieId
    if not __TS__ArrayIncludes(uiState.pendingPlayerDieIds, dragged.combatDieId) then
        local ____uiState_pendingPlayerDieIds_23 = uiState.pendingPlayerDieIds
        ____uiState_pendingPlayerDieIds_23[#____uiState_pendingPlayerDieIds_23 + 1] = dragged.combatDieId
    end
end
local function drawHpBar(self, x, y, width, height, ratio)
    love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b)
    love.graphics.rectangle(
        "line",
        x,
        y,
        width,
        height
    )
    love.graphics.setColor(GREEN.r, GREEN.g, GREEN.b)
    love.graphics.rectangle(
        "fill",
        x + 2,
        y + 2,
        math.max(0, (width - 4) * ratio),
        height - 4
    )
end
local function drawPlayerIncomingDamagePreview(self, x, y, width, height, state)
    if state.phase ~= "player-turn" or state.enemy.hp <= 0 then
        return
    end
    local incomingDamage = math.max(0, state.enemyIntent.pendingPlayerDamage - state.player.armor)
    if incomingDamage <= 0 or state.player.maxHp <= 0 then
        return
    end
    local currentHp = math.max(
        0,
        math.min(state.player.maxHp, state.player.hp)
    )
    local projectedHp = math.max(0, currentHp - incomingDamage)
    local innerWidth = width - 4
    local startX = x + 2 + innerWidth * projectedHp / state.player.maxHp
    local overlayWidth = innerWidth * (currentHp - projectedHp) / state.player.maxHp
    if overlayWidth > 0 then
        love.graphics.setColor(0, 0, 0, 0.45)
        love.graphics.rectangle(
            "fill",
            startX,
            y + 2,
            overlayWidth,
            height - 4
        )
        love.graphics.setColor(0, 0, 0, 0.7)
        love.graphics.rectangle(
            "fill",
            startX,
            y + 2,
            2,
            height - 4
        )
    end
end
local function drawDie(self, die)
    local half = die.size / 2
    local textScale = 0.56
    local font = love.graphics.getFont()
    local text = die.label
    local textX = -half + 4
    local textY = -6
    if font then
        local maxWidth = die.size - 8
        while #text > 0 and font:getWidth(text) * textScale > maxWidth do
            text = __TS__StringSlice(
                text,
                0,
                math.max(1, #text - 1)
            )
        end
        if text ~= die.label and #text > 1 then
            text = __TS__StringSlice(
                text,
                0,
                math.max(1, #text - 1)
            ) .. "…"
        end
        local textWidth = font:getWidth(text) * textScale
        textX = -textWidth / 2
        textY = -font:getHeight() * textScale * 0.5
    end
    love.graphics.push()
    love.graphics.translate(die.x, die.y)
    love.graphics.rotate(die.angle)
    love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b)
    love.graphics.rectangle(
        "fill",
        -half,
        -half,
        die.size,
        die.size
    )
    love.graphics.setColor(BLACK.r, BLACK.g, BLACK.b)
    love.graphics.rectangle(
        "line",
        -half,
        -half,
        die.size,
        die.size
    )
    if die.flashTimer ~= nil and die.flashTimer > 0 then
        local flashRatio = die.flashTimer / RESOLVE_FLASH_DURATION
        local pad = 2 + (1 - flashRatio) * 4
        love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b, 0.25 + flashRatio * 0.55)
        love.graphics.rectangle(
            "line",
            -half - pad,
            -half - pad,
            die.size + pad * 2,
            die.size + pad * 2
        )
    end
    love.graphics.print(
        text,
        textX,
        textY,
        0,
        textScale,
        textScale
    )
    love.graphics.pop()
end
function ____exports.drawCombatUi(self, uiState, state)
    local layout = uiState.layout
    local playerHpRatio = state.player.maxHp <= 0 and 0 or state.player.hp / state.player.maxHp
    local enemyHpRatio = state.enemy.maxHp <= 0 and 0 or state.enemy.hp / state.enemy.maxHp
    love.graphics.setColor(BACKGROUND.r, BACKGROUND.g, BACKGROUND.b)
    love.graphics.rectangle(
        "fill",
        0,
        0,
        love.graphics.getWidth(),
        love.graphics.getHeight()
    )
    love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b)
    love.graphics.print(state.player.name, layout.playerNameX, layout.playerNameY)
    drawHpBar(
        nil,
        layout.playerNameX,
        layout.playerNameY + 26,
        layout.hpBarWidth,
        layout.hpBarHeight,
        playerHpRatio
    )
    drawPlayerIncomingDamagePreview(
        nil,
        layout.playerNameX,
        layout.playerNameY + 26,
        layout.hpBarWidth,
        layout.hpBarHeight,
        state
    )
    love.graphics.print(state.enemy.name, layout.enemyNameX, layout.enemyNameY)
    drawHpBar(
        nil,
        layout.enemyNameX,
        layout.enemyNameY + 26,
        layout.hpBarWidth,
        layout.hpBarHeight,
        enemyHpRatio
    )
    love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b)
    love.graphics.rectangle(
        "line",
        layout.arenaX,
        layout.arenaY,
        layout.arenaWidth,
        layout.arenaHeight
    )
    love.graphics.rectangle(
        "line",
        layout.poolX,
        layout.poolY,
        layout.poolWidth,
        layout.poolHeight
    )
    love.graphics.print("Dice Pool", layout.poolX + layout.poolWidth * 0.5 - 40, layout.poolY - 34)
    for ____, die in ipairs(uiState.enemyArenaDice) do
        drawDie(nil, die)
    end
    for ____, die in ipairs(uiState.enemyParkedDice) do
        drawDie(nil, die)
    end
    for ____, die in ipairs(uiState.arenaPlayerDice) do
        if die.state == "arena" then
            drawDie(nil, die)
        end
    end
    for ____, die in ipairs(uiState.playerDice) do
        if die.state == "parked" or die.state == "dragging" then
            drawDie(nil, die)
        end
    end
    love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b)
    love.graphics.print(
        "Round " .. tostring(state.round),
        layout.arenaX + 12,
        layout.arenaY + 10
    )
    love.graphics.print("Combat: " .. state.phase, layout.arenaX + 12, layout.arenaY + 34)
    if state.phase == "resolved" then
        love.graphics.print("Press Space to continue", layout.poolX + layout.poolWidth - 240, layout.poolY + 14)
    elseif uiState.pendingRound ~= nil then
        love.graphics.print("Gathering dice for next round... (Space to skip)", layout.poolX + layout.poolWidth - 360, layout.poolY + 14)
    elseif ____exports.canPlayerThrow(nil, uiState, state) then
        love.graphics.print("Right-click die to inspect, left-drag into arena to throw", layout.poolX + layout.poolWidth - 420, layout.poolY + 14)
    else
        love.graphics.print("Right-click any die to inspect. Enemy dice resolving... (Space to skip)", layout.poolX + layout.poolWidth - 468, layout.poolY + 14)
    end
    if uiState.inspector then
        drawDieInspector(nil, uiState, state)
    end
end
return ____exports
