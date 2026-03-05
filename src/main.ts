import {
    closeCombatInspector,
    createCombatUiState,
    drainSettledEnemyDieIds,
    drainSettledPlayerDieIds,
    drawCombatUi,
    enqueueCombatResolutionPopups,
    fastForwardCombatUi,
    isCombatInspectorOpen,
    onCombatMouseMoved,
    onCombatMousePressed,
    onCombatMouseReleased,
    type CombatUiState,
    updateCombatUiState,
} from "./combat-ui";
import {
    createCombatEncounter,
    drainResolutionPopups,
    resolveEnemyDie,
    rollPlayerDie,
    type CombatEncounterState,
} from "./game/combat-encounter";
import { CombatEventBus } from "./game/combat-event-bus";
import {
    advanceScene,
    chooseExploreBranch,
    createInitialSceneState,
} from "./game/scenes";
import {
    createMainMenuUiState,
    drawMainMenuUi,
    onMainMenuMouseMoved,
    onMainMenuMousePressed,
    onMainMenuMouseReleased,
    type MainMenuUiState,
    updateMainMenuUiState,
} from "./main-menu-ui";

let sceneState = createInitialSceneState();
let previousScene = sceneState.current;
let activeCombat: { state: CombatEncounterState; eventBus: CombatEventBus } | undefined;
let activeCombatUi: CombatUiState | undefined;
let mainMenuUi: MainMenuUiState | undefined;

love.load = () => {
    love.window.setTitle("new-lands-await3");
    love.window.setMode(1120, 620);
    love.graphics.setBackgroundColor(0.16, 0.16, 0.16);
    mainMenuUi = createMainMenuUiState();
};

love.update = (dt: number) => {
    if (sceneState.current !== previousScene) {
        if (sceneState.current === "combat") {
            activeCombat = createCombatEncounter();
            activeCombatUi = createCombatUiState(activeCombat.state);
        }

        if (previousScene === "combat" && sceneState.current !== "combat") {
            activeCombat = undefined;
            activeCombatUi = undefined;
        }

        previousScene = sceneState.current;
    }

    if (sceneState.current === "combat" && activeCombat && activeCombatUi) {
        updateCombatUiState(activeCombatUi, activeCombat.state, dt);

        const settledDieIds = drainSettledPlayerDieIds(activeCombatUi);
        for (const dieId of settledDieIds) {
            rollPlayerDie(activeCombat.state, activeCombat.eventBus, dieId);
        }

        const settledEnemyDieIds = drainSettledEnemyDieIds(activeCombatUi);
        for (const dieId of settledEnemyDieIds) {
            resolveEnemyDie(activeCombat.state, activeCombat.eventBus, dieId);
        }

        const resolutionPopups = drainResolutionPopups(activeCombat.state);
        if (resolutionPopups.length > 0) {
            enqueueCombatResolutionPopups(activeCombatUi, resolutionPopups);
        }
    }

    if (sceneState.current === "main-menu") {
        if (!mainMenuUi) {
            mainMenuUi = createMainMenuUiState();
        }

        updateMainMenuUiState(mainMenuUi, dt);
    }
};

love.keypressed = (key) => {
    if (sceneState.current === "combat") {
        if (!activeCombat) {
            activeCombat = createCombatEncounter();
            activeCombatUi = createCombatUiState(activeCombat.state);
        }

        if (key === "space" && activeCombat.state.phase === "resolved") {
            sceneState = advanceScene(sceneState);
            return;
        }

        if (key === "escape" && activeCombatUi && isCombatInspectorOpen(activeCombatUi)) {
            closeCombatInspector(activeCombatUi);
            return;
        }

        if (key === "space" && activeCombatUi) {
            fastForwardCombatUi(activeCombatUi, activeCombat.state);
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

love.mousepressed = (x, y, button) => {
    if (sceneState.current === "main-menu") {
        if (!mainMenuUi) {
            mainMenuUi = createMainMenuUiState();
        }

        onMainMenuMousePressed(mainMenuUi, x, y, button);
        return;
    }

    if (sceneState.current !== "combat" || !activeCombat || !activeCombatUi) {
        return;
    }

    onCombatMousePressed(activeCombatUi, activeCombat.state, x, y, button);
};

love.mousemoved = (x, y, dx, dy) => {
    if (sceneState.current === "main-menu") {
        if (!mainMenuUi) {
            mainMenuUi = createMainMenuUiState();
        }

        onMainMenuMouseMoved(mainMenuUi, x, y);
        return;
    }

    if (sceneState.current !== "combat" || !activeCombatUi || !activeCombat) {
        return;
    }

    onCombatMouseMoved(activeCombatUi, activeCombat.state, x, y, dx, dy);
};

love.mousereleased = (x, y, button) => {
    if (sceneState.current === "main-menu") {
        if (!mainMenuUi) {
            mainMenuUi = createMainMenuUiState();
        }

        const action = onMainMenuMouseReleased(mainMenuUi, x, y, button);
        if (action === "start-run") {
            sceneState = advanceScene(sceneState);
            return;
        }

        if (action === "quit") {
            love.event.quit();
            return;
        }

        return;
    }

    if (sceneState.current !== "combat" || !activeCombat || !activeCombatUi) {
        return;
    }

    onCombatMouseReleased(activeCombatUi, activeCombat.state, x, y, button);
};

love.draw = () => {
    if (sceneState.current === "main-menu") {
        if (!mainMenuUi) {
            mainMenuUi = createMainMenuUiState();
        }

        drawMainMenuUi(mainMenuUi, sceneState.visitCounts["main-menu"]);
        return;
    }

    if (sceneState.current === "combat" && activeCombat && activeCombatUi) {
        drawCombatUi(activeCombatUi, activeCombat.state);
        return;
    }

    love.graphics.setColor(1, 1, 1);
    love.graphics.print(`Scene: ${sceneState.current}`, 40, 30);
    love.graphics.print("Visit counts:", 40, 80);
    love.graphics.print(`Main Menu: ${sceneState.visitCounts["main-menu"]}`, 40, 110);
    love.graphics.print(`Explore: ${sceneState.visitCounts.explore}`, 40, 134);
    love.graphics.print(`Combat: ${sceneState.visitCounts.combat}`, 40, 158);
    love.graphics.print(`Encounter: ${sceneState.visitCounts.encounter}`, 40, 182);
    love.graphics.print(`Post Combat: ${sceneState.visitCounts["post-combat"]}`, 40, 206);
    love.graphics.print(`End Game: ${sceneState.visitCounts["end-game"]}`, 40, 230);
};