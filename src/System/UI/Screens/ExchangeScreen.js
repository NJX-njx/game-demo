import { UIScreen } from "../base/UIScreen";
import { ItemSlotElement } from "../Elements/ItemSlotElement";
import { UIButton } from "../Elements/UIButton";
import { Slot, SlotTypes } from "../../Item/Slot";
import { itemManager } from "../../Item/ItemManager";
import { game } from "../../../Game";

class ExchangeScreen extends UIScreen {
    constructor() {
        super('exchange', { blocksGame: true });

        // 交换用的临时格子，类型为 EXCHANGE
        this.exchangeSlot = new Slot({ type: SlotTypes.EXCHANGE });

        // 关联的触发交互对象（Interaction），以及剩余交换次数
        this._interaction = null;

        const canvas = document.getElementById('ui-canvas');
        const cw = canvas?.width || 800;
        const ch = canvas?.height || 600;

        const slotSize = 96;
        const slotX = Math.floor(cw / 2 - slotSize / 2);
        const slotY = Math.floor(ch / 2 - slotSize / 2) - 40;

        this.slotElement = new ItemSlotElement(this.exchangeSlot, slotX, slotY, slotSize);
        this.addElement(this.slotElement);

        // 按钮
        const btnW = 120, btnH = 40;
        const btnY = slotY + slotSize + 20;

        this.exchangeBtn = new UIButton(cw / 2 - btnW - 10, btnY, btnW, btnH, '交换', () => {
            if (!this.exchangeSlot.item || !this.exchangeSlot.item.canExchange()) return;
            if (!this._interaction || this._interaction.times === 0) return;
            this._interaction.times--;
            const ok = itemManager.exchangeItemBySlot(this.exchangeSlot);
            if (!ok) {
                console.warn('交换失败', this.exchangeSlot.item);
            }
        });

        this.closeBtn = new UIButton(cw / 2 + 10, btnY, btnW, btnH, '关闭', () => {
            game.popUI();
        });

        this.addElement(this.exchangeBtn);
        this.addElement(this.closeBtn);
    }

    show() {
        super.show();
    }

    hide() {
        super.hide();
        this.close();
    }

    /** 关闭界面并把格子里的物品放回道具栏 */
    close() {
        if (this.exchangeSlot.item) {
            const item = this.exchangeSlot.item;
            // 先清空临时格子引用
            this.exchangeSlot.removeItem();

            // 找到第一个可放入的空背包格
            const target = itemManager.slots.find(s => !s.item && s.canAccept(item));
            if (target) {
                target.setItem(item);
                item._slot = target;
            } else {
                console.warn('没有可用的背包格来放回道具，物品被销毁');
                item.dispose();
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();
        // 遮罩
        ctx.fillStyle = "rgba(30,41,59,0.8)";
        ctx.fillRect(80, 0, 1280, ctx.canvas.height);

        // 绘制剩余交换次数提示（如果有关联的 interaction）
        if (this._interaction && typeof this._interaction.times === 'number') {
            ctx.fillStyle = 'white';
            ctx.font = '18px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`剩余交换次数: ${this._interaction.times}`, ctx.canvas.width / 2, 60);
        }

        ctx.restore();

        super.draw(ctx);
    }
}

export const exchangeScreen = new ExchangeScreen();
