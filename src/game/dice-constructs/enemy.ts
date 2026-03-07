import { MinorMend } from "../faces/abilities/MinorMend";
import { ShieldBash } from "../faces/abilities/ShieldBash";
import { SwordSlash } from "../faces/abilities/SwordSlash";
import type { DieConstruct } from "./types";

export const ENEMY_DIE_CONSTRUCTS: DieConstruct[] = [
  {
    id: "slime-claw",
    name: "Slime Claw",
    description: "Heavy-handed slime swipe with occasional sustain.",
    metadata: { tags: ["enemy", "slime"] },
    sideBuilders: [
      (sideId) => new ShieldBash(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ShieldBash(sideId),
    ],
  },
  {
    id: "slime-jab",
    name: "Slime Jab",
    description: "Quick poke die with low but consistent pressure.",
    metadata: { tags: ["enemy", "slime"] },
    sideBuilders: [
      (sideId) => new SwordSlash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new MinorMend(sideId),
    ],
  },
  {
    id: "slime-ooze",
    name: "Slime Ooze",
    description: "Recovery-focused die that can still peck at opponents.",
    metadata: { tags: ["enemy", "slime", "support"] },
    sideBuilders: [
      (sideId) => new MinorMend(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new SwordSlash(sideId),
    ],
  },
  {
    id: "hex-bolt",
    name: "Hex Bolt",
    description: "Hexer die that leans into heavier hits.",
    metadata: { tags: ["enemy", "goblin"] },
    sideBuilders: [
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
    ],
  },
  {
    id: "knife-toss",
    name: "Knife Toss",
    description: "Fast dagger tosses with intermittent defense.",
    metadata: { tags: ["enemy", "goblin"] },
    sideBuilders: [
      (sideId) => new SwordSlash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ShieldBash(sideId),
    ],
  },
  {
    id: "brew-sip",
    name: "Brew Sip",
    description: "Potion sip die that patches up allies while poking.",
    metadata: { tags: ["enemy", "goblin", "support"] },
    sideBuilders: [
      (sideId) => new MinorMend(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
    ],
  },
];
