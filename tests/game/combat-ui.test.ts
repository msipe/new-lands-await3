import {
  consumeRequestedPlayerTurnEnd,
  createCombatUiState,
  enqueueCombatResolutionPopups,
  isCombatInspectorOpen,
  onCombatMousePressed,
  onCombatMouseReleased,
  updateCombatUiState,
  drainSettledPlayerDieIds,
  fastForwardCombatUi,
} from "../../src/combat-ui";
import { createCombatEncounter, resolveNextEnemyDie } from "../../src/game/combat-encounter";

describe("combat ui", () => {
  beforeAll(() => {
    const loveMock = {
      graphics: {
        getWidth: () => 1120,
        getHeight: () => 620,
      },
    };

    (global as unknown as { love: unknown }).love = loveMock;
  });

  it("cancels drag-to-skip when released outside arena", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, 0, 0, 1);

    expect(die.state).toBe("parked");
    expect(uiState.enemyParkedDice).toHaveLength(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(0);
  });

  it("fast-forwards enemy presentation when dropped in arena during enemy turn", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    const dropX = uiState.layout.arenaX + 40;
    const dropY = uiState.layout.arenaY + 40;

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, dropX, dropY, 1);

    expect(uiState.enemyArenaDice).toHaveLength(0);
    expect(uiState.enemyPendingDice).toHaveLength(0);
    expect(uiState.enemyParkedDice.length).toBeGreaterThan(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(encounter.state.round);
  });

  it("keeps enemy dice in arena until all enemy dice settle", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);

    uiState.enemyPendingDice = [];
    uiState.enemyParkedDice = [];
    uiState.enemyArenaDice = [
      {
        id: "enemy-a",
        owner: "enemy",
        combatDieId: "enemy-die-1",
        label: "Shield Bash",
        x: 260,
        y: 240,
        vx: 0,
        vy: 0,
        angle: 0,
        spin: 0,
        size: 46,
        state: "arena",
        parkX: 880,
        parkY: 90,
        parkSize: 36,
        faceLocked: false,
      },
      {
        id: "enemy-b",
        owner: "enemy",
        combatDieId: "enemy-die-2",
        label: "Sword Slash",
        x: 330,
        y: 260,
        vx: 260,
        vy: 70,
        angle: 0,
        spin: 4,
        size: 46,
        state: "arena",
        parkX: 930,
        parkY: 90,
        parkSize: 36,
        faceLocked: false,
      },
    ];

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.enemyArenaDice).toHaveLength(2);
    expect(uiState.enemyParkedDice).toHaveLength(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(0);

    uiState.enemyArenaDice[1].vx = 0;
    uiState.enemyArenaDice[1].vy = 0;
    uiState.enemyArenaDice[1].spin = 0;

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.enemyArenaDice).toHaveLength(2);
    expect(uiState.enemyParkedDice).toHaveLength(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(0);

    updateCombatUiState(uiState, encounter.state, uiState.enemySettleDelay + 0.05);

    expect(uiState.enemyArenaDice).toHaveLength(0);
    expect(uiState.enemyParkedDice).toHaveLength(2);
    expect(uiState.enemyThrowResolvedForRound).toBe(encounter.state.round);
  });

  it("commits settled player dice immediately", () => {
    const encounter = createCombatEncounter();
    while (encounter.state.phase === "enemy-turn") {
      resolveNextEnemyDie(encounter.state, encounter.eventBus);
    }

    const uiState = createCombatUiState(encounter.state);

    for (let index = 0; index < uiState.playerDice.length; index += 1) {
      const die = uiState.playerDice[index];
      onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
      onCombatMouseReleased(
        uiState,
        encounter.state,
        uiState.layout.arenaX + 80 + index * 60,
        uiState.layout.arenaY + 80,
        1,
      );
    }

    for (const die of uiState.arenaPlayerDice) {
      die.vx = 0;
      die.vy = 0;
      die.spin = 0;
    }

    const thrownCount = uiState.pendingPlayerDieIds.length;
    expect(thrownCount).toBeGreaterThan(0);

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.readyPlayerDieIds).toHaveLength(thrownCount);
    expect(drainSettledPlayerDieIds(uiState)).toHaveLength(thrownCount);
  });

  it("queues throw during enemy turn and executes it when player turn is available", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    const dropX = uiState.layout.arenaX + 70;
    const dropY = uiState.layout.arenaY + 90;

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, dropX, dropY, 1);

    expect(uiState.queuedPlayerThrow?.dieId).toBe(die.id);

    encounter.state.phase = "player-turn";
    uiState.pendingRound = undefined;

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.queuedPlayerThrow).toBeUndefined();
    expect(uiState.arenaPlayerDice.find((entry) => entry.id === die.id)).toBeDefined();
    expect(uiState.rolledPlayerDieIds).toContain(die.combatDieId);
  });

  it("preserves queued throw through pending-round finalize", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    const dropX = uiState.layout.arenaX + 95;
    const dropY = uiState.layout.arenaY + 110;

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, dropX, dropY, 1);

    expect(uiState.queuedPlayerThrow?.dieId).toBe(die.id);
    expect(die.state).toBe("parked");

    encounter.state.phase = "player-turn";
    uiState.pendingRound = encounter.state.round;

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.queuedPlayerThrow).toBeUndefined();
    expect(uiState.pendingRound).toBeUndefined();
    expect(uiState.arenaPlayerDice.find((entry) => entry.id === die.id)).toBeDefined();
    expect(uiState.rolledPlayerDieIds).toContain(die.combatDieId);
  });

  it("does not respawn enemy throw during pending-round finalize", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);

    // Simulate entering a new round already in enemy-turn while a throw preview is active.
    uiState.pendingRound = encounter.state.round;
    uiState.playerResetTimer = uiState.playerResetDelay + 5;
    uiState.enemyThrowResolvedForRound = 0;
    uiState.enemyPendingDice = [];
    uiState.enemyParkedDice = [];
    uiState.enemyArenaDice = [
      {
        id: "preserve-enemy-preview",
        owner: "enemy",
        combatDieId: "enemy-die-1",
        label: "Shield Bash",
        x: 300,
        y: 220,
        vx: 0,
        vy: 0,
        angle: 0,
        spin: 0,
        size: 46,
        state: "arena",
        parkX: 880,
        parkY: 90,
        parkSize: 36,
      },
    ];

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    const totalEnemyVisualDice =
      uiState.enemyArenaDice.length + uiState.enemyPendingDice.length + uiState.enemyParkedDice.length;

    expect(totalEnemyVisualDice).toBe(1);
    expect(
      [...uiState.enemyArenaDice, ...uiState.enemyPendingDice, ...uiState.enemyParkedDice].some(
        (die) => die.id === "preserve-enemy-preview",
      ),
    ).toBe(true);
  });

  it("allows throw when drag started in enemy turn but released in player turn", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);

    // Transition happens while die is still being held.
    encounter.state.phase = "player-turn";
    uiState.pendingRound = undefined;

    const dropX = uiState.layout.arenaX + 120;
    const dropY = uiState.layout.arenaY + 140;
    onCombatMouseReleased(uiState, encounter.state, dropX, dropY, 1);

    expect(uiState.queuedPlayerThrow).toBeUndefined();
    expect(uiState.arenaPlayerDice.find((entry) => entry.id === die.id)).toBeDefined();
    expect(uiState.rolledPlayerDieIds).toContain(die.combatDieId);
  });

  it("waits for authoritative player resolution labels before showing face text", () => {
    const encounter = createCombatEncounter();
    encounter.state.phase = "player-turn";
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    die.state = "arena";
    die.x = uiState.layout.arenaX + 120;
    die.y = uiState.layout.arenaY + 120;
    die.vx = 0;
    die.vy = 0;
    die.spin = 0;
    die.rollingLabel = "Sword Slash";

    uiState.arenaPlayerDice = [die];
    if (die.combatDieId) {
      uiState.pendingPlayerDieIds = [die.combatDieId];
      uiState.rolledPlayerDieIds = [die.combatDieId];
    }

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(die.label).toBe("Warcry Die");
    expect(die.displayLabel).toBeUndefined();
    expect(die.faceLocked).toBe(true);
    expect(uiState.floatingPopups).toHaveLength(0);

    enqueueCombatResolutionPopups(uiState, [
      {
        source: "player",
        dieId: die.combatDieId ?? "player-die-1",
        text: "+2 damage",
        sideLabel: "Sword Slash",
      },
    ]);

    expect(die.label).toBe("Sword Slash");
    expect(die.displayLabel).toBe("Sword Slash");
    expect(uiState.floatingPopups.some((popup) => popup.source === "player" && popup.text === "+2 damage")).toBe(true);
  });

  it("shows player popups from authoritative resolution events", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);

    const die = uiState.playerDice[0];
    die.label = "Sword Slash";

    enqueueCombatResolutionPopups(uiState, [
      {
        source: "player",
        dieId: die.combatDieId ?? "player-die-1",
        text: "+2 damage",
        sideLabel: "Sword Slash",
      },
    ]);

    expect(uiState.floatingPopups).toHaveLength(1);
    expect(uiState.floatingPopups[0].text).toBe("+2 damage");
  });

  it("spawns a transient attack die popup when requested", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const sourceDie = uiState.playerDice[0];
    sourceDie.state = "arena";
    sourceDie.x = uiState.layout.arenaX + 124;
    sourceDie.y = uiState.layout.arenaY + 102;
    sourceDie.vx = 90;
    sourceDie.vy = -30;
    uiState.arenaPlayerDice.push(sourceDie);

    enqueueCombatResolutionPopups(uiState, [
      {
        source: "player",
        dieId: sourceDie.combatDieId ?? "player-die-1",
        text: "Transient Sword Slash",
        spawnedDie: {
          constructId: "rusty-sword-die",
          dieLabel: "Rusty Sword Die",
          sideLabel: "Sword Slash",
        },
      },
    ]);

    const spawned = uiState.arenaPlayerDice.find((die) => die.isSpawnedDie === true);
    expect(spawned).toBeDefined();
    expect(spawned?.combatDieId).toBeUndefined();
    expect(spawned?.label).toBe("Sword Slash");
    const spawnedInspectorSides = spawned?.spawnedInspectorSides ?? [];
    expect(spawnedInspectorSides.length).toBeGreaterThan(0);
    expect(
      spawnedInspectorSides.every((side, index, sides) =>
        index === 0 ? true : sides[index - 1].power >= side.power,
      ),
    ).toBe(true);
    expect(spawnedInspectorSides.some((side) => side.isCriticalHit)).toBe(true);
    expect(spawnedInspectorSides.some((side) => side.isCriticalMiss)).toBe(true);
    expect(uiState.floatingPopups).toHaveLength(1);
    expect(uiState.floatingPopups[0].text).toBe("Transient Sword Slash");

    encounter.state.phase = "player-turn";
    updateCombatUiState(uiState, encounter.state, 2.8);
    expect(uiState.arenaPlayerDice.some((die) => die.isSpawnedDie)).toBe(true);

    onCombatMousePressed(uiState, encounter.state, spawned?.x ?? 0, spawned?.y ?? 0, 2);
    expect(isCombatInspectorOpen(uiState)).toBe(true);

    encounter.state.phase = "enemy-turn";
    updateCombatUiState(uiState, encounter.state, 1 / 60);
    expect(uiState.arenaPlayerDice.some((die) => die.isSpawnedDie)).toBe(false);
  });

  it("syncs enemy die label from authoritative sideLabel", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);

    uiState.enemyParkedDice = [
      {
        id: "enemy-sync",
        owner: "enemy",
        combatDieId: "enemy-die-1",
        label: "Slime Claw",
        x: 900,
        y: 90,
        vx: 0,
        vy: 0,
        angle: 0,
        spin: 0,
        size: 36,
        state: "parked",
        faceLocked: true,
      },
    ];

    enqueueCombatResolutionPopups(uiState, [
      {
        source: "enemy",
        dieId: "enemy-die-1",
        text: "+1 block",
        sideLabel: "Shield Bash",
      },
    ]);

    expect(uiState.enemyParkedDice[0].label).toBe("Shield Bash");
    expect(uiState.floatingPopups.some((popup) => popup.source === "enemy" && popup.text === "+1 block")).toBe(true);
  });

  it("resets player die labels to die names when enemy turn auto-parks player dice", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    die.state = "arena";
    die.label = "Sword Slash";
    die.displayLabel = "Sword Slash";
    die.x = uiState.layout.arenaX + 80;
    die.y = uiState.layout.arenaY + 80;

    uiState.arenaPlayerDice = [die];
    encounter.state.phase = "enemy-turn";

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(die.state).toBe("parked");
    expect(die.label).toBe("Warcry Die");
    expect(die.displayLabel).toBeUndefined();
  });

  it("does not start dragging a die that is already rolled", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];
    const combatDieId = die.combatDieId;

    encounter.state.phase = "enemy-turn";
    if (combatDieId) {
      encounter.state.rolledPlayerDieIds = [combatDieId];
      uiState.rolledPlayerDieIds = [combatDieId];
      uiState.settledPlayerDieIds = [combatDieId];
    }

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);

    expect(uiState.drag).toBeUndefined();
    expect(die.state).toBe("parked");
  });

  it("does not start dragging while pending round transition is active", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    uiState.pendingRound = encounter.state.round;
    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);

    expect(uiState.drag).toBeUndefined();
    expect(die.state).toBe("parked");
  });

  it("auto-requests end turn when player cannot afford any remaining die", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);

    encounter.state.phase = "player-turn";
    encounter.state.playerEnergyCurrent = 0;
    const affordableAtZeroEnergyIds = encounter.state.player.dice
      .filter((die) => die.energyCost <= encounter.state.playerEnergyCurrent)
      .map((die) => die.id);
    encounter.state.rolledPlayerDieIds = [...affordableAtZeroEnergyIds];
    uiState.rolledPlayerDieIds = [...affordableAtZeroEnergyIds];
    uiState.pendingRound = undefined;
    uiState.pendingPlayerDieIds = [];
    uiState.readyPlayerDieIds = [];

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(consumeRequestedPlayerTurnEnd(uiState)).toBe(true);
  });
});
