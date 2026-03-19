export type PlayerRollConversionKind =
  | "to-critical-hit"
  | "to-critical-miss"
  | "shift-power";

export type PlayerRollConversionRequest =
  | {
      kind: "to-critical-hit";
      description: string;
    }
  | {
      kind: "to-critical-miss";
      description: string;
    }
  | {
      kind: "shift-power";
      shift: -1 | 1;
      description: string;
    };

export type QueuedPlayerRollConversion = PlayerRollConversionRequest & {
  id: string;
  sourceDieId: string;
  sourceSideId: string;
};
