import { Duration } from "../Utils/Duration";
export const AttributeTypes = {
    player: [
        "ATK", "HP", "SPD", "HEAL", "DMG",
        "ENEMY_DMG_DEC", "HP_CONTINUES_DEC",
        "MeteeStartupTime", "MeteeRecoveryTime",
        "RangedStartupTime", "RangedRecoveryTime"
    ],
    enemy: [
        "ENEMY_ATK", "ENEMY_HP", "ENEMY_DMG",
        "ENEMY_MeteeStartupTime", "ENEMY_MeteeRecoveryTime",
        "ENEMY_RangedStartupTime", "ENEMY_RangedRecoveryTime"
    ],
    boss: [
        // 可以单独扩展 boss 的属性
    ]
};

export class AttributeManager {
    constructor() {
        if (AttributeManager.instance) return AttributeManager.instance;
        AttributeManager.instance = this;

        this.attributes = {
            player: {},
            enemy: {},
            boss: {}
        };
    }

    _checkAttr(type, attrKey) {
        if (!AttributeTypes[type]) {
            console.warn(`[AttributeManager] Unknown type: ${type}`);
            return false;
        }
        if (!AttributeTypes[type].includes(attrKey)) {
            console.warn(`[AttributeManager] ${attrKey} is not valid for type ${type}`);
            return false;
        }
        return true;
    }

    /**
     * 添加属性
     * @param {string} type 属性类别 player/enemy/boss
     * @param {string} attrKey 属性名
     * @param {number} value 属性值
     * @param {string} source 来源
     * @param {number|null} duration 持续时间 ms
     * @param {number|null} maxStack 最大叠加层数
     */
    addAttr(type, attrKey, value, source, duration = null, maxStack = null) {
        if (!this._checkAttr(type, attrKey)) return;

        if (!this.attributes[type][attrKey]) this.attributes[type][attrKey] = {};
        if (!this.attributes[type][attrKey][source]) this.attributes[type][attrKey][source] = [];

        const layers = this.attributes[type][attrKey][source];
        while (maxStack && layers.length >= maxStack) {
            // 达到层数上限，移除最早的一层
            layers.shift();
        }

        const timer = duration !== null ? new Duration(duration) : null;
        if (timer) timer.start(duration);

        layers.push({ value, timer });
    }

    // 删除特定来源的特定属性
    removeAttrBySource(type, attrKey, source) {
        if (!this.attributes[type][attrKey]) return;
        delete this.attributes[type][attrKey][source];
    }

    // 删除特定来源的所有属性
    removeAllAttrBySource(source) {
        for (const type of Object.keys(this.attributes)) {
            for (const attrKey of Object.keys(this.attributes[type])) {
                delete this.attributes[type][attrKey][source];
            }
        }
    }

    // 刷新特定来源的特定属性的持续时间
    refreshAttrDuration(type, attrKey, source, duration) {
        if (!this.attributes[type][attrKey] || !this.attributes[type][attrKey][source]) return;
        for (const entry of this.attributes[type][attrKey][source]) {
            if (!entry.timer) continue;
            entry.timer.start(duration);
        }
    }

    // 获取特定属性的和
    getAttrSum(type, attrKey) {
        if (!this._checkAttr(type, attrKey)) return 0;
        if (!this.attributes[type][attrKey]) return 0;

        let total = 0;
        for (const source of Object.keys(this.attributes[type][attrKey])) {
            const layers = this.attributes[type][attrKey][source];
            total += layers.reduce((sum, entry) => sum + entry.value, 0);
        }

        return total;
    }

    // 获取特定属性特定来源的当前层数
    getAttrStackCount(type, attrKey, source) {
        if (!this._checkAttr(type, attrKey)) return 0;
        if (!this.attributes[type][attrKey]) return 0;
        if (!this.attributes[type][attrKey][source]) return 0;

        return this.attributes[type][attrKey][source].length;
    }

    // 获取特定类的所有属性
    getAllAttrByType(type) {
        if (!AttributeTypes[type]) return {};
        const result = {};
        for (const key of AttributeTypes[type]) {
            result[key] = this.getAttr(type, key);
        }
        return result;
    }

    // 获取所有属性
    getAllAttr() {
        const result = {};
        for (const type of Object.keys(this.attributes)) {
            result[type] = this.getAllAttrByType(type);
        }
        return result;
    }

    /**
     * 更新所有 Duration 并清理过期层
     * @param {number} deltaTime 时间增量 ms
     */
    update(deltaTime) {
        for (const type of Object.keys(this.attributes)) {
            for (const attrKey of Object.keys(this.attributes[type])) {
                for (const source of Object.keys(this.attributes[type][attrKey])) {
                    const layers = this.attributes[type][attrKey][source];

                    // 更新所有 Duration
                    for (const entry of layers) {
                        if (entry.timer) entry.timer.tick(deltaTime);
                    }

                    // 清理过期层
                    this.attributes[type][attrKey][source] = layers.filter(
                        entry => !entry.timer || !entry.timer.expired()
                    );

                    // 如果某个来源已经没有层了，删除这个来源
                    if (this.attributes[type][attrKey][source].length === 0) {
                        delete this.attributes[type][attrKey][source];
                    }
                }
            }
        }
    }
}

export const attributeManager = new AttributeManager();