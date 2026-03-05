import { HealSelf } from "../abilities/HealSelf";

export class RestorationCharm extends HealSelf {
  constructor(id: string) {
    super(id, "Restoration Charm", 2);
  }
}
