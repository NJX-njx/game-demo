import { UIElement } from "../base/UIElement";

export class UIButton extends UIElement {
    constructor(x, y, width, height, text, onClick) {
        super(x, y, width, height);
        this.text = text;
        this.onClick = onClick;
        this.hover = false;
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();

        // 背景
        ctx.fillStyle = this.hover ? "rgba(3,102,241,0.8)" : "rgba(30,41,59,0.9)";
        ctx.strokeStyle = "rgba(3,102,241,0.5)";
        ctx.lineWidth = 2;

        ctx.beginPath();
        const r = 8;
        ctx.moveTo(this.x + r, this.y);
        ctx.arcTo(this.x + this.width, this.y, this.x + this.width, this.y + this.height, r);
        ctx.arcTo(this.x + this.width, this.y + this.height, this.x, this.y + this.height, r);
        ctx.arcTo(this.x, this.y + this.height, this.x, this.y, r);
        ctx.arcTo(this.x, this.y, this.x + this.width, this.y, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 文字
        ctx.fillStyle = "#f8fafc";
        ctx.font = "16px Inter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);

        ctx.restore();
    }

    handleEvent(event) {
        if (!this.visible) return false;

        if (event.type === "mousemove") {
            this.hover = this.contains(event.offsetX, event.offsetY);
            return this.hover;
        }

        if (event.type === "mouseup") {
            if (this.contains(event.offsetX, event.offsetY)) {
                this.onClick?.();
                return true;
            }
        }
        return false;
    }
}
