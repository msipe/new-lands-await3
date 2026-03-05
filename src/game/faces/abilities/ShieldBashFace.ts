import { DealDamageFace } from "./DealDamageFace";

export class ShieldBashFace extends DealDamageFace {
  constructor(id: string) {
    super(id, "Shield Bash", 2);
  }
}
