import { Talent } from './Talent';
import { TalentConfigs } from './TalentConfigs';
import { eventBus as bus, EventTypes as Events } from '../../Manager/EventBus';

class TalentManager {
    constructor() {
        if (TalentManager.instance) return TalentManager.instance;
        TalentManager.instance = this;

        // 已注册的天赋实例：name -> Talent 实例
        this.talents = {};

        // 天赋等级存储：name -> level
        this.levels = {};

        // 玩家持有的灵魂碎片
        this.soulFragments = 0;

        this.excludes = new Set();
        this.unlock_excludes = new Set();
    }

    /** 初始化：根据配置创建 Talent 实例（但不解锁等级，保持 level 为 0） */
    initFromConfigs(Configs) {
        for (const key of Object.keys(Configs)) {
            const cfg = Configs[key];
            const name = cfg.name;
            this.talents[name] = new Talent(key, cfg);
            this.levels[name] = 0;
        }
    }

    /**
     * 获取指定名称的天赋实例
     * @param {string} name
     * @returns {Talent}
     */
    getTalent(name) {
        return this.talents[name] || null;
    }

    /**
     * 获取指定名称的天赋等级
     * @param {string} name
     * @returns {number}
     */
    getTalentLevel(name) {
        return this.levels[name] || 0;
    }

    /**
     * 检查是否拥有指定名称的天赋
     * @param {string} name
     * @returns {boolean}
     */
    hasTalent(name) {
        return this.talents[name] !== undefined;
    }

    /**
     * 检查某个天赋是否已达到目标等级
     * @param {string} name
     * @param {number} level
     * @returns {boolean}
     */
    hasTalentLevel(name, level) {
        return this.getTalentLevel(name) >= level;
    }

    /**
     * 检查是否有足够的灵魂碎片
     * @param {number} count
     * @returns {boolean}
     */
    hasFragments(count) {
        return this.soulFragments >= count;
    }

    /**
     * 消耗灵魂碎片
     * @param {number} count
     */
    consumeFragments(count) {
        if (!count) return;
        this.soulFragments -= count;
        bus.emit(Events.talent.fragmentsChange, { fragments: this.soulFragments });
    }

    /** 解锁或提升天赋一级
     * @param {string} name
     * @returns { { ok: boolean, reason?: string } }
     */
    unlockTalent(name) {
        const t = this.getTalent(name);
        if (!t) return { ok: false, reason: 'no_such_talent' };
        const nextLevel = this.getTalentLevel(name) + 1;
        if (nextLevel > t.maxLevel) return { ok: false, reason: 'max_level' };
        if (!t.canUnlock(nextLevel)) return { ok: false, reason: 'req_not_met' };

        const cost = t.costs[nextLevel - 1] || 0;
        if (!this.hasFragments(cost)) return { ok: false, reason: 'no_fragments' };
        this.consumeFragments(cost);
        this.levels[name] = nextLevel;
        try { t.activate(nextLevel); } catch (e) { console.warn('talent activate error', e); }

        bus.emit(Events.talent.unlock, { key: t.key, name, level: nextLevel, talent: t });
        return { ok: true, level: nextLevel };
    }

    /**
     * 更新天赋状态
     * @param {number} _ - 可选参数，通常为 deltaTime（未使用）
     */
    update(_) {
        for (const key in this.talents) {
            const t = this.getTalent(key);
            const lvl = this.getTalentLevel(key);
            if (lvl > 0) {
                try { t.activate(lvl); } catch (e) { console.warn('talent.activate error', e); }
            } else {
                try { t.deactivate(); } catch (e) { console.warn('talent.deactivate error', e); }
            }
        }
    }

    isBlockedByExcludes(name) {
        if (this.unlock_excludes.has(name)) return false;
        if (this.excludes.has(name)) return true;

        const talent = this.getTalent(name);
        if (!talent) return false;

        for (const excludeName of talent.excludes) {
            if (this.unlock_excludes.has(excludeName)) continue;
            if (this.hasTalentLevel(excludeName, 1)) return true;
        }

        return false;
    }


    // 工具：增加/设置碎片数（便于测试）
    addFragments(n) {
        if (!n) return;
        this.soulFragments += n;
        bus.emit(Events.talent.fragmentsChange, { fragments: this.soulFragments });
    }
    setFragments(n) {
        this.soulFragments = Math.max(0, n);
        bus.emit(Events.talent.fragmentsChange, { fragments: this.soulFragments });
    }
}

export const talentManager = new TalentManager();
talentManager.initFromConfigs(TalentConfigs);
