import { Item } from "./Item";
import { ItemTypes, ItemTags, ItemConfigs as Items } from "./ItemConfigs";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { inputManager } from "../../Manager/InputManager";
import { game } from "../../Game";
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

        // === 拖拽相关状态 ===
        this.draggingItem = null;   // 当前拖拽的道具实例
        this.draggingFrom = null;   // 原始格子索引
        this.mouseX = 0;
        this.mouseY = 0;

        // 绑定事件
        const canvas = document.getElementById("right-ui");
        canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    }

    getSlotIndexFromMouse(e) {
        const rect = e.target.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const padding = 5;
        const slotSize = Math.min(60, e.target.width - 2 * padding);
        const slotHeight = slotSize + padding;
        const index = Math.floor((mouseY - padding) / slotHeight);
        return index >= 0 && index < this.slots.length ? index : null;
    }

    onMouseDown(e) {
        const index = this.getSlotIndexFromMouse(e);
        if (index === null) return;
        const slot = this.slots[index];
        if (slot.item) {
            this.draggingItem = slot.item;
            this.draggingFrom = index;
            this.mouseX = e.offsetX;
            this.mouseY = e.offsetY;
        }
    }

    onMouseMove(e) {
        if (!this.draggingItem) return;
        this.mouseX = e.offsetX;
        this.mouseY = e.offsetY;
    }

    onMouseUp(e) {
        if (!this.draggingItem) return;

        const targetIndex = this.getSlotIndexFromMouse(e);

        if (targetIndex !== null && targetIndex !== this.draggingFrom) {
            // 尝试交换
            const success = this.swapSlots(this.draggingFrom, targetIndex);
            if (!success) {
                console.warn("交换失败，规则不允许");
            }
        }

        // 清理拖拽状态
        this.draggingItem = null;
        this.draggingFrom = null;
    }

    /**
     * 交换两个格子的道具（仅考虑格子 type 和 maxLevel）
     * @param {number} indexA
     * @param {number} indexB
     * @returns {boolean} 是否成功交换
     */
    swapSlots(indexA, indexB) {
        const slotA = this.slots[indexA];
        const slotB = this.slots[indexB];
        if (!slotA || !slotB) return false;

        const itemA = slotA.item;
        const itemB = slotB.item;

        // 检查 type 和 maxLevel 限制
        if (itemA) {
            if (slotB.type && slotB.type !== itemA.config.type) return false;
            if (slotB.maxLevel < itemA.config.level) return false;
        }
        if (itemB) {
            if (slotA.type && slotA.type !== itemB.config.type) return false;
            if (slotA.maxLevel < itemB.config.level) return false;
        }

        // 执行交换
        slotA.item = itemB || null;
        slotB.item = itemA || null;

        if (itemA) itemA._slotIndex = indexB;
        if (itemB) itemB._slotIndex = indexA;

        return true;
    }

    getSlotIndexFromMouse(e) {
        const rect = e.target.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const slotHeight = 65; // 包含 padding
        const index = Math.floor(mouseY / slotHeight);
        return index >= 0 && index < this.slots.length ? index : null;
    }

    /** 获取道具，返回道具实例或 null */
    tryAcquire(config) {
        // 自动添加 UNIQUE_SINGLE 标签
        if (!config.tags) config.tags = [];
        if (!config.tags.includes(ItemTags.UNIQUE_GLOBAL) && !config.tags.includes(ItemTags.MULTIPLE)) {
            if (!config.tags.includes(ItemTags.UNIQUE_SINGLE)) {
                config.tags.push(ItemTags.UNIQUE_SINGLE);
            }
        }

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
        if (index === -1) return false;

        // 检查能否移除
        if (!itemInstance.canRemove()) {
            console.warn("该道具暂时不能移除");
            return false;
        }

        // 执行销毁逻辑
        itemInstance.dispose();
        this.slots[index].item = null;

        // 清理扩展格子
        this.slots = this.slots.filter(slot => slot._source !== itemInstance._instanceId);

        return true;
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
     * 增加新的道具格
     * @param {number} count 要增加的数量
     * @param {Object} options 格子配置（默认 NORMAL / maxLevel=1）
     * @param {string} source 来源道具（移除时清理格子用）
     */
    addSlots(count, options = {}, source = null) {
        const { maxLevel = 1, type = ItemTypes.NORMAL } = options;

        const newSlots = [];
        for (let i = 0; i < count; i++) {
            const slot = { maxLevel, type, item: null, _source: source };
            this.slots.push(slot);
            newSlots.push(slot);
        }
        return newSlots;
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

        const selectedSlot = this.getSelectedSlot();

        // 如果正在拖拽，计算目标格子
        let hoverIndex = null;
        if (this.draggingItem) {
            hoverIndex = this.getSlotIndexFromMouse({
                target: ctx.canvas,
                clientY: this.mouseY + ctx.canvas.getBoundingClientRect().top
            });
        }

        allSlots.forEach((slot, index) => {
            const x = padding;
            const y = padding + index * (slotSize + padding);

            if (y + slotSize > canvasHeight) return;

            // 背景
            ctx.fillStyle = "rgba(50,50,50,0.7)";
            ctx.fillRect(x, y, slotSize, slotSize);

            // 边框颜色：选中黄，高亮绿/红
            if (index === hoverIndex && this.draggingItem) {
                // 检查是否能放置
                const canDrop =
                    (!slot.type || slot.type === this.draggingItem.config.type) &&
                    (slot.maxLevel >= this.draggingItem.config.level);

                ctx.strokeStyle = canDrop ? "lime" : "red";
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = slot === selectedSlot ? "yellow" : "white";
                ctx.lineWidth = slot === selectedSlot ? 2 : 1;
            }
            ctx.strokeRect(x, y, slotSize, slotSize);

            // 绘制道具
            if (slot.item && slot.item !== this.draggingItem) {
                ctx.fillStyle = "white";
                ctx.font = `${Math.min(slotSize / 3, 14)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(slot.item.config.id, x + slotSize / 2, y + slotSize / 2);
            } else if (!slot.item) {
                ctx.fillStyle = "rgba(200,200,200,0.3)";
                ctx.font = `${Math.min(slotSize / 3, 14)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("空", x + slotSize / 2, y + slotSize / 2);
            }
        });

        // 绘制拖拽中的道具（跟随鼠标）
        if (this.draggingItem) {
            ctx.save();
            ctx.globalAlpha = 0.8; // 半透明
            ctx.fillStyle = "white";
            ctx.font = "16px bold sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // 稍微放大显示
            ctx.fillText(this.draggingItem.config.id, this.mouseX, this.mouseY);
            ctx.restore();
        }
    }
}

export const itemManager = new ItemManager();