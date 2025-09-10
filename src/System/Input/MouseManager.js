import { textureManager } from "../../Manager/TextureManager";
import { Vector } from "../../Utils/Vector";
import { game } from "../../Game"; // 假设 game 有 pause/resume 方法

class MouseManager {
    static instance;

    constructor(canvas) {
        if (MouseManager.instance) return MouseManager.instance;
        MouseManager.instance = this;

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.x = 0;
        this.y = 0;
        this.left = false;
        this.right = false;

        // 鼠标事件
        canvas.addEventListener('mousemove', e => this.move(e));
        canvas.addEventListener('mousedown', e => this.down(e));
        canvas.addEventListener('mouseup', e => this.up(e));

        // 窗口切出/切入事件
        window.addEventListener('blur', () => this.onBlur());
        window.addEventListener('focus', () => this.onFocus());
    }

    move(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        this.x = Math.max(0, Math.min(this.x, this.canvas.width));
        this.y = Math.max(0, Math.min(this.y, this.canvas.height));
    }

    down(e) {
        if (e.button === 0) this.left = true;
        if (e.button === 2) this.right = true;
    }

    up(e) {
        if (e.button === 0) this.left = false;
        if (e.button === 2) this.right = false;
    }

    draw(ctx) {
        ctx.drawImage(
            textureManager.getTexture("cursor"),
            12, 9, 16, 22,
            this.x - 4, this.y - 5, 16, 22
        );
    }

    get position() {
        return new Vector(this.x, this.y);
    }

    // 窗口切出
    onBlur() {
        if (!game.isPaused) {
            game.pause();
            console.log("游戏已自动暂停（窗口失去焦点）");
        }
        this.left = false;
        this.right = false;
    }

    // 窗口切入
    onFocus() {
        // 可以选择自动恢复，或者保持暂停状态，由玩家手动继续
        // game.resume();
        console.log("窗口获得焦点");
    }
}

export const mouseManager = new MouseManager(document.getElementById('ui-canvas'));
