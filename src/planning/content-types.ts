import type { PlannerRequirementKind } from "./game-planner";
import type { ZoneType } from "../exploration/explore-state";

export type NpcResidenceBuilding = "shop" | "inn" | "guild" | "square" | "shrine";

export type ContentNpc = {
  id: string;
  name: string;
  role: string;
  defaultZone: ZoneType;
  residenceBuilding: NpcResidenceBuilding;
  notes: string;
  standardDialog: string[];
};

export type ContentTile = {
  id: string;
  name: string;
  zone: ZoneType;
  unique: boolean;
  isTemplate?: boolean;
  description?: string;
  color?: [number, number, number, number];
  defaultStatus?: "unvisited" | "visited" | "active";
  encounterPlaceholders?: Array<{
    id: string;
    weight: number;
    tags: string[];
  }>;
  enemyPool?: Array<{
    enemyId: string;
    weight: number;
  }>;
  tags: string[];
  enemyIds?: string[];
};

export type EnemyTag = string;

export type EnemyType = string;

export type ContentEnemyAbilityStub = {
  id: string;
  kind: string;
  metadata: Record<string, string | number | boolean>;
};

export type ContentEnemy = {
  id: string;
  name: string;
  level: number;
  hp: number;
  tags: EnemyTag[];
  types: EnemyType[];
  abilities: ContentEnemyAbilityStub[];
  dice: string[];
};

export type ItemSlot =
  | "armor"
  | "ring-1"
  | "ring-2"
  | "necklace"
  | "trinket"
  | "cloak"
  | "helmet"
  | "weapon-1"
  | "weapon-2"
  | "inventory";

export type ContentItem = {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: number;
  slot: ItemSlot;
  diceId?: string;
};

export type ContentRequirementTemplate = {
  id: string;
  kind: PlannerRequirementKind;
  description: string;
  minCount?: number;
  tags: string[];
  metadata: Record<string, string | number | boolean>;
};

export type QuestObjective =
  | {
      id: string;
      kind: "kill-enemy";
      description: string;
      enemyIds: readonly string[];
      targetCount: number;
    }
  | {
      id: string;
      kind: "collect-item";
      description: string;
      itemIds: readonly string[];
      targetCount: number;
    }
  | {
      id: string;
      kind: "visit-tile";
      description: string;
      tileIds?: readonly string[];
      zone?: ZoneType;
      targetCount: number;
      goToTileHint?: string;
    };

export type ContentQuest = {
  id: string;
  name: string;
  summary: string;
  category: "main" | "side" | "town";
  offerNpcId?: string;
  turnInNpcId?: string;
  objectives: QuestObjective[];
  worldRequirements: ContentRequirementTemplate[];
};

export type ContentBigBad = {
  id: string;
  name: string;
  summary: string;
  mainQuestId: string;
  sideQuestIds: string[];
  townQuestIds: string[];
  mandatorySideQuestIds: string[];
  specialTileId: string;
  eventCollectionId: string;
};
