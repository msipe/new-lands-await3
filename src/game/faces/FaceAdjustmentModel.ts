export enum FaceAdjustmentModalityType {
  Improve = "improve",
  Reduce = "reduce",
  Select = "select",
}

export type FaceAdjustmentPropertyModality =
  | {
      type: FaceAdjustmentModalityType.Improve;
      step: number;
      rate: number;
      min?: number;
      max?: number;
    }
  | {
      type: FaceAdjustmentModalityType.Reduce;
      step: number;
      rate: number;
      min?: number;
      max?: number;
    }
  | {
      type: FaceAdjustmentModalityType.Select;
      options: string[];
      multi: boolean;
      rate: number;
    };

export type FaceAdjustmentProperty = {
  id: string;
  label: string;
  description: string;
  value: number | string;
  improvementRate?: number;
  reductionRate?: number;
  modalities: FaceAdjustmentPropertyModality[];
};

export type FaceAdjustmentOperation =
  | {
      propertyId: string;
      type: FaceAdjustmentModalityType.Improve;
      steps?: number;
    }
  | {
      propertyId: string;
      type: FaceAdjustmentModalityType.Reduce;
      steps?: number;
    }
  | {
      propertyId: string;
      type: FaceAdjustmentModalityType.Select;
      value: string;
    };

export type FaceAdjustmentResult = {
  applied: boolean;
  resourceDelta: number;
  reason?: string;
};

export type FaceAdjustmentTextTokenDisplay = "value" | "label";

export type FaceAdjustmentTextTokenBinding = {
  propertyId: string;
  display: FaceAdjustmentTextTokenDisplay;
  tooltipKey?: string;
};

export type FaceAdjustmentTextTemplate = {
  template: string;
  bindings: Record<string, FaceAdjustmentTextTokenBinding>;
};
