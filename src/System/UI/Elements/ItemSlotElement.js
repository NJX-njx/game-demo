import { UIElement } from "../base/UIElement";
import { itemManager } from "../../Item/ItemManager";
import { SlotTypes } from "../../Item/Slot";

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

        // 背景
        ctx.fillStyle = "rgba(50,50,50,0.7)";
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 边框
        if (this.hovering && itemManager.draggingFrom) {
            ctx.strokeStyle = this.slot.canAccept(itemManager.draggingItem) ? "lime" : "red";
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = itemManager.getSelectedSlot() === this.slot ? "yellow" : "white";
            ctx.lineWidth = itemManager.getSelectedSlot() === this.slot ? 2 : 1;
        }
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // 道具名称
        let name = "空"
        if (this.slot.item && this.slot !== itemManager.draggingFrom) {
            name = this.slot.item.name;
        } else if (this.slot.type === SlotTypes.TRUSH) {
            name = "垃圾桶"
        }
        ctx.fillStyle = "white";
        ctx.font = `${Math.min(this.width / 3, 14)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, this.x + this.width / 2, this.y + this.height / 2);
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
