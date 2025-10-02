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

    /**
     * 返回一个用于 UI 展示的描述数组（每行为一段文字）
     * - 根据 config.effects 生成属性展示
     * - 显示标签（不可交换/不可丢弃等）与等级信息
     */
    getDescription() {
        const lines = [];
        if (this.name) lines.push(`${this.name} ${this.level ? `(等级 ${this.level})` : ''}`);

        // 优先显示配置里的 description（支持字符串或字符串数组，按换行拆分）
        if (this.config && this.config.description) {
            const desc = this.config.description;
            if (Array.isArray(desc)) {
                for (const d of desc) if (d) lines.push(d);
            } else if (typeof desc === 'string') {
                desc.split(/\r?\n/).forEach(l => { if (l) lines.push(l); });
            }
        }

        // const effectMap = this.config.effects || {};
        // const attrLabels = {
        //     // player
        //     'PLAYER_HP': '玩家生命',
        //     'PLAYER_DMG': '玩家伤害',
        //     'PLAYER_ATK': '玩家攻击',
        //     'PLAYER_SPD': '玩家速度',
        //     'PLAYER_HEAL': '玩家治疗',
        //     'PLAYER_TAKE_DAMAGE': '受到伤害',
        //     'PLAYER_DASH_CHARGE': '冲刺充能',
        //     'PLAYER_MeleeDmg': '近战伤害',
        //     'PLAYER_RangedDmg': '远程伤害',
        //     // enemy
        //     'ENEMY_DMG_DEC': '敌人伤害减免',
        //     // boss
        //     'BOSS_HP': 'BOSS 生命',
        //     'BOSS_ATK': 'BOSS 攻击'
        // };

        // for (const key in effectMap) {
        //     const val = effectMap[key];
        //     const label = attrLabels[key] || key;
        //     let text = '';
        //     // 百分比表现（绝大多数 effects 使用小数表示比例）
        //     if (Math.abs(val) > 0 && Math.abs(val) < 1) {
        //         text = `${label}: ${val > 0 ? '+' : ''}${(val * 100).toFixed(0)}%`;
        //     } else {
        //         // 绝对值或较大数值
        //         text = `${label}: ${val > 0 ? '+' : ''}${val}`;
        //     }
        //     lines.push(text);
        // }

        // // tags -> 友好文本
        // const tagTexts = [];
        // for (const t of this.tags || []) {
        //     switch (t) {
        //         case ItemTags.NO_EXCHANGE: tagTexts.push('不可交换'); break;
        //         case ItemTags.NO_DROP: tagTexts.push('不可丢弃'); break;
        //         case ItemTags.NO_RANDOM: tagTexts.push('不可随机获得'); break;
        //         case ItemTags.FIXED_EXCHANGE: tagTexts.push('固定交换道具'); break;
        //         case ItemTags.UNIQUE_GLOBAL: tagTexts.push('全局唯一'); break;
        //         case ItemTags.UNIQUE_SINGLE: tagTexts.push('单次唯一'); break;
        //         case ItemTags.MULTIPLE: tagTexts.push('可重复获得'); break;
        //         default: break;
        //     }
        // }
        // if (tagTexts.length > 0) lines.push('标签: ' + tagTexts.join('，'));

        return lines;
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

        if (typeof this.config.onAcquire === "function" && !this._init) {
            this.config.onAcquire(this);
            this._init = true;
        }

        if (typeof this.config.onActivate === "function") {
            this.config.onActivate(this);
        }
    }

    /** 取消激活效果 */
    deactivate() {
        if (!this._active) return;
        itemManager.activatedItems.delete(this);
        this._active = false;

        AM.removeAllAttrBySource(this.id);
        bus.offBySource(this.id);

        if (typeof this.config.onDeactivate === "function") {
            this.config.onDeactivate(this);
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