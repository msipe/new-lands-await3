local ____lualib = require("lualib_bundle")
local __TS__ObjectValues = ____lualib.__TS__ObjectValues
local ____exports = {}
local VALID_ZONES = {
    forest = true,
    mountain = true,
    farmland = true,
    town = true,
    ocean = true
}
local function readZone(self, value)
    if type(value) ~= "string" then
        return nil
    end
    if VALID_ZONES[value] == true then
        return value
    end
    return nil
end
local function collectZoneRequirements(self, requirements)
    local map = {}
    for ____, requirement in ipairs(requirements) do
        do
            if requirement.kind ~= "tile-zone" then
                goto __continue6
            end
            local zone = readZone(nil, requirement.metadata.zone)
            if zone == nil then
                goto __continue6
            end
            local existing = map[zone]
            if existing ~= nil then
                existing.minCount = existing.minCount + requirement.minCount
                local ____existing_sourceRequirementIds_0 = existing.sourceRequirementIds
                ____existing_sourceRequirementIds_0[#____existing_sourceRequirementIds_0 + 1] = requirement.id
                goto __continue6
            end
            map[zone] = {zone = zone, minCount = requirement.minCount, sourceRequirementIds = {requirement.id}}
        end
        ::__continue6::
    end
    return __TS__ObjectValues(map)
end
local function collectSpecialTileRequirements(self, requirements)
    local entries = {}
    for ____, requirement in ipairs(requirements) do
        do
            if requirement.kind ~= "special-tile" then
                goto __continue12
            end
            entries[#entries + 1] = {
                id = requirement.id,
                preferredZone = readZone(nil, requirement.metadata.zone),
                minCount = math.max(1, requirement.minCount)
            }
        end
        ::__continue12::
    end
    return entries
end
local function collectNpcRequirements(self, requirements)
    local map = {}
    for ____, requirement in ipairs(requirements) do
        do
            if requirement.kind ~= "npc-presence" then
                goto __continue16
            end
            local npcId = requirement.metadata.npcId
            if type(npcId) ~= "string" then
                goto __continue16
            end
            local preferredZone = readZone(nil, requirement.metadata.preferredZone)
            local existing = map[npcId]
            if existing ~= nil then
                existing.minCount = 1
                local ____existing_sourceRequirementIds_1 = existing.sourceRequirementIds
                ____existing_sourceRequirementIds_1[#____existing_sourceRequirementIds_1 + 1] = requirement.id
                goto __continue16
            end
            map[npcId] = {npcId = npcId, preferredZone = preferredZone, minCount = 1, sourceRequirementIds = {requirement.id}}
        end
        ::__continue16::
    end
    return __TS__ObjectValues(map)
end
function ____exports.createWorldSpecFromPlan(self, plan)
    return {
        seed = plan.seed,
        maxTownTiles = math.max(1, plan.worldConfig.maxTownTiles),
        requiredZones = collectZoneRequirements(nil, plan.requirements),
        requiredSpecialTiles = collectSpecialTileRequirements(nil, plan.requirements),
        requiredNpcs = collectNpcRequirements(nil, plan.requirements)
    }
end
return ____exports
