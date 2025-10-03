import { attributeManager as AM } from "../../Manager/AttributeManager";
import { eventBus as bus } from "../../Manager/EventBus";
import { talentManager } from "./TalentManager";

export class Talent {
    constructor(key, config) {
        this.key = key;
        this.name = config.name;
        this.description = config.description || '';
        this.maxLevel = config.maxLevel;
        const rawCosts = config.cost ?? config.costs ?? [];
        this.costs = Array.isArray(rawCosts) ? rawCosts.slice() : [rawCosts];
        this.cost = this.costs;
        this.prerequisites = (config.prerequisites || []).map(pr => {
            if (typeof pr === "string") return { name: pr, level: 1 };
            const name = pr.name || pr.key || pr.id;
            if (!name) return null;
            return { name, level: pr.level || 1 };
        }).filter(Boolean);
        this.excludes = new Set(config.excludes || []);
        this.unlock_excludes = new Set(config.unlock_excludes || []);
        this.config = config;
        this._active = false;
        this.appliedLevel = 0; // 当前应用到属性系统的等级
        this.state = {};
    }

    /** 检查是否可以解锁到指定等级（不考虑当前等级，只检查条件） */
    canUnlock(level) {
        if (level > this.maxLevel) {
            console.warn(`Talent ${this.name} cannot unlock to level ${level}, max is ${this.maxLevel}`);
            return false;
        }

        if (this.prerequisites.length > 0) {
            const satisfied = this.prerequisites.some(({ name, level: reqLevel }) => talentManager.hasTalentLevel(name, reqLevel));
            if (!satisfied) return false;
        }

        // 检查排斥关系：如果已有的已解锁天赋与当前天赋互相排斥，则不能解锁
        if (talentManager.isBlockedByExcludes(this.name)) return false;
        return true;
    }

    /** 激活天赋效果（将 effects 应用到属性系统）
     * @param {number} level 要应用的等级（0 表示取消）
     */
    activate(level) {
        // 如果 level 与已应用等级相同，则不用重复应用
        if (this.appliedLevel === level) return;

        // 先清理之前的效果
        this.deactivate();

        if (!level || level <= 0) return;

        talentManager.excludes = new Set([...talentManager.excludes, ...this.excludes]);
        talentManager.unlock_excludes = new Set([...talentManager.unlock_excludes, ...this.unlock_excludes]);

        // 应用新的效果
        if (typeof this.config.effects === 'function') {
            const eff = this.config.effects(level);
            for (const k in eff) {
                AM.addAttr(k, eff[k], this.name);
            }
        }

        // 注册 hooks（如果有）——传入 talent 对象并允许根据 level 行为
        if (typeof this.config.hooks === 'function') {
            const hooks = this.config.hooks(this, level);
            for (const hook of hooks) {
                bus.on({ ...hook, handler: hook.handler.bind(this), source: this.name });
            }
        }

        if (typeof this.config.onActivate === "function") {
            this.config.onActivate(this, level);
        }

        this._active = true;
        this.appliedLevel = level;
    }

    deactivate() {
        if (!this._active && this.appliedLevel === 0) return;
        // 清理效果
        talentManager.excludes = new Set([...talentManager.excludes].filter(x => !this.excludes.has(x)));
        talentManager.unlock_excludes = new Set([...talentManager.unlock_excludes].filter(x => !this.unlock_excludes.has(x)));
        this._active = false;
        this.appliedLevel = 0;
        AM.removeAllAttrBySource(this.name);
        bus.offBySource(this.name);

        if (typeof this.config.onDeactivate === "function") {
            this.config.onDeactivate(this);
        }
    }

    dispose() {
        this.deactivate();
    }
}

export default Talent;
