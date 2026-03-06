import { DealDamage } from "./DealDamage";

export class Miss extends DealDamage {
  constructor(id: string) {
    super(id, "Whiff!", 0);
  }
}
