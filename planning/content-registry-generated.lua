--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
____exports.RAW_NPCS = {
    {
        id = "npc:igor",
        name = "Igor",
        role = "Caretaker",
        defaultZone = "town",
        residenceBuilding = "square",
        notes = "Provides clues needed to defeat Dracula.",
        standardDialog = {"Keep your lantern high. Shadows here remember faces.", "If you seek Dracula's weakness, begin where old vows were broken."}
    },
    {
        id = "npc:castle-librarian",
        name = "Castle Librarian",
        role = "Archivist",
        defaultZone = "mountain",
        residenceBuilding = "guild",
        notes = "Holds information about the Sacred Tome.",
        standardDialog = {"Books bite when handled by fools. Turn pages carefully.", "Knowledge is a blade. Know where to point it."}
    },
    {
        id = "npc:captain-marla",
        name = "Captain Marla",
        role = "Caravan Captain",
        defaultZone = "town",
        residenceBuilding = "inn",
        notes = "Leads moonlit supply routes and knows hidden road hazards.",
        standardDialog = {"Moonlight keeps the raiders nervous. We move when they squint.", "Tie your packs high. Mud steals more than bandits do."}
    },
    {
        id = "npc:warden-bren",
        name = "Warden Bren",
        role = "Village Warden",
        defaultZone = "town",
        residenceBuilding = "square",
        notes = "Coordinates militia patrols and tracks nearby den activity.",
        standardDialog = {"Bandits test fences first, then resolve.", "If you clear the den, people will sleep with both eyes shut."}
    },
    {
        id = "npc:ferryman-colt",
        name = "Ferryman Colt",
        role = "River Pilot",
        defaultZone = "town",
        residenceBuilding = "inn",
        notes = "Controls crossing schedules when floodwaters rise.",
        standardDialog = {"River decides the fare. I just collect it.", "Storm upstream means trouble here by sundown."}
    }
}
____exports.RAW_TILES = {
    {
        id = "tile:whisperwood",
        name = "Whisperwood",
        zone = "forest",
        unique = false,
        isTemplate = true,
        description = "Dense groves hide old ruins, beasts, and overgrown tracks.",
        color = {0.19, 0.48, 0.22, 1},
        defaultStatus = "unvisited",
        encounterPlaceholders = {{id = "wolf-pack", weight = 3, tags = {"beast", "combat"}}, {id = "lost-scout", weight = 2, tags = {"npc", "encounter"}}},
        enemyPool = {{enemyId = "enemy:slime-raider", weight = 3}, {enemyId = "enemy:bog-slime", weight = 2}, {enemyId = "enemy:vine-slime", weight = 2}, {enemyId = "enemy:goblin-raider", weight = 1}},
        tags = {"wild", "green"}
    },
    {
        id = "tile:shale-peaks",
        name = "Shale Peaks",
        zone = "mountain",
        unique = false,
        isTemplate = true,
        description = "Craggy heights with thin air, narrow paths, and hidden ore seams.",
        color = {0.5, 0.5, 0.53, 1},
        defaultStatus = "unvisited",
        encounterPlaceholders = {{id = "stone-raider", weight = 2, tags = {"combat", "ambush"}}, {id = "collapsed-pass", weight = 1, tags = {"hazard", "encounter"}}},
        enemyPool = {{enemyId = "enemy:goblin-hexer", weight = 3}, {enemyId = "enemy:peak-warlock", weight = 2}, {enemyId = "enemy:goblin-brewguard", weight = 1}, {enemyId = "enemy:slime-raider", weight = 1}},
        tags = {"elevated", "harsh"}
    },
    {
        id = "tile:golden-fields",
        name = "Golden Fields",
        zone = "farmland",
        unique = false,
        isTemplate = true,
        description = "Patchwork farms and villages touched by trade roads.",
        color = {0.67, 0.56, 0.27, 1},
        defaultStatus = "unvisited",
        encounterPlaceholders = {{id = "bandit-tax", weight = 2, tags = {"combat", "human"}}, {id = "harvest-fair", weight = 2, tags = {"event", "encounter"}}},
        enemyPool = {{enemyId = "enemy:goblin-hexer", weight = 2}, {enemyId = "enemy:goblin-raider", weight = 3}, {enemyId = "enemy:goblin-brewguard", weight = 1}, {enemyId = "enemy:slime-raider", weight = 1}},
        tags = {"civilized", "roads"}
    },
    {
        id = "tile:waypost",
        name = "Waypost",
        zone = "town",
        unique = false,
        isTemplate = true,
        description = "A small hub for caravans, repairs, and rumors of the frontier.",
        color = {0.45, 0.35, 0.2, 1},
        defaultStatus = "unvisited",
        encounterPlaceholders = {{id = "market-brawl", weight = 1, tags = {"combat", "urban"}}, {id = "guild-contract", weight = 3, tags = {"quest", "encounter"}}},
        enemyPool = {{enemyId = "enemy:goblin-hexer", weight = 2}, {enemyId = "enemy:goblin-raider", weight = 2}, {enemyId = "enemy:goblin-brewguard", weight = 1}},
        tags = {"safe-ish", "services"}
    },
    {
        id = "tile:salt-expanse",
        name = "Salt Expanse",
        zone = "ocean",
        unique = false,
        isTemplate = true,
        description = "Open waters, storm fronts, and drifting wreckage.",
        color = {0.17, 0.36, 0.64, 1},
        defaultStatus = "unvisited",
        encounterPlaceholders = {{id = "reef-serpent", weight = 1, tags = {"combat", "beast"}}, {id = "drifter-cache", weight = 2, tags = {"loot", "encounter"}}},
        enemyPool = {{enemyId = "enemy:reef-marauder", weight = 3}, {enemyId = "enemy:bog-slime", weight = 1}, {enemyId = "enemy:slime-raider", weight = 1}},
        tags = {"nautical", "open"}
    },
    {
        id = "tile:draculas-castle",
        name = "Dracula's Castle",
        zone = "mountain",
        unique = true,
        tags = {"special", "castle", "big-bad"},
        enemyIds = {"enemy:castle-sentinel", "enemy:peak-warlock"}
    }
}
____exports.RAW_QUESTS = {
    {
        id = "main:defeat-dracula",
        name = "Defeat Lord Dracula",
        summary = "Uncover Dracula's weakness and confront him in the castle.",
        type = "main",
        requirements = {{
            id = "npc:igor",
            kind = "npc-presence",
            description = "Place Igor in a village/town with dialogue options about defeating Dracula.",
            tags = {"main-quest", "npc"},
            metadata = {preferredZone = "town", givesClue = true, npcId = "npc:igor"}
        }, {
            id = "quest:defeat-dracula",
            kind = "quest-presence",
            description = "Main questline for defeating Lord Dracula must exist.",
            tags = {"main-quest"},
            metadata = {target = "lord-dracula"}
        }}
    },
    {
        id = "side:sacred-tome",
        name = "Sacred Tome",
        summary = "Recover the Sacred Tome from Dracula's castle archives.",
        type = "side",
        requirements = {{
            id = "npc:castle-librarian",
            kind = "npc-presence",
            description = "Place a Librarian in Dracula's Castle tied to the Sacred Tome quest.",
            tags = {"side-quest", "npc", "castle"},
            metadata = {location = "draculas-castle", npcId = "npc:castle-librarian"}
        }, {
            id = "quest:sacred-tome",
            kind = "quest-presence",
            description = "Include Sacred Tome side quest in world quest pool.",
            tags = {"side-quest"},
            metadata = {questId = "sacred-tome"}
        }}
    },
    {
        id = "side:night-caravan",
        name = "Night Caravan",
        summary = "Escort a caravan that only travels under moonlight.",
        type = "side",
        requirements = {{
            id = "tile-zone:farmland",
            kind = "tile-zone",
            description = "Ensure at least one farmland tile for caravan route.",
            tags = {"side-quest", "route"},
            metadata = {zone = "farmland"}
        }, {
            id = "npc:captain-marla",
            kind = "npc-presence",
            description = "Place Captain Marla in a town to brief the caravan route.",
            tags = {"side-quest", "npc", "caravan"},
            metadata = {npcId = "npc:captain-marla", preferredZone = "town"}
        }}
    },
    {
        id = "side:grave-sigil",
        name = "Grave Sigil",
        summary = "Gather sigils from cursed burial grounds.",
        type = "side",
        requirements = {{
            id = "tile-zone:mountain",
            kind = "tile-zone",
            description = "Ensure at least one mountain tile with cursed landmark hooks.",
            tags = {"side-quest", "landmark"},
            metadata = {zone = "mountain", cursed = true}
        }}
    },
    {
        id = "town:big-scary-wolf",
        name = "Big Scary Wolf",
        summary = "Track a wolf terrorizing settlements near the woods.",
        type = "town",
        requirements = {{
            id = "tile-zone:forest",
            kind = "tile-zone",
            description = "Spawn a dense forest tile for the wolf hunt.",
            tags = {"town-quest", "forest"},
            minCount = 1,
            metadata = {zone = "forest", dense = true}
        }}
    },
    {
        id = "town:bandit-den",
        name = "Bandit Den",
        summary = "Clear out a hidden den raiding nearby roads.",
        type = "town",
        requirements = {{
            id = "tile-zone:forest",
            kind = "tile-zone",
            description = "Spawn an additional dense forest tile for the bandit den.",
            tags = {"town-quest", "forest", "additional"},
            minCount = 1,
            metadata = {zone = "forest", dense = true}
        }, {
            id = "npc:warden-bren",
            kind = "npc-presence",
            description = "Place Warden Bren in a town to provide den intel.",
            tags = {"town-quest", "npc", "bandits"},
            metadata = {npcId = "npc:warden-bren", preferredZone = "town"}
        }}
    },
    {
        id = "town:river-toll",
        name = "River Toll",
        summary = "Negotiate or fight for passage at a flooded crossing.",
        type = "town",
        requirements = {{
            id = "tile-zone:ocean",
            kind = "tile-zone",
            description = "Ensure at least one ocean/coastal tile for river crossing events.",
            tags = {"town-quest", "water"},
            metadata = {zone = "ocean"}
        }, {
            id = "npc:ferryman-colt",
            kind = "npc-presence",
            description = "Place Ferryman Colt in a town to negotiate crossing terms.",
            tags = {"town-quest", "npc", "water"},
            metadata = {npcId = "npc:ferryman-colt", preferredZone = "town"}
        }}
    }
}
____exports.RAW_BIG_BADS = {{
    id = "lord-dracula",
    name = "Lord Dracula",
    summary = "Master of the castle domain and final obstacle of the run.",
    mainQuestId = "main:defeat-dracula",
    sideQuestIds = {"side:sacred-tome", "side:night-caravan", "side:grave-sigil"},
    townQuestIds = {"town:big-scary-wolf", "town:bandit-den", "town:river-toll"},
    mandatorySideQuestIds = {"side:sacred-tome"},
    specialTileId = "tile:draculas-castle",
    eventCollectionId = "event-collection:dracula"
}}
____exports.RAW_ENEMIES = {
    {
        id = "enemy:slime-raider",
        name = "Slime Raider",
        level = 1,
        hp = 14,
        tags = {"beast", "slime", "melee"},
        types = {"ooze"},
        abilities = {},
        dice = {"slime-claw", "slime-jab", "slime-ooze"}
    },
    {
        id = "enemy:bog-slime",
        name = "Bog Slime",
        level = 1,
        hp = 16,
        tags = {"beast", "slime", "swamp"},
        types = {"ooze", "bruiser"},
        abilities = {},
        dice = {"slime-claw", "slime-ooze", "slime-ooze"}
    },
    {
        id = "enemy:vine-slime",
        name = "Vine Slime",
        level = 2,
        hp = 15,
        tags = {"beast", "slime", "forest"},
        types = {"ooze", "striker"},
        abilities = {},
        dice = {"slime-jab", "slime-jab", "slime-ooze"}
    },
    {
        id = "enemy:goblin-hexer",
        name = "Goblin Hexer",
        level = 2,
        hp = 12,
        tags = {"humanoid", "goblin", "caster"},
        types = {"raider", "caster"},
        abilities = {},
        dice = {"hex-bolt", "knife-toss", "brew-sip"}
    },
    {
        id = "enemy:goblin-raider",
        name = "Goblin Raider",
        level = 1,
        hp = 13,
        tags = {"humanoid", "goblin", "ambush"},
        types = {"raider", "striker"},
        abilities = {},
        dice = {"knife-toss", "knife-toss", "hex-bolt"}
    },
    {
        id = "enemy:goblin-brewguard",
        name = "Goblin Brewguard",
        level = 2,
        hp = 17,
        tags = {"humanoid", "goblin", "support"},
        types = {"raider", "support"},
        abilities = {},
        dice = {"brew-sip", "hex-bolt", "slime-claw"}
    },
    {
        id = "enemy:reef-marauder",
        name = "Reef Marauder",
        level = 2,
        hp = 16,
        tags = {"nautical", "raider", "coastal"},
        types = {"pirate", "striker"},
        abilities = {},
        dice = {"knife-toss", "hex-bolt", "slime-jab"}
    },
    {
        id = "enemy:peak-warlock",
        name = "Peak Warlock",
        level = 3,
        hp = 18,
        tags = {"humanoid", "caster", "mountain"},
        types = {"cultist", "caster"},
        abilities = {},
        dice = {"hex-bolt", "hex-bolt", "brew-sip"}
    },
    {
        id = "enemy:castle-sentinel",
        name = "Castle Sentinel",
        level = 4,
        hp = 22,
        tags = {"elite", "castle", "guardian"},
        types = {"elite", "defender"},
        abilities = {},
        dice = {"hex-bolt", "slime-claw", "brew-sip"}
    }
}
____exports.RAW_ITEMS = {
    {
        id = "item:rusty-sword",
        name = "Rusty Sword",
        description = "An old blade with chipped edges, but still battle-ready.",
        level = 1,
        cost = 12,
        slot = "weapon-1",
        diceId = "rusty-sword-die"
    },
    {
        id = "item:threadbare-cloak",
        name = "Threadbare Cloak",
        description = "Worn cloth that still offers a little protection from wind and rain.",
        level = 1,
        cost = 8,
        slot = "cloak",
        diceId = "ward-die"
    },
    {
        id = "item:wooden-shield",
        name = "Wooden Shield",
        description = "A sturdy shield built to catch glancing blows.",
        level = 1,
        cost = 11,
        slot = "weapon-2",
        diceId = "wooden-shield-die"
    },
    {
        id = "item:patched-armor",
        name = "Patched Armor",
        description = "Layered plates and stitching that keep a novice warrior alive.",
        level = 1,
        cost = 14,
        slot = "armor",
        diceId = "patched-armor-die"
    },
    {
        id = "item:rations-pack",
        name = "Rations Pack",
        description = "Basic field supplies for long travel.",
        level = 1,
        cost = 5,
        slot = "inventory"
    }
}
return ____exports
