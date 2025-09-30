import { UIElement } from "../base/UIElement";

export class UISlider extends UIElement {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {string} label
     * @param {number} initialValue (0..1)
     * @param {function} onChange (value)
     */
    constructor(x, y, width, label, initialValue = 0.5, onChange = null) {
        super(x, y, width, 36);
        this.label = label;
        this.value = Math.max(0, Math.min(1, initialValue));
        this.onChange = onChange;
        this.knobRadius = 8;
        this.dragging = false;
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();

        // label + percent
        ctx.fillStyle = '#f8fafc';
        ctx.font = '14px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x, this.y + 8);
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(this.value * 100) + '%', this.x + this.width, this.y + 8);

        // bar
        const barX = this.x;
        const barY = this.y + 20;
        const barW = this.width;
        const barH = 6;

        // background
        ctx.fillStyle = '#1f2937';
        roundRect(ctx, barX, barY, barW, barH, 3, true, true);

        // filled
        ctx.fillStyle = '#0366f1';
        roundRect(ctx, barX, barY, barW * this.value, barH, 3, true, false);

        // knob
        const knobX = barX + barW * this.value;
        const knobY = barY + barH / 2;
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.arc(knobX, knobY, this.knobRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#9ca3af';
        ctx.stroke();

        ctx.restore();
    }

    contains(px, py) {
        return px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
    }

    handleEvent(event) {
        if (!this.visible) return false;
        // Prefer offsetX/offsetY (added by canvas events). Fallback to client coords.
        let px = event.offsetX;
        let py = event.offsetY;
        if (px === undefined || py === undefined) {
            const canvas = document.getElementById('ui-canvas');
            if (!canvas) return false;
            const rect = canvas.getBoundingClientRect();
            px = event.clientX - rect.left;
            py = event.clientY - rect.top;
        }

        if (event.type === 'mousedown') {
            if (this.contains(px, py)) {
                this.dragging = true;
                this.updateValueFromX(px);
                return true;
            }
        } else if (event.type === 'mousemove') {
            if (this.dragging) {
                this.updateValueFromX(px);
                return true;
            }
        } else if (event.type === 'mouseup') {
            if (this.dragging) {
                this.updateValueFromX(px);
                this.dragging = false;
                return true;
            }
        }
        return false;
    }

    updateValueFromX(px) {
        const barX = this.x;
        const barW = this.width;
        let v = (px - barX) / barW;
        v = Math.max(0, Math.min(1, v));
        if (Math.abs(v - this.value) > 1e-4) {
            this.value = v;
            if (typeof this.onChange === 'function') this.onChange(this.value);
        }
    }
}

// helper: rounded rect fill/stroke
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
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
