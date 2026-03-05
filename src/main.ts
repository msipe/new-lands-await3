import { computeWobbleY } from "./game/wobble";
import {
    createCombatEncounter,
    getEnemyIntentSummary,
    getRecentCombatLog,
    rollNextPlayerDie,
    type CombatEncounterState,
} from "./game/combat-encounter";
import { CombatEventBus } from "./game/combat-event-bus";
import {
    advanceScene,
    chooseExploreBranch,
    createInitialSceneState,
    getScenePrompt,
    getSceneTitle,
} from "./game/scenes";

let elapsed = 0;
let sceneState = createInitialSceneState();
let previousScene = sceneState.current;
let activeCombat: { state: CombatEncounterState; eventBus: CombatEventBus } | undefined;

love.load = () => {
    love.window.setTitle("new-lands-await3");
    love.window.setMode(960, 540);
    love.graphics.setBackgroundColor(0.08, 0.1, 0.16);
};

love.update = (dt: number) => {
    elapsed += dt;

    if (sceneState.current !== previousScene) {
        if (sceneState.current === "combat") {
            activeCombat = createCombatEncounter();
        }

        if (previousScene === "combat" && sceneState.current !== "combat") {
            activeCombat = undefined;
        }

        previousScene = sceneState.current;
    }
};

love.keypressed = (key) => {
    if (sceneState.current === "combat") {
        if (!activeCombat) {
            activeCombat = createCombatEncounter();
        }

        if (key === "r") {
            rollNextPlayerDie(activeCombat.state, activeCombat.eventBus);
            return;
        }

        if (key === "space" && activeCombat.state.phase === "resolved") {
            sceneState = advanceScene(sceneState);
        }
        return;
    }

    if (key === "space") {
        sceneState = advanceScene(sceneState);
        return;
    }

    if (key === "c") {
        sceneState = chooseExploreBranch(sceneState, "combat");
        return;
    }

    if (key === "e") {
        sceneState = chooseExploreBranch(sceneState, "encounter");
    }
};

love.draw = () => {
    const titleY = computeWobbleY(60, elapsed, 6, 2);

    love.graphics.setColor(1, 1, 1);
    love.graphics.print("new-lands-await3", 40, 24, 0, 1.4, 1.4);

    love.graphics.setColor(0.95, 0.86, 0.4);
    love.graphics.print(`Scene: ${getSceneTitle(sceneState.current)}`, 40, titleY, 0, 2, 2);

    love.graphics.setColor(1, 1, 1);
    love.graphics.print(getScenePrompt(sceneState.current), 40, 170);

    if (sceneState.current === "combat" && activeCombat) {
        const encounter = activeCombat.state;

        love.graphics.print(`Player HP: ${encounter.player.hp}/${encounter.player.maxHp}`, 40, 220);
        love.graphics.print(`Enemy HP: ${encounter.enemy.hp}/${encounter.enemy.maxHp}`, 40, 244);
        love.graphics.print(getEnemyIntentSummary(encounter), 40, 268);
        love.graphics.print(
            `Player rolls used: ${encounter.playerRollIndex}/${encounter.player.dice.length}`,
            40,
            292,
        );
        love.graphics.print(`Combat phase: ${encounter.phase}`, 40, 316);

        const recentLog = getRecentCombatLog(encounter, 6);
        love.graphics.print("Combat log:", 40, 348);
        for (let index = 0; index < recentLog.length; index += 1) {
            love.graphics.print(recentLog[index], 40, 372 + index * 22);
        }

        return;
    }

    love.graphics.print("Visit counts:", 40, 220);
    love.graphics.print(`Main Menu: ${sceneState.visitCounts["main-menu"]}`, 40, 250);
    love.graphics.print(`Explore: ${sceneState.visitCounts.explore}`, 40, 274);
    love.graphics.print(`Combat: ${sceneState.visitCounts.combat}`, 40, 298);
    love.graphics.print(`Encounter: ${sceneState.visitCounts.encounter}`, 40, 322);
    love.graphics.print(`Post Combat: ${sceneState.visitCounts["post-combat"]}`, 40, 346);
    love.graphics.print(`End Game: ${sceneState.visitCounts["end-game"]}`, 40, 370);
};