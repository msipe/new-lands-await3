export const SCENE_IDS = [
  "main-menu",
  "character-setup",
  "explore",
  "combat",
  "encounter",
  "post-combat",
  "end-game",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export type MainMenuInput = {
  kind: "start-run";
};

export type CharacterSetupInput = {
  kind: "confirm-selection";
};

export type ExploreInput =
  | {
      kind: "advance";
    }
  | {
      kind: "choose-branch";
      branch: "combat" | "exploration";
    };

export type CombatInput = {
  kind: "complete-combat";
};

export type EncounterInput = {
  kind: "complete-encounter";
};

export type PostCombatInput = {
  kind: "continue";
};

export type EndGameInput = {
  kind: "restart";
};

export type SceneInputById = {
  "main-menu": MainMenuInput;
  "character-setup": CharacterSetupInput;
  explore: ExploreInput;
  combat: CombatInput;
  encounter: EncounterInput;
  "post-combat": PostCombatInput;
  "end-game": EndGameInput;
};

export type MainMenuContext = {
  runNumber: number;
};

export type ExploreContext = {
  nodeIndex: number;
  availableBranches: Array<"combat" | "exploration">;
};

export type CharacterSetupContext = {
  selectedClassId: "class:warrior";
  selectedRaceId: "race:human";
};

export type CombatContext = {
  enemyGroupId: string;
  turnCount: number;
};

export type EncounterContext = {
  encounterId: string;
  isResolved: boolean;
};

export type PostCombatContext = {
  rewardChoices: string[];
};

export type EndGameContext = {
  outcome: "victory" | "defeat";
};

export type SceneContextById = {
  "main-menu": MainMenuContext;
  "character-setup": CharacterSetupContext;
  explore: ExploreContext;
  combat: CombatContext;
  encounter: EncounterContext;
  "post-combat": PostCombatContext;
  "end-game": EndGameContext;
};

export type SceneOutputById = {
  "main-menu": { nextScene: "character-setup" };
  "character-setup": { nextScene: "explore" };
  explore: { nextScene: "combat" | "encounter" };
  combat: { nextScene: "explore" };
  encounter: { nextScene: "explore" };
  "post-combat": { nextScene: "end-game" };
  "end-game": { nextScene: "main-menu" };
};

export type SceneContract<TScene extends SceneId> = {
  id: TScene;
  title: string;
  prompt: string;
  defaultNext: SceneOutputById[TScene]["nextScene"];
  createInitialContext: () => SceneContextById[TScene];
  reduce: (
    context: SceneContextById[TScene],
    input: SceneInputById[TScene],
  ) => SceneOutputById[TScene];
};

type SceneContracts = {
  [Key in SceneId]: SceneContract<Key>;
};

export const SCENE_CONTRACTS: SceneContracts = {
  "main-menu": {
    id: "main-menu",
    title: "Main Menu",
    prompt: "Press Space to start your run.",
    defaultNext: "character-setup",
    createInitialContext: () => ({ runNumber: 1 }),
    reduce: () => ({ nextScene: "character-setup" }),
  },
  "character-setup": {
    id: "character-setup",
    title: "Character Setup",
    prompt: "Choose your class and race, then continue.",
    defaultNext: "explore",
    createInitialContext: () => ({
      selectedClassId: "class:warrior",
      selectedRaceId: "race:human",
    }),
    reduce: () => ({ nextScene: "explore" }),
  },
  explore: {
    id: "explore",
    title: "Explore",
    prompt: "Click a neighboring hex to travel, then choose Combat or Encounter.",
    defaultNext: "combat",
    createInitialContext: () => ({
      nodeIndex: 0,
      availableBranches: ["combat", "exploration"],
    }),
    reduce: (_, input) => {
      if (input.kind === "choose-branch") {
        return { nextScene: input.branch === "exploration" ? "encounter" : "combat" };
      }

      return { nextScene: "combat" };
    },
  },
  combat: {
    id: "combat",
    title: "Combat",
    prompt: "Press R to roll a die. Press Space after combat resolves to return to exploration.",
    defaultNext: "explore",
    createInitialContext: () => ({ enemyGroupId: "stub-slimes", turnCount: 1 }),
    reduce: () => ({ nextScene: "explore" }),
  },
  encounter: {
    id: "encounter",
    title: "Encounter",
    prompt: "Press Space to return to exploration.",
    defaultNext: "explore",
    createInitialContext: () => ({ encounterId: "stub-shrine", isResolved: false }),
    reduce: () => ({ nextScene: "explore" }),
  },
  "post-combat": {
    id: "post-combat",
    title: "Post Combat",
    prompt: "Press Space to continue.",
    defaultNext: "end-game",
    createInitialContext: () => ({ rewardChoices: ["gain-die", "upgrade-face"] }),
    reduce: () => ({ nextScene: "end-game" }),
  },
  "end-game": {
    id: "end-game",
    title: "End Game",
    prompt: "Press Space to return to Main Menu.",
    defaultNext: "main-menu",
    createInitialContext: () => ({ outcome: "victory" }),
    reduce: () => ({ nextScene: "main-menu" }),
  },
};
