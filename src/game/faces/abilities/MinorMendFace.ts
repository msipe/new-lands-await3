import { HealSelfFace } from "./HealSelfFace";

export class MinorMendFace extends HealSelfFace {
  constructor(id: string) {
    super(id, "Minor Mend", 1);
  }
}
