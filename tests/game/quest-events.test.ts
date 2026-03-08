import {
  recordEnemyDefeated,
  recordItemCollected,
  recordNpcInteracted,
  recordTileVisited,
} from "../../src/planning/quest-events";
import {
  acceptQuest,
  getQuestState,
  resetQuestLogForNewRun,
} from "../../src/planning/quest-log";

describe("quest-events", () => {
  beforeEach(() => {
    resetQuestLogForNewRun();
  });

  it("tracks kill-enemy objective progress and clamps at target", () => {
    acceptQuest("town:big-scary-wolf");

    recordEnemyDefeated("enemy:goblin-raider");
    recordEnemyDefeated("enemy:goblin-raider");
    recordEnemyDefeated("enemy:goblin-raider");
    recordEnemyDefeated("enemy:goblin-raider");

    const entry = getQuestState("town:big-scary-wolf");
    const objective = entry?.objectives.find((candidate) => candidate.id === "obj:hunt-forest-wolves");

    expect(objective?.currentCount).toBe(3);
    expect(objective?.completed).toBe(true);
    expect(entry?.status).toBe("ready-to-turn-in");
  });

  it("tracks collect-item objectives", () => {
    acceptQuest("side:sacred-tome");

    const changes = recordItemCollected("item:sacred-tome", 1);
    const entry = getQuestState("side:sacred-tome");
    const objective = entry?.objectives.find((candidate) => candidate.id === "obj:collect-sacred-tome");

    expect(changes.some((change) => change.objectiveId === "obj:collect-sacred-tome")).toBe(true);
    expect(objective?.currentCount).toBe(1);
    expect(objective?.completed).toBe(true);
    expect(entry?.status).toBe("in-progress");
  });

  it("tracks visit-tile objectives by zone", () => {
    acceptQuest("side:grave-sigil");

    recordTileVisited({ tileKey: "1,0", zone: "mountain" });
    recordTileVisited({ tileKey: "1,1", zone: "mountain" });

    const entry = getQuestState("side:grave-sigil");
    const objective = entry?.objectives.find((candidate) => candidate.id === "obj:visit-cursed-mountains");

    expect(objective?.currentCount).toBe(2);
    expect(objective?.completed).toBe(true);
    expect(entry?.status).toBe("completed");
  });

  it("tracks visit-tile objectives by special tile id", () => {
    acceptQuest("main:defeat-dracula");

    const changes = recordTileVisited({
      tileKey: "2,-1",
      zone: "mountain",
      specialTileId: "tile:draculas-castle",
    });

    const entry = getQuestState("main:defeat-dracula");
    const objective = entry?.objectives.find((candidate) => candidate.id === "obj:visit-castle");

    expect(changes.some((change) => change.objectiveId === "obj:visit-castle")).toBe(true);
    expect(objective?.currentCount).toBe(1);
    expect(objective?.completed).toBe(true);
  });

  it("only marks ready-to-turn-in after objectives are complete and npc is interacted", () => {
    acceptQuest("side:sacred-tome");

    const initialNpcResult = recordNpcInteracted("npc:castle-librarian");
    expect(initialNpcResult).toHaveLength(0);

    recordTileVisited({
      tileKey: "2,-1",
      zone: "mountain",
      specialTileId: "tile:draculas-castle",
    });
    recordItemCollected("item:sacred-tome", 1);

    const completeEntry = getQuestState("side:sacred-tome");
    expect(completeEntry?.status).toBe("ready-to-turn-in");

    const npcResult = recordNpcInteracted("npc:castle-librarian");
    expect(npcResult).toContain("side:sacred-tome");
  });
});
