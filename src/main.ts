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
    consumeRequestedPlayerTurnEnd,
    setResolvedContinueEnabled,
    syncSpawnedPlayerDice,
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
    onExploreWheelMoved,
    type ExploreUiState,
    updateExploreUiState,
} from "./exploration/explore-ui";
import {
    createFacetUiState,
    drawFacetUi,
    onFacetKeyPressed,
    onFacetMouseReleased,
    type FacetUiState,
} from "./facet-ui";
import { pickEnemyIdForTile } from "./exploration/enemy-selection";
import { getCurrentTile } from "./exploration/explore-state";
import {
    createCombatEncounter,
    drainResolutionPopups,
    endPlayerTurn,
    resolveEnemyDie,
    rollPlayerDie,
    type CombatEncounterState,
} from "./game/combat-encounter";
import { CombatEventBus } from "./game/combat-event-bus";
import { createPlayerCombatDiceLoadout } from "./game/dice-constructs/player-combat-dice";
import {
    advanceScene,
    chooseExploreBranch,
    closeFacetsScene,
    createInitialSceneState,
    openFacetsScene,
} from "./game/scenes";
import {
    calculateCombatGoldReward,
    createPlayerProgression,
    grantPlayerGold,
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
import { recordEnemyDefeated } from "./planning/quest-events";

let sceneState = createInitialSceneState();
let previousScene = sceneState.current;
let activeCombat: { state: CombatEncounterState; eventBus: CombatEventBus } | undefined;
let activeCombatUi: CombatUiState | undefined;
let activeExploreUi: ExploreUiState | undefined;
let activeEncounterUi: EncounterUiState | undefined;
let activeFacetUi: FacetUiState | undefined;
let activeCharacterSetupUi: CharacterSetupUiState | undefined;
let mainMenuUi: MainMenuUiState | undefined;
let runSeedNonce = 0;
let combatResolvedHoldTimer = 0;
let hasGrantedCombatProgression = false;
let playerProgression: PlayerProgressionState = createPlayerProgression();

const COMBAT_RESOLVE_BEAT_SECONDS = 0.5;
const TEXT_SCALE_MULTIPLIER = 1.2;
const TEXT_MIN_SCALE = 0.6;
let textScalingPatched = false;

function scaleTextFactor(scale: number | undefined): number {
    if (scale === undefined) {
        return TEXT_SCALE_MULTIPLIER;
    }

    return Math.max(TEXT_MIN_SCALE, scale * TEXT_SCALE_MULTIPLIER);
}

function patchTextReadabilityScaling(): void {
    if (textScalingPatched) {
        return;
    }

    const originalPrint = love.graphics.print;
    const originalPrintf = love.graphics.printf;

    love.graphics.print = ((
        text: string,
        x?: number,
        y?: number,
        r?: number,
        sx?: number,
        sy?: number,
        ox?: number,
        oy?: number,
        kx?: number,
        ky?: number,
    ) => {
        const scaledX = scaleTextFactor(sx);
        const scaledY = scaleTextFactor(sy);
        return originalPrint(text, x, y, r, scaledX, scaledY, ox, oy, kx, ky);
    }) as typeof love.graphics.print;

    love.graphics.printf = ((
        text: string,
        x: number,
        y: number,
        limit: number,
        align?: "left" | "center" | "right" | "justify",
        r?: number,
        sx?: number,
        sy?: number,
        ox?: number,
        oy?: number,
        kx?: number,
        ky?: number,
    ) => {
        const scaledX = scaleTextFactor(sx);
        const scaledY = scaleTextFactor(sy);
        return originalPrintf(text, x, y, limit, align, r, scaledX, scaledY, ox, oy, kx, ky);
    }) as typeof love.graphics.printf;

    textScalingPatched = true;
}

function createCombatForCurrentTile(): { state: CombatEncounterState; eventBus: CombatEventBus } {
    const currentTile = activeExploreUi ? getCurrentTile(activeExploreUi.model) : undefined;
    const runSeed = activeExploreUi?.plannerSpec.seed ?? `run-fallback-${runSeedNonce}`;
    const enemyId = pickEnemyIdForTile(currentTile, runSeed);
    const playerDice = createPlayerCombatDiceLoadout(playerProgression);
    return createCombatEncounter({ enemyId, playerProgression, playerDice });
}

love.load = () => {
    love.window.setTitle("new-lands-await3");
    love.window.setMode(1456, 806);
    love.graphics.setBackgroundColor(0.16, 0.16, 0.16);
    patchTextReadabilityScaling();
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

        if (sceneState.current === "facets") {
            activeFacetUi = createFacetUiState(playerProgression);
        }

        if (previousScene === "facets" && sceneState.current !== "facets") {
            activeFacetUi = undefined;
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
                          tileDescription: currentTile.description,
                          locations: currentTile.locations,
                          explorationFlowId: currentTile.explorationFlowId,
                          flowLevel: currentTile.flowLevel,
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

        if (consumeRequestedPlayerTurnEnd(activeCombatUi)) {
            endPlayerTurn(activeCombat.state, activeCombat.eventBus);
        }

        const resolutionPopups = drainResolutionPopups(activeCombat.state);
        if (resolutionPopups.length > 0) {
            enqueueCombatResolutionPopups(activeCombatUi, resolutionPopups);
        }
        syncSpawnedPlayerDice(activeCombatUi, activeCombat.state);

        if (activeCombat.state.phase === "resolved") {
            if (!hasGrantedCombatProgression && activeCombat.state.enemy.hp <= 0 && activeCombat.state.player.hp > 0) {
                recordEnemyDefeated(activeCombat.state.enemy.id);
                const levelResult = recordCombatVictory(playerProgression, activeCombat.state.enemy.level);
                const goldReward = calculateCombatGoldReward(activeCombat.state.enemy.level);
                grantPlayerGold(playerProgression, goldReward);
                if (activeExploreUi) {
                    if (levelResult.didLevelUp) {
                        activeExploreUi.model.notice =
                            `Victory! +${levelResult.gainedXp} XP, +${goldReward} gold, and ${levelResult.levelsGained} level gained. Continue to return.`;
                    } else {
                        activeExploreUi.model.notice =
                            `Victory! +${levelResult.gainedXp} XP and +${goldReward} gold earned. Continue to return.`;
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
        if (activeEncounterUi !== undefined && activeExploreUi !== undefined) {
            const currentTile = getCurrentTile(activeExploreUi.model);
            if (currentTile.explorationFlowId !== null) {
                const flow = activeEncounterUi.explorationFlow;
                const maxLevels = flow !== null ? flow.levels.length : 0;
                const newLevel = Math.min(activeEncounterUi.viewLevel + 1, maxLevels);
                if (newLevel > currentTile.flowLevel) {
                    currentTile.flowLevel = newLevel;
                }
            }
        }
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

    if (sceneState.current === "facets") {
        if (activeFacetUi && onFacetKeyPressed(activeFacetUi, key)) {
            sceneState = closeFacetsScene(sceneState);
        }
        return;
    }

    if (sceneState.current === "explore") {
        if (!activeExploreUi) {
            activeExploreUi = createExploreUiState({ playerProgression });
        }

        const keyResult = onExploreKeyPressed(activeExploreUi, key);
        if (keyResult) {
            if (typeof keyResult === "object" && keyResult.kind === "open-facets") {
                sceneState = openFacetsScene(sceneState);
            }
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
        sceneState = chooseExploreBranch(sceneState, "exploration");
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
        if (sceneState.current === "facets") {
            if (activeFacetUi) {
                const facetAction = onFacetMouseReleased(activeFacetUi, x, y, button);
                if (facetAction === "close") {
                    sceneState = closeFacetsScene(sceneState);
                }
            }
            return;
        }

        if (sceneState.current === "explore") {
            if (!activeExploreUi) {
                activeExploreUi = createExploreUiState({ playerProgression });
            }

            const exploreAction = onExploreMouseReleased(activeExploreUi, x, y, button);
            if (exploreAction?.kind === "choose-branch") {
                sceneState = chooseExploreBranch(sceneState, exploreAction.branch);
            }
            if (exploreAction?.kind === "open-facets") {
                sceneState = openFacetsScene(sceneState);
            }
            return;
        }

        if (sceneState.current === "encounter") {
            if (!activeEncounterUi) {
                activeEncounterUi = createEncounterUiState();
            }

            const didContinue = onEncounterMouseReleased(activeEncounterUi, x, y, button);
            if (didContinue) {
                const currentTile = activeExploreUi ? getCurrentTile(activeExploreUi.model) : undefined;
                if (currentTile !== undefined && currentTile.explorationFlowId !== null) {
                    const flow = activeEncounterUi.explorationFlow;
                    const maxLevels = flow !== null ? flow.levels.length : 0;
                    const newLevel = Math.min(activeEncounterUi.viewLevel + 1, maxLevels);
                    if (newLevel > currentTile.flowLevel) {
                        currentTile.flowLevel = newLevel;
                    }
                }
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

    if (sceneState.current === "facets") {
        if (activeFacetUi) {
            drawFacetUi(activeFacetUi);
        }
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

love.wheelmoved = (_x, y) => {
    if (sceneState.current !== "explore") {
        return;
    }

    if (!activeExploreUi) {
        activeExploreUi = createExploreUiState({ playerProgression });
    }

    onExploreWheelMoved(activeExploreUi, y);
};