import type { Die, DieSide } from "./dice";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentResult,
} from "./faces/FaceAdjustmentModel";

export type FaceAdjustmentEntry = {
  dieId: string;
  sideId: string;
  operation: FaceAdjustmentOperation;
};

type AdjustableDieSide = DieSide & {
  applyAdjustment: (operation: FaceAdjustmentOperation) => FaceAdjustmentResult;
};

function asAdjustableDieSide(side: DieSide | undefined): AdjustableDieSide | undefined {
  if (!side) {
    return undefined;
  }

  const candidate = side as Partial<AdjustableDieSide>;
  if (typeof candidate.applyAdjustment !== "function") {
    return undefined;
  }

  return candidate as AdjustableDieSide;
}

export function applyFaceAdjustmentEntry(
  dice: Die[],
  entry: FaceAdjustmentEntry,
): FaceAdjustmentResult {
  const die = dice.find((candidate) => candidate.id === entry.dieId);
  if (!die) {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Target die not found.",
    };
  }

  const side = asAdjustableDieSide(die.sides.find((candidate) => candidate.id === entry.sideId));
  if (!side) {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Target die side is missing or not adjustable.",
    };
  }

  return side.applyAdjustment(entry.operation);
}

export function applyRecordedFaceAdjustments(dice: Die[], entries: FaceAdjustmentEntry[]): void {
  for (const entry of entries) {
    applyFaceAdjustmentEntry(dice, entry);
  }
}
