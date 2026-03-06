import { ArmorGain } from "./ArmorGain";

export class Ironhide extends ArmorGain {
  constructor(id: string, armorGain: number) {
    super(id, "Ironhide", armorGain);
  }
}