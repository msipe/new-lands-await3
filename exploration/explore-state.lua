local ____lualib = require("lualib_bundle")
local __TS__StringCharCodeAt = ____lualib.__TS__StringCharCodeAt
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local ____exports = {}
local ____tile_2Dfactory = require("exploration.tile-factory")
local createDefaultTileFactoryConfig = ____tile_2Dfactory.createDefaultTileFactoryConfig
local createTileFromFactory = ____tile_2Dfactory.createTileFromFactory
local function hashString(self, input)
    local hash = 2166136261
    do
        local i = 0
        while i < #input do
            hash = bit.bxor(
                hash,
                __TS__StringCharCodeAt(input, i)
            )
            hash = hash * 16777619
            i = i + 1
        end
    end
    return bit.rshift(hash, 0)
end
function ____exports.toCoordKey(self, coord)
    return (tostring(coord.q) .. ",") .. tostring(coord.r)
end
function ____exports.getHexDistance(self, a, b)
    local dq = a.q - b.q
    local dr = a.r - b.r
    local ds = -a.q - a.r - (-b.q - b.r)
    return math.max(
        math.abs(dq),
        math.abs(dr),
        math.abs(ds)
    )
end
function ____exports.isNeighbor(self, a, b)
    return ____exports.getHexDistance(nil, a, b) == 1
end
function ____exports.getNeighborCoords(self, coord)
    return {
        {q = coord.q + 1, r = coord.r},
        {q = coord.q + 1, r = coord.r - 1},
        {q = coord.q, r = coord.r - 1},
        {q = coord.q - 1, r = coord.r},
        {q = coord.q - 1, r = coord.r + 1},
        {q = coord.q, r = coord.r + 1}
    }
end
local function hashToUnitInterval(self, q, r, radius, seedHash)
    local raw = math.sin(q * 12.9898 + r * 78.233 + radius * 31.4159 + seedHash * 0.0001) * 43758.5453
    return raw - math.floor(raw)
end
local function buildTileFactoryConfig(self, options)
    local defaults = createDefaultTileFactoryConfig(nil)
    local partial = options and options.tileFactoryConfig
    return {templatesByZone = partial and partial.templatesByZone or defaults.templatesByZone, chooseZone = partial and partial.chooseZone or defaults.chooseZone, buildLocations = partial and partial.buildLocations or defaults.buildLocations, customizeTile = partial and partial.customizeTile}
end
local function applyTileOverrides(self, tile, tileOverridesByKey, tileCustomizer)
    local withOverrides = tileOverridesByKey and tileOverridesByKey[tile.key] and __TS__ObjectAssign({}, tile, tileOverridesByKey[tile.key]) or tile
    if not tileCustomizer then
        return withOverrides
    end
    return tileCustomizer(nil, withOverrides)
end
function ____exports.createExploreState(self, input)
    local options = type(input) == "number" and ({radius = input}) or (input or ({}))
    local radius = options.radius or 3
    local seedHash = hashString(nil, options.seed or "run-default")
    local tiles = {}
    local tileByKey = {}
    local tileFactory = buildTileFactoryConfig(nil, options)
    do
        local q = -radius
        while q <= radius do
            local rMin = math.max(-radius, -q - radius)
            local rMax = math.min(radius, -q + radius)
            do
                local r = rMin
                while r <= rMax do
                    local distance = ____exports.getHexDistance(nil, {q = 0, r = 0}, {q = q, r = r})
                    local roll = hashToUnitInterval(
                        nil,
                        q,
                        r,
                        radius,
                        seedHash
                    )
                    local key = (tostring(q) .. ",") .. tostring(r)
                    local tile = createTileFromFactory(nil, tileFactory, {
                        coord = {q = q, r = r},
                        key = key,
                        radius = radius,
                        distanceFromCenter = distance,
                        roll = roll
                    })
                    tile = applyTileOverrides(nil, tile, options.tileOverridesByKey, options.tileCustomizer)
                    tiles[#tiles + 1] = tile
                    tileByKey[tile.key] = tile
                    r = r + 1
                end
            end
            q = q + 1
        end
    end
    local startTile = tileByKey["0,0"]
    if startTile ~= nil then
        startTile.status = "active"
    end
    return {
        radius = radius,
        tiles = tiles,
        tileByKey = tileByKey,
        playerCoord = {q = 0, r = 0},
        notice = "Click a neighboring hex to travel. Then choose Combat or Encounter."
    }
end
function ____exports.getCurrentTile(self, state)
    return state.tileByKey[____exports.toCoordKey(nil, state.playerCoord)]
end
function ____exports.tryTravelToCoord(self, state, target)
    local currentTile = state.tileByKey[____exports.toCoordKey(nil, state.playerCoord)]
    local targetTile = state.tileByKey[____exports.toCoordKey(nil, target)]
    if not targetTile then
        state.notice = "That tile is outside the known map."
        return false
    end
    if not ____exports.isNeighbor(nil, state.playerCoord, target) then
        state.notice = "You can only move to neighboring tiles."
        return false
    end
    if currentTile ~= nil then
        currentTile.status = "visited"
    end
    state.playerCoord = {q = target.q, r = target.r}
    targetTile.status = "active"
    state.notice = ("Traveled to " .. targetTile.name) .. ". Choose your next action."
    return true
end
return ____exports
