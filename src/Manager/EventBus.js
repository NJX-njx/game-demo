export const EventTypes = {
    game: {
        tick: "GAME_TICK",
        battle: {
            start: "GAME_BATTLE_START",
            end: "GAME_BATTLE_END"
        },
        enter: {
            shop: "GAME_ENTER_SHOP"
        },
        finish: "GAME_FINISH"
    },
    item: {
        gain: "ITEM_GAIN",
        use: "ITEM_USE"
    },
    player: {
        die: "PLAYER_DIE",
        hpPercent: "PLAYER_HP_PERCENT",
        heal: "PLAYER_HEAL",
        dealDamage: "PLAYER_DEAL_DAMAGE",
        takeDamage: "PLAYER_TAKE_DAMAGE",
        fatelDmg: "PLAYER_FATEL_DAMAGE"
    },
    enemy: {
        die: "ENEMY_DIE"
    },
    boss: {},
    interaction: {
        trigger: "MAP_INTERACTION_TRIGGER"
    },
    dialog: {
        start: "DIALOG_START",
        end: "DIALOG_END"
    }
};

export const ItemEvents = {
    GAIN: "Item_Gain",
    REMOVE: "Item_onRemove",
    ON_CLEAR_STAGE: "onClearStage",
    PLAYER_TAKE_DAMAGE: "Item_PlayerTakeDamage",
    ON_ENTER_SHOP: "onEnterShop",
    ON_NEXT_FLOOR: "onNextFloor",
    ON_ACTIVE_USE: "onActiveUse",
    ON_PARRY: "onParry",
    ON_DODGE_COUNTER: "onDodgeCounter",
    ON_DASH_CHARGE_TICK: "onDashChargeTick",
    ON_PROJECTILE_HIT: "onProjectileHit"
};

class EventBus {
    constructor() {
        if (EventBus.instance) return EventBus.instance;
        EventBus.instance = this;

        this.listeners = new Map();
        this.validEvents = new Set();
        this._completedEvents = new Set(); // 记录已完成的事件

        this._initValidEvents(EventTypes);
    }

    _initValidEvents(obj) {
        for (const key in obj) {
            if (typeof obj[key] === "object") {
                this._initValidEvents(obj[key]);
            } else {
                this.validEvents.add(obj[key]);
            }
        }
    }

    _checkEvent(event) {
        const exists = this.validEvents.has(event);
        if (!exists) console.warn(`[EventBus] 事件 "${event}" 不存在`);
    }

    // 修复：只接受options对象参数
    on(options) {
        const { event, handler, priority = 0, maxCalls = Infinity, onDispose = null, source = null } = options;
        this._checkEvent(event);
        if (!this.listeners.has(event)) this.listeners.set(event, []);

        const arr = this.listeners.get(event);
        const listener = {
            handler,
            priority,
            maxCalls,
            callCount: 0,
            onDispose,
            source
        };

        const index = arr.findIndex(h => priority > h.priority);
        if (index === -1) arr.push(listener);
        else arr.splice(index, 0, listener);

        return () => this.off(event, handler);
    }

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

    offBySource(source) {
        for (const [event, arr] of this.listeners.entries()) {
            const newArr = arr.filter(h => {
                if (h.source && h.source === source) {
                    if (h.onDispose) h.onDispose();
                    return false;
                }
                return true;
            });

            if (newArr.length > 0) {
                this.listeners.set(event, newArr);
            } else {
                this.listeners.delete(event);
            }
        }
    }

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

    emitInterruptible(event, payload) {
        this._checkEvent(event);
        const arr = this.listeners.get(event);
        if (!arr) return false;

        for (const listener of [...arr]) {
            let stop = false;
            try {
                stop = listener.handler(payload) === true;
            } catch (e) {
                console.error(`[EventBus] ${event} handler error`, e);
            }

            listener.callCount++;
            if (listener.callCount >= listener.maxCalls) {
                this.off(event, listener.handler);
            }

            if (stop) {
                return true;
            }
        }
        return false;
    }

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

    /**
     * 获取已完成事件列表
     * @returns {Array<string>} 已完成的事件ID数组
     */
    getCompletedEvents() {
        return Array.from(this._completedEvents);
    }

    /**
     * 恢复已完成事件
     * @param {Array<string>} events 已完成的事件ID数组
     */
    restoreCompletedEvents(events) {
        if (Array.isArray(events)) {
            this._completedEvents = new Set(events);
        }
    }

    /**
     * 标记事件为已完成
     * @param {string} eventId 事件ID
     */
    completeEvent(eventId) {
        this._completedEvents.add(eventId);
    }

    /**
     * 检查事件是否已完成
     * @param {string} eventId 事件ID
     * @returns {boolean}
     */
    isEventCompleted(eventId) {
        return this._completedEvents.has(eventId);
    }
}

export const eventBus = new EventBus();
