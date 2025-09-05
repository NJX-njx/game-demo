import { attributeManager as AM } from "../../Manager/AttributeManager";
import { eventBus as bus } from "../../Manager/EventBus";
let itemInstanceCounter = 0;

export class Item {
    constructor(config) {
        this.config = config;
        this.state = config.state ? { ...config.state } : {};
        this._registeredHandlers = [];

        // 每个实例唯一 id
        this._instanceId = `${config.id}_${itemInstanceCounter++}`;

        // 添加属性效果
        if (config.effects)
            for (const key in config.effects)
                AM.addAttr(key, config.effects[key], this._instanceId);

        // 注册事件钩子
        if (config.hooks)
            for (const hook of config.hooks(this)) {
                const hookOptions = {
                    ...hook,
                    handler: hook.handler.bind(this)
                };
                const unregister = bus.on(hookOptions);
                this._registeredHandlers.push(unregister);
            }

        if (typeof config.onAcquire === "function") {
            config.onAcquire(this);
        }

        // // 广播一个获得事件（可选）
        // bus.emit("ITEM_ACQUIRE", this);
    }

    /** 移除道具，解绑属性和事件 */
    dispose() {
        // 移除属性效果
        if (this.config.effects) AM.removeAllAttrBySource(this._instanceId);
        // 注销事件回调
        for (const unregister of this._registeredHandlers) unregister();
        this._registeredHandlers = [];
        // // 统一广播移除事件（可选）
        // bus.emit("ITEM_REMOVE", this);
    }
}
