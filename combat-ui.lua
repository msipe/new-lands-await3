local ____lualib = require("lualib_bundle")
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__SparseArrayNew = ____lualib.__TS__SparseArrayNew
local __TS__SparseArrayPush = ____lualib.__TS__SparseArrayPush
local __TS__SparseArraySpread = ____lualib.__TS__SparseArraySpread
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__ArrayIncludes = ____lualib.__TS__ArrayIncludes
local __TS__ArrayPushArray = ____lualib.__TS__ArrayPushArray
local __TS__MathSign = ____lualib.__TS__MathSign
local __TS__StringSlice = ____lualib.__TS__StringSlice
local __TS__ArraySlice = ____lualib.__TS__ArraySlice
local ____exports = {}
local isDieSettled, getDieFromInspector
function isDieSettled(self, die)
    local speed = math.sqrt(die.vx * die.vx + die.vy * die.vy)
    return speed <= 60 and math.abs(die.spin) <= 1.3
end
function getDieFromInspector(self, uiState, state)
    if not uiState.inspector then
        return nil
    end
    local dice = uiState.inspector.owner == "player" and state.player.dice or state.enemy.dice
    return __TS__ArrayFind(
        dice,
        function(____, die)
            local ____die_id_17 = die.id
            local ____opt_15 = uiState.inspector
            return ____die_id_17 == (____opt_15 and ____opt_15.combatDieId)
        end
    )
end
local BACKGROUND = {r = 0.16, g = 0.16, b = 0.16}
local WHITE = {r = 1, g = 1, b = 1}
local GREEN = {r = 0.2, g = 0.72, b = 0.33}
local BLACK = {r = 0, g = 0, b = 0}
local RESOLVE_FLASH_DURATION = 0.26
local POPUP_DURATION = 0.9
local FACE_ROLL_MIN_INTERVAL = 0.04
local FACE_ROLL_MAX_INTERVAL = 0.24
local FACE_ROLL_MOTION_REFERENCE = 520
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
        arenaLogWidth = 210,
        arenaGapToLog = 10,
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
local function getEnemyRolledSideLabel(self, state, dieId)
    local side = state.enemyIntent.sideByDieId[dieId]
    return side ~= nil and side.label or "?"
end
local function spawnEnemyThrowDice(self, uiState, state)
    uiState.enemyArenaDice = {}
    uiState.enemyParkedDice = {}
    uiState.enemyPendingDice = {}
    local dieIds = #state.pendingEnemyDieIds > 0 and ({unpack(state.pendingEnemyDieIds)}) or (#state.enemyIntent.dieOrder > 0 and ({unpack(state.enemyIntent.dieOrder)}) or __TS__ArrayMap(
        state.enemy.dice,
        function(____, die) return die.id end
    ))
    local laneWidth = uiState.layout.hpBarWidth
    local minGap = 4
    local maxPreviewSize = 46
    local availablePerDie = #dieIds > 0 and (laneWidth - minGap * (#dieIds - 1)) / #dieIds or maxPreviewSize
    local parkedSize = math.max(
        18,
        math.min(maxPreviewSize, availablePerDie)
    )
    local totalWidth = parkedSize * #dieIds + minGap * math.max(0, #dieIds - 1)
    local parkStartX = uiState.layout.enemyNameX + (laneWidth - totalWidth) * 0.5 + parkedSize * 0.5
    local parkY = uiState.layout.enemyNameY + 26 + uiState.layout.hpBarHeight + 24
    do
        local index = 0
        while index < #dieIds do
            local dieId = dieIds[index + 1]
            local spawnX = uiState.layout.arenaX + uiState.layout.arenaWidth * 0.5 + (math.random() - 0.5) * (uiState.layout.arenaWidth * 0.3)
            local spawnY = uiState.layout.arenaY + 30 + math.random() * 18
            local ____uiState_enemyPendingDice_0 = uiState.enemyPendingDice
            ____uiState_enemyPendingDice_0[#____uiState_enemyPendingDice_0 + 1] = {
                id = (("enemy-preview-" .. tostring(state.round)) .. "-") .. dieId,
                owner = "enemy",
                combatDieId = dieId,
                label = getEnemyRolledSideLabel(nil, state, dieId),
                rollingLabel = nil,
                rollingFaceTimer = 0,
                faceLocked = false,
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
                rollingLabel = nil,
                rollingFaceTimer = 0,
                faceLocked = false,
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
    local playableRight = l.arenaX + l.arenaWidth - l.arenaLogWidth - l.arenaGapToLog
    return x >= l.arenaX and x <= playableRight and y >= l.arenaY and y <= l.arenaY + l.arenaHeight
end
local function applyWallBounce(self, layout, die)
    local collisionHalfExtent = die.size / 2 * 1.4142135623730951
    local playableRight = layout.arenaX + layout.arenaWidth - layout.arenaLogWidth - layout.arenaGapToLog
    local minX = layout.arenaX + collisionHalfExtent
    local maxX = playableRight - collisionHalfExtent
    local minY = layout.arenaY + collisionHalfExtent
    local maxY = layout.arenaY + layout.arenaHeight - collisionHalfExtent
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
        local speed = math.sqrt(die.vx * die.vx + die.vy * die.vy)
        local speedRatio = math.max(
            0,
            math.min(1, speed / 460)
        )
        local frameLinearDamping = 0.962 + speedRatio * 0.034
        local frameSpinDamping = 0.9 + speedRatio * 0.095
        local linearDamping = frameLinearDamping ^ (dt * 60)
        local spinDamping = frameSpinDamping ^ (dt * 60)
        die.vx = die.vx * linearDamping
        die.vy = die.vy * linearDamping
        die.spin = die.spin * spinDamping
        if speed < 70 then
            local lowSpeedDamping = 0.86 ^ (dt * 60)
            die.vx = die.vx * lowSpeedDamping
            die.vy = die.vy * lowSpeedDamping
            die.spin = die.spin * 0.78 ^ (dt * 60)
        end
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
local function getDieSideLabels(self, state, die)
    if not die.combatDieId then
        return {}
    end
    local ownerDice = die.owner == "player" and state.player.dice or state.enemy.dice
    local match = __TS__ArrayFind(
        ownerDice,
        function(____, entry) return entry.id == die.combatDieId end
    )
    if not match then
        return {}
    end
    return __TS__ArrayMap(
        match.sides,
        function(____, side) return side.label end
    )
end
local function lockVisualDieFace(self, die)
    die.faceLocked = true
    die.rollingLabel = nil
    die.rollingFaceTimer = 0
end
local function updateRollingFaceLabels(self, uiState, state, dt)
    local ____array_2 = __TS__SparseArrayNew(unpack(uiState.enemyArenaDice))
    __TS__SparseArrayPush(
        ____array_2,
        unpack(uiState.arenaPlayerDice)
    )
    local activeDice = {__TS__SparseArraySpread(____array_2)}
    for ____, die in ipairs(activeDice) do
        do
            if die.faceLocked or die.state ~= "arena" or isDieSettled(nil, die) then
                die.rollingLabel = nil
                die.rollingFaceTimer = 0
                goto __continue37
            end
            local labels = getDieSideLabels(nil, state, die)
            if #labels == 0 then
                goto __continue37
            end
            local speed = math.sqrt(die.vx * die.vx + die.vy * die.vy)
            local motion = speed + math.abs(die.spin) * 45
            local normalizedMotion = math.max(
                0,
                math.min(1, motion / FACE_ROLL_MOTION_REFERENCE)
            )
            local interval = FACE_ROLL_MAX_INTERVAL - (FACE_ROLL_MAX_INTERVAL - FACE_ROLL_MIN_INTERVAL) * normalizedMotion
            die.rollingFaceTimer = (die.rollingFaceTimer or 0) - dt
            if die.rollingLabel ~= nil and die.rollingFaceTimer > 0 then
                goto __continue37
            end
            local randomIndex = math.floor(math.random() * #labels)
            local nextLabel = labels[randomIndex + 1]
            if #labels > 1 and nextLabel == die.rollingLabel then
                nextLabel = labels[(randomIndex + 1) % #labels + 1]
            end
            die.rollingLabel = nextLabel
            die.rollingFaceTimer = interval
        end
        ::__continue37::
    end
end
local function updateDieFlashes(self, uiState, dt)
    local ____array_3 = __TS__SparseArrayNew(unpack(uiState.playerDice))
    __TS__SparseArrayPush(
        ____array_3,
        unpack(uiState.enemyArenaDice)
    )
    __TS__SparseArrayPush(
        ____array_3,
        unpack(uiState.enemyPendingDice)
    )
    __TS__SparseArrayPush(
        ____array_3,
        unpack(uiState.enemyParkedDice)
    )
    local allDice = {__TS__SparseArraySpread(____array_3)}
    for ____, die in ipairs(allDice) do
        do
            if die.flashTimer == nil or die.flashTimer <= 0 then
                goto __continue44
            end
            die.flashTimer = math.max(0, die.flashTimer - dt)
        end
        ::__continue44::
    end
end
local function updateFloatingPopups(self, uiState, dt)
    local next = {}
    for ____, popup in ipairs(uiState.floatingPopups) do
        do
            local remaining = popup.timer - dt
            if remaining <= 0 then
                goto __continue48
            end
            next[#next + 1] = __TS__ObjectAssign({}, popup, {timer = remaining, y = popup.y - 24 * dt})
        end
        ::__continue48::
    end
    uiState.floatingPopups = next
end
local function queueSettledEnemyDieId(self, uiState, dieId)
    if __TS__ArrayIncludes(uiState.settledEnemyDieIds, dieId) then
        return
    end
    local ____uiState_settledEnemyDieIds_4 = uiState.settledEnemyDieIds
    ____uiState_settledEnemyDieIds_4[#____uiState_settledEnemyDieIds_4 + 1] = dieId
end
local function settleEnemyArenaDice(self, uiState)
    for ____, die in ipairs(uiState.enemyArenaDice) do
        do
            if not isDieSettled(nil, die) then
                goto __continue54
            end
            die.state = "arena"
            die.vx = 0
            die.vy = 0
            die.spin = 0
            die.angle = 0
            if not die.faceLocked then
                die.flashTimer = RESOLVE_FLASH_DURATION
            end
            lockVisualDieFace(nil, die)
            if die.combatDieId then
                queueSettledEnemyDieId(nil, uiState, die.combatDieId)
            end
        end
        ::__continue54::
    end
end
local function parkEnemyDice(self, uiState)
    for ____, die in ipairs(uiState.enemyArenaDice) do
        do
            if die.parkX == nil or die.parkY == nil then
                goto __continue60
            end
            die.state = "parked"
            die.vx = 0
            die.vy = 0
            die.spin = 0
            die.angle = 0
            die.size = die.parkSize or die.size
            die.x = die.parkX
            die.y = die.parkY
            die.flashTimer = RESOLVE_FLASH_DURATION
            lockVisualDieFace(nil, die)
            local ____uiState_enemyParkedDice_5 = uiState.enemyParkedDice
            ____uiState_enemyParkedDice_5[#____uiState_enemyParkedDice_5 + 1] = die
            if die.combatDieId then
                queueSettledEnemyDieId(nil, uiState, die.combatDieId)
            end
        end
        ::__continue60::
    end
    for ____, die in ipairs(uiState.enemyPendingDice) do
        do
            if die.parkX == nil or die.parkY == nil then
                goto __continue64
            end
            die.state = "parked"
            die.vx = 0
            die.vy = 0
            die.spin = 0
            die.angle = 0
            die.size = die.parkSize or die.size
            die.x = die.parkX
            die.y = die.parkY
            die.flashTimer = RESOLVE_FLASH_DURATION
            lockVisualDieFace(nil, die)
            local ____uiState_enemyParkedDice_6 = uiState.enemyParkedDice
            ____uiState_enemyParkedDice_6[#____uiState_enemyParkedDice_6 + 1] = die
            if die.combatDieId then
                queueSettledEnemyDieId(nil, uiState, die.combatDieId)
            end
        end
        ::__continue64::
    end
    uiState.enemyArenaDice = {}
    uiState.enemyPendingDice = {}
end
local function parkPlayerArenaDice(self, uiState)
    for ____, die in ipairs(uiState.arenaPlayerDice) do
        die.state = "parked"
        die.vx = 0
        die.vy = 0
        die.spin = 0
        die.angle = 0
        die.rollingLabel = nil
        die.rollingFaceTimer = 0
        die.faceLocked = false
        if die.parkX ~= nil and die.parkY ~= nil then
            die.x = die.parkX
            die.y = die.parkY
        end
    end
    uiState.arenaPlayerDice = {}
    uiState.pendingPlayerDieIds = {}
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
        settledEnemyDieIds = {},
        floatingPopups = {},
        inspector = nil
    }
    ensurePlayerDice(nil, uiState, state)
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
    uiState.settledEnemyDieIds = {}
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
        local ____opt_7 = __TS__ArrayFind(
            state.player.dice,
            function(____, entry) return entry.id == die.combatDieId end
        )
        die.label = ____opt_7 and ____opt_7.name or die.label
        die.rollingLabel = nil
        die.rollingFaceTimer = 0
        die.faceLocked = false
    end
    ensurePlayerDice(nil, uiState, state)
    uiState.enemyArenaDice = {}
    uiState.enemyPendingDice = {}
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
local function enqueueSettledPlayerDice(self, uiState)
    local remaining = {}
    for ____, dieId in ipairs(uiState.pendingPlayerDieIds) do
        do
            local visualDie = __TS__ArrayFind(
                uiState.arenaPlayerDice,
                function(____, entry) return entry.combatDieId == dieId end
            )
            if not visualDie then
                goto __continue84
            end
            if not isDieSettled(nil, visualDie) then
                remaining[#remaining + 1] = dieId
                goto __continue84
            end
            visualDie.vx = 0
            visualDie.vy = 0
            visualDie.spin = 0
            visualDie.flashTimer = RESOLVE_FLASH_DURATION
            if not __TS__ArrayIncludes(uiState.settledPlayerDieIds, dieId) then
                local ____uiState_settledPlayerDieIds_9 = uiState.settledPlayerDieIds
                ____uiState_settledPlayerDieIds_9[#____uiState_settledPlayerDieIds_9 + 1] = dieId
            end
        end
        ::__continue84::
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
            local ____uiState_settledPlayerDieIds_10 = uiState.settledPlayerDieIds
            ____uiState_settledPlayerDieIds_10[#____uiState_settledPlayerDieIds_10 + 1] = dieId
        end
    end
    uiState.pendingPlayerDieIds = {}
end
local function updateEnemyPresentation(self, uiState, state, dt)
    if state.phase ~= "enemy-turn" then
        return
    end
    if #uiState.arenaPlayerDice > 0 then
        parkPlayerArenaDice(nil, uiState)
    end
    if uiState.enemyThrowResolvedForRound ~= state.round and #uiState.enemyPendingDice == 0 and #uiState.enemyArenaDice == 0 then
        if #uiState.enemyParkedDice > 0 then
            uiState.enemyParkedDice = {}
        end
        spawnEnemyThrowDice(nil, uiState, state)
    end
    if uiState.enemyThrowResolvedForRound == state.round then
        return
    end
    uiState.enemySpawnTimer = uiState.enemySpawnTimer + dt
    if #uiState.enemyArenaDice == 0 and #uiState.enemyPendingDice > 0 then
        local immediate = table.remove(uiState.enemyPendingDice, 1)
        if immediate then
            local ____uiState_enemyArenaDice_11 = uiState.enemyArenaDice
            ____uiState_enemyArenaDice_11[#____uiState_enemyArenaDice_11 + 1] = immediate
        end
    end
    while #uiState.enemyPendingDice > 0 and uiState.enemySpawnTimer >= uiState.enemySpawnInterval do
        uiState.enemySpawnTimer = uiState.enemySpawnTimer - uiState.enemySpawnInterval
        local next = table.remove(uiState.enemyPendingDice, 1)
        if next then
            local ____uiState_enemyArenaDice_12 = uiState.enemyArenaDice
            ____uiState_enemyArenaDice_12[#____uiState_enemyArenaDice_12 + 1] = next
        end
    end
    settleEnemyArenaDice(nil, uiState)
    if #uiState.enemyPendingDice == 0 and areDiceSettled(nil, uiState.enemyArenaDice) then
        parkEnemyDice(nil, uiState)
        uiState.enemyThrowResolvedForRound = state.round
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
    if state.phase ~= "enemy-turn" then
        return
    end
    if #uiState.enemyPendingDice == 0 and #uiState.enemyArenaDice == 0 then
        if #uiState.enemyParkedDice > 0 then
            uiState.enemyParkedDice = {}
        end
        spawnEnemyThrowDice(nil, uiState, state)
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
    updateRollingFaceLabels(nil, uiState, state, dt)
    updateDieFlashes(nil, uiState, dt)
    updateFloatingPopups(nil, uiState, dt)
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
function ____exports.drainSettledEnemyDieIds(self, uiState)
    if #uiState.settledEnemyDieIds == 0 then
        return {}
    end
    local settled = {unpack(uiState.settledEnemyDieIds)}
    uiState.settledEnemyDieIds = {}
    return settled
end
local function findVisualDieByCombatId(self, uiState, dieId)
    local ____array_13 = __TS__SparseArrayNew(unpack(uiState.playerDice))
    __TS__SparseArrayPush(
        ____array_13,
        unpack(uiState.arenaPlayerDice)
    )
    __TS__SparseArrayPush(
        ____array_13,
        unpack(uiState.enemyArenaDice)
    )
    __TS__SparseArrayPush(
        ____array_13,
        unpack(uiState.enemyParkedDice)
    )
    __TS__SparseArrayPush(
        ____array_13,
        unpack(uiState.enemyPendingDice)
    )
    return __TS__ArrayFind(
        {__TS__SparseArraySpread(____array_13)},
        function(____, die) return die.combatDieId == dieId end
    )
end
function ____exports.enqueueCombatResolutionPopups(self, uiState, popups)
    for ____, popup in ipairs(popups) do
        do
            local die = findVisualDieByCombatId(nil, uiState, popup.dieId)
            if not die then
                goto __continue125
            end
            die.flashTimer = RESOLVE_FLASH_DURATION
            if popup.sideLabel ~= nil then
                die.label = popup.sideLabel
            end
            lockVisualDieFace(nil, die)
            local ____uiState_floatingPopups_14 = uiState.floatingPopups
            ____uiState_floatingPopups_14[#____uiState_floatingPopups_14 + 1] = {
                x = die.x,
                y = die.y - die.size * 0.72,
                text = popup.text,
                source = popup.source,
                timer = POPUP_DURATION
            }
        end
        ::__continue125::
    end
end
function ____exports.canPlayerThrow(self, uiState, state)
    return state.phase == "player-turn" and uiState.pendingRound == nil
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
    local ____opt_18 = uiState.inspector
    local ownerLabel = (____opt_18 and ____opt_18.owner) == "player" and "Ally" or "Enemy"
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
    local ____opt_20 = uiState.inspector
    local ____temp_24 = ____opt_20 and ____opt_20.hoveredSideIndex
    if ____temp_24 == nil then
        local ____opt_22 = uiState.inspector
        ____temp_24 = ____opt_22 and ____opt_22.selectedSideIndex
    end
    local activeSideIndex = ____temp_24
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
    for ____, die in ipairs(uiState.playerDice) do
        do
            if die.state == "arena" then
                goto __continue175
            end
            local half = die.size / 2
            local inside = x >= die.x - half and x <= die.x + half and y >= die.y - half and y <= die.y + half
            if not inside then
                goto __continue175
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
                lastDt = 1 / 60,
                skipOnRelease = not ____exports.canPlayerThrow(nil, uiState, state)
            }
            return
        end
        ::__continue175::
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
            local ____die_id_27 = die.id
            local ____opt_25 = uiState.drag
            return ____die_id_27 == (____opt_25 and ____opt_25.dieId)
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
    if drag.skipOnRelease then
        dragged.state = "parked"
        if dragged.parkX ~= nil and dragged.parkY ~= nil then
            dragged.x = dragged.parkX
            dragged.y = dragged.parkY
        end
        if isInsideArena(nil, uiState, x, y) then
            ____exports.fastForwardCombatUi(nil, uiState, state)
        end
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
    local dragDx = x - drag.startX
    local dragDy = y - drag.startY
    local dragDistance = math.sqrt(dragDx * dragDx + dragDy * dragDy)
    local baseScale = 3.6
    local minHorizontal = 26 + math.min(42, dragDistance * 0.18)
    local minVerticalLift = 90 + math.min(120, dragDistance * 0.42)
    local launchVx = dragDx * baseScale
    local launchVy = dragDy * baseScale
    if math.abs(launchVx) < minHorizontal then
        local horizontalDirection = dragDx == 0 and (math.random() < 0.5 and -1 or 1) or __TS__MathSign(dragDx)
        launchVx = horizontalDirection * minHorizontal
    end
    if launchVy > -minVerticalLift then
        launchVy = -minVerticalLift
    end
    dragged.vx = launchVx
    dragged.vy = launchVy
    dragged.spin = (dragged.vx - dragged.vy) * 0.01
    dragged.angle = 0
    if not __TS__ArrayFind(
        uiState.arenaPlayerDice,
        function(____, entry) return entry.id == dragged.id end
    ) then
        local ____uiState_arenaPlayerDice_28 = uiState.arenaPlayerDice
        ____uiState_arenaPlayerDice_28[#____uiState_arenaPlayerDice_28 + 1] = dragged
    end
    local ____uiState_rolledPlayerDieIds_29 = uiState.rolledPlayerDieIds
    ____uiState_rolledPlayerDieIds_29[#____uiState_rolledPlayerDieIds_29 + 1] = dragged.combatDieId
    if not __TS__ArrayIncludes(uiState.pendingPlayerDieIds, dragged.combatDieId) then
        local ____uiState_pendingPlayerDieIds_30 = uiState.pendingPlayerDieIds
        ____uiState_pendingPlayerDieIds_30[#____uiState_pendingPlayerDieIds_30 + 1] = dragged.combatDieId
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
    local text = die.rollingLabel or die.label
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
local function drawCombatLogPanel(self, uiState, state)
    local layout = uiState.layout
    local panelX = layout.arenaX + layout.arenaWidth - layout.arenaLogWidth
    local panelY = layout.arenaY
    local panelWidth = layout.arenaLogWidth
    local panelHeight = layout.arenaHeight
    love.graphics.setColor(0.13, 0.14, 0.16, 0.94)
    love.graphics.rectangle(
        "fill",
        panelX,
        panelY,
        panelWidth,
        panelHeight
    )
    love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b, 0.7)
    love.graphics.rectangle(
        "line",
        panelX,
        panelY,
        panelWidth,
        panelHeight
    )
    love.graphics.setColor(0.84, 0.89, 0.96, 0.98)
    love.graphics.printf(
        "Combat Log",
        panelX + 10,
        panelY + 12,
        panelWidth - 20,
        "left",
        0,
        0.86,
        0.86
    )
    local recent = __TS__ArraySlice(
        state.combatLog,
        math.max(0, #state.combatLog - 9)
    )
    local lineY = panelY + 38
    do
        local index = 0
        while index < #recent do
            love.graphics.setColor(0.9, 0.93, 0.98, 0.94)
            love.graphics.printf(
                recent[index + 1],
                panelX + 10,
                lineY,
                panelWidth - 16,
                "left",
                0,
                0.62,
                0.62
            )
            lineY = lineY + 20
            index = index + 1
        end
    end
end
local function drawFloatingResolutionPopups(self, uiState)
    for ____, popup in ipairs(uiState.floatingPopups) do
        local alpha = math.max(
            0,
            math.min(1, popup.timer / POPUP_DURATION)
        )
        if popup.source == "player" then
            love.graphics.setColor(0.72, 0.96, 0.78, alpha)
        else
            love.graphics.setColor(0.96, 0.84, 0.72, alpha)
        end
        love.graphics.printf(
            popup.text,
            popup.x - 70,
            popup.y,
            140,
            "center",
            0,
            0.72,
            0.72
        )
    end
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
    drawCombatLogPanel(nil, uiState, state)
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
    drawFloatingResolutionPopups(nil, uiState)
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
