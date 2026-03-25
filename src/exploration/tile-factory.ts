import { listTiles } from "../planning/content-registry";

export type ZoneType = "forest" | "mountain" | "farmland" | "town" | "ocean";

export type TileStatus = "unvisited" | "visited" | "active";

export type TileColor = [number, number, number, number];

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
  explorationFlowId: string | null;
  flowLevel: number;
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

function toTileTemplateByZone(): Record<ZoneType, TileTemplate> {
  const templateEntries = listTiles().filter((tile) => tile.isTemplate === true);

  const templateMap: Partial<Record<ZoneType, TileTemplate>> = {};
  for (const tile of templateEntries) {
    if (
      tile.description === undefined ||
      tile.color === undefined ||
      tile.defaultStatus === undefined ||
      tile.enemyPool === undefined
    ) {
      throw new Error(`Tile template is missing required template fields: ${tile.id}`);
    }

    templateMap[tile.zone] = {
      zone: tile.zone,
      name: tile.name,
      description: tile.description,
      color: [tile.color[0], tile.color[1], tile.color[2], tile.color[3]],
      defaultStatus: tile.defaultStatus,
      enemyPool: tile.enemyPool.map((entry) => ({
        enemyId: entry.enemyId,
        weight: entry.weight,
      })),
      tags: [...tile.tags],
    };
  }

  const requiredZones: ZoneType[] = ["forest", "mountain", "farmland", "town", "ocean"];
  for (const zone of requiredZones) {
    if (templateMap[zone] === undefined) {
      throw new Error(`Missing tile template definition for zone: ${zone}`);
    }
  }

  return templateMap as Record<ZoneType, TileTemplate>;
}

export function createDefaultTileFactoryConfig(): TileFactoryConfig {
  const templatesByZone = toTileTemplateByZone();

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
    explorationFlowId: null,
    flowLevel: 0,
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
