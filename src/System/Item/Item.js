import { attributeManager as AM } from "../../Manager/AttributeManager";
import { eventBus as bus } from "../../Manager/EventBus";

let itemInstanceCounter = 0;

export class Item {
    constructor(config) {
        this.config = config;
        this.state = config.state ? { ...config.state } : {};

        // 每个实例唯一 id
        this._instanceId = `${config.id}_${itemInstanceCounter++}`;

        // 拷贝标签
        this.tags = [...(config.tags || [])];

        // 添加属性效果
        if (config.effects) {
            for (const key in config.effects) {
                AM.addAttr(key, config.effects[key], this._instanceId);
            }
        }

        // 注册事件钩子
        if (config.hooks) {
            for (const hook of config.hooks(this)) {
                const hookOptions = {
                    ...hook,
                    handler: hook.handler.bind(this),
                    source: this._instanceId
                };
                bus.on(hookOptions);
            }
        }

        if (typeof config.onAcquire === "function") {
            config.onAcquire(this);
        }
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

    /**
     * 是否允许移除
     * 默认返回 true，可以在 config.canRemove 覆盖
     */
    canRemove() {
        if (typeof this.config.canRemove === "function") {
            return this.config.canRemove(this);
        }
        return true;
    }

    /**
     * 移除时调用
     */
    onRemove() {
        if (typeof this.config.onRemove === "function") {
            this.config.onRemove(this);
        }
    }

    /** 移除道具，解绑属性和事件 */
    dispose() {
        if (this.config.effects) AM.removeAllAttrBySource(this._instanceId);
        bus.offBySource(this._instanceId);
        this.onRemove();
    }
}