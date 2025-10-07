import { UIElement } from "../base/UIElement";
import { itemManager } from "../../Item/ItemManager";
import { SlotTypes } from "../../Item/Slot";
import { mouseManager } from "../../Input/MouseManager";
import { uiManager } from "../UIManager";
import { textureManager } from "../../../Manager/TextureManager";

export class ItemSlotElement extends UIElement {
    constructor(slot, x, y, size) {
        super(x, y, size, size);
        this.slot = slot;
        this.size = size;
        this.padding = 5;
        this.hovering = false;
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();

        // 背景
        ctx.fillStyle = "rgba(50,50,50,0.7)";
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 边框
        if (this.hovering && itemManager.draggingFrom) {
            ctx.strokeStyle = this.slot.canAccept(itemManager.draggingItem) ? "lime" : "red";
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = itemManager.getSelectedSlot() === this.slot ? "#4a9eff" : "white";
            ctx.lineWidth = itemManager.getSelectedSlot() === this.slot ? 2 : 1;
        }
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // 道具图标或名称
        if (this.slot.item && this.slot !== itemManager.draggingFrom) {
            const item = this.slot.item;
            const tex = textureManager.getTexture('item', item.name);
            if (tex) {
                // 绘制图标，适配格子大小并留少量 padding
                const pad = Math.max(4, Math.floor(this.width * 0.08));
                const iw = this.width - pad * 2;
                const ih = this.height - pad * 2;
                ctx.drawImage(tex, this.x + pad, this.y + pad, iw, ih);
            } else {
                // 回退为名称显示
                ctx.fillStyle = "white";
                ctx.font = `${Math.min(this.width / 3, 14)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(item.name, this.x + this.width / 2, this.y + this.height / 2);
            }
        } else if (this.slot.type === SlotTypes.TRUSH) {
            ctx.fillStyle = "white";
            ctx.font = `${Math.min(this.width / 3, 14)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("垃圾桶", this.x + this.width / 2, this.y + this.height / 2);
        } else {
            ctx.fillStyle = "white";
            ctx.font = `${Math.min(this.width / 3, 14)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("空", this.x + this.width / 2, this.y + this.height / 2);
        }

        // 如果鼠标悬停且槽内有物品，注册 tooltip 到 uiManager 以便顶层绘制
        if (this.hovering && this.slot.item) {
            try {
                const lines = this.slot.item.getDescription ? this.slot.item.getDescription() : [this.slot.item.name];
                const padding = 8;
                const lineHeight = 18;
                const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2;
                const boxWidth = Math.min(maxWidth, 300);

                let tx = mouseManager.x + 12;
                let ty = mouseManager.y + 12;

                // 使用 rawText 让 UIManager 在顶层负责按 width 自动换行
                const rawText = lines.join('\n');
                uiManager.setTooltip({ x: tx, y: ty, rawText, width: boxWidth, padding, lineHeight, font: '14px sans-serif' });
            } catch (e) {
                // ignore
            }
        }

        ctx.restore();
    }

    handleEvent(event) {
        const { type, offsetX: mx, offsetY: my } = event;

        this.hovering = this.contains(mx, my);
        if (!this.contains(mx, my)) return false;

        switch (type) {
            case "mousedown":
                if (this.slot.item) {
                    itemManager.dragging = true;
                    itemManager.draggingFrom = this.slot;
                    itemManager.draggingItem = this.slot.item;
                    return true;
                }
                break;
            case "mouseup":
                if (itemManager.dragging) {
                    const success = itemManager.swapSlots(
                        itemManager.draggingFrom,
                        this.slot
                    );
                    if (!success) console.warn("交换失败");
                    itemManager.dragging = false;
                    itemManager.draggingFrom = null;
                    itemManager.draggingItem = null;
                    return true;
                }
                break;
        }
        return false;
    }
}
