import { ArcaneBurst } from "../faces/abilities/ArcaneBurst";
import { MinorMend } from "../faces/abilities/MinorMend";
import { ShieldBash } from "../faces/abilities/ShieldBash";
import { SwordSlash } from "../faces/abilities/SwordSlash";
import { Warcry } from "../faces/abilities/Warcry";
import type { DieConstruct } from "./types";

export const PLAYER_DIE_CONSTRUCTS: DieConstruct[] = [
  {
    id: "rage-die",
    name: "Rage Die",
    description: "Channel rage into bonus attack damage this round.",
    energyCost: 0,
    tint: { r: 0.88, g: 0.18, b: 0.18 },
    metadata: { tags: ["berserker", "fleeting"] },
    sideBuilders: [
      (sideId) => new Warcry(sideId, 0),
      (sideId) => new Warcry(sideId, 1),
      (sideId) => new Warcry(sideId, 2),
    ],
  },
  {
    id: "spark-die",
    name: "Spark Die",
    description: "Reliable skirmish die with steady offense and chip sustain.",
    energyCost: 1,
    metadata: { tags: ["starter", "balanced"] },
    sideBuilders: [
      (sideId) => new ShieldBash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ArcaneBurst(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new ShieldBash(sideId),
    ],
  },
  {
    id: "ward-die",
    name: "Ward Die",
    description: "Aggressive starter die that favors frequent damage rolls.",
    energyCost: 1,
    metadata: { tags: ["starter", "aggressive"] },
    sideBuilders: [
      (sideId) => new SwordSlash(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new ArcaneBurst(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new MinorMend(sideId),
    ],
  },
  {
    id: "mend-die",
    name: "Mend Die",
    description: "Stabilizing starter die with sustain and defensive pressure.",
    energyCost: 1,
    metadata: { tags: ["starter", "support"] },
    sideBuilders: [
      (sideId) => new MinorMend(sideId),
      (sideId) => new ShieldBash(sideId),
      (sideId) => new MinorMend(sideId),
      (sideId) => new SwordSlash(sideId),
      (sideId) => new ArcaneBurst(sideId),
      (sideId) => new MinorMend(sideId),
    ],
  },
];
