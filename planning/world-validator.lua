local ____lualib = require("lualib_bundle")
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayFlatMap = ____lualib.__TS__ArrayFlatMap
local ____exports = {}
local function countZones(self, state)
    local counts = {
        forest = 0,
        mountain = 0,
        farmland = 0,
        town = 0,
        ocean = 0
    }
    for ____, tile in ipairs(state.tiles) do
        local ____counts_0, ____tile_zone_1 = counts, tile.zone
        ____counts_0[____tile_zone_1] = ____counts_0[____tile_zone_1] + 1
    end
    return counts
end
function ____exports.validateWorldAgainstSpec(self, state, spec)
    local zoneCounts = countZones(nil, state)
    local issues = {}
    if zoneCounts.town > spec.maxTownTiles then
        issues[#issues + 1] = {
            requirementId = "max-town-tiles",
            message = (("Town tiles expected <= " .. tostring(spec.maxTownTiles)) .. ", got ") .. tostring(zoneCounts.town)
        }
    end
    for ____, zoneRequirement in ipairs(spec.requiredZones) do
        local currentCount = zoneCounts[zoneRequirement.zone]
        if currentCount < zoneRequirement.minCount then
            issues[#issues + 1] = {
                requirementId = table.concat(zoneRequirement.sourceRequirementIds, ","),
                message = (((("Zone " .. zoneRequirement.zone) .. " expected >= ") .. tostring(zoneRequirement.minCount)) .. ", got ") .. tostring(currentCount)
            }
        end
    end
    for ____, specialRequirement in ipairs(spec.requiredSpecialTiles) do
        local matchingTiles = __TS__ArrayFilter(
            state.tiles,
            function(____, tile) return tile.metadata.specialTileId == specialRequirement.id end
        )
        if #matchingTiles < specialRequirement.minCount then
            issues[#issues + 1] = {
                requirementId = specialRequirement.id,
                message = (((("Special tile " .. specialRequirement.id) .. " expected >= ") .. tostring(specialRequirement.minCount)) .. ", got ") .. tostring(#matchingTiles)
            }
        end
    end
    for ____, npcRequirement in ipairs(spec.requiredNpcs) do
        local placements = __TS__ArrayFlatMap(
            state.tiles,
            function(____, tile) return __TS__ArrayFlatMap(
                tile.locations,
                function(____, location) return __TS__ArrayFilter(
                    location.characters,
                    function(____, character) return character.npcId == npcRequirement.npcId end
                ) end
            ) end
        )
        if #placements < npcRequirement.minCount then
            issues[#issues + 1] = {
                requirementId = table.concat(npcRequirement.sourceRequirementIds, ","),
                message = (((("NPC " .. npcRequirement.npcId) .. " expected >= ") .. tostring(npcRequirement.minCount)) .. ", got ") .. tostring(#placements)
            }
        end
    end
    return {isValid = #issues == 0, zoneCounts = zoneCounts, issues = issues}
end
return ____exports
