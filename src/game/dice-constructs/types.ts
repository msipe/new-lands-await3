import type { DieSide, DieTint } from "../dice";

export type DieConstructMetadata = {
  tags?: string[];
  notes?: string;
};

export type DieSideBuilder = () => DieSide;

export type DieConstruct = {
  id: string;
  name: string;
  description: string;
  energyCost: number;
  sideBuilders: DieSideBuilder[];
  metadata?: DieConstructMetadata;
  tint?: DieTint;
};
