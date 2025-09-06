import { game } from "./Game.js";

window.onload = () => {
    game.init().then(() => {
        game.start();
    });
};
