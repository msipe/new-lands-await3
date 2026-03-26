import {
  SCENE_CONTRACTS,
  SCENE_IDS,
  type SceneContextById,
  type SceneId,
} from "./scene-contracts";

export { SCENE_IDS, type SceneId };

type VisitCounts = Record<SceneId, number>;
type SceneContexts = {
  [Key in SceneId]: SceneContextById[Key];
};

export type SceneState = {
  current: SceneId;
  visitCounts: VisitCounts;
  contexts: SceneContexts;
};

function createInitialVisitCounts(): VisitCounts {
  return {
    "main-menu": 1,
    "character-setup": 0,
    explore: 0,
    facets: 0,
    combat: 0,
    encounter: 0,
    "post-combat": 0,
    "end-game": 0,
  };
}

function createInitialContexts(): SceneContexts {
  return {
    "main-menu": SCENE_CONTRACTS["main-menu"].createInitialContext(),
    "character-setup": SCENE_CONTRACTS["character-setup"].createInitialContext(),
    explore: SCENE_CONTRACTS.explore.createInitialContext(),
    facets: SCENE_CONTRACTS.facets.createInitialContext(),
    combat: SCENE_CONTRACTS.combat.createInitialContext(),
    encounter: SCENE_CONTRACTS.encounter.createInitialContext(),
    "post-combat": SCENE_CONTRACTS["post-combat"].createInitialContext(),
    "end-game": SCENE_CONTRACTS["end-game"].createInitialContext(),
  };
}

export function createInitialSceneState(): SceneState {
  return {
    current: "main-menu",
    visitCounts: createInitialVisitCounts(),
    contexts: createInitialContexts(),
  };
}

function transitionTo(state: SceneState, next: SceneId): SceneState {
  return {
    current: next,
    visitCounts: {
      ...state.visitCounts,
      [next]: state.visitCounts[next] + 1,
    },
    contexts: state.contexts,
  };
}

export function advanceScene(state: SceneState): SceneState {
  if (state.current === "main-menu") {
    return transitionTo(
      state,
      SCENE_CONTRACTS["main-menu"].reduce(state.contexts["main-menu"], {
        kind: "start-run",
      }).nextScene,
    );
  }

  if (state.current === "character-setup") {
    return transitionTo(
      state,
      SCENE_CONTRACTS["character-setup"].reduce(state.contexts["character-setup"], {
        kind: "confirm-selection",
      }).nextScene,
    );
  }

  if (state.current === "explore") {
    return transitionTo(
      state,
      SCENE_CONTRACTS.explore.reduce(state.contexts.explore, { kind: "advance" })
        .nextScene,
    );
  }

  if (state.current === "combat") {
    return transitionTo(
      state,
      SCENE_CONTRACTS.combat.reduce(state.contexts.combat, {
        kind: "complete-combat",
      }).nextScene,
    );
  }

  if (state.current === "encounter") {
    return transitionTo(
      state,
      SCENE_CONTRACTS.encounter.reduce(state.contexts.encounter, {
        kind: "complete-encounter",
      }).nextScene,
    );
  }

  if (state.current === "post-combat") {
    return transitionTo(
      state,
      SCENE_CONTRACTS["post-combat"].reduce(state.contexts["post-combat"], {
        kind: "continue",
      }).nextScene,
    );
  }

  return transitionTo(
    state,
    SCENE_CONTRACTS["end-game"].reduce(state.contexts["end-game"], {
      kind: "restart",
    }).nextScene,
  );
}

export function openFacetsScene(state: SceneState): SceneState {
  if (state.current !== "explore") {
    return state;
  }

  return transitionTo(
    state,
    SCENE_CONTRACTS.explore.reduce(state.contexts.explore, { kind: "open-facets" }).nextScene,
  );
}

export function closeFacetsScene(state: SceneState): SceneState {
  if (state.current !== "facets") {
    return state;
  }

  return transitionTo(
    state,
    SCENE_CONTRACTS.facets.reduce(state.contexts.facets, { kind: "close" }).nextScene,
  );
}

export function chooseExploreBranch(
  state: SceneState,
  next: "combat" | "exploration",
): SceneState {
  if (state.current !== "explore") {
    return state;
  }

  return transitionTo(
    state,
    SCENE_CONTRACTS.explore.reduce(state.contexts.explore, {
      kind: "choose-branch",
      branch: next,
    }).nextScene,
  );
}

export function getSceneTitle(scene: SceneId): string {
  return SCENE_CONTRACTS[scene].title;
}

export function getScenePrompt(scene: SceneId): string {
  return SCENE_CONTRACTS[scene].prompt;
}
