import { dialogManager } from "./DialogManager";
import { eventBus, EventTypes } from "./EventBus";
import { plotModeManager } from "./PlotModeManager";

class PlotManager {
    constructor() {
        if (PlotManager.instance) return PlotManager.instance;
        PlotManager.instance = this;

        this.plotData = {};
        this.interactionsData = {};
        this.dialogIndex = new Map();
        this.interactionDialogIndex = new Map();
        this.triggeredEvents = new Set();
        this._loadingPromise = null;
        this.currentPlotEventId = null; // 当前播放的剧情事件ID

        this._loadingPromise = this._loadAndIndexPlotData();
        this._registerEventListeners();
    }

    /**
     * 强制重新加载剧情数据
     */
    async reload() {
        this._loadingPromise = this._loadAndIndexPlotData(true);
        return this._loadingPromise;
    }

    /**
     * 确保剧情数据已加载
     */
    async ensureReady() {
        if (!this._loadingPromise) {
            this._loadingPromise = this._loadAndIndexPlotData();
        }
        return this._loadingPromise;
    }

    /**
     * 获取指定房间的剧情交互配置
     * @param {number|string} layer
     * @param {number|string} room
     * @returns {Promise<Array<object>>}
     */
    async getRoomInteractions(layer, room) {
        await this.ensureReady();

        const chapterKey = `Chapter${layer}`;
        const roomKey = `Lv${layer}-${room}`;
        const rawList = this.interactionsData?.[chapterKey]?.[roomKey] || [];

        return rawList.map(raw => this._transformInteraction(raw));
    }

    /**
     * 重置指定房间内剧情的去重标记（用于重新进入房间时再次播放）
     */
    resetRoomEvents(layer, room, eventIds = []) {
        const prefix = `id:plot${layer}-${room}-`;
        const dedupeKeys = new Set(eventIds.filter(Boolean).map(id => `id:${id}`));

        for (const key of [...this.triggeredEvents]) {
            if (key.startsWith(prefix) || dedupeKeys.has(key)) {
                this.triggeredEvents.delete(key);
            }
        }
    }

    /**
     * 播放剧情
     * @param {string|null} eventId
     * @param {Array} fallbackDialogs
     * @param {object} options
     * @param {string} [options.dedupeKey]
     * @param {boolean} [options.allowReplay=false]
     * @returns {boolean}
     */
    playPlot(eventId, fallbackDialogs = [], options = {}) {
        if (plotModeManager.isPlotDisabled()) {
            console.log('剧情模式已关闭，跳过剧情事件:', eventId || '(fallback)');
            return false;
        }

        const dedupeKey = options.dedupeKey || (eventId ? `id:${eventId}` : this._makeFallbackKey(fallbackDialogs));
        if (!options.allowReplay && dedupeKey && this.triggeredEvents.has(dedupeKey)) {
            console.log('剧情事件已播放，跳过重复:', dedupeKey);
            return false;
        }

        const dialogs = this._resolveDialogs(eventId, fallbackDialogs);
        if (!dialogs.length) {
            console.warn('未找到剧情内容，无法播放:', eventId);
            return false;
        }

        if (dedupeKey) this.triggeredEvents.add(dedupeKey);
        this.currentPlotEventId = eventId; // 记录当前播放的剧情ID
        dialogManager.startDialog(dialogs);
        return true;
    }

    /**
     * 解析剧情事件ID
     */
    parseEventId(eventId) {
        const match = typeof eventId === 'string' ? eventId.match(/plot(\d+)-(\d+)-(.+)/) : null;
        if (!match) return null;
        return {
            chapterKey: match[1],
            sceneKey: match[2],
            triggerId: match[3]
        };
    }

    /**
     * 内部：加载并索引剧情数据
     */
    async _loadAndIndexPlotData(force = false) {
        if (this._loadingPromise && !force) {
            return this._loadingPromise;
        }

        const promise = (async () => {
            try {
                const res = await fetch('Plot.V3/plot-data.json');
                if (!res.ok) throw new Error(`Failed to load plot data: ${res.status}`);
                const data = await res.json();
                this.plotData = data?.plotData ?? {};
                this.interactionsData = data?.interactions ?? {};
                this._buildDialogIndexes();
                console.log('剧情数据加载完成');
            } catch (error) {
                console.error('加载剧情数据失败:', error);
                throw error;
            }
        })();

        if (!force) {
            this._loadingPromise = promise;
        }

        return promise;
    }

    _buildDialogIndexes() {
        this.dialogIndex.clear();
        this.interactionDialogIndex.clear();

        // 先处理剧情主体
        for (const [chapterKey, chapterValue] of Object.entries(this.plotData || {})) {
            if (!chapterValue) continue;
            for (const [sceneKey, sceneValue] of Object.entries(chapterValue || {})) {
                const triggers = Array.isArray(sceneValue?.triggers) ? sceneValue.triggers : [];
                for (const trigger of triggers) {
                    if (!trigger?.id) continue;
                    const compositeId = `plot${chapterKey.replace('Chapter', '')}-${sceneKey}-${trigger.id}`;
                    const dialogs = this._composeTriggerDialogs(trigger);
                    if (!this.dialogIndex.has(compositeId)) {
                        this.dialogIndex.set(compositeId, dialogs);
                    }
                    if (!this.dialogIndex.has(trigger.id)) {
                        this.dialogIndex.set(trigger.id, dialogs);
                    }
                }
            }
        }

        // 再处理交互定义中的对话，作为覆盖/补充
        for (const chapterValue of Object.values(this.interactionsData || {})) {
            if (!chapterValue) continue;
            for (const interactions of Object.values(chapterValue)) {
                if (!Array.isArray(interactions)) continue;
                for (const interaction of interactions) {
                    if (!interaction?.event) continue;
                    const dialogs = this._normalizeDialogList(interaction.dialogs);
                    if (dialogs.length) {
                        this.interactionDialogIndex.set(interaction.event, dialogs);
                    }
                }
            }
        }
    }

    _registerEventListeners() {
        const plotEventName = EventTypes?.plot?.trigger || EventTypes?.PLOT_TRIGGER;
        if (!plotEventName) {
            console.warn('PlotManager: 未找到剧情事件类型，跳过事件监听注册');
            return;
        }

        eventBus.on({
            event: plotEventName,
            handler: (eventId) => this.playPlot(eventId),
            source: 'PlotManager'
        });
    }

    _transformInteraction(raw) {
        const tags = new Set(Array.isArray(raw?.tags) ? raw.tags : []);
        if (raw?.autoTrigger) tags.add('autoTrigger');
        if (raw?.type && raw.type !== 'plot') tags.add(raw.type);

        return {
            position: { ...raw.position },
            size: { ...raw.size },
            tags: Array.from(tags),
            events: [
                {
                    event: 'plot',
                    payout: { id: raw.event }
                }
            ],
            dialogs: this._normalizeDialogList(raw?.dialogs),
            cond: Array.isArray(raw?.conditions) ? raw.conditions.slice() : [],
            dedupeKey: raw?.event ? `id:${raw.event}` : undefined
        };
    }

    _composeTriggerDialogs(trigger) {
        const dialogs = [];
        if (Array.isArray(trigger?.dialogs)) {
            dialogs.push(...this._normalizeDialogList(trigger.dialogs));
        }
        if (Array.isArray(trigger?.systemPrompts)) {
            dialogs.push(...trigger.systemPrompts.map(text => this._normalizeDialogEntry({ speaker: '【系统提示】', text })));
        }
        if (Array.isArray(trigger?.screenTexts)) {
            dialogs.push(...trigger.screenTexts.map(text => this._normalizeDialogEntry({ speaker: '【场景】', text })));
        }
        return dialogs;
    }

    _normalizeDialogList(list) {
        if (!Array.isArray(list)) return [];
        return list.map(entry => this._normalizeDialogEntry(entry)).filter(item => item.text.length > 0 || item.speaker.length > 0);
    }

    _normalizeDialogEntry(entry) {
        if (!entry) return { speaker: '', text: '' };
        if (typeof entry === 'string') {
            return { speaker: '', text: entry };
        }
        return {
            speaker: entry.speaker ?? '',
            text: entry.text ?? ''
        };
    }

    _resolveDialogs(eventId, fallbackDialogs) {
        if (eventId && this.interactionDialogIndex.has(eventId)) {
            return this.interactionDialogIndex.get(eventId);
        }

        if (eventId && this.dialogIndex.has(eventId)) {
            return this.dialogIndex.get(eventId);
        }

        const parsed = this.parseEventId(eventId);
        if (parsed) {
            const scene = this.plotData?.[parsed.chapterKey]?.[parsed.sceneKey];
            const triggers = Array.isArray(scene?.triggers) ? scene.triggers : [];
            const trigger = triggers.find(t => t?.id === parsed.triggerId);
            if (trigger) {
                return this._composeTriggerDialogs(trigger);
            }
        }

        return this._normalizeDialogList(fallbackDialogs);
    }

    _makeFallbackKey(dialogs) {
        if (!Array.isArray(dialogs) || !dialogs.length) return '';
        return dialogs.map(dialog => `${dialog?.speaker ?? ''}|${dialog?.text ?? ''}`).join('||');
    }
}

export const plotManager = new PlotManager();
