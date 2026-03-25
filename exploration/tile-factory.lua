local ____lualib = require("lualib_bundle")
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local Error = ____lualib.Error
local RangeError = ____lualib.RangeError
local ReferenceError = ____lualib.ReferenceError
local SyntaxError = ____lualib.SyntaxError
local TypeError = ____lualib.TypeError
local URIError = ____lualib.URIError
local __TS__New = ____lualib.__TS__New
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local ____exports = {}
local ____content_2Dregistry = require("planning.content-registry")
local listTiles = ____content_2Dregistry.listTiles
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
local function toTileTemplateByZone(self)
    local templateEntries = __TS__ArrayFilter(
        listTiles(nil),
        function(____, tile) return tile.isTemplate == true end
    )
    local templateMap = {}
    for ____, tile in ipairs(templateEntries) do
        if tile.description == nil or tile.color == nil or tile.defaultStatus == nil or tile.enemyPool == nil then
            error(
                __TS__New(Error, "Tile template is missing required template fields: " .. tile.id),
                0
            )
        end
        templateMap[tile.zone] = {
            zone = tile.zone,
            name = tile.name,
            description = tile.description,
            color = {tile.color[1], tile.color[2], tile.color[3], tile.color[4]},
            defaultStatus = tile.defaultStatus,
            enemyPool = __TS__ArrayMap(
                tile.enemyPool,
                function(____, entry) return {enemyId = entry.enemyId, weight = entry.weight} end
            ),
            tags = {unpack(tile.tags)}
        }
    end
    local requiredZones = {
        "forest",
        "mountain",
        "farmland",
        "town",
        "ocean"
    }
    for ____, zone in ipairs(requiredZones) do
        if templateMap[zone] == nil then
            error(
                __TS__New(Error, "Missing tile template definition for zone: " .. zone),
                0
            )
        end
    end
    return templateMap
end
function ____exports.createDefaultTileFactoryConfig(self)
    local templatesByZone = toTileTemplateByZone(nil)
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
        explorationFlowId = nil,
        flowLevel = 0,
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
