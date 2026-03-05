import { DealDamageFace } from "./DealDamageFace";

export class SwordSlashFace extends DealDamageFace {
  constructor(id: string) {
    super(id, "Sword Slash", 1);
  }
}
