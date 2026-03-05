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
} from "./game/scenes";

let sceneState = createInitialSceneState();
let previousScene = sceneState.current;
let activeCombat: { state: CombatEncounterState; eventBus: CombatEventBus } | undefined;

love.load = () => {
    love.window.setTitle("new-lands-await3");
    love.window.setMode(960, 540);
    love.graphics.setBackgroundColor(0.08, 0.1, 0.16);
};

love.update = (dt: number) => {
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
    love.graphics.setColor(1, 1, 1);
    love.graphics.print(getScenePrompt(sceneState.current), 40, 30);

    if (sceneState.current === "combat" && activeCombat) {
        const encounter = activeCombat.state;

        love.graphics.print(`Player HP: ${encounter.player.hp}/${encounter.player.maxHp}`, 40, 80);
        love.graphics.print(`Enemy HP: ${encounter.enemy.hp}/${encounter.enemy.maxHp}`, 40, 104);
        love.graphics.print(getEnemyIntentSummary(encounter), 40, 128);
        love.graphics.print(
            `Player rolls used: ${encounter.playerRollIndex}/${encounter.player.dice.length}`,
            40,
            152,
        );
        love.graphics.print(`Combat phase: ${encounter.phase}`, 40, 176);

        const recentLog = getRecentCombatLog(encounter, 6);
        love.graphics.print("Combat log:", 40, 208);
        for (let index = 0; index < recentLog.length; index += 1) {
            love.graphics.print(recentLog[index], 40, 232 + index * 22);
        }

        return;
    }

    love.graphics.print("Visit counts:", 40, 80);
    love.graphics.print(`Main Menu: ${sceneState.visitCounts["main-menu"]}`, 40, 110);
    love.graphics.print(`Explore: ${sceneState.visitCounts.explore}`, 40, 134);
    love.graphics.print(`Combat: ${sceneState.visitCounts.combat}`, 40, 158);
    love.graphics.print(`Encounter: ${sceneState.visitCounts.encounter}`, 40, 182);
    love.graphics.print(`Post Combat: ${sceneState.visitCounts["post-combat"]}`, 40, 206);
    love.graphics.print(`End Game: ${sceneState.visitCounts["end-game"]}`, 40, 230);
};