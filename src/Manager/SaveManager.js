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
     * 只保存玩家血量、当前房间和道具信息
     * @param {number} slotId 1-based
     * @param {object} ctx { player, mapManager, itemManager }
     */
    save(slotId = 1, ctx = {}) {
        const { player, mapManager, itemManager, talentManager } = ctx;
        const slotIndex = Math.max(0, slotId - 1);

        // 获取道具信息
        const items = [];
        if (itemManager && itemManager.slots) {
            for (const slot of itemManager.slots) {
                if (slot.item) {
                    items.push({
                        name: slot.item.config.name,
                        level: slot.item.config.level,
                        type: slot.item.config.type
                    });
                } else {
                    items.push(null); // 空槽位
                }
            }
        }

        // 获取天赋等级信息
        const talents = {};
        if (talentManager && talentManager.levels) {
            for (const [name, level] of Object.entries(talentManager.levels)) {
                if (level > 0) {
                    talents[name] = level;
                }
            }
        }

        const saveData = {
            // 只保存玩家血量
            playerHp: player?.state?.hp ?? 100,
            // 保存当前房间信息
            layer: mapManager?.currentLayer ?? 0,
            room: mapManager?.currentRoom ?? 1,
            // 保存道具信息
            items: items,
            // 保存灵魂碎片数量
            soulFragments: talentManager?.soulFragments ?? 0,
            // 保存天赋等级信息
            talents: talents,
            timestamp: new Date().toISOString()
        };

        // 调试信息（生产环境可移除）
        if (process.env.NODE_ENV === 'development') {
            console.log('准备保存数据:', {
                slotId,
                playerHp: saveData.playerHp,
                layer: saveData.layer,
                room: saveData.room,
                itemsCount: items.filter(item => item !== null).length,
                talentsCount: Object.keys(talents).length,
                soulFragments: saveData.soulFragments,
                timestamp: saveData.timestamp
            });
        }

        const container = this._readStorage();
        container.saveSlots = container.saveSlots || [];
        container.saveSlots[slotIndex] = saveData;

        const ok = this._writeStorage(container);
        if (ok && process.env.NODE_ENV === 'development') {
            console.log('存档成功:', saveData);
        }
        return ok ? saveData : null;
    }

    /**
     * 加载槽位并恢复游戏状态
     * 只恢复玩家血量、房间和道具，其他属性重新计算
     * @param {number} slotId
     * @param {object} ctx { player, mapManager, itemManager }
     */
    async load(slotId = 1, ctx = {}) {
        const { player, mapManager, itemManager, talentManager } = ctx;
        const slotIndex = Math.max(0, slotId - 1);
        const container = this._readStorage();
        const saveData = container.saveSlots?.[slotIndex];
        if (!saveData) return false;

        try {
            if (process.env.NODE_ENV === 'development') {
                console.log('开始加载存档:', saveData);
            }
            
            // 1. 先加载地图
            if (mapManager && typeof mapManager.loadRoom === 'function' && saveData.layer != null && saveData.room != null) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`加载地图: 第${saveData.layer + 1}层 - 房间${saveData.room + 1}`);
                }
                await mapManager.loadRoom(saveData.layer, saveData.room);
                if (process.env.NODE_ENV === 'development') {
                    console.log('地图加载完成');
                }
            } else {
                console.warn('无法加载地图:', { mapManager: !!mapManager, layer: saveData.layer, room: saveData.room });
            }

            // 2. 恢复玩家血量（其他属性通过updateState重新计算）
            if (player && saveData.playerHp != null) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`恢复玩家血量: ${saveData.playerHp}`);
                }
                player.state.hp = saveData.playerHp;
                // 确保血量不超过最大值
                player.state.hp = Math.min(player.state.hp, player.state.hp_max);
                if (process.env.NODE_ENV === 'development') {
                    console.log(`玩家血量恢复完成: ${player.state.hp}/${player.state.hp_max}`);
                }
            } else {
                console.warn('无法恢复玩家血量:', { player: !!player, playerHp: saveData.playerHp });
            }

            // 2.5. 恢复灵魂碎片数量
            if (talentManager && saveData.soulFragments != null) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`恢复灵魂碎片数量: ${saveData.soulFragments}`);
                }
                talentManager.setFragments(saveData.soulFragments);
                if (process.env.NODE_ENV === 'development') {
                    console.log(`灵魂碎片恢复完成: ${talentManager.soulFragments}`);
                }
            } else {
                console.warn('无法恢复灵魂碎片:', { talentManager: !!talentManager, soulFragments: saveData.soulFragments });
            }

            // 2.6. 恢复天赋等级并重新激活
            if (talentManager && saveData.talents && typeof saveData.talents === 'object') {
                if (process.env.NODE_ENV === 'development') {
                    console.log('开始恢复天赋等级:', saveData.talents);
                }
                
                // 先重置所有天赋等级为0
                for (const talentName of Object.keys(talentManager.levels)) {
                    talentManager.levels[talentName] = 0;
                }
                
                // 恢复保存的天赋等级
                let restoredCount = 0;
                for (const [talentName, level] of Object.entries(saveData.talents)) {
                    if (talentManager.hasTalent(talentName) && level > 0) {
                        talentManager.levels[talentName] = level;
                        restoredCount++;
                        if (process.env.NODE_ENV === 'development') {
                            console.log(`恢复天赋: ${talentName} 等级 ${level}`);
                        }
                    } else {
                        console.warn(`无法恢复天赋: ${talentName} (等级: ${level})`);
                    }
                }
                
                // 重新激活所有天赋效果
                talentManager.update();
                
                if (process.env.NODE_ENV === 'development') {
                    console.log(`天赋恢复完成: 共恢复 ${restoredCount} 个天赋`);
                }
            } else {
                console.warn('无法恢复天赋:', { talentManager: !!talentManager, talents: saveData.talents });
            }

            // 3. 恢复道具
            if (itemManager && saveData.items && Array.isArray(saveData.items)) {
                // 清空当前道具
                for (const slot of itemManager.slots) {
                    if (slot.item) {
                        itemManager.remove(slot.item);
                    }
                }

                // 恢复道具
                for (let i = 0; i < Math.min(saveData.items.length, itemManager.slots.length); i++) {
                    const itemData = saveData.items[i];
                    if (itemData && itemData.name) {
                        try {
                            // 根据道具名称和等级恢复道具
                            const itemConfig = await this._findItemConfig(itemData.name, itemData.level, itemData.type);
                            if (itemConfig) {
                                // 动态导入Item类
                                const { Item } = await import('../System/Item/Item.js');
                                const item = new Item(itemConfig);
                                itemManager.slots[i].setItem(item);
                                item._slot = itemManager.slots[i];
                                if (process.env.NODE_ENV === 'development') {
                                    console.log(`恢复道具: ${itemData.name} 到槽位 ${i + 1}`);
                                }
                            } else {
                                console.warn(`找不到道具配置: ${itemData.name}`);
                            }
                        } catch (e) {
                            console.error(`恢复道具失败: ${itemData.name}`, e);
                        }
                    }
                }
                console.log('道具恢复完成');
            }

            // 4. 最终验证：确保所有系统状态正确
            if (process.env.NODE_ENV === 'development') {
                console.log('存档加载完成，最终状态验证:');
                console.log(`- 玩家血量: ${player?.state?.hp}/${player?.state?.hp_max}`);
                console.log(`- 灵魂碎片: ${talentManager?.soulFragments}`);
                console.log(`- 已激活天赋数量: ${talentManager ? Object.values(talentManager.levels).filter(lvl => lvl > 0).length : 0}`);
                console.log(`- 当前房间: 第${mapManager?.currentLayer + 1}层 - 房间${mapManager?.currentRoom + 1}`);
            }

        } catch (e) {
            console.error('恢复存档时出错', e);
            return false;
        }

        return true;
    }

    /**
     * 根据道具信息查找配置
     * @param {string} name 道具名称
     * @param {number} level 道具等级
     * @param {string} type 道具类型
     */
    async _findItemConfig(name, level, type) {
        try {
            // 动态导入ItemConfigs，避免循环依赖
            const { ItemConfigs } = await import('../System/Item/ItemConfigs.js');
            const config = Object.values(ItemConfigs).find(cfg => 
                cfg.name === name && 
                cfg.level === level && 
                cfg.type === type
            );
            if (!config) {
                console.warn(`找不到道具配置: ${name} (等级${level}, 类型${type})`);
            }
            return config;
        } catch (e) {
            console.warn('查找道具配置失败:', name, e);
            return null;
        }
    }
}

export const saveManager = new SaveManager();
