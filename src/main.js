import { game } from "./Game.js";
import { debug } from "./Debug.js";

window.onload = () => {
    game.init().then(() => {
        game.start();
    });
    debug.exposeGlobals({ prefix: '_', force: true });
};
