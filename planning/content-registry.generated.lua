--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
____exports.RAW_NPCS = {{
    id = "npc:igor",
    name = "Igor",
    role = "Caretaker",
    defaultZone = "town",
    notes = "Provides clues needed to defeat Dracula."
}, {
    id = "npc:castle-librarian",
    name = "Castle Librarian",
    role = "Archivist",
    defaultZone = "mountain",
    notes = "Holds information about the Sacred Tome."
}}
____exports.RAW_TILES = {{
    id = "tile:draculas-castle",
    name = "Dracula's Castle",
    zone = "mountain",
    unique = true,
    tags = {"special", "castle", "big-bad"}
}}
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
return ____exports
