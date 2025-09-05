export const EventTypes = {
    game: {
        tick: "GAME_TICK"
    },
    item: {
        gain: "ITEM_GAIN"
    },
    player: {
        die: "PLAYER_DIE",
        hp: "PLAYER_HP",
        heal: "PLAYER_HEAL"
    },
    enemy: {},
    boss: {}
};

class EventBus {
    constructor() {
        if (EventBus.instance) return EventBus.instance;
        EventBus.instance = this;

        /**
         * 存储事件监听器
         * Map<eventName, Array<{handler: Function, priority: number, maxCalls: number, callCount: number, onDispose: Function}>>
         */
        this.listeners = new Map();
        this.validEvents = new Set();

        this._initValidEvents(EventTypes);
    }

    /**
     * 扁平化 EventTypes，将所有合法事件名加入 Set
     * @param {object} obj 
     */
    _initValidEvents(obj) {
        for (const key in obj) {
            if (typeof obj[key] === "object") {
                this._initValidEvents(obj[key]);
            } else {
                this.validEvents.add(obj[key]);
            }
        }
    }

    /**
     * 检查事件是否合法
     * @param {string} event 
     */
    _checkEvent(event) {
        const exists = this.validEvents.has(event);
        if (!exists) console.warn(`[EventBus] 事件 "${event}" 不存在`);
    }

    /**
     * 注册事件监听器
     * @param {object} options
     * @param {string} options.event - 事件名称
     * @param {Function} options.handler - 回调函数
     * @param {number} [options.priority] - 优先级（默认 0）
     * @param {number} [options.maxCalls] - 最大触发次数（默认 Infinity）
     * @param {Function} [options.onDispose] - 注销时回调
     * @returns {Function} - 注销函数
     */
    on({ event, handler, priority = 0, maxCalls = Infinity, onDispose = null }) {
        this._checkEvent(event);
        if (!this.listeners.has(event)) this.listeners.set(event, []);

        const arr = this.listeners.get(event);
        const listener = {
            handler,
            priority,
            maxCalls,
            callCount: 0,
            onDispose
        };

        const index = arr.findIndex(h => priority > h.priority);
        if (index === -1) arr.push(listener);
        else arr.splice(index, 0, listener);

        return () => this.off(event, handler);
    }

    /**
     * 注销事件监听器
     * @param {string} event - 事件名称
     * @param {Function} handler - 要移除的回调函数
     */
    off(event, handler) {
        this._checkEvent(event);
        const arr = this.listeners.get(event);
        if (!arr) return;
        this.listeners.set(event, arr.filter(h => {
            if (h.handler === handler) {
                if (h.onDispose) h.onDispose();
                return false;
            }
            return true;
        }));
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} payload - 事件数据
     */
    emit(event, payload) {
        this._checkEvent(event);
        const arr = this.listeners.get(event);
        if (!arr) return;

        for (const listener of [...arr]) {
            try {
                listener.handler(payload);
            } catch (e) {
                console.error(`[EventBus] ${event} handler error`, e);
            }

            listener.callCount++;
            if (listener.callCount >= listener.maxCalls) {
                this.off(event, listener.handler);
            }
        }
    }

    /**
     * 触发可累积事件（Reducer 型）
     * @param {string} event - 事件名称
     * @param {*} payload - 初始数据
     * @param {Function} reducer - 累积逻辑函数 (prev, next) => newValue
     * @returns {*} - 最终累积结果
     */
    emitReduce(event, payload, reducer) {
        this._checkEvent(event);
        const arr = this.listeners.get(event);
        if (!arr) return payload;

        let result = payload;
        for (const listener of [...arr]) {
            try {
                const r = listener.handler(result);
                if (r !== undefined) result = reducer(result, r);
            } catch (e) {
                console.error(`[EventBus] ${event} handler error`, e);
            }

            listener.callCount++;
            if (listener.callCount >= listener.maxCalls) {
                this.off(event, listener.handler);
            }
        }
        return result;
    }
}

export const eventBus = new EventBus();