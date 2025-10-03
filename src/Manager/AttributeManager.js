import { Duration } from "../Utils/Duration";

export const AttributeTypes = {
    player: {
        ATK: "PLAYER_ATK",
        HP: "PLAYER_HP",
        SPD: "PLAYER_SPD",
        HEAL: "PLAYER_HEAL",
        DMG: "PLAYER_DMG",
        TAKE_DMG: "PLAYER_TAKE_DAMAGE",//受到的伤害
        DASH_CHARGE: "PLAYER_DASH_CHARGE",//冲刺充能加速
        DASH_DURATION: "PLAYER_DASH_DURATION",//冲刺持续时间
        MeleeDmg: "PLAYER_MeleeDmg",
        RangedDmg: "PLAYER_RangedDmg",
        AttackStartupTime: "PLAYER_AttackStartupTime",
        AttackRecoveryTime: "PLAYER_AttackRecoveryTime",
        MeleeStartupTime: "PLAYER_MeleeStartupTime",
        MeleeRecoveryTime: "PLAYER_MeleeRecoveryTime",
        RangedStartupTime: "PLAYER_RangedStartupTime",
        RangedRecoveryTime: "PLAYER_RangedRecoveryTime",
        BlockDamageReduction: "PLAYER_Block_Damage_Reduction"
    },
    enemy: {
        ATK: "ENEMY_ATK",
        HP: "ENEMY_HP",
        DMG: "ENEMY_DMG",
        DMG_DEC: "ENEMY_DMG_DEC",
        AttackStartupTime: "ENEMY_AttackStartupTime",
        AttackRecoveryTime: "ENEMY_AttackRecoveryTime",
        MeleeStartupTime: "ENEMY_MeleeStartupTime",
        MeleeRecoveryTime: "ENEMY_MeleeRecoveryTime",
        RangedStartupTime: "ENEMY_RangedStartupTime",
        RangedRecoveryTime: "ENEMY_RangedRecoveryTime"
    },
    boss: {
        ATK: "BOSS_ATK",
        HP: "BOSS_HP",
        AttackStartupTime: "BOSS_AttackStartupTime",
        AttackRecoveryTime: "BOSS_AttackRecoveryTime",
        MeleeStartupTime: "BOSS_MeleeStartupTime",
        MeleeRecoveryTime: "BOSS_MeleeRecoveryTime",
        RangedStartupTime: "BOSS_RangedStartupTime",
        RangedRecoveryTime: "BOSS_RangedRecoveryTime"
    }
};

class AttributeManager {
    constructor() {
        if (AttributeManager.instance) return AttributeManager.instance;
        AttributeManager.instance = this;

        // 属性存储结构： key -> source -> [{value, timer}]
        this.attributes = {};
        this.validAttributes = new Set();

        this._initValidAttributes(AttributeTypes);
    }

    /**
     * 扁平化 AttributeTypes，将所有合法属性名加入 Set
     * @param {object} obj 
     */
    _initValidAttributes(obj) {
        for (const key in obj) {
            if (typeof obj[key] === "object") {
                this._initValidAttributes(obj[key]);
            } else {
                this.validAttributes.add(obj[key]);
            }
        }
    }

    /**
     * 校验属性 key 是否存在于 AttributeTypes
     * @param {string} key 属性标识
     * @returns {boolean}
     */
    _checkAttr(key) {
        const exists = this.validAttributes.has(key);
        if (!exists) console.warn(`[AttributeManager] 属性 "${key}" 不存在`);
        return exists;
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