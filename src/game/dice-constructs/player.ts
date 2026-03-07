import { ArcaneBurst } from "../faces/abilities/ArcaneBurst";
import { MinorMend } from "../faces/abilities/MinorMend";
import { ShieldBash } from "../faces/abilities/ShieldBash";
import { SwordSlash } from "../faces/abilities/SwordSlash";
import type { DieConstruct } from "./types";

export const PLAYER_DIE_CONSTRUCTS: DieConstruct[] = [
  {
    id: "spark-die",
    name: "Spark Die",
    description: "Reliable skirmish die with steady offense and chip sustain.",
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
