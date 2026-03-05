import { DealDamage } from "./DealDamage";

export class ArcaneBurst extends DealDamage {
  constructor(id: string) {
    super(id, "Arcane Burst", 3);
  }
}
