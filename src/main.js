import { game } from "./Game.js";
import { debug } from "./Debug.js";
import { setupCanvasResize } from "./Utils/canvas.js";

window.onload = () => {
    game.init().then(() => {
        game.start();
    });
    // ensure canvas pixel size and visual scaling are synced with viewport
    setupCanvasResize();
    debug.exposeGlobals({ prefix: '_', force: true });
};
