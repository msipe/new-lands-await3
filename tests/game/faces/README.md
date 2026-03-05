# Face Test Pattern

Add one test file per concrete face class.

- `tests/game/faces/abilities/<FaceName>.test.ts`
- `tests/game/faces/items/<FaceName>.test.ts`
- `tests/game/faces/misc/<FaceName>.test.ts`

Minimum expectations per face test:

1. Resolves the face and asserts effect type, value, and target.
2. Verifies any face-specific upgrade behavior (if supported).
3. Verifies any unique mechanics (for example scaling thresholds).
