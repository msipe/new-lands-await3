import { HealSelf } from "./HealSelf";

export class MinorMend extends HealSelf {
  constructor(id: string) {
    super(id, "Minor Mend", 1);
  }
}
