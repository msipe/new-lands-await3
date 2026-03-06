local ____lualib = require("lualib_bundle")
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local ____exports = {}
local function createDefaultTownLocations(self, tileKey)
    return {{
        id = tileKey .. ":market-square",
        name = "Market Square",
        description = "A busy square where locals trade gossip, goods, and warnings.",
        locationType = "square",
        characters = {},
        tags = {"trade", "rumors"}
    }, {
        id = tileKey .. ":drifters-rest",
        name = "Drifter's Rest",
        description = "An inn where travelers leave maps, debts, and half-true stories.",
        locationType = "inn",
        characters = {},
        tags = {"rest", "leads"}
    }, {
        id = tileKey .. ":copper-anvil",
        name = "Copper Anvil",
        description = "A cramped smithy where tools, armor, and odd artifacts get patched.",
        locationType = "shop",
        characters = {},
        tags = {"crafting", "upgrades"}
    }}
end
local function chooseDefaultZoneByRoll(self, roll)
    if roll < 0.22 then
        return "forest"
    end
    if roll < 0.42 then
        return "farmland"
    end
    if roll < 0.62 then
        return "mountain"
    end
    if roll < 0.82 then
        return "ocean"
    end
    return "town"
end
function ____exports.createDefaultTileFactoryConfig(self)
    local templatesByZone = {
        forest = {
            zone = "forest",
            name = "Whisperwood",
            description = "Dense groves hide old ruins, beasts, and overgrown tracks.",
            color = {0.19, 0.48, 0.22, 1},
            defaultStatus = "unvisited",
            encounterPlaceholders = {{id = "wolf-pack", weight = 3, tags = {"beast", "combat"}}, {id = "lost-scout", weight = 2, tags = {"npc", "encounter"}}},
            enemyPool = {{enemyId = "enemy:slime-raider", weight = 3}, {enemyId = "enemy:goblin-hexer", weight = 1}},
            tags = {"wild", "green"}
        },
        mountain = {
            zone = "mountain",
            name = "Shale Peaks",
            description = "Craggy heights with thin air, narrow paths, and hidden ore seams.",
            color = {0.5, 0.5, 0.53, 1},
            defaultStatus = "unvisited",
            encounterPlaceholders = {{id = "stone-raider", weight = 2, tags = {"combat", "ambush"}}, {id = "collapsed-pass", weight = 1, tags = {"hazard", "encounter"}}},
            enemyPool = {{enemyId = "enemy:goblin-hexer", weight = 3}, {enemyId = "enemy:slime-raider", weight = 1}},
            tags = {"elevated", "harsh"}
        },
        farmland = {
            zone = "farmland",
            name = "Golden Fields",
            description = "Patchwork farms and villages touched by trade roads.",
            color = {0.67, 0.56, 0.27, 1},
            defaultStatus = "unvisited",
            encounterPlaceholders = {{id = "bandit-tax", weight = 2, tags = {"combat", "human"}}, {id = "harvest-fair", weight = 2, tags = {"event", "encounter"}}},
            enemyPool = {{enemyId = "enemy:goblin-hexer", weight = 2}, {enemyId = "enemy:slime-raider", weight = 2}},
            tags = {"civilized", "roads"}
        },
        town = {
            zone = "town",
            name = "Waypost",
            description = "A small hub for caravans, repairs, and rumors of the frontier.",
            color = {0.45, 0.35, 0.2, 1},
            defaultStatus = "unvisited",
            encounterPlaceholders = {{id = "market-brawl", weight = 1, tags = {"combat", "urban"}}, {id = "guild-contract", weight = 3, tags = {"quest", "encounter"}}},
            enemyPool = {{enemyId = "enemy:goblin-hexer", weight = 1}},
            tags = {"safe-ish", "services"}
        },
        ocean = {
            zone = "ocean",
            name = "Salt Expanse",
            description = "Open waters, storm fronts, and drifting wreckage.",
            color = {0.17, 0.36, 0.64, 1},
            defaultStatus = "unvisited",
            encounterPlaceholders = {{id = "reef-serpent", weight = 1, tags = {"combat", "beast"}}, {id = "drifter-cache", weight = 2, tags = {"loot", "encounter"}}},
            enemyPool = {{enemyId = "enemy:slime-raider", weight = 2}},
            tags = {"nautical", "open"}
        }
    }
    return {
        templatesByZone = templatesByZone,
        chooseZone = function(____, context)
            if context.distanceFromCenter == 0 then
                return "town"
            end
            return chooseDefaultZoneByRoll(nil, context.roll)
        end,
        buildLocations = function(____, zone, context)
            if zone ~= "town" then
                return {}
            end
            return createDefaultTownLocations(nil, context.key)
        end
    }
end
local function cloneTemplateData(self, template)
    return {
        zone = template.zone,
        name = template.name,
        description = template.description,
        color = {template.color[1], template.color[2], template.color[3], template.color[4]},
        status = template.defaultStatus,
        encounterPlaceholders = __TS__ArrayMap(
            template.encounterPlaceholders,
            function(____, entry) return {
                id = entry.id,
                weight = entry.weight,
                tags = {unpack(entry.tags)}
            } end
        ),
        enemyPool = __TS__ArrayMap(
            template.enemyPool,
            function(____, entry) return {enemyId = entry.enemyId, weight = entry.weight} end
        ),
        locations = {},
        tags = {unpack(template.tags)},
        metadata = {}
    }
end
function ____exports.createTileFromFactory(self, config, context)
    local zone = config:chooseZone(context)
    local template = config.templatesByZone[zone]
    local baseTile = __TS__ObjectAssign(
        {key = context.key, coord = {q = context.coord.q, r = context.coord.r}},
        cloneTemplateData(nil, template)
    )
    local buildLocations = config.buildLocations
    if buildLocations ~= nil then
        baseTile.locations = __TS__ArrayMap(
            buildLocations(nil, zone, context),
            function(____, location) return __TS__ObjectAssign(
                {},
                location,
                {
                    characters = __TS__ArrayMap(
                        location.characters,
                        function(____, character) return __TS__ObjectAssign(
                            {},
                            character,
                            {questHooks = {unpack(character.questHooks)}}
                        ) end
                    ),
                    tags = {unpack(location.tags)}
                }
            ) end
        )
    end
    if not config.customizeTile then
        return baseTile
    end
    return config:customizeTile(baseTile, context)
end
return ____exports
