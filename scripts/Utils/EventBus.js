class EventBus {
    constructor() { this.listeners = new Map(); }
    on(event, handler) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }
    off(event, handler) {
        const set = this.listeners.get(event); if (set) set.delete(handler);
    }
    emit(event, payload) {
        const set = this.listeners.get(event);
        if (!set) return;
        for (const h of [...set]) {
            try { h(payload); } catch (e) { console.error(`[EventBus] ${event} handler error`, e); }
        }
    }
}