import { attributeManager as AM } from "../../Manager/AttributeManager";
import { eventBus as bus } from "../../Manager/EventBus";
import { ItemTags } from "./ItemConfigs";
import { itemManager } from "./ItemManager";

let itemInstanceCounter = 0;
export const itemGenerateHistory = new Set();

export class Item {
    constructor(config) {
        this.config = config;
        this.state = config.state ? { ...config.state } : {};
        this.id = `${config.name}_${itemInstanceCounter++}`;
        this.name = config.name;
        this.tags = [...(config.tags || [])];
        this.type = config.type;
        this.level = config.level;
        itemGenerateHistory.add(config.name);
        this._slot = null;   // 当前所在格子
        this._init = false;
        this._active = false; // 是否生效
    }

    /** 激活道具效果 */
    activate() {
        if (this._active) return;
        this._active = true;

        // 属性
        if (this.config.effects) {
            for (const key in this.config.effects) {
                AM.addAttr(key, this.config.effects[key], this.id);
            }
        }

        // 事件钩子
        if (this.config.hooks) {
            for (const hook of this.config.hooks(this)) {
                const hookOptions = { ...hook, handler: hook.handler.bind(this), source: this.id };
                bus.on(hookOptions);
            }
        }

        if (typeof this.config.onActivate === "function") {
            this.config.onActivate(this);
        }

        if (typeof this.config.onAcquire === "function" && !this._init) {
            this.config.onAcquire(this);
            this._init = true;
        }
    }

    /** 取消激活效果 */
    deactivate() {
        if (!this._active) return;
        itemManager.activatedItems.delete(this);
        this._active = false;

        AM.removeAllAttrBySource(this.id);
        bus.offBySource(this.id);

        if (this.hasTag(ItemTags.ADD_SLOTS))
            itemManager.removeSlotsBySource(this.id);
    }

    /** 添加标签 */
    addTag(tag) {
        if (!this.tags.includes(tag)) this.tags.push(tag);
    }

    /** 移除标签 */
    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
    }

    /** 检查标签 */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /** 检查能否移除 */
    canRemove() {
        if (this.hasTag(ItemTags.NO_DROP)) return false;
        if (typeof this.config.canRemove === "function") return this.config.canRemove(this);
        return true;
    }

    /** 检查能否交换 */
    canExchange() {
        if (this.hasTag(ItemTags.NO_EXCHANGE)) return false;
        if (typeof this.config.canExchange === "function") return this.config.canExchange(this);
        return true;
    }

    /** 移除道具时调用 */
    dispose() {
        this.deactivate();
        if (typeof this.config.onRemove === "function") this.config.onRemove(this);
    }
}