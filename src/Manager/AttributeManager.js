import { Duration } from "../Utils/Duration";
export const AttributeTypes = {
    player: {
        ATK: "PLAYER_ATK",
        HP: "PLAYER_HP",
        SPD: "PLAYER_SPD",
        HEAL: "PLAYER_HEAL",
        DMG: "PLAYER_DMG",
        HP_CONTINUES_DEC: "PLAYER_HP_CONTINUES_DEC",
        MeteeStartupTime: "PLAYER_MeteeStartupTime",
        MeteeRecoveryTime: "PLAYER_MeteeRecoveryTime",
        RangedStartupTime: "PLAYER_RangedStartupTime",
        RangedRecoveryTime: "PLAYER_RangedRecoveryTime"
    },
    enemy: {
        ATK: "ENEMY_ATK",
        HP: "ENEMY_HP",
        DMG: "ENEMY_DMG",
        DMG_DEC: "ENEMY_DMG_DEC",
        MeteeStartupTime: "ENEMY_MeteeStartupTime",
        MeteeRecoveryTime: "ENEMY_MeteeRecoveryTime",
        RangedStartupTime: "ENEMY_RangedStartupTime",
        RangedRecoveryTime: "ENEMY_RangedRecoveryTime"
    },
    boss: {
        // 可扩展 boss 属性
    }
};

class AttributeManager {
    constructor() {
        if (AttributeManager.instance) return AttributeManager.instance;
        AttributeManager.instance = this;

        // 属性存储结构： key -> source -> [{value, timer}]
        this.attributes = {};
    }

    /**
     * 校验属性 key 是否存在于 AttributeTypes
     * @param {string} key 属性标识
     * @returns {boolean}
     */
    _checkAttr(key) {
        for (const type of Object.keys(AttributeTypes)) {
            if (Object.values(AttributeTypes[type]).includes(key)) {
                return true;
            }
        }
        console.warn(`[AttributeManager] Unknown attribute key: ${key}`);
        return false;
    }

    /**
     * 添加属性
     * @param {string} key 属性标识
     * @param {number} value 属性值
     * @param {string} source 来源
     * @param {number|null} duration 持续时间 ms
     * @param {number|null} maxStack 最大叠加层数
     */
    addAttr(key, value, source, duration = null, maxStack = null) {
        if (!this._checkAttr(key)) return;

        if (!this.attributes[key]) this.attributes[key] = {};
        if (!this.attributes[key][source]) this.attributes[key][source] = [];

        const layers = this.attributes[key][source];
        while (maxStack && layers.length >= maxStack) {
            layers.shift(); // 达到层数上限，移除最早的一层
        }

        const timer = duration !== null ? new Duration(duration) : null;
        if (timer) timer.start(duration);

        layers.push({ value, timer });
    }

    // 删除特定来源的特定属性
    removeAttrBySource(key, source) {
        if (!this.attributes[key]) return;
        delete this.attributes[key][source];
    }

    // 移除特定来源的特定属性的一层
    removeOneAttrLayer(key, source) {
        if (!this._checkAttr(key)) return false;
        if (!this.attributes[key] || !this.attributes[key][source]) return false;

        const layers = this.attributes[key][source];
        if (layers.length === 0) return false;

        layers.shift(); // 移除最早的一层

        if (layers.length === 0) {
            delete this.attributes[key][source];
        }
        return true;
    }

    // 删除特定来源的所有属性
    removeAllAttrBySource(source) {
        for (const key of Object.keys(this.attributes)) {
            if (this.attributes[key][source]) {
                delete this.attributes[key][source];
            }
        }
    }

    // 刷新特定来源的特定属性的持续时间
    refreshAttrDuration(key, source, duration) {
        if (!this._checkAttr(key)) return;
        if (!this.attributes[key] || !this.attributes[key][source]) return;
        for (const entry of this.attributes[key][source]) {
            if (entry.timer) entry.timer.start(duration);
        }
    }

    // 获取特定属性的总和
    getAttrSum(key) {
        if (!this._checkAttr(key)) return 0;
        if (!this.attributes[key]) return 0;

        let total = 0;
        for (const source of Object.keys(this.attributes[key])) {
            const layers = this.attributes[key][source];
            total += layers.reduce((sum, entry) => sum + entry.value, 0);
        }

        return total;
    }

    // 获取特定属性特定来源的当前层数
    getAttrStackCount(key, source) {
        if (!this._checkAttr(key)) return 0;
        if (!this.attributes[key] || !this.attributes[key][source]) return 0;

        return this.attributes[key][source].length;
    }

    // 获取特定类的每一项属性的总和
    getAllAttrByType(typeObj) {
        const result = {};
        for (const keyInType of Object.keys(typeObj)) {
            const key = typeObj[keyInType];
            result[key] = this.getAttrSum(key);
        }
        return result;
    }

    // 获取所有属性
    getAllAttr() {
        const result = {};
        for (const key of Object.keys(this.attributes)) {
            result[key] = this.getAttrSum(key);
        }
        return result;
    }

    /**
     * 更新所有 Duration 并清理过期层
     * @param {number} deltaTime 时间增量 ms
     */
    update(deltaTime) {
        for (const key of Object.keys(this.attributes)) {
            for (const source of Object.keys(this.attributes[key])) {
                const layers = this.attributes[key][source];

                // 更新所有 Duration
                for (const entry of layers) {
                    if (entry.timer) entry.timer.tick(deltaTime);
                }

                // 清理过期层
                this.attributes[key][source] = layers.filter(
                    entry => !entry.timer || !entry.timer.expired()
                );

                // 删除零层的属性
                if (this.attributes[key][source].length === 0) {
                    delete this.attributes[key][source];
                }
            }
        }
    }
}

export const attributeManager = new AttributeManager();