local ____lualib = require("lualib_bundle")
local __TS__StringCharCodeAt = ____lualib.__TS__StringCharCodeAt
local __TS__Class = ____lualib.__TS__Class
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__SparseArrayNew = ____lualib.__TS__SparseArrayNew
local __TS__SparseArrayPush = ____lualib.__TS__SparseArrayPush
local __TS__SparseArraySpread = ____lualib.__TS__SparseArraySpread
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArraySplice = ____lualib.__TS__ArraySplice
local __TS__New = ____lualib.__TS__New
local __TS__ArrayIncludes = ____lualib.__TS__ArrayIncludes
local __TS__ArraySlice = ____lualib.__TS__ArraySlice
local __TS__ObjectValues = ____lualib.__TS__ObjectValues
local ____exports = {}
local ____content_2Dregistry = require("planning.content-registry")
local getBigBadById = ____content_2Dregistry.getBigBadById
local getNpcById = ____content_2Dregistry.getNpcById
local getQuestById = ____content_2Dregistry.getQuestById
local getTileById = ____content_2Dregistry.getTileById
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
local DeterministicRng = __TS__Class()
DeterministicRng.name = "DeterministicRng"
function DeterministicRng.prototype.____constructor(self, seed)
    self.state = hashString(nil, seed) or 123456789
end
function DeterministicRng.prototype.next(self)
    self.state = bit.rshift(1664525 * self.state + 1013904223, 0)
    return self.state / 4294967296
end
local function cloneQuest(self, quest)
    return __TS__ObjectAssign(
        {},
        quest,
        {requirementTemplates = __TS__ArrayMap(
            quest.requirementTemplates,
            function(____, entry) return __TS__ObjectAssign(
                {},
                entry,
                {
                    tags = {unpack(entry.tags)},
                    metadata = __TS__ObjectAssign({}, entry.metadata)
                }
            ) end
        )}
    )
end
local function toRequirementTemplate(self, requirement)
    local metadata = __TS__ObjectAssign({}, requirement.metadata)
    local npcId = requirement.metadata.npcId
    if requirement.kind == "npc-presence" and type(npcId) == "string" then
        local npc = getNpcById(nil, npcId)
        metadata.npcName = npc.name
    end
    return {
        id = requirement.id,
        kind = requirement.kind,
        description = requirement.description,
        minCount = requirement.minCount,
        tags = {unpack(requirement.tags)},
        metadata = metadata
    }
end
local function toQuestTemplate(self, questId)
    local quest = getQuestById(nil, questId)
    return {
        id = quest.id,
        name = quest.name,
        summary = quest.summary,
        type = quest.type,
        requirementTemplates = __TS__ArrayMap(
            quest.requirements,
            function(____, entry) return toRequirementTemplate(nil, entry) end
        )
    }
end
local function toBigBadTemplate(self, bigBadId)
    local bigBad = getBigBadById(nil, bigBadId)
    local specialTile = getTileById(nil, bigBad.specialTileId)
    local ____bigBad_id_3 = bigBad.id
    local ____bigBad_name_4 = bigBad.name
    local ____bigBad_summary_5 = bigBad.summary
    local ____specialTile_id_1 = specialTile.id
    local ____temp_2 = ("Spawn " .. specialTile.name) .. " tile in the world."
    local ____array_0 = __TS__SparseArrayNew(unpack(specialTile.tags))
    __TS__SparseArrayPush(____array_0, "big-bad")
    return {
        id = ____bigBad_id_3,
        name = ____bigBad_name_4,
        summary = ____bigBad_summary_5,
        tileRequirement = {
            id = ____specialTile_id_1,
            kind = "special-tile",
            description = ____temp_2,
            tags = {__TS__SparseArraySpread(____array_0)},
            metadata = {zone = specialTile.zone, unique = specialTile.unique, bigBadId = bigBad.id}
        },
        eventRequirement = {
            id = bigBad.eventCollectionId,
            kind = "event-collection",
            description = ("Include random event collection themed around " .. bigBad.name) .. ".",
            tags = {"events", "big-bad"},
            metadata = {owner = bigBad.id}
        }
    }
end
local function addRequirement(self, bag, template)
    local minCount = template.minCount or 1
    local existing = bag[template.id]
    if existing ~= nil then
        existing.minCount = existing.minCount + minCount
        return
    end
    bag[template.id] = {
        id = template.id,
        kind = template.kind,
        description = template.description,
        minCount = minCount,
        tags = {unpack(template.tags)},
        metadata = __TS__ObjectAssign({}, template.metadata)
    }
end
local function takeUniqueRandom(self, pool, count, rng, alreadyChosenIds)
    local available = __TS__ArrayFilter(
        pool,
        function(____, entry) return alreadyChosenIds[entry.id] ~= true end
    )
    local picked = {}
    while #picked < count and #available > 0 do
        do
            local rawIndex = math.floor(rng:next() * #available)
            local index = math.max(
                0,
                math.min(#available - 1, rawIndex)
            )
            local selected = available[index + 1]
            if selected == nil then
                __TS__ArraySplice(available, index, 1)
                goto __continue18
            end
            picked[#picked + 1] = selected
            alreadyChosenIds[selected.id] = true
            __TS__ArraySplice(available, index, 1)
        end
        ::__continue18::
    end
    return picked
end
function ____exports.createDefaultGamePlannerConfig(self, seed)
    if seed == nil then
        seed = "run-001"
    end
    local bigBad = getBigBadById(nil, "lord-dracula")
    return {
        seed = seed,
        sideQuestCount = 2,
        townCount = 2,
        maxTownTiles = 2,
        bigBadId = bigBad.id,
        mainQuestId = bigBad.mainQuestId,
        sideQuestIds = {unpack(bigBad.sideQuestIds)},
        mandatorySideQuestIds = {unpack(bigBad.mandatorySideQuestIds)},
        townQuestIds = {unpack(bigBad.townQuestIds)}
    }
end
____exports.GamePlanner = __TS__Class()
local GamePlanner = ____exports.GamePlanner
GamePlanner.name = "GamePlanner"
function GamePlanner.prototype.____constructor(self, config)
    self.config = config
end
function GamePlanner.prototype.createPlan(self)
    local rng = __TS__New(DeterministicRng, self.config.seed)
    local requirementBag = {}
    local bigBadContent = getBigBadById(nil, self.config.bigBadId)
    local bigBad = toBigBadTemplate(nil, bigBadContent.id)
    local mainQuestId = self.config.mainQuestId or bigBadContent.mainQuestId
    local mainQuest = toQuestTemplate(nil, mainQuestId)
    local sideQuestIds = self.config.sideQuestIds or bigBadContent.sideQuestIds
    local townQuestIds = self.config.townQuestIds or bigBadContent.townQuestIds
    local mandatorySideQuestIds = self.config.mandatorySideQuestIds or bigBadContent.mandatorySideQuestIds
    local sideQuestPool = __TS__ArrayMap(
        sideQuestIds,
        function(____, id) return toQuestTemplate(nil, id) end
    )
    local townQuestPool = __TS__ArrayMap(
        townQuestIds,
        function(____, id) return toQuestTemplate(nil, id) end
    )
    addRequirement(nil, requirementBag, bigBad.tileRequirement)
    addRequirement(nil, requirementBag, bigBad.eventRequirement)
    local mainQuestClone = cloneQuest(nil, mainQuest)
    for ____, requirement in ipairs(mainQuestClone.requirementTemplates) do
        addRequirement(nil, requirementBag, requirement)
    end
    local chosenIds = {}
    local mandatorySide = __TS__ArrayMap(
        __TS__ArraySlice(
            __TS__ArrayFilter(
                sideQuestPool,
                function(____, quest) return __TS__ArrayIncludes(mandatorySideQuestIds, quest.id) end
            ),
            0,
            self.config.sideQuestCount
        ),
        cloneQuest
    )
    for ____, quest in ipairs(mandatorySide) do
        chosenIds[quest.id] = true
    end
    local remainingSideSlots = math.max(0, self.config.sideQuestCount - #mandatorySide)
    local randomSide = __TS__ArrayMap(
        takeUniqueRandom(
            nil,
            sideQuestPool,
            remainingSideSlots,
            rng,
            chosenIds
        ),
        cloneQuest
    )
    local ____array_6 = __TS__SparseArrayNew(unpack(mandatorySide))
    __TS__SparseArrayPush(
        ____array_6,
        unpack(randomSide)
    )
    local sideQuests = {__TS__SparseArraySpread(____array_6)}
    for ____, quest in ipairs(sideQuests) do
        for ____, requirement in ipairs(quest.requirementTemplates) do
            addRequirement(nil, requirementBag, requirement)
        end
    end
    local chosenTownIds = {}
    local townQuests = __TS__ArrayMap(
        takeUniqueRandom(
            nil,
            townQuestPool,
            self.config.townCount,
            rng,
            chosenTownIds
        ),
        cloneQuest
    )
    for ____, quest in ipairs(townQuests) do
        for ____, requirement in ipairs(quest.requirementTemplates) do
            addRequirement(nil, requirementBag, requirement)
        end
    end
    return {
        seed = self.config.seed,
        worldConfig = {maxTownTiles = math.max(1, self.config.maxTownTiles)},
        bigBad = bigBad,
        mainQuest = mainQuestClone,
        sideQuests = sideQuests,
        townQuests = townQuests,
        requirements = __TS__ObjectValues(requirementBag),
        debugNotes = {
            "Big Bad selected: " .. bigBad.name,
            "Main quest: " .. mainQuestClone.name,
            "Side quests chosen: " .. tostring(#sideQuests),
            "Town quests chosen: " .. tostring(#townQuests),
            "Total requirements: " .. tostring(#__TS__ObjectValues(requirementBag))
        }
    }
end
function ____exports.formatGamePlanSpec(self, spec)
    local lines = {}
    lines[#lines + 1] = "Seed: " .. spec.seed
    lines[#lines + 1] = "World Max Town Tiles: " .. tostring(spec.worldConfig.maxTownTiles)
    lines[#lines + 1] = "Big Bad: " .. spec.bigBad.name
    lines[#lines + 1] = "Main Quest: " .. spec.mainQuest.name
    lines[#lines + 1] = "Side Quests: " .. table.concat(
        __TS__ArrayMap(
            spec.sideQuests,
            function(____, entry) return entry.name end
        ),
        ", "
    )
    lines[#lines + 1] = "Town Quests: " .. table.concat(
        __TS__ArrayMap(
            spec.townQuests,
            function(____, entry) return entry.name end
        ),
        ", "
    )
    lines[#lines + 1] = "Requirements:"
    for ____, requirement in ipairs(spec.requirements) do
        lines[#lines + 1] = ((((("- [" .. requirement.kind) .. "] ") .. requirement.description) .. " (min=") .. tostring(requirement.minCount)) .. ")"
    end
    lines[#lines + 1] = "Planner Notes:"
    for ____, note in ipairs(spec.debugNotes) do
        lines[#lines + 1] = "- " .. note
    end
    return lines
end
return ____exports
