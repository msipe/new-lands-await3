import { computeWobbleY } from "./game/wobble";

let elapsed = 0;

love.load = () => {
    love.window.setTitle("new-lands-await3");
    love.window.setMode(960, 540);
    love.graphics.setBackgroundColor(0.08, 0.1, 0.16);
};

love.update = (dt: number) => {
    elapsed += dt;
};

love.draw = () => {
    const text = "Hello from TypeScriptToLua + LÖVE2D";
    const scale = 2;
    const x = 120;
    const y = computeWobbleY(230, elapsed, 12, 2);

    love.graphics.setColor(1, 1, 1);
    love.graphics.print(text, x, y, 0, scale, scale);
};