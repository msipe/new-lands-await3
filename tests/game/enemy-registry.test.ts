import { createDefaultTileFactoryConfig } from "../../src/exploration/tile-factory";
import { getEnemyById, getTileById, listEnemies } from "../../src/planning/content-registry";

describe("enemy registry", () => {
  it("loads enemies with expected required properties", () => {
    const enemies = listEnemies();

    expect(enemies.length).toBeGreaterThan(0);

    for (const enemy of enemies) {
      expect(enemy.id.length).toBeGreaterThan(0);
      expect(enemy.name.length).toBeGreaterThan(0);
      expect(enemy.level).toBeGreaterThan(0);
      expect(enemy.hp).toBeGreaterThan(0);
      expect(Array.isArray(enemy.tags)).toBe(true);
      expect(Array.isArray(enemy.types)).toBe(true);
      expect(Array.isArray(enemy.abilities)).toBe(true);
      expect(enemy.dice.length).toBeGreaterThan(0);
      for (const dieId of enemy.dice) {
        expect(dieId.length).toBeGreaterThan(0);
      }
    }
  });

  it("resolves tile enemy IDs and default tile pools against known enemies", () => {
    const defaults = createDefaultTileFactoryConfig();

    for (const template of Object.values(defaults.templatesByZone)) {
      expect(template.enemyPool.length).toBeGreaterThan(0);
      for (const entry of template.enemyPool) {
        expect(entry.weight).toBeGreaterThanOrEqual(0);
        expect(() => getEnemyById(entry.enemyId)).not.toThrow();
      }
    }

    const castle = getTileById("tile:draculas-castle");
    expect(castle.enemyIds?.length ?? 0).toBeGreaterThan(0);
    for (const enemyId of castle.enemyIds ?? []) {
      expect(() => getEnemyById(enemyId)).not.toThrow();
    }
  });
});
