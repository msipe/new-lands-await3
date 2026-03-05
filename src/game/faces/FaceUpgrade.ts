export type FaceUpgrade =
  | {
      type: "numeric-plus-1";
    }
  | {
      type: "damage-plus";
      amount: number;
    }
  | {
      type: "heal-plus";
      amount: number;
    }
  | {
      type: "scaling-step-plus";
      amount: number;
    };
