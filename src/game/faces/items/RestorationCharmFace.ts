import { HealSelfFace } from "../abilities/HealSelfFace";

export class RestorationCharmFace extends HealSelfFace {
  constructor(id: string) {
    super(id, "Restoration Charm", 2);
  }
}
