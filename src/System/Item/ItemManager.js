import { Item, itemGenerateHistory } from "./Item";
import { Slot, SlotTypes } from "./Slot";
import { ItemTypes, ItemTags, ItemConfigs as Items } from "./ItemConfigs";
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
        if (slotA.type != SlotTypes.INVENTORY && itemB && !itemB.canRemove()) return false;
        if (slotB.type != SlotTypes.INVENTORY && itemA && !itemA.canRemove()) return false;

        // 执行交换
        if (slotA.type != SlotTypes.INVENTORY && itemB) itemB.deactivate();
        if (slotB.type != SlotTypes.INVENTORY && itemA) itemA.deactivate();
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

        console.log(config)

        const item = new Item(config);
        item.activate();

        this.slots[slotIndex].setItem(item);
        item._slot = this.slots[slotIndex];
        return item;
    }

    /** 移除道具 */
    remove(item) {
        item.dispose();
        item._slot.removeItem();
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
