import { DealDamage } from "./DealDamage";

export class ShieldBash extends DealDamage {
  constructor(id: string) {
    super(id, "Shield Bash", 2);
  }
}
