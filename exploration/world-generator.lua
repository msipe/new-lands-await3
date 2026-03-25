local ____lualib = require("lualib_bundle")
local __TS__StringCharCodeAt = ____lualib.__TS__StringCharCodeAt
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArraySort = ____lualib.__TS__ArraySort
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__SparseArrayNew = ____lualib.__TS__SparseArrayNew
local __TS__SparseArrayPush = ____lualib.__TS__SparseArrayPush
local __TS__SparseArraySpread = ____lualib.__TS__SparseArraySpread
local __TS__ArrayFlatMap = ____lualib.__TS__ArrayFlatMap
local __TS__ArraySplice = ____lualib.__TS__ArraySplice
local __TS__ArraySome = ____lualib.__TS__ArraySome
local ____exports = {}
local ____tile_2Dfactory = require("exploration.tile-factory")
local createDefaultTileFactoryConfig = ____tile_2Dfactory.createDefaultTileFactoryConfig
local ____explore_2Dstate = require("exploration.explore-state")
local getHexDistance = ____explore_2Dstate.getHexDistance
local ____content_2Dregistry = require("planning.content-registry")
local getNpcById = ____content_2Dregistry.getNpcById
local getTileById = ____content_2Dregistry.getTileById
local listExplorationFlows = ____content_2Dregistry.listExplorationFlows
local listNpcs = ____content_2Dregistry.listNpcs
local START_TILE_KEY = "0,0"
local NPCS_PER_TOWN = 3
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
    local normalized = bit.rshift(hash, 0) / 4294967296
    return normalized
end
local function applyTemplateToTile(self, tile, template)
    tile.zone = template.zone
    tile.name = template.name
    tile.description = template.description
    tile.color = {template.color[1], template.color[2], template.color[3], template.color[4]}
    tile.explorationFlowId = nil
    tile.flowLevel = 0
    tile.enemyPool = __TS__ArrayMap(
        template.enemyPool,
        function(____, entry) return {enemyId = entry.enemyId, weight = entry.weight} end
    )
    tile.tags = {unpack(template.tags)}
    tile.locations = {}
end
local function pickCandidateTiles(self, state, targetZone)
    local pool = __TS__ArrayFilter(
        state.tiles,
        function(____, tile) return tile.key ~= START_TILE_KEY and tile.zone ~= targetZone end
    )
    __TS__ArraySort(
        pool,
        function(____, a, b)
            local aScore = hashToUnitInterval(nil, (a.key .. ":") .. targetZone)
            local bScore = hashToUnitInterval(nil, (b.key .. ":") .. targetZone)
            return aScore - bScore
        end
    )
    return pool
end
local function addTownLocations(self, tile, radius)
    local defaults = createDefaultTileFactoryConfig(nil)
    local buildLocations = defaults.buildLocations
    if buildLocations == nil then
        return
    end
    local distanceFromCenter = getHexDistance(nil, {q = 0, r = 0}, tile.coord)
    local locations = buildLocations(
        nil,
        "town",
        {
            key = tile.key,
            coord = {q = tile.coord.q, r = tile.coord.r},
            radius = radius,
            distanceFromCenter = distanceFromCenter,
            roll = hashToUnitInterval(
                nil,
                (("roll:" .. tile.key) .. ":") .. tostring(radius)
            )
        }
    )
    tile.locations = locations
end
local function ensureZoneMinimums(self, state, spec)
    local defaults = createDefaultTileFactoryConfig(nil)
    for ____, requirement in ipairs(spec.requiredZones) do
        do
            local currentCount = #__TS__ArrayFilter(
                state.tiles,
                function(____, tile) return tile.zone == requirement.zone end
            )
            if currentCount >= requirement.minCount then
                goto __continue13
            end
            local needed = requirement.minCount - currentCount
            local candidates = pickCandidateTiles(nil, state, requirement.zone)
            do
                local i = 0
                while i < needed and i < #candidates do
                    local tile = candidates[i + 1]
                    applyTemplateToTile(nil, tile, defaults.templatesByZone[requirement.zone])
                    if requirement.zone == "town" then
                        addTownLocations(nil, tile, state.radius)
                    end
                    i = i + 1
                end
            end
        end
        ::__continue13::
    end
end
local function pickReplacementZone(self, tileKey, seed)
    local pool = {"forest", "farmland", "mountain", "ocean"}
    local index = math.floor(hashToUnitInterval(nil, (seed .. ":replace:") .. tileKey) * #pool)
    return pool[math.max(
        0,
        math.min(#pool - 1, index)
    ) + 1]
end
local function enforceMaxTownTiles(self, state, spec)
    local ____opt_0 = __TS__ArrayFind(
        spec.requiredZones,
        function(____, entry) return entry.zone == "town" end
    )
    local townMinRequirement = ____opt_0 and ____opt_0.minCount or 0
    local maxTownTiles = math.max(spec.maxTownTiles, townMinRequirement)
    local townTiles = __TS__ArrayFilter(
        state.tiles,
        function(____, tile) return tile.zone == "town" end
    )
    if #townTiles <= maxTownTiles then
        return
    end
    local protectedKeys = {[START_TILE_KEY] = true}
    local candidates = __TS__ArrayFilter(
        townTiles,
        function(____, tile) return protectedKeys[tile.key] ~= true end
    )
    __TS__ArraySort(
        candidates,
        function(____, a, b) return hashToUnitInterval(nil, (spec.seed .. ":") .. a.key) - hashToUnitInterval(nil, (spec.seed .. ":") .. b.key) end
    )
    local toConvert = #townTiles - maxTownTiles
    for ____, tile in ipairs(candidates) do
        if toConvert <= 0 then
            break
        end
        local replacementZone = pickReplacementZone(nil, tile.key, spec.seed)
        local defaults = createDefaultTileFactoryConfig(nil)
        applyTemplateToTile(nil, tile, defaults.templatesByZone[replacementZone])
        toConvert = toConvert - 1
    end
end
local function ensureSpecialTiles(self, state, spec)
    local defaults = createDefaultTileFactoryConfig(nil)
    for ____, special in ipairs(spec.requiredSpecialTiles) do
        do
            local existing = __TS__ArrayFilter(
                state.tiles,
                function(____, tile) return tile.metadata.specialTileId == special.id end
            )
            if #existing >= special.minCount then
                goto __continue31
            end
            local preferredZone = special.preferredZone
            local candidatePool = __TS__ArrayFilter(
                state.tiles,
                function(____, tile)
                    if tile.key == START_TILE_KEY then
                        return false
                    end
                    if tile.metadata.specialTileId ~= nil then
                        return false
                    end
                    if preferredZone ~= nil then
                        return tile.zone == preferredZone
                    end
                    return true
                end
            )
            if #candidatePool == 0 then
                goto __continue31
            end
            __TS__ArraySort(
                candidatePool,
                function(____, a, b) return hashToUnitInterval(nil, a.key) - hashToUnitInterval(nil, b.key) end
            )
            local selected = candidatePool[1]
            if preferredZone ~= nil and selected.zone ~= preferredZone then
                applyTemplateToTile(nil, selected, defaults.templatesByZone[preferredZone])
                if preferredZone == "town" then
                    addTownLocations(nil, selected, state.radius)
                end
            end
            selected.metadata = __TS__ObjectAssign({}, selected.metadata, {specialTileId = special.id, specialTile = true})
            local ____array_2 = __TS__SparseArrayNew(unpack(selected.tags))
            __TS__SparseArrayPush(____array_2, "special-tile")
            selected.tags = {__TS__SparseArraySpread(____array_2)}
            local tileDefinition = getTileById(nil, special.id)
            selected.name = tileDefinition.name
            if tileDefinition.enemyIds and #tileDefinition.enemyIds > 0 then
                selected.enemyPool = __TS__ArrayMap(
                    tileDefinition.enemyIds,
                    function(____, enemyId) return {enemyId = enemyId, weight = 1} end
                )
            end
        end
        ::__continue31::
    end
end
local function getTownPlacementSlots(self, state, spec)
    local townTiles = __TS__ArrayFilter(
        state.tiles,
        function(____, tile) return tile.zone == "town" end
    )
    for ____, tile in ipairs(townTiles) do
        if #tile.locations == 0 then
            addTownLocations(nil, tile, state.radius)
        end
    end
    local slots = __TS__ArrayMap(
        __TS__ArrayFilter(
            townTiles,
            function(____, tile) return #tile.locations > 0 end
        ),
        function(____, tile)
            local assignedCount = #__TS__ArrayFilter(
                __TS__ArrayFlatMap(
                    tile.locations,
                    function(____, location) return location.characters end
                ),
                function(____, character) return character.npcId ~= nil end
            )
            return {tile = tile, assignedCount = assignedCount}
        end
    )
    __TS__ArraySort(
        slots,
        function(____, a, b) return hashToUnitInterval(nil, (spec.seed .. ":town-slot:") .. a.tile.key) - hashToUnitInterval(nil, (spec.seed .. ":town-slot:") .. b.tile.key) end
    )
    return slots
end
local function createFallbackTownLocation(self, tile, building)
    local titleByBuilding = {
        shop = "Provision Shop",
        inn = "Roadside Inn",
        guild = "Guild Hall",
        square = "Town Square",
        shrine = "Wayside Shrine"
    }
    return {
        id = (tile.key .. ":generated-") .. building,
        name = titleByBuilding[building],
        description = ("A " .. building) .. " where local residents gather and exchange news.",
        locationType = building,
        characters = {},
        tags = {"generated", building}
    }
end
local function getOrCreateBuildingLocation(self, tile, npc, spec)
    local existing = __TS__ArrayFind(
        tile.locations,
        function(____, location) return location.locationType == npc.residenceBuilding end
    )
    if existing ~= nil then
        return existing
    end
    local generated = createFallbackTownLocation(nil, tile, npc.residenceBuilding)
    local insertIndex = math.floor(hashToUnitInterval(nil, (((spec.seed .. ":insert-location:") .. tile.key) .. ":") .. npc.id) * (#tile.locations + 1))
    __TS__ArraySplice(
        tile.locations,
        math.max(
            0,
            math.min(#tile.locations, insertIndex)
        ),
        0,
        generated
    )
    return generated
end
local function assignNpcToTown(self, slot, npc, spec)
    local hasNpcAlready = __TS__ArraySome(
        slot.tile.locations,
        function(____, location) return __TS__ArraySome(
            location.characters,
            function(____, character) return character.npcId == npc.id end
        ) end
    )
    if hasNpcAlready or slot.assignedCount >= NPCS_PER_TOWN then
        return false
    end
    local targetLocation = getOrCreateBuildingLocation(nil, slot.tile, npc, spec)
    local ____targetLocation_characters_3 = targetLocation.characters
    ____targetLocation_characters_3[#____targetLocation_characters_3 + 1] = {
        id = (slot.tile.key .. ":npc:") .. npc.id,
        npcId = npc.id,
        name = npc.name,
        role = npc.role,
        disposition = "neutral",
        description = npc.notes,
        questHooks = {}
    }
    slot.assignedCount = slot.assignedCount + 1
    return true
end
local function placeTownNpcs(self, state, spec)
    local slots = getTownPlacementSlots(nil, state, spec)
    if #slots == 0 then
        return
    end
    local usedNpcIds = {}
    local requiredNpcIds = {}
    local requiredNpcs = __TS__ArrayMap(
        spec.requiredNpcs,
        function(____, requirement)
            requiredNpcIds[requirement.npcId] = true
            return getNpcById(nil, requirement.npcId)
        end
    )
    __TS__ArraySort(
        requiredNpcs,
        function(____, a, b) return hashToUnitInterval(nil, (spec.seed .. ":required:") .. a.id) - hashToUnitInterval(nil, (spec.seed .. ":required:") .. b.id) end
    )
    for ____, npc in ipairs(requiredNpcs) do
        do
            if usedNpcIds[npc.id] == true then
                goto __continue67
            end
            local candidates = __TS__ArrayFilter(
                {unpack(slots)},
                function(____, entry) return entry.assignedCount < NPCS_PER_TOWN end
            )
            __TS__ArraySort(
                candidates,
                function(____, a, b)
                    if a.assignedCount ~= b.assignedCount then
                        return a.assignedCount - b.assignedCount
                    end
                    local aBias = hashToUnitInterval(nil, (((spec.seed .. ":required-town:") .. npc.id) .. ":") .. a.tile.key)
                    local bBias = hashToUnitInterval(nil, (((spec.seed .. ":required-town:") .. npc.id) .. ":") .. b.tile.key)
                    return aBias - bBias
                end
            )
            local target = candidates[1]
            if target == nil then
                break
            end
            if assignNpcToTown(nil, target, npc, spec) then
                usedNpcIds[npc.id] = true
            end
        end
        ::__continue67::
    end
    local ambientPool = __TS__ArrayFilter(
        listNpcs(nil),
        function(____, npc) return npc.defaultZone == "town" and requiredNpcIds[npc.id] ~= true end
    )
    __TS__ArraySort(
        ambientPool,
        function(____, a, b) return hashToUnitInterval(nil, (spec.seed .. ":ambient:") .. a.id) - hashToUnitInterval(nil, (spec.seed .. ":ambient:") .. b.id) end
    )
    for ____, npc in ipairs(ambientPool) do
        do
            if usedNpcIds[npc.id] == true then
                goto __continue77
            end
            local candidates = __TS__ArrayFilter(
                {unpack(slots)},
                function(____, entry) return entry.assignedCount < NPCS_PER_TOWN end
            )
            if #candidates == 0 then
                break
            end
            __TS__ArraySort(
                candidates,
                function(____, a, b)
                    if a.assignedCount ~= b.assignedCount then
                        return a.assignedCount - b.assignedCount
                    end
                    local aBias = hashToUnitInterval(nil, (((spec.seed .. ":ambient-town:") .. npc.id) .. ":") .. a.tile.key)
                    local bBias = hashToUnitInterval(nil, (((spec.seed .. ":ambient-town:") .. npc.id) .. ":") .. b.tile.key)
                    return aBias - bBias
                end
            )
            local target = candidates[1]
            if target == nil then
                break
            end
            if assignNpcToTown(nil, target, npc, spec) then
                usedNpcIds[npc.id] = true
            end
        end
        ::__continue77::
    end
    for ____, slot in ipairs(slots) do
        slot.tile.locations = __TS__ArrayFilter(
            slot.tile.locations,
            function(____, location) return #location.characters > 0 end
        )
    end
end
local function assignExplorationFlows(self, state, seed)
    local allFlows = listExplorationFlows(nil)
    local poolByZone = {}
    for ____, flow in ipairs(allFlows) do
        if poolByZone[flow.zone] == nil then
            poolByZone[flow.zone] = {}
        end
        local ____poolByZone_flow_zone_4 = poolByZone[flow.zone]
        ____poolByZone_flow_zone_4[#____poolByZone_flow_zone_4 + 1] = flow
    end
    local candidates = __TS__ArraySort(
        __TS__ArrayFilter(
            state.tiles,
            function(____, tile) return tile.zone ~= "town" end
        ),
        function(____, a, b) return a.key < b.key and -1 or (a.key > b.key and 1 or 0) end
    )
    for ____, tile in ipairs(candidates) do
        do
            local pool = poolByZone[tile.zone]
            if pool == nil or #pool == 0 then
                goto __continue95
            end
            local score = hashToUnitInterval(nil, (seed .. ":flow:") .. tile.key)
            local index = math.max(
                0,
                math.min(
                    #pool - 1,
                    math.floor(score * #pool)
                )
            )
            tile.explorationFlowId = pool[index + 1].id
            __TS__ArraySplice(pool, index, 1)
        end
        ::__continue95::
    end
end
function ____exports.applyWorldSpecToExploreState(self, state, spec)
    ensureZoneMinimums(nil, state, spec)
    ensureSpecialTiles(nil, state, spec)
    enforceMaxTownTiles(nil, state, spec)
    placeTownNpcs(nil, state, spec)
    assignExplorationFlows(nil, state, spec.seed)
end
return ____exports
