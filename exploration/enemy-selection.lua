local ____lualib = require("lualib_bundle")
local __TS__StringCharCodeAt = ____lualib.__TS__StringCharCodeAt
local ____exports = {}
local function hashToUnitInterval(self, input)
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
    return bit.rshift(hash, 0) / 4294967296
end
function ____exports.pickEnemyIdForTile(self, tile, runSeed)
    if not tile or #tile.enemyPool == 0 then
        return nil
    end
    local totalWeight = 0
    for ____, entry in ipairs(tile.enemyPool) do
        totalWeight = totalWeight + math.max(0, entry.weight)
    end
    if totalWeight <= 0 then
        return tile.enemyPool[1].enemyId
    end
    local roll = hashToUnitInterval(nil, ((((runSeed .. ":") .. tile.key) .. ":") .. tile.zone) .. ":enemy-pool") * totalWeight
    local cursor = 0
    for ____, entry in ipairs(tile.enemyPool) do
        local weight = math.max(0, entry.weight)
        cursor = cursor + weight
        if roll <= cursor then
            return entry.enemyId
        end
    end
    return tile.enemyPool[#tile.enemyPool].enemyId
end
return ____exports
