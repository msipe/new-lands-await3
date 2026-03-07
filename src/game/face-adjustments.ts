import type { Die, DieSide } from "./dice";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentResult,
} from "./faces/FaceAdjustmentModel";
import { Face } from "./faces/Face";

export type FaceAdjustmentEntry = {
  dieId: string;
  sideId: string;
  operation: FaceAdjustmentOperation;
};

export type AppendFaceCopyEntry = {
  dieId: string;
  sourceSideId: string;
  newSideId: string;
};

export type RemoveFaceEntry = {
  dieId: string;
  sideId: string;
};

export type DieFaceOperation =
  | {
      kind: "adjust";
      entry: FaceAdjustmentEntry;
    }
  | {
      kind: "append-copy";
      entry: AppendFaceCopyEntry;
    }
  | {
      kind: "remove";
      entry: RemoveFaceEntry;
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

function asClonableFace(side: DieSide | undefined): Face | undefined {
  if (!side) {
    return undefined;
  }

  if (!(side instanceof Face)) {
    return undefined;
  }

  return side;
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

export function appendCopiedFaceEntry(dice: Die[], entry: AppendFaceCopyEntry): FaceAdjustmentResult {
  const die = dice.find((candidate) => candidate.id === entry.dieId);
  if (!die) {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Target die not found.",
    };
  }

  if (die.sides.some((side) => side.id === entry.newSideId)) {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Copied side id already exists.",
    };
  }

  const source = asClonableFace(die.sides.find((candidate) => candidate.id === entry.sourceSideId));
  if (!source) {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Source side is missing or not cloneable.",
    };
  }

  die.addSide(source.cloneWithId(entry.newSideId));
  return {
    applied: true,
    resourceDelta: 0,
  };
}

export function removeFaceEntry(dice: Die[], entry: RemoveFaceEntry): FaceAdjustmentResult {
  const die = dice.find((candidate) => candidate.id === entry.dieId);
  if (!die) {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Target die not found.",
    };
  }

  const sideExists = die.sides.some((candidate) => candidate.id === entry.sideId);
  if (!sideExists) {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Target side not found.",
    };
  }

  die.removeSide(entry.sideId);
  return {
    applied: true,
    resourceDelta: 0,
  };
}

export function applyDieFaceOperation(dice: Die[], operation: DieFaceOperation): FaceAdjustmentResult {
  switch (operation.kind) {
    case "adjust":
      return applyFaceAdjustmentEntry(dice, operation.entry);
    case "append-copy":
      return appendCopiedFaceEntry(dice, operation.entry);
    case "remove":
      return removeFaceEntry(dice, operation.entry);
    default:
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported die face operation.",
      };
  }
}

export function applyRecordedFaceAdjustments(dice: Die[], entries: FaceAdjustmentEntry[]): void {
  for (const entry of entries) {
    applyFaceAdjustmentEntry(dice, entry);
  }
}

export function applyRecordedDieFaceOperations(dice: Die[], operations: DieFaceOperation[]): void {
  for (const operation of operations) {
    applyDieFaceOperation(dice, operation);
  }
}
