import { DealDamage } from "./DealDamage";

export class SwordSlash extends DealDamage {
  constructor(id: string) {
    super(id, "Sword Slash", 1);
  }
}
