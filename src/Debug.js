import { game } from "./Game";
import { player } from "./Entities/Player";
import { itemManager } from "./System/Item/ItemManager";
import { mapManager } from "./Manager/MapManager";
import { saveManager } from "./Manager/SaveManager";
import { soundManager } from "./Manager/SoundManager";
import { textureManager } from "./Manager/TextureManager";
import { dataManager } from "./Manager/DataManager";
import { attributeManager } from "./Manager/AttributeManager";
import { projectilesManager } from "./System/Attack/ProjectilesManager";
import { uiManager } from "./System/UI/UIManager";
import { interactionManager } from "./Manager/InteractionManager";
import { dialogManager } from "./Manager/DialogManager";
import { eventBus, EventTypes } from "./Manager/EventBus";
import { ItemConfigs, ItemTags, ItemTypes } from "./System/Item/ItemConfigs";
import { SlotTypes } from "./System/Item/Slot";
import { AttributeTypes } from "./Manager/AttributeManager";
import { EnemyAnimationConfigs } from "./Entities/Enemys/EnemyAnimation";
import { canvas_game, canvas_ui, ctx_game, ctx_ui, sizes } from "./Utils/canvas";
import { mouseManager } from "./System/Input/MouseManager";
import { keyboardManager } from "./System/Input/KeyboardManager";
import { inputManager } from "./System/Input/InputManager";
import { itemGenerateHistory } from "./System/Item/Item";
import { talentManager } from "./System/Talent/TalentManager";
import { TalentConfigs } from "./System/Talent/TalentConfigs";

class Debug {
    constructor() {
        if (Debug.instance) return Debug.instance;
        Debug.instance = this;

        // 将这些 manager/instance 挂载到 debug 对象下，方便在控制台快速访问
        this.managers = {
            game,
            player,
            itemManager,
            mapManager,
            saveManager,
            soundManager,
            textureManager,
            dataManager,
            attributeManager,
            projectilesManager,
            uiManager,
            interactionManager,
            dialogManager,
            eventBus,
            inputManager,
            mouseManager,
            keyboardManager,
            talentManager
        };

        // 常用静态配置 / 常量
        this.constants = {
            ItemConfigs,
            ItemTags,
            ItemTypes,
            itemGenerateHistory,
            EventTypes,
            SlotTypes,
            AttributeTypes,
            TalentConfigs,
            EnemyAnimationConfigs,
            canvas_game,
            canvas_ui,
            ctx_game,
            ctx_ui,
            sizes,
        };
    }

    /**
     * 将 managers 和 constants 挂载到全局 window 上，便于在控制台直接访问。
     * options:
     *  - prefix: 可选字符串，挂载名的前缀（默认无）
     *  - force: 如果 true，会覆盖已存在的全局变量（默认 false）
     */
    exposeGlobals(options = {}) {
        const { prefix = '', force = false } = options;

        const mount = (name, value) => {
            const key = prefix ? `${prefix}${name}` : name;
            if (!force && typeof window[key] !== 'undefined') {
                console.warn(`skip mounting ${key}: already exists on window`);
                return false;
            }
            try {
                window[key] = value;
                console.log(`mounted ${key} to window`);
                return true;
            } catch (e) {
                console.warn(`failed to mount ${key} to window`, e);
                return false;
            }
        };

        for (const [k, v] of Object.entries(this.managers || {})) mount(k, v);
        for (const [k, v] of Object.entries(this.constants || {})) mount(k, v);
        mount('debug', this);
    }

    // 列出已挂载的管理器
    list() {
        console.table(Object.keys(this.managers).map(k => ({ name: k, type: typeof this.managers[k] })));
    }

    // 打印某个管理器的当前状态（传入名称字符串）
    print(name) {
        const m = this.managers[name];
        if (!m) return console.warn(`No manager named ${name}`);
        console.log(name, m);
        return m;
    }

    // 将所有管理器 dump 出来（可能很多，谨慎使用）
    dumpAll() {
        for (const k of Object.keys(this.managers)) {
            console.groupCollapsed(k);
            console.log(this.managers[k]);
            console.groupEnd();
        }
    }

    // 列出可用的 ItemConfigs 名称
    listConfigs() {
        if (!this.constants || !this.constants.ItemConfigs) return console.warn('ItemConfigs not available');
        console.table(Object.keys(this.constants.ItemConfigs).map(k => ({ key: k, name: this.constants.ItemConfigs[k].name, level: this.constants.ItemConfigs[k].level })));
    }

    // 列出所有挂载到 constants 的常量名
    listConstants() {
        console.table(Object.keys(this.constants).map(k => ({ key: k, type: typeof this.constants[k] })));
    }

    // 展示事件类型（EventTypes）
    showEventTypes() {
        console.log('EventTypes:', EventTypes);
    }

    // toggle pause（若 game 对象有 switchPause）
    togglePause() {
        if (game && typeof game.switchPause === 'function') {
            game.switchPause();
            console.log('toggled pause, isPaused =', game.isPaused);
        } else {
            console.warn('game.switchPause not available');
        }
    }

    togglePauseTick() {
        if (game.isStopUpdate) {
            game.resumeUpdate();
            console.log('game resumed');
        } else {
            game.stopUpdate();
            console.log('game paused');
        }
    }

    stepTick() {
        if (!game) return console.warn('game not available');
        if (eventBus && eventBus.emit) {
            eventBus.emit('GAME_TICK', { deltaTime: game.FrameTime });
            console.log('stepped one tick');
        } else {
            console.warn('eventBus not available');
        }
    }

    save(slot = 1) {
        if (!saveManager) return console.warn('saveManager not available');
        const ctx = { player, mapManager, itemManager };
        const res = saveManager.save(slot, ctx);
        console.log('save result', res);
        return res;
    }

    async load(slot = 1) {
        if (!saveManager) return console.warn('saveManager not available');
        const ctx = { player, mapManager, itemManager };
        const ok = await saveManager.load(slot, ctx);
        console.log('load result', ok);
        return ok;
    }

    showActivatedItems() {
        if (!itemManager) return console.warn('itemManager not available');
        const arr = Array.from(itemManager.activatedItems || []);
        console.table(arr.map(i => ({ id: i.id, name: i.name, config: i.config?.name })));
        return arr;
    }

    deactivateAllItems() {
        if (!itemManager) return console.warn('itemManager not available');
        for (const it of Array.from(itemManager.activatedItems || [])) {
            try { it.deactivate(); } catch (e) { console.warn(e); }
            itemManager.activatedItems.delete(it);
        }
        console.log('deactivated all items');
    }

    reactivateAllFromSlots() {
        if (!itemManager) return console.warn('itemManager not available');
        const currentItems = new Set(itemManager.slots.map(s => s.item).filter(Boolean));
        for (const it of currentItems) {
            if (!itemManager.activatedItems.has(it)) {
                try { it.activate(); } catch (e) { console.warn(e); }
                itemManager.activatedItems.add(it);
            }
        }
        console.log('reactivated items from slots');
    }
}

export const debug = new Debug();
