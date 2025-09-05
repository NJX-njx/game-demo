import { Item } from "./Item";
import { ItemTypes } from "./ItemConfigs";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
class ItemManager {
    constructor() {
        if (ItemManager.instance) return ItemManager.instance;
        ItemManager.instance = this;
        /**
         * 格子定义（固定顺序）
         * 每个格子：
         *  - maxLevel: 允许放置道具的最大等级
         *  - type: 可选，限制类型，如 "story"
         *  - item: 当前放置的道具实例
         */
        this.slots = [
            { maxLevel: Infinity, type: ItemTypes.ENDING, item: null }, // 剧情道具格子
            { maxLevel: 3, type: ItemTypes.NORMAL, item: null },           // 可放三级及以下
            { maxLevel: 2, type: ItemTypes.NORMAL, item: null },
            { maxLevel: 2, type: ItemTypes.NORMAL, item: null },
            { maxLevel: 2, type: ItemTypes.NORMAL, item: null },
            { maxLevel: 1, type: ItemTypes.NORMAL, item: null },
            { maxLevel: 1, type: ItemTypes.NORMAL, item: null },
            { maxLevel: 1, type: ItemTypes.NORMAL, item: null },
        ];

        this.selectedIndex = 0; // 当前选中格子

    }

    /** 获取道具，返回道具实例或 null */
    tryAcquire(config) {
        console.log(config);
        // 找第一个符合条件的空格子
        const slotIndex = this.slots.findIndex(slot => {
            if (slot.item) return false;
            if (slot.type && slot.type !== config.type) return false;
            if (slot.maxLevel < config.level) return false;
            return true;
        });

        if (slotIndex === -1) return null;

        const item = new Item(config);

        this.slots[slotIndex].item = item;
        item._slotIndex = slotIndex;
        return item;
    }

    /** 移除道具实例 */
    remove(itemInstance) {
        const index = this.slots.findIndex(slot => slot.item === itemInstance);
        if (index === -1) return;

        itemInstance.dispose();
        this.slots[index].item = null;
    }

    /** 获取某个格子的道具 */
    getAt(slotIndex) {
        return this.slots[slotIndex]?.item || null;
    }

    /** 获取所有格子里的道具（按顺序） */
    getAll() {
        return this.slots.map(slot => slot.item);
    }

    /** 切换当前选中格子（循环切换） */
    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.slots.length;
    }

    selectPrev() {
        this.selectedIndex = (this.selectedIndex - 1 + this.slots.length) % this.slots.length;
    }

    /** 获取当前选中的道具 */
    getSelected() {
        return this.slots[this.selectedIndex]?.item || null;
    }

    /** 移动道具到指定格子，如果符合条件 */
    move(itemInstance, targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.slots.length) return false;
        const targetSlot = this.slots[targetIndex];
        if (targetSlot.item) return false;
        if (targetSlot.type && targetSlot.type !== itemInstance.config.type) return false;
        if (targetSlot.maxLevel < itemInstance.config.level) return false;

        const currentIndex = itemInstance._slotIndex;
        if (currentIndex === undefined) return false;

        this.slots[currentIndex].item = null;
        targetSlot.item = itemInstance;
        itemInstance._slotIndex = targetIndex;
        return true;
    }
}

export const itemManager = new ItemManager();