import { UIScreen } from "../base/UIScreen";
import { UIButton } from "../Elements/UIButton";
import { canvas_ui as canvas } from "../../../Utils/canvas";
import { game } from "../../../Game";

class PauseMenu extends UIScreen {
    constructor() {
        super("pauseMenu");

        // 居中
        this.menuWidth = 300;
        this.menuHeight = 300;

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const buttonWidth = 200;
        const buttonHeight = 50;
        const gap = 20;

        const startY = cy - 60;

        this.addElement(new UIButton(cx - buttonWidth / 2, startY, buttonWidth, buttonHeight, "继续游戏", () => game.resume()));
        this.addElement(new UIButton(cx - buttonWidth / 2, startY + (buttonHeight + gap), buttonWidth, buttonHeight, "返回主菜单", () => {
            window.location.href = "menu.html";
        }));
        this.addElement(new UIButton(cx - buttonWidth / 2, startY + 2 * (buttonHeight + gap), buttonWidth, buttonHeight, "退出游戏", () => {
            alert("退出逻辑");
        }));
    }

    draw(ctx) {
        if (!this.visible) return;

        // 遮罩
        ctx.fillStyle = "rgba(30,41,59,0.8)";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 标题
        ctx.fillStyle = "#f8fafc";
        ctx.font = "20px Inter";
        ctx.textAlign = "center";
        ctx.fillText("暂停菜单", ctx.canvas.width / 2, ctx.canvas.height / 2 - 100);

        // 按钮
        super.draw(ctx);
    }
}

export const pauseMenu = new PauseMenu();
