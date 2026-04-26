import { ArcaneBurst } from "../faces/abilities/ArcaneBurst";
import { MinorMend } from "../faces/abilities/MinorMend";
import { ShieldBash } from "../faces/abilities/ShieldBash";
import { SwordSlash } from "../faces/abilities/SwordSlash";
import { Warcry } from "../faces/abilities/Warcry";
import type { DieConstruct } from "./types";

export const PLAYER_DIE_CONSTRUCTS: DieConstruct[] = [
  {
    id: "killing-machine-die",
    name: "Killing Machine Die",
    description: "A supercharged rage die born from frenzied slaughter.",
    energyCost: 0,
    tint: { r: 0.72, g: 0.10, b: 0.10 },
    metadata: { tags: ["berserker"] },
    sideBuilders: [
      () => new Warcry(0),
      () => new Warcry(2),
      () => new Warcry(4),
    ],
  },
  {
    id: "rage-die",
    name: "Rage Die",
    description: "Channel rage into bonus attack damage this round.",
    energyCost: 0,
    tint: { r: 0.88, g: 0.18, b: 0.18 },
    metadata: { tags: ["berserker", "fleeting"] },
    sideBuilders: [
      () => new Warcry(0),
      () => new Warcry(1),
      () => new Warcry(2),
    ],
  },
  {
    id: "spark-die",
    name: "Spark Die",
    description: "Reliable skirmish die with steady offense and chip sustain.",
    energyCost: 1,
    metadata: { tags: ["starter", "balanced"] },
    sideBuilders: [
      () => new ShieldBash(),
      () => new SwordSlash(),
      () => new SwordSlash(),
      () => new ArcaneBurst(),
      () => new MinorMend(),
      () => new ShieldBash(),
    ],
  },
  {
    id: "ward-die",
    name: "Ward Die",
    description: "Aggressive starter die that favors frequent damage rolls.",
    energyCost: 1,
    metadata: { tags: ["starter", "aggressive"] },
    sideBuilders: [
      () => new SwordSlash(),
      () => new SwordSlash(),
      () => new ShieldBash(),
      () => new ArcaneBurst(),
      () => new SwordSlash(),
      () => new MinorMend(),
    ],
  },
  {
    id: "mend-die",
    name: "Mend Die",
    description: "Stabilizing starter die with sustain and defensive pressure.",
    energyCost: 1,
    metadata: { tags: ["starter", "support"] },
    sideBuilders: [
      () => new MinorMend(),
      () => new ShieldBash(),
      () => new MinorMend(),
      () => new SwordSlash(),
      () => new ArcaneBurst(),
      () => new MinorMend(),
    ],
  },
];
