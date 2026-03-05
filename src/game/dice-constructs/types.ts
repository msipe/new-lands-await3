import type { DieSide } from "../dice";

export type DieConstructMetadata = {
  tags?: string[];
  notes?: string;
};

export type DieSideBuilder = (sideId: string) => DieSide;

export type DieConstruct = {
  id: string;
  name: string;
  description: string;
  sideBuilders: DieSideBuilder[];
  metadata?: DieConstructMetadata;
};
