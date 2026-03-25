local ____lualib = require("lualib_bundle")
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local Error = ____lualib.Error
local RangeError = ____lualib.RangeError
local ReferenceError = ____lualib.ReferenceError
local SyntaxError = ____lualib.SyntaxError
local TypeError = ____lualib.TypeError
local URIError = ____lualib.URIError
local __TS__New = ____lualib.__TS__New
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local ____exports = {}
local ____content_2Dregistry_2Dgenerated = require("planning.content-registry-generated")
local RAW_BIG_BADS = ____content_2Dregistry_2Dgenerated.RAW_BIG_BADS
local RAW_ENEMIES = ____content_2Dregistry_2Dgenerated.RAW_ENEMIES
local RAW_EXPLORATION_FLOWS = ____content_2Dregistry_2Dgenerated.RAW_EXPLORATION_FLOWS
local RAW_ITEMS = ____content_2Dregistry_2Dgenerated.RAW_ITEMS
local RAW_NPCS = ____content_2Dregistry_2Dgenerated.RAW_NPCS
local RAW_QUESTS = ____content_2Dregistry_2Dgenerated.RAW_QUESTS
local RAW_TILES = ____content_2Dregistry_2Dgenerated.RAW_TILES
local function cloneEnemyAbilities(self, abilities)
    return __TS__ArrayMap(
        abilities,
        function(____, ability)
            local candidate = ability
            return {
                id = candidate.id,
                kind = candidate.kind,
                metadata = __TS__ObjectAssign({}, candidate.metadata)
            }
        end
    )
end
local function cloneQuestObjective(self, objective)
    if objective.kind == "kill-enemy" then
        return __TS__ObjectAssign(
            {},
            objective,
            {enemyIds = {unpack(objective.enemyIds)}}
        )
    end
    if objective.kind == "collect-item" then
        return __TS__ObjectAssign(
            {},
            objective,
            {itemIds = {unpack(objective.itemIds)}}
        )
    end
    return __TS__ObjectAssign(
        {},
        objective,
        {tileIds = objective.tileIds ~= nil and ({unpack(objective.tileIds)}) or nil}
    )
end
local NPCS = __TS__ArrayMap(
    RAW_NPCS,
    function(____, entry) return __TS__ObjectAssign(
        {},
        entry,
        {standardDialog = {unpack(entry.standardDialog)}}
    ) end
)
local QUESTS = __TS__ArrayMap(
    RAW_QUESTS,
    function(____, entry) return __TS__ObjectAssign(
        {},
        entry,
        {
            objectives = __TS__ArrayMap(
                entry.objectives,
                function(____, objective) return cloneQuestObjective(nil, objective) end
            ),
            worldRequirements = __TS__ArrayMap(
                entry.worldRequirements,
                function(____, req) return __TS__ObjectAssign(
                    {},
                    req,
                    {
                        tags = {unpack(req.tags)},
                        metadata = __TS__ObjectAssign({}, req.metadata)
                    }
                ) end
            )
        }
    ) end
)
local TILES = __TS__ArrayMap(
    RAW_TILES,
    function(____, entry) return __TS__ObjectAssign(
        {},
        entry,
        {
            color = entry.color and ({entry.color[1], entry.color[2], entry.color[3], entry.color[4]}) or nil,
            enemyPool = entry.enemyPool and __TS__ArrayMap(
                entry.enemyPool,
                function(____, enemyEntry) return {enemyId = enemyEntry.enemyId, weight = enemyEntry.weight} end
            ) or nil,
            tags = {unpack(entry.tags)},
            enemyIds = entry.enemyIds ~= nil and ({unpack(entry.enemyIds)}) or nil
        }
    ) end
)
local EXPLORATION_FLOWS = __TS__ArrayMap(
    RAW_EXPLORATION_FLOWS,
    function(____, entry) return __TS__ObjectAssign(
        {},
        entry,
        {
            tags = {unpack(entry.tags)},
            levels = __TS__ArrayMap(
                entry.levels,
                function(____, level) return __TS__ObjectAssign(
                    {},
                    level,
                    {combatHook = level.combatHook ~= nil and __TS__ObjectAssign({}, level.combatHook) or nil}
                ) end
            )
        }
    ) end
)
local BIG_BADS = __TS__ArrayMap(
    RAW_BIG_BADS,
    function(____, entry) return __TS__ObjectAssign(
        {},
        entry,
        {
            sideQuestIds = {unpack(entry.sideQuestIds)},
            townQuestIds = {unpack(entry.townQuestIds)},
            mandatorySideQuestIds = {unpack(entry.mandatorySideQuestIds)}
        }
    ) end
)
local ENEMIES = __TS__ArrayMap(
    RAW_ENEMIES,
    function(____, entry) return __TS__ObjectAssign(
        {},
        entry,
        {
            tags = {unpack(entry.tags)},
            types = {unpack(entry.types)},
            abilities = cloneEnemyAbilities(nil, entry.abilities),
            dice = {unpack(entry.dice)}
        }
    ) end
)
local ITEMS = __TS__ArrayMap(
    RAW_ITEMS,
    function(____, entry) return __TS__ObjectAssign({}, entry) end
)
local function assertFound(self, value, kind, id)
    if value ~= nil then
        return value
    end
    error(
        __TS__New(Error, (("Missing " .. kind) .. " in registry: ") .. id),
        0
    )
end
function ____exports.getNpcById(self, id)
    return assertFound(
        nil,
        __TS__ArrayFind(
            NPCS,
            function(____, entry) return entry.id == id end
        ),
        "npc",
        id
    )
end
function ____exports.getQuestById(self, id)
    return assertFound(
        nil,
        __TS__ArrayFind(
            QUESTS,
            function(____, entry) return entry.id == id end
        ),
        "quest",
        id
    )
end
function ____exports.getTileById(self, id)
    return assertFound(
        nil,
        __TS__ArrayFind(
            TILES,
            function(____, entry) return entry.id == id end
        ),
        "tile",
        id
    )
end
function ____exports.getBigBadById(self, id)
    return assertFound(
        nil,
        __TS__ArrayFind(
            BIG_BADS,
            function(____, entry) return entry.id == id end
        ),
        "big bad",
        id
    )
end
function ____exports.getEnemyById(self, id)
    return assertFound(
        nil,
        __TS__ArrayFind(
            ENEMIES,
            function(____, entry) return entry.id == id end
        ),
        "enemy",
        id
    )
end
function ____exports.getItemById(self, id)
    return assertFound(
        nil,
        __TS__ArrayFind(
            ITEMS,
            function(____, entry) return entry.id == id end
        ),
        "item",
        id
    )
end
function ____exports.listNpcs(self)
    return __TS__ArrayMap(
        NPCS,
        function(____, entry) return __TS__ObjectAssign(
            {},
            entry,
            {standardDialog = {unpack(entry.standardDialog)}}
        ) end
    )
end
function ____exports.listQuests(self)
    return __TS__ArrayMap(
        QUESTS,
        function(____, entry) return __TS__ObjectAssign(
            {},
            entry,
            {
                objectives = __TS__ArrayMap(
                    entry.objectives,
                    function(____, objective) return cloneQuestObjective(nil, objective) end
                ),
                worldRequirements = __TS__ArrayMap(
                    entry.worldRequirements,
                    function(____, req) return __TS__ObjectAssign(
                        {},
                        req,
                        {
                            tags = {unpack(req.tags)},
                            metadata = __TS__ObjectAssign({}, req.metadata)
                        }
                    ) end
                )
            }
        ) end
    )
end
function ____exports.listTiles(self)
    return __TS__ArrayMap(
        TILES,
        function(____, entry) return __TS__ObjectAssign(
            {},
            entry,
            {
                color = entry.color and ({entry.color[1], entry.color[2], entry.color[3], entry.color[4]}) or nil,
                enemyPool = entry.enemyPool and __TS__ArrayMap(
                    entry.enemyPool,
                    function(____, enemyEntry) return {enemyId = enemyEntry.enemyId, weight = enemyEntry.weight} end
                ) or nil,
                tags = {unpack(entry.tags)},
                enemyIds = entry.enemyIds ~= nil and ({unpack(entry.enemyIds)}) or nil
            }
        ) end
    )
end
function ____exports.getExplorationFlowById(self, id)
    return assertFound(
        nil,
        __TS__ArrayFind(
            EXPLORATION_FLOWS,
            function(____, entry) return entry.id == id end
        ),
        "exploration flow",
        id
    )
end
function ____exports.listExplorationFlows(self)
    return __TS__ArrayMap(
        EXPLORATION_FLOWS,
        function(____, entry) return __TS__ObjectAssign(
            {},
            entry,
            {
                tags = {unpack(entry.tags)},
                levels = __TS__ArrayMap(
                    entry.levels,
                    function(____, level) return __TS__ObjectAssign(
                        {},
                        level,
                        {combatHook = level.combatHook ~= nil and __TS__ObjectAssign({}, level.combatHook) or nil}
                    ) end
                )
            }
        ) end
    )
end
function ____exports.listEnemies(self)
    return __TS__ArrayMap(
        ENEMIES,
        function(____, entry) return __TS__ObjectAssign(
            {},
            entry,
            {
                tags = {unpack(entry.tags)},
                types = {unpack(entry.types)},
                abilities = cloneEnemyAbilities(nil, entry.abilities),
                dice = {unpack(entry.dice)}
            }
        ) end
    )
end
function ____exports.listItems(self)
    return __TS__ArrayMap(
        ITEMS,
        function(____, entry) return __TS__ObjectAssign({}, entry) end
    )
end
return ____exports
