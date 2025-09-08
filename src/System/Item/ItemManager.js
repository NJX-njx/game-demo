import { Item } from "./Item";
import { ItemTypes, ItemTags, ItemConfigs as Items } from "./ItemConfigs";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { inputManager } from "../../Manager/InputManager";
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
        this.acquiredHistory = new Set(); // 记录全局唯一道具是否已经获取过

    }

    /** 获取道具，返回道具实例或 null */
    tryAcquire(config) {
        // 如果是全局唯一且已获取过，直接返回 null
        if (config.tags?.includes(ItemTags.UNIQUE_GLOBAL) && this.acquiredHistory.has(config.id)) {
            return null;
        }

        // 如果是同时唯一（UNIQUE_SINGLE），检查当前背包中是否已有同类道具
        if (config.tags?.includes(ItemTags.UNIQUE_SINGLE)) {
            const hasSingle = this.slots.some(slot => slot.item?.config.id === config.id);
            if (hasSingle) return null;
        }

        // 找第一个符合条件的空格子
        const slotIndex = this.slots.findIndex(slot => {
            if (slot.item) return false;
            if (slot.type && slot.type !== config.type) return false;
            if (slot.maxLevel < config.level) return false;
            return true;
        });

        if (slotIndex === -1) return null;

        console.log(config)

        const item = new Item(config);

        // 记录全局唯一道具
        if (config.tags?.includes(ItemTags.UNIQUE_GLOBAL)) {
            this.acquiredHistory.add(config.id);
        }

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

    /** 获取当前选中的格子（包含空格子信息） */
    getSelectedSlot() {
        return this.slots[this.selectedIndex] || null;
    }

    /** 获取当前选中的道具（可能为 null） */
    getSelectedItem() {
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

    /**
     * 获取一个随机的道具配置
     * @param {number} level 道具等级
     * @param {Object} options 可选项
     *   - exclude: 排除的道具id数组
     *   - type: 限制类型 (NORMAL / ENDING)
     */
    getRandomConfig(level, options = {}) {
        const { exclude = [], type = ItemTypes.NORMAL } = options;

        const pool = Object.values(Items).filter(cfg => {
            if (cfg.level !== level) return false;
            if (type && cfg.type !== type) return false;
            if (exclude.includes(cfg.id)) return false;

            // 不随机掉落的跳过
            if (cfg.tags?.includes(ItemTags.NO_RANDOM)) return false;

            // 已获取的全局唯一跳过
            if (cfg.tags?.includes(ItemTags.UNIQUE_GLOBAL) && this.acquiredHistory.has(cfg.id)) {
                return false;
            }

            // 当前背包中已有的 UNIQUE_SINGLE 跳过
            if (cfg.tags?.includes(ItemTags.UNIQUE_SINGLE)) {
                const hasSingle = this.slots.some(slot => slot.item?.config.id === cfg.id);
                if (hasSingle) return false;
            }

            return true;
        });

        if (pool.length === 0) return null;

        const config = pool[Math.floor(Math.random() * pool.length)];
        return config;
    }

    update(_) {
        if (inputManager.isFirstDown("N")) {
            itemManager.selectNext();
        }
        if (inputManager.isFirstDown("M")) {
            itemManager.selectPrev();
        }
        if (inputManager.isFirstDown("I")) {
            bus.emit(Events.item.use, { usedItem: this.getSelectedItem() })
        }
    }

    /**
      * 绘制道具栏
      * @param {CanvasRenderingContext2D} ctx 绘图上下文（右侧 UI canvas）
      */
    draw(ctx) {
        const allSlots = this.slots;
        const padding = 5;
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        const slotSize = Math.min(60, canvasWidth - 2 * padding);

        const selectedSlot = this.getSelectedSlot(); // 获取选中格子对象

        allSlots.forEach((slot, index) => {
            const x = padding;
            const y = padding + index * (slotSize + padding);

            if (y + slotSize > canvasHeight) return;

            // 背景
            ctx.fillStyle = "rgba(50,50,50,0.7)";
            ctx.fillRect(x, y, slotSize, slotSize);

            // 边框
            ctx.strokeStyle = slot === selectedSlot ? "yellow" : "white";
            ctx.lineWidth = slot === selectedSlot ? 2 : 1;
            ctx.strokeRect(x, y, slotSize, slotSize);

            // 道具 id 或空格子
            ctx.fillStyle = slot.item ? "white" : "rgba(200,200,200,0.3)";
            ctx.font = `${Math.min(slotSize / 3, 14)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(slot.item ? slot.item.config.id : "空", x + slotSize / 2, y + slotSize / 2);
        });
    }
}

export const itemManager = new ItemManager();