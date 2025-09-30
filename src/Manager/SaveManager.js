import { Vector } from "../Utils/Vector";

export class SaveManager {
    constructor(game, options = {}) {
        this.game = game;
        this.storageKey = options.storageKey || 'present_data';
    }

    _readStorage() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : { saveSlots: [] };
        } catch (e) {
            console.error('读取存档失败', e);
            return { saveSlots: [] };
        }
    }

    _writeStorage(obj) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(obj));
            return true;
        } catch (e) {
            console.error('写入存档失败', e);
            return false;
        }
    }

    /**
     * 保存当前游戏状态到槽位
     * @param {number} slotId 1-based
     * @param {object} ctx { player, enemies, mapManager }
     */
    save(slotId = 1, ctx = {}) {
        const { player, enemies = [], mapManager } = ctx;
        const slotIndex = Math.max(0, slotId - 1);

        const saveData = {
            player: player && typeof player.constructor?.getSaveData === 'function' ? player.constructor.getSaveData() : (player?.state || {}),
            enemies: Array.isArray(enemies) ? enemies.map(e => ({ type: e.type, position: e.hitbox.position, state: e.state, defeated: e.state?.hp <= 0 })) : [],
            layer: mapManager?.currentLayer ?? null,
            room: mapManager?.currentRoom ?? null,
            mapState: typeof mapManager?.getMapState === 'function' ? mapManager.getMapState() : null,
            timestamp: new Date().toISOString()
        };

        const container = this._readStorage();
        container.saveSlots = container.saveSlots || [];
        container.saveSlots[slotIndex] = saveData;

        const ok = this._writeStorage(container);
        if (ok) console.log('存档成功:', saveData);
        return ok ? saveData : null;
    }

    /**
     * 加载槽位并恢复实例
     * @param {number} slotId
     * @param {object} ctx { player, mapManager }
     */
    async load(slotId = 1, ctx = {}) {
        const { player, mapManager } = ctx;
        const slotIndex = Math.max(0, slotId - 1);
        const container = this._readStorage();
        const saveData = container.saveSlots?.[slotIndex];
        if (!saveData) return false;

        // 先加载地图
        if (mapManager && typeof mapManager.loadRoom === 'function' && saveData.layer != null && saveData.room != null) {
            await mapManager.loadRoom(saveData.layer, saveData.room);
        }

        try {
            // 恢复玩家位置/状态（尽量兼容）
            if (saveData.player?.position && player && typeof player.setPosition === 'function') {
                player.setPosition(new Vector(saveData.player.position.x, saveData.player.position.y));
            }
            if (saveData.player?.state && player) {
                if (typeof player.loadFromSave === 'function') {
                    player.loadFromSave(saveData.player);
                } else if (player.state && typeof player.state === 'object') {
                    Object.assign(player.state, saveData.player.state);
                }
            }

            // 恢复敌人：清空并根据存档创建
            // if (Array.isArray(saveData.enemies)) {
            //     window.enemies = [];
            //     for (const e of saveData.enemies) {
            //         try {
            //             const en = new Enemy(e.type, new Vector(e.position.x, e.position.y));
            //             if (e.state) Object.assign(en.state, e.state);
            //             window.enemies.push(en);
            //         } catch (err) {
            //             console.warn('恢复敌人失败', e, err);
            //         }
            //     }
            // }

        } catch (e) {
            console.error('恢复存档时出错', e);
            return false;
        }

        return true;
    }
}

export const saveManager = new SaveManager();
