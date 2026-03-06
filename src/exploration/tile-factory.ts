export type ZoneType = "forest" | "mountain" | "farmland" | "town" | "ocean";

export type TileStatus = "unvisited" | "visited" | "active";

export type TileColor = [number, number, number, number];

export type EncounterPlaceholder = {
  id: string;
  weight: number;
  tags: string[];
};

export type EnemySpawnEntry = {
  enemyId: string;
  weight: number;
};

export type TownCharacter = {
  id: string;
  npcId?: string;
  name: string;
  role: string;
  disposition: "friendly" | "neutral" | "wary";
  description: string;
  questHooks: string[];
};

export type TownLocation = {
  id: string;
  name: string;
  description: string;
  locationType: "shop" | "inn" | "guild" | "square" | "shrine";
  characters: TownCharacter[];
  tags: string[];
};

export type TileTemplate = {
  zone: ZoneType;
  name: string;
  description: string;
  color: TileColor;
  defaultStatus: TileStatus;
  encounterPlaceholders: EncounterPlaceholder[];
  enemyPool: EnemySpawnEntry[];
  tags: string[];
};

export type TileFactoryCoord = {
  q: number;
  r: number;
};

export type TileFactoryContext = {
  coord: TileFactoryCoord;
  key: string;
  radius: number;
  distanceFromCenter: number;
  roll: number;
};

export type ExploreTile = {
  key: string;
  coord: TileFactoryCoord;
  zone: ZoneType;
  name: string;
  description: string;
  color: TileColor;
  status: TileStatus;
  encounterPlaceholders: EncounterPlaceholder[];
  enemyPool: EnemySpawnEntry[];
  locations: TownLocation[];
  tags: string[];
  metadata: Record<string, string | number | boolean>;
};

export type TileFactoryConfig = {
  templatesByZone: Record<ZoneType, TileTemplate>;
  chooseZone: (context: TileFactoryContext) => ZoneType;
  buildLocations?: (zone: ZoneType, context: TileFactoryContext) => TownLocation[];
  customizeTile?: (tile: ExploreTile, context: TileFactoryContext) => ExploreTile;
};

function createDefaultTownLocations(tileKey: string): TownLocation[] {
  return [
    {
      id: `${tileKey}:market-square`,
      name: "Market Square",
      description: "A busy square where locals trade gossip, goods, and warnings.",
      locationType: "square",
      characters: [],
      tags: ["trade", "rumors"],
    },
    {
      id: `${tileKey}:drifters-rest`,
      name: "Drifter's Rest",
      description: "An inn where travelers leave maps, debts, and half-true stories.",
      locationType: "inn",
      characters: [],
      tags: ["rest", "leads"],
    },
    {
      id: `${tileKey}:copper-anvil`,
      name: "Copper Anvil",
      description: "A cramped smithy where tools, armor, and odd artifacts get patched.",
      locationType: "shop",
      characters: [],
      tags: ["crafting", "upgrades"],
    },
  ];
}

function chooseDefaultZoneByRoll(roll: number): ZoneType {
  if (roll < 0.22) {
    return "forest";
  }

  if (roll < 0.42) {
    return "farmland";
  }

  if (roll < 0.62) {
    return "mountain";
  }

  if (roll < 0.82) {
    return "ocean";
  }

  return "town";
}

export function createDefaultTileFactoryConfig(): TileFactoryConfig {
  const templatesByZone: Record<ZoneType, TileTemplate> = {
    forest: {
      zone: "forest",
      name: "Whisperwood",
      description: "Dense groves hide old ruins, beasts, and overgrown tracks.",
      color: [0.19, 0.48, 0.22, 1],
      defaultStatus: "unvisited",
      encounterPlaceholders: [
        { id: "wolf-pack", weight: 3, tags: ["beast", "combat"] },
        { id: "lost-scout", weight: 2, tags: ["npc", "encounter"] },
      ],
      enemyPool: [
        { enemyId: "enemy:slime-raider", weight: 3 },
        { enemyId: "enemy:goblin-hexer", weight: 1 },
      ],
      tags: ["wild", "green"],
    },
    mountain: {
      zone: "mountain",
      name: "Shale Peaks",
      description: "Craggy heights with thin air, narrow paths, and hidden ore seams.",
      color: [0.5, 0.5, 0.53, 1],
      defaultStatus: "unvisited",
      encounterPlaceholders: [
        { id: "stone-raider", weight: 2, tags: ["combat", "ambush"] },
        { id: "collapsed-pass", weight: 1, tags: ["hazard", "encounter"] },
      ],
      enemyPool: [
        { enemyId: "enemy:goblin-hexer", weight: 3 },
        { enemyId: "enemy:slime-raider", weight: 1 },
      ],
      tags: ["elevated", "harsh"],
    },
    farmland: {
      zone: "farmland",
      name: "Golden Fields",
      description: "Patchwork farms and villages touched by trade roads.",
      color: [0.67, 0.56, 0.27, 1],
      defaultStatus: "unvisited",
      encounterPlaceholders: [
        { id: "bandit-tax", weight: 2, tags: ["combat", "human"] },
        { id: "harvest-fair", weight: 2, tags: ["event", "encounter"] },
      ],
      enemyPool: [
        { enemyId: "enemy:goblin-hexer", weight: 2 },
        { enemyId: "enemy:slime-raider", weight: 2 },
      ],
      tags: ["civilized", "roads"],
    },
    town: {
      zone: "town",
      name: "Waypost",
      description: "A small hub for caravans, repairs, and rumors of the frontier.",
      color: [0.45, 0.35, 0.2, 1],
      defaultStatus: "unvisited",
      encounterPlaceholders: [
        { id: "market-brawl", weight: 1, tags: ["combat", "urban"] },
        { id: "guild-contract", weight: 3, tags: ["quest", "encounter"] },
      ],
      enemyPool: [
        { enemyId: "enemy:goblin-hexer", weight: 1 },
      ],
      tags: ["safe-ish", "services"],
    },
    ocean: {
      zone: "ocean",
      name: "Salt Expanse",
      description: "Open waters, storm fronts, and drifting wreckage.",
      color: [0.17, 0.36, 0.64, 1],
      defaultStatus: "unvisited",
      encounterPlaceholders: [
        { id: "reef-serpent", weight: 1, tags: ["combat", "beast"] },
        { id: "drifter-cache", weight: 2, tags: ["loot", "encounter"] },
      ],
      enemyPool: [
        { enemyId: "enemy:slime-raider", weight: 2 },
      ],
      tags: ["nautical", "open"],
    },
  };

  return {
    templatesByZone,
    chooseZone: (context) => {
      if (context.distanceFromCenter === 0) {
        return "town";
      }

      return chooseDefaultZoneByRoll(context.roll);
    },
    buildLocations: (zone, context) => {
      if (zone !== "town") {
        return [];
      }

      return createDefaultTownLocations(context.key);
    },
  };
}

function cloneTemplateData(template: TileTemplate): Omit<ExploreTile, "key" | "coord"> {
  return {
    zone: template.zone,
    name: template.name,
    description: template.description,
    color: [template.color[0], template.color[1], template.color[2], template.color[3]],
    status: template.defaultStatus,
    encounterPlaceholders: template.encounterPlaceholders.map((entry) => ({
      id: entry.id,
      weight: entry.weight,
      tags: [...entry.tags],
    })),
    enemyPool: template.enemyPool.map((entry) => ({
      enemyId: entry.enemyId,
      weight: entry.weight,
    })),
    locations: [],
    tags: [...template.tags],
    metadata: {},
  };
}

export function createTileFromFactory(
  config: TileFactoryConfig,
  context: TileFactoryContext,
): ExploreTile {
  const zone = config.chooseZone(context);
  const template = config.templatesByZone[zone];

  const baseTile: ExploreTile = {
    key: context.key,
    coord: { q: context.coord.q, r: context.coord.r },
    ...cloneTemplateData(template),
  };

  const buildLocations = config.buildLocations;
  if (buildLocations !== undefined) {
    baseTile.locations = buildLocations(zone, context).map((location) => ({
      ...location,
      characters: location.characters.map((character) => ({
        ...character,
        questHooks: [...character.questHooks],
      })),
      tags: [...location.tags],
    }));
  }

  if (!config.customizeTile) {
    return baseTile;
  }

  return config.customizeTile(baseTile, context);
}
