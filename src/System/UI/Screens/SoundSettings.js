import { UIScreen } from "../base/UIScreen";
import { UIButton } from "../Elements/UIButton";
import { UISlider } from "../Elements/UISlider";
import { soundManager } from "../../../Manager/SoundManager";
import { game } from "../../../Game";

/**
 * 基于 Canvas 的声音设置界面
 */
export class SoundSettings extends UIScreen {
    constructor() {
        super("soundSettings", { blocksGame: true });
        this.visible = false;

        // 布局参数（以 1440x720 设计稿为基准）
        this.cx = 1440 / 2;
        this.cy = 720 / 2;
        this.panelW = 520;
        this.panelH = 260;

        this.elements = [];

        // 关闭按钮
        const btnW = 140, btnH = 42;
        this.closeButton = new UIButton(this.cx + this.panelW / 2 - btnW - 20, this.cy + this.panelH / 2 - btnH - 20, btnW, btnH, '关闭', () => game.popUI());
        this.addElement(this.closeButton);

        // 三个滑块
        const left = this.cx - this.panelW / 2 + 30;
        const width = this.panelW - 60;
        const startY = this.cy - 40;

        this.masterSlider = new UISlider(left, startY - 40, width, '主音量', soundManager.masterVolume, (v) => soundManager.setMasterVolume(v));
        this.sfxSlider = new UISlider(left, startY + 10, width, '音效音量', soundManager.sfxVolume, (v) => soundManager.setSfxVolume(v));
        this.musicSlider = new UISlider(left, startY + 60, width, '音乐音量', soundManager.musicVolume, (v) => soundManager.setMusicVolume(v));

        this.addElement(this.masterSlider);
        this.addElement(this.sfxSlider);
        this.addElement(this.musicSlider);
    }

    draw(ctx) {
        if (!this.visible) return;

        // 背景面板
        ctx.save();
        const x = this.cx - this.panelW / 2;
        const y = this.cy - this.panelH / 2;
        // dark panel
        ctx.fillStyle = 'rgba(2,6,23,0.9)';
        roundRect(ctx, x, y, this.panelW, this.panelH, 12, true, false);

        // 标题
        ctx.fillStyle = '#f8fafc';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('音频设置', this.cx, y + 36);

        // 说明
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('调整主音量、音效与音乐的音量', this.cx, y + 60);

        ctx.restore();

        // 绘制子元素（滑块和按钮）
        for (let el of this.elements) {
            el.draw(ctx);
        }
    }
}

// small helper for rounded rect
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 6;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

export const soundSettings = new SoundSettings();
