import { DealSelfDamage } from "../faces/abilities/DealSelfDamage";
import { Miss } from "../faces/abilities/Miss";
import { MinorMend } from "../faces/abilities/MinorMend";
import { ShieldBash } from "../faces/abilities/ShieldBash";
import { SwordSlash } from "../faces/abilities/SwordSlash";
import type { DieConstruct } from "./types";

export const ITEM_DIE_CONSTRUCTS: DieConstruct[] = [
  {
    id: "rusty-sword-die",
    name: "Rusty Sword Die",
    description: "A weathered blade with simple but dependable attack faces.",
    metadata: { tags: ["item", "weapon", "starter"] },
    sideBuilders: [
      (sideId) => new DealSelfDamage(sideId, "Hit yourself!", 1),
      (sideId) => new Miss(sideId),
      (sideId) => new Miss(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new SwordSlash(sideId),
    ],
  },
  {
    id: "wooden-shield-die",
    name: "Wooden Shield Die",
    description: "A defensive die focused on blocks with occasional counter hits.",
    metadata: { tags: ["item", "shield", "starter"] },
    sideBuilders: [
      (sideId) => new Miss(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new MinorMend(sideId),
    ],
  },
  {
    id: "patched-armor-die",
    name: "Patched Armor Die",
    description: "A survivability die that leans into sustain and resilience.",
    metadata: { tags: ["item", "armor", "starter"] },
    sideBuilders: [
      (sideId) => new Miss(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
    ],
  },
];
