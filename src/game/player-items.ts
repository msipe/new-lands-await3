export type EquipmentSlotId =
  | "armor"
  | "ring-1"
  | "ring-2"
  | "necklace"
  | "trinket"
  | "cloak"
  | "helmet"
  | "weapon-1"
  | "weapon-2";

export const EQUIPMENT_SLOT_ORDER: EquipmentSlotId[] = [
  "armor",
  "ring-1",
  "ring-2",
  "necklace",
  "trinket",
  "cloak",
  "helmet",
  "weapon-1",
  "weapon-2",
];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotId, string> = {
  armor: "Armor",
  "ring-1": "Ring 1",
  "ring-2": "Ring 2",
  necklace: "Necklace",
  trinket: "Trinket",
  cloak: "Cloak",
  helmet: "Helmet",
  "weapon-1": "Weapon 1",
  "weapon-2": "Weapon 2",
};

export type PlayerItemSlot = EquipmentSlotId | "inventory";

export type PlayerItem = {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: number;
  slot: PlayerItemSlot;
  // Equipment maps to dice in combat; this links to the die construct.
  diceId?: string;
};

export type EquippedItems = Record<EquipmentSlotId, PlayerItem | undefined>;

export type PlayerInventoryState = {
  equipped: EquippedItems;
  inventory: PlayerItem[];
};

export function createEmptyEquippedItems(): EquippedItems {
  return {
    armor: undefined,
    "ring-1": undefined,
    "ring-2": undefined,
    necklace: undefined,
    trinket: undefined,
    cloak: undefined,
    helmet: undefined,
    "weapon-1": undefined,
    "weapon-2": undefined,
  };
}

export function createInitialInventoryState(): PlayerInventoryState {
  return {
    equipped: createEmptyEquippedItems(),
    inventory: [],
  };
}
