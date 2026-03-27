import { MinorMend } from "../faces/abilities/MinorMend";
import { ShieldBash } from "../faces/abilities/ShieldBash";
import { SwordSlash } from "../faces/abilities/SwordSlash";
import type { DieConstruct } from "./types";

export const ENEMY_DIE_CONSTRUCTS: DieConstruct[] = [
  {
    id: "slime-claw",
    name: "Slime Claw",
    description: "Heavy-handed slime swipe with occasional sustain.",
    energyCost: 1,
    metadata: { tags: ["enemy", "slime"] },
    sideBuilders: [
      () => new ShieldBash(),
      () => new ShieldBash(),
      () => new SwordSlash(),
      () => new MinorMend(),
      () => new SwordSlash(),
      () => new ShieldBash(),
    ],
  },
  {
    id: "slime-jab",
    name: "Slime Jab",
    description: "Quick poke die with low but consistent pressure.",
    energyCost: 1,
    metadata: { tags: ["enemy", "slime"] },
    sideBuilders: [
      () => new SwordSlash(),
      () => new SwordSlash(),
      () => new ShieldBash(),
      () => new MinorMend(),
      () => new SwordSlash(),
      () => new MinorMend(),
    ],
  },
  {
    id: "slime-ooze",
    name: "Slime Ooze",
    description: "Recovery-focused die that can still peck at opponents.",
    energyCost: 1,
    metadata: { tags: ["enemy", "slime", "support"] },
    sideBuilders: [
      () => new MinorMend(),
      () => new MinorMend(),
      () => new SwordSlash(),
      () => new ShieldBash(),
      () => new MinorMend(),
      () => new SwordSlash(),
    ],
  },
  {
    id: "hex-bolt",
    name: "Hex Bolt",
    description: "Hexer die that leans into heavier hits.",
    energyCost: 1,
    metadata: { tags: ["enemy", "goblin"] },
    sideBuilders: [
      () => new ShieldBash(),
      () => new SwordSlash(),
      () => new ShieldBash(),
      () => new MinorMend(),
      () => new ShieldBash(),
      () => new SwordSlash(),
    ],
  },
  {
    id: "knife-toss",
    name: "Knife Toss",
    description: "Fast dagger tosses with intermittent defense.",
    energyCost: 1,
    metadata: { tags: ["enemy", "goblin"] },
    sideBuilders: [
      () => new SwordSlash(),
      () => new SwordSlash(),
      () => new MinorMend(),
      () => new ShieldBash(),
      () => new SwordSlash(),
      () => new ShieldBash(),
    ],
  },
  {
    id: "brew-sip",
    name: "Brew Sip",
    description: "Potion sip die that patches up allies while poking.",
    energyCost: 1,
    metadata: { tags: ["enemy", "goblin", "support"] },
    sideBuilders: [
      () => new MinorMend(),
      () => new MinorMend(),
      () => new SwordSlash(),
      () => new MinorMend(),
      () => new ShieldBash(),
      () => new SwordSlash(),
    ],
  },
];
