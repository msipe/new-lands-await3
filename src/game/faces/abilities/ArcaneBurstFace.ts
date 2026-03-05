import { DealDamageFace } from "./DealDamageFace";

export class ArcaneBurstFace extends DealDamageFace {
  constructor(id: string) {
    super(id, "Arcane Burst", 3);
  }
}
