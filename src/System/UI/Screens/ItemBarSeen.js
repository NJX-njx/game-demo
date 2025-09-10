import { UIScreen } from "../base/UIScreen";
import { ItemSlotElement } from "../Elements/ItemSlotElement";
import { itemManager } from "../../Item/ItemManager";
import { mouseManager } from "../../Input/MouseManager";
import { sizes } from "../../../Utils/canvas";

export class ItemBarScreen extends UIScreen {
    constructor(name = "itemBar", width = 80, slotSize = 60, padding = 5) {
        super(name);
        this.name = name;
        this.width = width;
        this.slotSize = slotSize;
        this.padding = padding;
        this.visible = true;

        this.elements = [];
        // 添加垃圾桶格子，固定在屏幕最下方
        const startX = sizes.width - this.width + this.padding;
        const trashY = sizes.height - this.slotSize - this.padding;
        this.trashSlot = new ItemSlotElement(itemManager.trashSlot, startX, trashY, this.slotSize);
    }

    draw(ctx) {
        if (this.elements.length != itemManager.slots.length + 1) {
            const startX = sizes.width - this.width + this.padding;
            const startY = this.padding;
            this.elements = itemManager.slots.map((slot, i) => {
                return new ItemSlotElement(slot, startX, startY + i * (this.slotSize + this.padding), this.slotSize);
            });
            this.elements.push(this.trashSlot);
            console.log(this.elements)
        }

        super.draw(ctx);

        // 绘制拖拽道具
        if (itemManager.dragging) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = "white";
            ctx.font = "16px bold sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(itemManager.draggingItem.name, mouseManager.position.x, mouseManager.position.y);
            ctx.restore();
        }
    }
}

export const itemBar = new ItemBarScreen();
