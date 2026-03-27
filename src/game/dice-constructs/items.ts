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
    energyCost: 0,
    metadata: { tags: ["item", "weapon", "starter"] },
    sideBuilders: [
      () => new DealSelfDamage("Hit yourself!", 1),
      () => new Miss(),
      () => new Miss(),
      () => new SwordSlash(),
      () => new SwordSlash(),
      () => new SwordSlash(),
    ],
  },
  {
    id: "wooden-shield-die",
    name: "Wooden Shield Die",
    description: "A defensive die focused on blocks with occasional counter hits.",
    energyCost: 0,
    metadata: { tags: ["item", "shield", "starter"] },
    sideBuilders: [
      () => new Miss(),
      () => new ShieldBash(),
      () => new MinorMend(),
      () => new ShieldBash(),
      () => new SwordSlash(),
      () => new MinorMend(),
    ],
  },
  {
    id: "patched-armor-die",
    name: "Patched Armor Die",
    description: "A survivability die that leans into sustain and resilience.",
    energyCost: 0,
    metadata: { tags: ["item", "armor", "starter"] },
    sideBuilders: [
      () => new Miss(),
      () => new ShieldBash(),
      () => new MinorMend(),
      () => new MinorMend(),
      () => new ShieldBash(),
      () => new SwordSlash(),
    ],
  },
];
