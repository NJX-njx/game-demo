
/**
 * 剧情管理器
 * 管理游戏中的剧情触发和显示
 */

import { dialogManager } from '../Manager/DialogManager';
import { eventBus, EventTypes } from '../Manager/EventBus';

class PlotManager {
    constructor() {
        this.plotData = null;
        this.dialogIndex = new Map();
        this.triggeredKeys = new Set();
        this.pendingEvents = [];
        this._handlePlotTrigger = this.handlePlotTrigger.bind(this);
        this.loadPlotData();
        this.setupEventListeners();
    }

    /**
     * 加载剧情数据
     */
    async loadPlotData() {
        try {
            const response = await fetch('Plot.V3/plot-data.json');
            this.plotData = await response.json();
            this.indexPlotDialogs();
            this.flushPendingEvents();
            console.log('剧情数据加载完成');
        } catch (error) {
            console.error('加载剧情数据失败:', error);
        }
    }

    /**
     * 建立剧情ID与对话的索引表，便于快速查询
     */
    indexPlotDialogs() {
        this.dialogIndex = new Map();

        const plotData = this.plotData?.plotData;
        if (!plotData) return;

        for (const [chapterKey, chapterValue] of Object.entries(plotData)) {
            if (!chapterValue) continue;
            for (const [sceneKey, sceneValue] of Object.entries(chapterValue)) {
                const triggers = sceneValue?.triggers;
                if (!Array.isArray(triggers)) continue;

                for (const trigger of triggers) {
                    if (!trigger) continue;
                    const dialogs = Array.isArray(trigger.dialogs) ? trigger.dialogs : [];
                    if (!trigger.id) continue;

                    const compositeId = `plot${chapterKey}-${sceneKey}-${trigger.id}`;
                    if (!this.dialogIndex.has(compositeId)) {
                        this.dialogIndex.set(compositeId, dialogs);
                    }

                    if (!this.dialogIndex.has(trigger.id)) {
                        this.dialogIndex.set(trigger.id, dialogs);
                    }
                }
            }
        }
    }

    /**
     * 获取指定剧情ID的对话内容
     * @param {string} eventId
     * @returns {Array|null}
     */
    getDialogsById(eventId) {
        if (!eventId) return null;
        if (!this.dialogIndex || this.dialogIndex.size === 0) return null;
        return this.dialogIndex.get(eventId) || null;
    }

    /**
     * 根据剧情ID播放剧情（带重复保护）
     * @param {string|null} eventId
     * @param {Array|null} fallbackDialogs 当数据尚未加载或缺失时的后备对话
     * @param {Object} [options]
     * @param {string} [options.dedupeKey] 自定义去重键
     * @returns {boolean} 是否成功播放
     */
    playPlotById(eventId, fallbackDialogs = null, options = {}) {
        const key = this.makeEventKey(eventId, fallbackDialogs, options);

        if (this.triggeredKeys.has(key)) {
            console.log('剧情事件已播放，跳过重复:', eventId || key);
            return false;
        }

        const dialogsReady = this.dialogIndex && this.dialogIndex.size > 0;
        let dialogs = null;

        if (eventId && dialogsReady) {
            dialogs = this.getDialogsById(eventId);
        }

        if (!dialogs && fallbackDialogs && Array.isArray(fallbackDialogs) && fallbackDialogs.length) {
            dialogs = fallbackDialogs;
        }

        if (!dialogs) {
            if (!dialogsReady && eventId) {
                const exists = this.pendingEvents.some(evt => evt.key === key);
                if (!exists) {
                    this.pendingEvents.push({ eventId, fallbackDialogs, key });
                }
                return false;
            }

            console.warn('未找到剧情内容，无法播放:', eventId);
            return false;
        }

        this.triggeredKeys.add(key);
        this.showPlotDialogue(dialogs);
        return true;
    }

    /**
     * 处理等待剧情数据加载完成后未播放的剧情
     */
    flushPendingEvents() {
        if (!this.pendingEvents.length) return;
        const events = [...this.pendingEvents];
        this.pendingEvents.length = 0;

        for (const { eventId, fallbackDialogs, key } of events) {
            if (this.triggeredKeys.has(key)) continue;

            let dialogs = this.getDialogsById(eventId);
            if ((!dialogs || !dialogs.length) && Array.isArray(fallbackDialogs) && fallbackDialogs.length) {
                dialogs = fallbackDialogs;
            }

            if (!dialogs || !dialogs.length) {
                console.warn('等待队列中的剧情缺少对话内容，被跳过:', eventId);
                continue;
            }

            this.triggeredKeys.add(key);
            this.showPlotDialogue(dialogs);
        }
    }

    /**
     * 生成剧情事件的唯一键值
     * @param {string|null} eventId
     * @param {Array|null} fallbackDialogs
     * @param {Object} options
     * @returns {string}
     */
    makeEventKey(eventId, fallbackDialogs, options = {}) {
        if (options?.dedupeKey) return options.dedupeKey;
        if (eventId) return `id:${eventId}`;
        if (Array.isArray(fallbackDialogs) && fallbackDialogs.length) {
            const serialized = fallbackDialogs.map(dialog => `${dialog?.speaker ?? ''}|${dialog?.text ?? ''}`).join('||');
            return `dialogs:${serialized}`;
        }
        return `unknown:${Date.now()}`;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const plotEventName = EventTypes?.plot?.trigger || EventTypes?.PLOT_TRIGGER;
        if (!plotEventName) {
            console.warn('PlotManager: 未找到剧情事件类型，跳过事件监听注册');
            return;
        }

        eventBus.on({
            event: plotEventName,
            handler: this._handlePlotTrigger,
            source: 'PlotManager'
        });
    }

    /**
     * 处理剧情触发
     * @param {string} eventId 事件ID
     */
    handlePlotTrigger(eventId) {
        this.playPlotById(eventId);
    }

    /**
     * 解析事件ID
     * @param {string} eventId 事件ID
     * @returns {Object|null} 解析结果
     */
    parseEventId(eventId) {
        const match = eventId.match(/plot(\d+)-(\d+)-(.+)/);
        if (match) {
            return {
                chapter: match[1],
                scene: match[2],
                triggerId: match[3]
            };
        }
        return null;
    }

    /**
     * 显示剧情对话
     * @param {Array} dialogues 对话数组
     */
    showPlotDialogue(dialogues) {
        if (!dialogManager) {
            console.error('DialogManager未初始化');
            return;
        }

        // 将对话添加到缓冲区
        dialogues.forEach(dialog => {
            dialogManager.addToBuffer(dialog.speaker, dialog.text);
        });

        // 开始显示对话
        dialogManager.startDialog();
    }

    /**
     * 获取场景标题
     * @param {string} chapter 章节编号
     * @param {string} scene 场景编号
     * @returns {string} 场景标题
     */
    getSceneTitle(chapter, scene) {
        return this.plotData?.plotData[chapter]?.[scene]?.title || '';
    }
}

// 创建单例实例
export const plotManager = new PlotManager();
