import {
    createCharacterSetupUiState,
    drawCharacterSetupUi,
    onCharacterSetupKeyPressed,
    onCharacterSetupMouseMoved,
    onCharacterSetupMousePressed,
    onCharacterSetupMouseReleased,
    type CharacterSetupUiState,
    updateCharacterSetupUiState,
} from "./character-setup-ui";
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
    consumeRequestedSceneAdvance,
    setResolvedContinueEnabled,
    type CombatUiState,
    updateCombatUiState,
} from "./combat-ui";
import {
    createEncounterUiState,
    drawEncounterUi,
    onEncounterMouseMoved,
    onEncounterMouseReleased,
    type EncounterUiState,
    updateEncounterUiState,
} from "./encounter-ui";
import {
    createExploreUiState,
    drawExploreUi,
    onExploreKeyPressed,
    onExploreMouseMoved,
    onExploreMouseReleased,
    type ExploreUiState,
    updateExploreUiState,
} from "./exploration/explore-ui";
import { pickEnemyIdForTile } from "./exploration/enemy-selection";
import { getCurrentTile } from "./exploration/explore-state";
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
    calculateCombatXpReward,
    createPlayerProgression,
    recordCombatVictory,
    setPlayerIdentity,
    type PlayerProgressionState,
} from "./game/player-progression";
import {
    createMainMenuUiState,
    drawMainMenuUi,
    onMainMenuMouseMoved,
    onMainMenuMousePressed,
    onMainMenuMouseReleased,
    type MainMenuUiState,
    updateMainMenuUiState,
} from "./main-menu-ui";
import { resetQuestLogForNewRun } from "./planning/quest-log";

let sceneState = createInitialSceneState();
let previousScene = sceneState.current;
let activeCombat: { state: CombatEncounterState; eventBus: CombatEventBus } | undefined;
let activeCombatUi: CombatUiState | undefined;
let activeExploreUi: ExploreUiState | undefined;
let activeEncounterUi: EncounterUiState | undefined;
let activeCharacterSetupUi: CharacterSetupUiState | undefined;
let mainMenuUi: MainMenuUiState | undefined;
let runSeedNonce = 0;
let combatResolvedHoldTimer = 0;
let hasGrantedCombatProgression = false;
let playerProgression: PlayerProgressionState = createPlayerProgression();

const COMBAT_RESOLVE_BEAT_SECONDS = 0.5;

function createCombatForCurrentTile(): { state: CombatEncounterState; eventBus: CombatEventBus } {
    const currentTile = activeExploreUi ? getCurrentTile(activeExploreUi.model) : undefined;
    const runSeed = activeExploreUi?.plannerSpec.seed ?? `run-fallback-${runSeedNonce}`;
    const enemyId = pickEnemyIdForTile(currentTile, runSeed);
    return createCombatEncounter({ enemyId });
}

love.load = () => {
    love.window.setTitle("new-lands-await3");
    love.window.setMode(1120, 620);
    love.graphics.setBackgroundColor(0.16, 0.16, 0.16);
    mainMenuUi = createMainMenuUiState();
};

love.update = (dt: number) => {
    if (sceneState.current !== previousScene) {
        if (sceneState.current === "combat") {
            activeCombat = createCombatForCurrentTile();
            activeCombatUi = createCombatUiState(activeCombat.state);
            combatResolvedHoldTimer = 0;
            hasGrantedCombatProgression = false;
            setResolvedContinueEnabled(activeCombatUi, false);
        }

        if (sceneState.current === "character-setup") {
            if (previousScene === "main-menu") {
                resetQuestLogForNewRun();
                runSeedNonce += 1;
                playerProgression = createPlayerProgression();
                activeExploreUi = undefined;
            }

            if (!activeCharacterSetupUi) {
                activeCharacterSetupUi = createCharacterSetupUiState();
            }
        }

        if (sceneState.current === "explore") {
            const enteringNewRun = previousScene === "character-setup";
            if (enteringNewRun || !activeExploreUi) {
                const runtimeSeedIndex = Math.floor(love.timer.getTime() * 1000) + runSeedNonce * 7919;
                activeExploreUi = createExploreUiState({
                    initialSeedIndex: runtimeSeedIndex,
                    playerProgression,
                });
            }
        }

        if (sceneState.current === "encounter") {
            const currentTile = activeExploreUi ? getCurrentTile(activeExploreUi.model) : undefined;
            activeEncounterUi = createEncounterUiState(
                currentTile
                    ? {
                          tileName: currentTile.name,
                          tileZone: currentTile.zone,
                          locations: currentTile.locations,
                      }
                    : undefined,
            );
        }

        if (previousScene === "combat" && sceneState.current !== "combat") {
            activeCombat = undefined;
            activeCombatUi = undefined;
        }

        if (previousScene === "encounter" && sceneState.current !== "encounter") {
            activeEncounterUi = undefined;
        }

        if (previousScene === "character-setup" && sceneState.current !== "character-setup") {
            activeCharacterSetupUi = undefined;
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

        if (activeCombat.state.phase === "resolved") {
            if (!hasGrantedCombatProgression && activeCombat.state.enemy.hp <= 0 && activeCombat.state.player.hp > 0) {
                const rewardXp = calculateCombatXpReward(activeCombat.state.enemy.level);
                const levelResult = recordCombatVictory(playerProgression, activeCombat.state.enemy.level);
                if (activeExploreUi) {
                    if (levelResult.didLevelUp) {
                        activeExploreUi.model.notice =
                            `Victory! +${rewardXp} XP and ${levelResult.levelsGained} level gained. Continue to return.`;
                    } else {
                        activeExploreUi.model.notice =
                            `Victory! +${rewardXp} XP earned. Continue to return.`;
                    }
                }

                hasGrantedCombatProgression = true;
            }

            combatResolvedHoldTimer += dt;
            const canContinue = combatResolvedHoldTimer >= COMBAT_RESOLVE_BEAT_SECONDS;
            setResolvedContinueEnabled(activeCombatUi, canContinue);

            if (canContinue && consumeRequestedSceneAdvance(activeCombatUi)) {
                sceneState = advanceScene(sceneState);
                return;
            }
        } else {
            combatResolvedHoldTimer = 0;
            setResolvedContinueEnabled(activeCombatUi, false);
        }
    }

    if (sceneState.current === "explore") {
        if (!activeExploreUi) {
            activeExploreUi = createExploreUiState({ playerProgression });
        }

        updateExploreUiState(activeExploreUi, dt);
    }

    if (sceneState.current === "encounter") {
        if (!activeEncounterUi) {
            activeEncounterUi = createEncounterUiState();
        }

        updateEncounterUiState(activeEncounterUi, dt);
    }

    if (sceneState.current === "character-setup") {
        if (!activeCharacterSetupUi) {
            activeCharacterSetupUi = createCharacterSetupUiState();
        }

        updateCharacterSetupUiState(activeCharacterSetupUi, dt);
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
            activeCombat = createCombatForCurrentTile();
            activeCombatUi = createCombatUiState(activeCombat.state);
        }

        if (key === "space" && activeCombat.state.phase === "resolved") {
            if (combatResolvedHoldTimer < COMBAT_RESOLVE_BEAT_SECONDS) {
                return;
            }

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

    if (sceneState.current === "encounter" && key === "space") {
        sceneState = advanceScene(sceneState);
        return;
    }

    if (sceneState.current === "character-setup") {
        if (!activeCharacterSetupUi) {
            activeCharacterSetupUi = createCharacterSetupUiState();
        }

        const action = onCharacterSetupKeyPressed(activeCharacterSetupUi, key);
        if (action?.kind === "confirm-character") {
            setPlayerIdentity(playerProgression, action.classId, action.raceId);
            sceneState = advanceScene(sceneState);
            return;
        }
    }

    if (sceneState.current === "explore") {
        if (!activeExploreUi) {
            activeExploreUi = createExploreUiState({ playerProgression });
        }

        if (onExploreKeyPressed(activeExploreUi, key)) {
            return;
        }
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

    if (sceneState.current === "character-setup") {
        if (!activeCharacterSetupUi) {
            activeCharacterSetupUi = createCharacterSetupUiState();
        }

        onCharacterSetupMousePressed(activeCharacterSetupUi, x, y, button);
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

    if (sceneState.current === "explore") {
        if (!activeExploreUi) {
            activeExploreUi = createExploreUiState({ playerProgression });
        }

        onExploreMouseMoved(activeExploreUi, x, y);
        return;
    }

    if (sceneState.current === "character-setup") {
        if (!activeCharacterSetupUi) {
            activeCharacterSetupUi = createCharacterSetupUiState();
        }

        onCharacterSetupMouseMoved(activeCharacterSetupUi, x, y);
        return;
    }

    if (sceneState.current === "encounter") {
        if (!activeEncounterUi) {
            activeEncounterUi = createEncounterUiState();
        }

        onEncounterMouseMoved(activeEncounterUi, x, y);
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

    if (sceneState.current === "character-setup") {
        if (!activeCharacterSetupUi) {
            activeCharacterSetupUi = createCharacterSetupUiState();
        }

        const action = onCharacterSetupMouseReleased(activeCharacterSetupUi, x, y, button);
        if (action?.kind === "confirm-character") {
            setPlayerIdentity(playerProgression, action.classId, action.raceId);
            sceneState = advanceScene(sceneState);
        }

        return;
    }

    if (sceneState.current !== "combat" || !activeCombat || !activeCombatUi) {
        if (sceneState.current === "explore") {
            if (!activeExploreUi) {
                activeExploreUi = createExploreUiState({ playerProgression });
            }

            const exploreAction = onExploreMouseReleased(activeExploreUi, x, y, button);
            if (exploreAction?.kind === "choose-branch") {
                sceneState = chooseExploreBranch(sceneState, exploreAction.branch);
            }
            return;
        }

        if (sceneState.current === "encounter") {
            if (!activeEncounterUi) {
                activeEncounterUi = createEncounterUiState();
            }

            const didContinue = onEncounterMouseReleased(activeEncounterUi, x, y, button);
            if (didContinue) {
                sceneState = advanceScene(sceneState);
            }
            return;
        }

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

    if (sceneState.current === "explore") {
        if (!activeExploreUi) {
            activeExploreUi = createExploreUiState({ playerProgression });
        }

        drawExploreUi(activeExploreUi, sceneState.visitCounts.explore);
        return;
    }

    if (sceneState.current === "character-setup") {
        if (!activeCharacterSetupUi) {
            activeCharacterSetupUi = createCharacterSetupUiState();
        }

        drawCharacterSetupUi(activeCharacterSetupUi, sceneState.visitCounts["character-setup"]);
        return;
    }

    if (sceneState.current === "encounter") {
        if (!activeEncounterUi) {
            activeEncounterUi = createEncounterUiState();
        }

        drawEncounterUi(activeEncounterUi, sceneState.visitCounts.encounter);
        return;
    }

    love.graphics.setColor(1, 1, 1);
    love.graphics.print(`Scene: ${sceneState.current}`, 40, 30);
    love.graphics.print("Visit counts:", 40, 80);
    love.graphics.print(`Main Menu: ${sceneState.visitCounts["main-menu"]}`, 40, 110);
    love.graphics.print(`Character Setup: ${sceneState.visitCounts["character-setup"]}`, 40, 134);
    love.graphics.print(`Explore: ${sceneState.visitCounts.explore}`, 40, 158);
    love.graphics.print(`Combat: ${sceneState.visitCounts.combat}`, 40, 182);
    love.graphics.print(`Encounter: ${sceneState.visitCounts.encounter}`, 40, 206);
    love.graphics.print(`Post Combat: ${sceneState.visitCounts["post-combat"]}`, 40, 230);
    love.graphics.print(`End Game: ${sceneState.visitCounts["end-game"]}`, 40, 254);
};