import { Item } from "./Item";
export const SlotTypes = {
    INVENTORY: "INVENTORY",   // 玩家背包格子
    PICKUP: "PICKUP",         // 临时拾取格子
    EXCHANGE: "EXCHANGE",     // 拖拽交换格子
    TRUSH: "TRUSH"            // 垃圾桶格子
};

export class Slot {
    constructor({ type = SlotTypes.INVENTORY, itemType = null, maxLevel = Infinity, _source = null } = {}) {
        this.type = type;
        this.itemType = itemType;
        this.maxLevel = maxLevel;
        this.item = null;
        this._source = _source;
    }

    /** 
     * 判断是否可以放入道具
     * @param {Item} item - 待放入的道具实例
     * @returns {boolean} 是否可以放入
     */
    canAccept(item) {
        if (!item) return true;
        if (this.type === SlotTypes.PICKUP) return false; // 临时拾取格子不允许放入物品
        if (this.type === SlotTypes.EXCHANGE && !item.canExchange()) return false;
        if (this.type === SlotTypes.TRUSH && !item.canRemove()) return false;
        if (this.itemType && this.itemType !== item.type) return false;
        if (this.maxLevel < item.level) return false;
        return true;
    }

    /** 放入道具 */
    setItem(item) {
        if (this.type === SlotTypes.TRUSH) {
            item.dispose();
            return;
        }
        this.item = item;
        if (item) item._slot = this
    }

    /** 移除道具 */
    removeItem() {
        if (this.item) this.item._slot = null
        this.item = null;
    }

    /** 判断格子是否空 */
    isEmpty() {
        return this.item === null;
    }
}
