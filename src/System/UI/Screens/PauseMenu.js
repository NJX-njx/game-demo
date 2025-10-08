import { UIScreen } from "../base/UIScreen";
import { UIButton } from "../Elements/UIButton";
import { game } from "../../../Game";
import { uiManager } from "../UIManager";

class PauseMenu extends UIScreen {
    constructor() {
        super("pauseMenu", { blocksGame: true });

        // 居中
        this.menuWidth = 300;
        this.menuHeight = 300;

        const cx = 1440 / 2;
        const cy = 720 / 2;

        const buttonWidth = 200;
        const buttonHeight = 50;
        const gap = 20;

    const startY = cy - 60;
    this.firstButtonTop = startY;

        this.addElement(new UIButton(cx - buttonWidth / 2, startY, buttonWidth, buttonHeight, "继续游戏", () => {
            uiManager.closeAll();
            game.resume();
        }));
        this.addElement(new UIButton(cx - buttonWidth / 2, startY + (buttonHeight + gap), buttonWidth, buttonHeight, "天赋树", () => {
            uiManager.switchScreen("talentTree");
        }));
        this.addElement(new UIButton(cx - buttonWidth / 2, startY + 2 * (buttonHeight + gap), buttonWidth, buttonHeight, "音效设置", () => {
            uiManager.switchScreen("soundSettings");
        }));
        this.addElement(new UIButton(cx - buttonWidth / 2, startY + 3 * (buttonHeight + gap), buttonWidth, buttonHeight, "存档", () => {
            game.saveGame();
        }));
        this.addElement(new UIButton(cx - buttonWidth / 2, startY + 4 * (buttonHeight + gap), buttonWidth, buttonHeight, "返回主菜单", () => {
            window.location.href = "menu.html";
        }));
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();

        // 遮罩
        ctx.fillStyle = "rgba(30,41,59,0.8)";
        ctx.fillRect(80, 0, 1280, ctx.canvas.height);

        // 标题位于按钮组上方并保持居中
        ctx.fillStyle = "#f8fafc";
        ctx.font = "26px Inter";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const maskX = 80;
        const maskWidth = 1280;
        const titleX = maskX + maskWidth / 2;
        const titleY = Math.max(48, this.firstButtonTop - 32);
        ctx.fillText("暂停菜单", titleX, titleY);

        ctx.restore();

        // 按钮
        super.draw(ctx);
    }
}

export const pauseMenu = new PauseMenu();
