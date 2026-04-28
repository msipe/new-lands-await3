# new-lands-await3

LÖVE2D game scaffold using TypeScript + TypeScriptToLua + `love-typescript-definitions`.

See [GAME_DESIGN.md](./GAME_DESIGN.md) for product direction, architecture rules, and development workflow.
Project structure notes: [docs/project-structure.md](./docs/project-structure.md)
Quest pipeline docs: [docs/quests.md](./docs/quests.md)

## Setup

1. Install dependencies:

	npm install

2. Build Lua output from TypeScript:

	npm run build

	This compiles to `build/` and syncs `main.lua` and `conf.lua` to the project root.

3. Run the game with LÖVE2D from this folder:

	love .

## Development

- Build once, then keep TypeScript compiling continuously:

	npm run dev

- Or only watch TypeScript changes:

  npm run watch

- Entry source file: `src/main.ts`
- Generated LÖVE entrypoint: `main.lua` (synced from `build/main.lua`)
- LÖVE config source file: `src/conf.ts`
- Generated LÖVE config file: `conf.lua` (synced from `build/conf.lua`)
- LÖVE typings package: `love-typescript-definitions`

## Testing

- Run tests once:

	npm test

- Run tests in watch mode:

	npm run test:watch

Tests target engine-agnostic TypeScript modules (in `src/game`) so game logic can be validated without running LÖVE.