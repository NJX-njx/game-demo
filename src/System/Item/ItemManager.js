import { Item, itemGenerateHistory } from "./Item";
import { Slot, SlotTypes } from "./Slot";
import { ItemTypes, ItemTags, ItemConfigs as Items, ItemConfigs } from "./ItemConfigs";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { inputManager } from "../Input/InputManager";

class ItemManager {
    constructor() {
        if (ItemManager.instance) return ItemManager.instance;
        ItemManager.instance = this;

        this.slots = [
            new Slot({ itemType: ItemTypes.ENDING, maxLevel: Infinity }),
            new Slot({ maxLevel: 3 }),
            new Slot({ maxLevel: 2 }),
            new Slot({ maxLevel: 2 }),
            new Slot({ maxLevel: 2 }),
            new Slot({ maxLevel: 1 }),
            new Slot({ maxLevel: 1 }),
            new Slot({ maxLevel: 1 }),
        ];

        this.trashSlot = new Slot({ type: SlotTypes.TRUSH });

        // 已经被激活的道具集合
        this.activatedItems = new Set();

        this.selectedIndex = 0; // 当前选中格子
        this.dragging = false;
        this.draggingFrom = null;
        this.draggingItem = null;
    }

    /**
     * 交换两个格子的道具（仅考虑格子 type 和 maxLevel）
     * @param {Slot} slotA
     * @param {Slot} slotB
     * @returns {boolean} 是否成功交换
     */
    swapSlots(slotA, slotB) {
        if (!slotA || !slotB) return false;

        const itemA = slotA.item;
        const itemB = slotB.item;

        // 检查格子
        if (!slotB.canAccept(itemA) || !slotA.canAccept(itemB)) return false;

        // 执行交换
        slotA.removeItem();
        slotB.removeItem();
        slotA.setItem(itemB);
        slotB.setItem(itemA);

        return true;
    }

    /** 获取道具，返回道具实例或 null */
    tryAcquire(config) {
        // 如果是全局唯一且已获取过，直接返回 null
        if (config.tags?.includes(ItemTags.UNIQUE_GLOBAL) && itemGenerateHistory.has(config.name)) {
            return null;
        }

        // 如果是同时唯一（UNIQUE_SINGLE），检查当前背包中是否已有同类道具
        if (config.tags?.includes(ItemTags.UNIQUE_SINGLE)) {
            const hasSingle = this.slots.some(slot => slot.item?.config.name === config.name);
            if (hasSingle) return null;
        }

        // 找第一个符合条件的空格子
        const slotIndex = this.slots.findIndex(slot => { return !slot.item && slot.canAccept(config); });
        if (slotIndex === -1) return null;

        const item = new Item(config);

        this.slots[slotIndex].setItem(item);
        item._slot = this.slots[slotIndex];
        return item;
    }

    /** 移除道具, 不检查 */
    remove(item) {
        item.dispose();
        if (item._slot) item._slot.removeItem();
    }

    /** 获取某个格子的道具 */
    getAt(slotIndex) {
        return this.slots[slotIndex]?.item || null;
    }

    /** 获取所有格子里的道具（按顺序） */
    getAll() {
        return this.slots.map(slot => slot.item);
    }

    /**
     * 统计当前持有某道具的数量（按道具 name 匹配）。
     * @param {string} name 道具名称
     * @returns {number} 持有数量，若未持有返回 0
     */
    countItem(name) {
        let count = 0;
        for (const slot of this.slots) {
            if (slot.item && slot.item.name === name) count++;
        }
        return count;
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

    /**
     * 增加新的道具格
     * @param {number} count 要增加的数量
     * @param {Object} options 格子配置（默认 NORMAL / maxLevel=1）
     * @param {string} source 来源道具（移除时清理格子用）
     */
    addSlots(count, options = {}, source = null) {
        const { maxLevel = 1, type = ItemTypes.NORMAL } = options;
        for (let i = 0; i < count; i++) {
            const slot = new Slot({ itemType: type, maxLevel: maxLevel, _source: source });
            this.slots.push(slot);
        }
    }

    /**
     * 移除特定来源的格子
     * @param {string} source 来源标识
     * @param {boolean} removeItems 是否先删除格子里的道具（默认 true）
     */
    removeSlotsBySource(source, removeItems = true) {
        if (!source) return;

        this.slots = this.slots.filter(slot => {
            if (slot._source === source) {
                if (removeItems && slot.item) {
                    slot.item.dispose();  // 销毁道具实例
                    slot.removeItem();
                }
                return false; // 从数组中删除
            }
            return true; // 保留其他格子
        });
    }

    /**
     * 交换格子中的道具
     * @param {Slot} slot 
     * @return {Boolean} 是否成功交换
     */
    exchangeItemBySlot(slot) {
        const currentItem = slot.item;
        if (!currentItem || !currentItem.canExchange()) return false;

        let newConfig = null;

        if (currentItem.hasTag(ItemTags.FIXED_EXCHANGE) && currentItem.config.exchangeToName) {// 1. 检查是否有特殊交换目标
            newConfig = Object.values(ItemConfigs).find(cfg => cfg.name === currentItem.config.exchangeToName);
        }
        else {// 2. 普通道具随机获取同等级道具
            newConfig = this.getRandomConfig(currentItem.config.level, { exclude: [currentItem.config.name] });
        }

        if (!newConfig) {
            console.warn("没有可交换的道具！");
            return false;
        }

        // 3. 移除当前道具
        this.remove(currentItem);

        // 4. 创建新道具放入原格子
        const newItem = new Item(newConfig);
        slot.item = newItem;
        newItem._slot = slot;

        return true;
    }

    /**
     * 获取一个随机的道具配置
     * @param {number} level 道具等级
     * @param {Object} options 可选项
     *   - exclude: 排除的道具name数组
     *   - type: 限制类型 (NORMAL / ENDING)
     */
    getRandomConfig(level, options = {}) {
        const { exclude = [], type = ItemTypes.NORMAL } = options;

        const pool = Object.values(Items).filter(cfg => {
            if (cfg.level !== level) return false;
            if (type && cfg.type !== type) return false;
            if (exclude.includes(cfg.name)) return false;

            // 不随机掉落的跳过
            if (cfg.tags?.includes(ItemTags.NO_RANDOM)) return false;

            // 已获取的全局唯一跳过
            if (cfg.tags?.includes(ItemTags.UNIQUE_GLOBAL) && itemGenerateHistory.has(cfg.name)) {
                return false;
            }

            // 当前背包中已有的 UNIQUE_SINGLE 跳过
            if (cfg.tags?.includes(ItemTags.UNIQUE_SINGLE)) {
                const hasSingle = this.slots.some(slot => slot.item?.config.name === cfg.name);
                if (hasSingle) return false;
            }

            return true;
        });

        if (pool.length === 0) return null;

        const config = pool[Math.floor(Math.random() * pool.length)];
        return config;
    }

    update(_) {
        // 自动激活当前主背包 slots 中的道具；同时取消激活已经不在 slots 中的道具
        const currentItems = new Set(this.slots.map(s => s.item).filter(Boolean));

        // 激活新进入 slots 的道具
        for (const item of currentItems) {
            if (!this.activatedItems.has(item)) {
                try { item.activate(); } catch (e) { console.warn("Item.activate error", e); }
                this.activatedItems.add(item);
            }
        }

        // 取消激活已经离开 slots 的道具
        for (const item of Array.from(this.activatedItems)) {
            if (!currentItems.has(item)) {
                try { item.deactivate(); } catch (e) { console.warn("Item.deactivate error", e); }
                this.activatedItems.delete(item);
            }
        }

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
}

export const itemManager = new ItemManager();
