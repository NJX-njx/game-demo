import { UIElement } from "../base/UIElement";
import { talentManager } from "../../Talent/TalentManager";
import { uiManager } from "../UIManager";

const DEFAULT_OPTIONS = {
    nodeWidth: 200,
    nodeHeight: 120,
    horizontalGap: 380,
    verticalGap: 220,
    minZoom: 0.6,
    maxZoom: 1.8,
    zoomStep: 0.1
};

function normalizePrerequisite(pr) {
    if (!pr) return null;
    if (typeof pr === "string") {
        return { name: pr, level: 1 };
    }
    const name = pr.name || pr.key || pr.id;
    if (!name) return null;
    return { name, level: pr.level || 1 };
}

export class TalentTreeView extends UIElement {
    constructor(x, y, width, height, options = {}) {
        super(x, y, width, height);
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.offset = { x: 0, y: 0 };
        this.zoom = this._clampZoom(1);
        this._zoomUI = null;
        this._zoomDragging = false;
        this.nodes = [];
        this.nodeMap = new Map();
        this.hoverNode = null;
        this.activeNode = null;
        this.isPanning = false;
        this.lastPointer = null;
        this.onAttemptUnlock = typeof options.onAttemptUnlock === "function" ? options.onAttemptUnlock : () => { };
        this._cachedTooltip = null;
        this.rebuild();
    }

    rebuild() {
        const talentsObj = talentManager.talents || {};
        const talents = Object.values(talentsObj);
        this.nodes = talents.map((talent, index) => {
            const prerequisites = (talent.prerequisites || [])
                .map(normalizePrerequisite)
                .filter(Boolean);
            return {
                id: talent.key || talent.name,
                name: talent.name,
                talent,
                order: index,
                prerequisites,
                depth: 0,
                cx: 0,
                cy: 0
            };
        });

        this.nodeMap = new Map(this.nodes.map(node => [node.name, node]));
        const depthCache = new Map();

        const resolveDepth = (name, chain = new Set()) => {
            if (depthCache.has(name)) return depthCache.get(name);
            if (chain.has(name)) return 0; // 避免循环依赖导致无限递归
            const node = this.nodeMap.get(name);
            if (!node || node.prerequisites.length === 0) {
                depthCache.set(name, 0);
                return 0;
            }
            chain.add(name);
            let depth = 0;
            for (const pre of node.prerequisites) {
                depth = Math.max(depth, resolveDepth(pre.name, chain));
            }
            chain.delete(name);
            depthCache.set(name, depth + 1);
            return depth + 1;
        };

        let maxDepth = 0;
        for (const node of this.nodes) {
            node.depth = resolveDepth(node.name);
            maxDepth = Math.max(maxDepth, node.depth);
        }

        const columnCount = maxDepth + 1;
        const columns = Array.from({ length: columnCount }, () => []);
        for (const node of this.nodes) {
            columns[node.depth].push(node);
        }

        const startX = -((columnCount - 1) * this.options.horizontalGap) / 2;
        for (let depth = 0; depth < columnCount; depth++) {
            const columnNodes = columns[depth];
            const columnX = startX + depth * this.options.horizontalGap;
            if (columnNodes.length === 0) continue;

            const columnSpacing = this.options.verticalGap * (depth === 1 ? 1.45 : 1);
            const fallbackSpacing = columnSpacing;
            if (depth === 0) {
                columnNodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
                const startY = -((columnNodes.length - 1) * fallbackSpacing) / 2;
                columnNodes.forEach((node, index) => {
                    node.cy = columnNodes.length <= 1 ? 0 : startY + index * fallbackSpacing;
                });
            } else {
                columnNodes.forEach(node => {
                    const prereqNodes = node.prerequisites
                        .map(pre => this.nodeMap.get(pre.name))
                        .filter(Boolean);
                    if (prereqNodes.length > 0) {
                        node._targetY = prereqNodes.reduce((sum, preNode) => sum + preNode.cy, 0) / prereqNodes.length;
                    } else {
                        node._targetY = 0;
                    }
                });
                columnNodes.sort((a, b) => {
                    const ay = a._targetY ?? 0;
                    const by = b._targetY ?? 0;
                    if (Math.abs(ay - by) > 1e-3) return ay - by;
                    return a.order - b.order;
                });
                columnNodes.forEach((node, index) => {
                    if (typeof node._targetY === "number") {
                        node.cy = node._targetY;
                    } else {
                        node.cy = (index - (columnNodes.length - 1) / 2) * fallbackSpacing;
                    }
                    delete node._targetY;
                });
            }

            this._resolveColumnSpacing(columnNodes, fallbackSpacing);
            columnNodes.forEach(node => {
                node.cx = columnX;
            });
        }

        if (this.nodes.length === 0) {
            this.worldBounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 };
        } else {
            const halfW = this.options.nodeWidth / 2;
            const halfH = this.options.nodeHeight / 2;
            const minX = Math.min(...this.nodes.map(n => n.cx - halfW)) - 120;
            const maxX = Math.max(...this.nodes.map(n => n.cx + halfW)) + 120;
            const minY = Math.min(...this.nodes.map(n => n.cy - halfH)) - 120;
            const maxY = Math.max(...this.nodes.map(n => n.cy + halfH)) + 120;
            this.worldBounds = { minX, maxX, minY, maxY };
        }
    }

    _resolveColumnSpacing(nodes, gap) {
        if (nodes.length <= 1) {
            nodes.forEach(node => {
                node.cy = node.cy || 0;
            });
            return;
        }

        nodes.sort((a, b) => a.cy - b.cy);
        for (let i = 1; i < nodes.length; i++) {
            const prev = nodes[i - 1];
            const curr = nodes[i];
            const minY = prev.cy + gap;
            if (curr.cy < minY) {
                curr.cy = minY;
            }
        }

        const first = nodes[0].cy;
        const last = nodes[nodes.length - 1].cy;
        const offset = (first + last) / 2;
        nodes.forEach(node => {
            node.cy -= offset;
        });
    }

    _clampZoom(value) {
        const { minZoom, maxZoom } = this.options;
        return Math.min(maxZoom, Math.max(minZoom, value));
    }

    _setZoom(value, anchorScreen = null) {
        const clamped = this._clampZoom(value);
        if (clamped === this.zoom) {
            return false;
        }
        const anchor = anchorScreen || this._getViewCenter();
        const worldBefore = this._screenToWorld(anchor.x, anchor.y);
        this.zoom = clamped;
        const worldAfter = this._screenToWorld(anchor.x, anchor.y);
        this.offset.x += worldAfter.x - worldBefore.x;
        this.offset.y += worldAfter.y - worldBefore.y;
        return true;
    }

    draw(ctx) {
        if (!this.visible) return;

        this._zoomUI = null;

        ctx.save();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.clip();

        ctx.fillStyle = "rgba(8,17,28,0.92)";
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(this.offset.x, this.offset.y);

        this._drawGrid(ctx);
        this._drawLinks(ctx);
        this._drawNodes(ctx);

        ctx.restore();

        this._drawZoomControls(ctx);

        this._refreshTooltip();
    }

    _drawGrid(ctx) {
        ctx.save();
        const gap = 80;
        ctx.strokeStyle = "rgba(30,58,138,0.12)";
        ctx.lineWidth = 1;

        const invZoom = 1 / this.zoom;
        const viewMinX = (-this.width / 2) * invZoom - this.offset.x;
        const viewMaxX = (this.width / 2) * invZoom - this.offset.x;
        const viewMinY = (-this.height / 2) * invZoom - this.offset.y;
        const viewMaxY = (this.height / 2) * invZoom - this.offset.y;

        const startX = Math.floor(viewMinX / gap) * gap;
        const endX = Math.ceil(viewMaxX / gap) * gap;
        const startY = Math.floor(viewMinY / gap) * gap;
        const endY = Math.ceil(viewMaxY / gap) * gap;

        for (let x = startX; x <= endX; x += gap) {
            ctx.beginPath();
            ctx.moveTo(x, viewMinY - gap * 2);
            ctx.lineTo(x, viewMaxY + gap * 2);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gap) {
            ctx.beginPath();
            ctx.moveTo(viewMinX - gap * 2, y);
            ctx.lineTo(viewMaxX + gap * 2, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawLinks(ctx) {
        ctx.save();
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const node of this.nodes) {
            const toCenter = this._getNodeCenter(node);
            const prereqs = node.prerequisites || [];
            const count = prereqs.length;
            prereqs.forEach((pre, index) => {
                const fromNode = this.nodeMap.get(pre.name);
                if (!fromNode) return;
                const fromCenter = this._getNodeCenter(fromNode);
                const state = this._evalPrerequisiteState(pre);
                const spanX = toCenter.x - fromCenter.x;
                const direction = spanX >= 0 ? 1 : -1;
                const magnitude = Math.max(Math.abs(spanX) * 0.35, this.options.horizontalGap * 0.55);
                const indexOffset = (index - (count - 1) / 2) * 60;

                const control1 = {
                    x: fromCenter.x + direction * magnitude,
                    y: fromCenter.y + indexOffset
                };
                const control2 = {
                    x: toCenter.x - direction * magnitude,
                    y: toCenter.y + indexOffset
                };

                ctx.strokeStyle = state.met ? (state.excess ? "#38bdf8" : "#3b82f6") : "rgba(148,163,184,0.45)";
                ctx.beginPath();
                ctx.moveTo(fromCenter.x, fromCenter.y);
                ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, toCenter.x, toCenter.y);
                ctx.stroke();
            });
        }
        ctx.restore();
    }

    _drawNodes(ctx) {
        const { nodeWidth, nodeHeight } = this.options;
        for (const node of this.nodes) {
            const { x, y } = this._getNodeTopLeft(node);
            const state = this._evalNodeState(node);

            ctx.save();
            ctx.beginPath();
            const radius = 16;
            this._roundRectPath(ctx, x, y, nodeWidth, nodeHeight, radius);
            ctx.fillStyle = state.fill;
            ctx.fill();
            ctx.lineWidth = state.borderWidth;
            ctx.strokeStyle = state.stroke;
            ctx.stroke();

            // 标题
            ctx.fillStyle = "#f8fafc";
            ctx.font = "18px \"Noto Sans SC\", sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(node.name, x + 16, y + 14);

            // 等级信息
            ctx.font = "14px Inter";
            ctx.textAlign = "right";
            ctx.fillStyle = "#cbd5f5";
            ctx.fillText(`${state.level}/${state.maxLevel}`, x + nodeWidth - 16, y + 18);

            // 描述摘要（仅显示首行）
            ctx.textAlign = "left";
            ctx.fillStyle = "#94a3b8";
            ctx.font = "12px Inter";
            ctx.textBaseline = "top";
            const descSource = node.talent.description ? node.talent.description.split("\n")[0] : "";
            const lines = this._wrapText(ctx, descSource, nodeWidth - 32, 2);
            lines.forEach((line, lineIndex) => {
                ctx.fillText(line, x + 16, y + 48 + lineIndex * 16);
            });

            // 成本条
            const barY = y + nodeHeight - 38;
            ctx.fillStyle = "rgba(15,23,42,0.8)";
            this._roundRectPath(ctx, x + 14, barY, nodeWidth - 28, 24, 12);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(148,163,184,0.35)";
            ctx.stroke();

            ctx.fillStyle = state.costColor;
            ctx.font = "13px Inter";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const costLabel = state.nextLevel > state.maxLevel ? "已满级" : `下一等级：${state.cost} 碎片`;
            ctx.fillText(costLabel, x + nodeWidth / 2, barY + 12);

            // 互斥提示
            if (state.blocked) {
                ctx.fillStyle = "#f87171";
                ctx.font = "12px Inter";
                ctx.textAlign = "left";
                ctx.fillText("互斥中", x + 16, y + nodeHeight - 14);
            } else if (!state.prerequisitesMet) {
                ctx.fillStyle = "#fbbf24";
                ctx.font = "12px Inter";
                ctx.textAlign = "left";
                ctx.fillText("尚未满足前置", x + 16, y + nodeHeight - 14);
            }

            if (this.hoverNode === node) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = "rgba(148,163,184,0.8)";
                this._roundRectPath(ctx, x - 4, y - 4, nodeWidth + 8, nodeHeight + 8, radius + 4);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    _drawZoomControls(ctx) {
        const padding = 16;
        const controlWidth = 220;
        const controlHeight = 60;
        const btnSize = 30;
        const baseX = this.x + this.width - padding - controlWidth;
        const baseY = this.y + padding;
        const range = Math.max(0.0001, this.options.maxZoom - this.options.minZoom);
        const ratio = Math.min(1, Math.max(0, (this.zoom - this.options.minZoom) / range));

        const btnY = baseY + 12;
        const minusRect = { x: baseX + 10, y: btnY, width: btnSize, height: btnSize };
        const plusRect = { x: baseX + controlWidth - btnSize - 10, y: btnY, width: btnSize, height: btnSize };
        const trackHeight = 6;
        const trackMargin = 14;
        const trackX = minusRect.x + btnSize + trackMargin;
        const trackWidth = Math.max(60, controlWidth - (btnSize * 2 + trackMargin * 2 + 20));
        const trackY = baseY + controlHeight / 2 - trackHeight / 2;
        const knobRadius = 10;
        const knobX = trackX + ratio * trackWidth;
        const knobY = baseY + controlHeight / 2;

        ctx.save();
        this._roundRectPath(ctx, baseX, baseY, controlWidth, controlHeight, 14);
        ctx.fillStyle = "rgba(15,23,42,0.86)";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(148,163,184,0.25)";
        ctx.stroke();

        const drawButton = (rect, isPlus) => {
            this._roundRectPath(ctx, rect.x, rect.y, rect.width, rect.height, 8);
            ctx.fillStyle = "rgba(30,41,59,0.95)";
            ctx.fill();
            ctx.strokeStyle = "rgba(148,163,184,0.35)";
            ctx.stroke();
            ctx.strokeStyle = "#cbd5f5";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(rect.x + 8, rect.y + rect.height / 2);
            ctx.lineTo(rect.x + rect.width - 8, rect.y + rect.height / 2);
            if (isPlus) {
                ctx.moveTo(rect.x + rect.width / 2, rect.y + 8);
                ctx.lineTo(rect.x + rect.width / 2, rect.y + rect.height - 8);
            }
            ctx.stroke();
        };

        drawButton(minusRect, false);
        drawButton(plusRect, true);

        this._roundRectPath(ctx, trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
        ctx.fillStyle = "rgba(71,85,105,0.35)";
        ctx.fill();
        this._roundRectPath(ctx, trackX, trackY, trackWidth * ratio, trackHeight, trackHeight / 2);
        ctx.fillStyle = "rgba(59,130,246,0.65)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(15,23,42,0.9)";
        ctx.stroke();

        ctx.font = "12px Inter";
        ctx.fillStyle = "#e2e8f0";
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(this.zoom * 100)}%`, baseX + controlWidth / 2, baseY + controlHeight - 18);

        ctx.restore();

        this._zoomUI = {
            bounds: { x: baseX, y: baseY, width: controlWidth, height: controlHeight },
            minus: minusRect,
            plus: plusRect,
            track: { x: trackX, y: trackY, width: trackWidth, height: trackHeight },
            trackExtended: { x: trackX, y: trackY - 10, width: trackWidth, height: trackHeight + 20 },
            knob: { cx: knobX, cy: knobY, r: knobRadius }
        };
    }

    _evalNodeState(node) {
        const talent = node.talent;
        const level = talentManager.getTalentLevel(node.name);
        const nextLevel = level + 1;
        const maxLevel = talent.maxLevel || 1;
        const cost = talent.cost[nextLevel - 1] ?? 0;
        const prereqSatisfied = node.prerequisites.filter(pre => talentManager.hasTalentLevel(pre.name, pre.level));
        const prerequisitesMet = node.prerequisites.length === 0 || prereqSatisfied.length > 0;
        const blocked = talentManager.isBlockedByExcludes(node.name);
        const affordable = talentManager.hasFragments(cost);
        const canUpgrade = !blocked && prerequisitesMet && nextLevel <= maxLevel;

        let fill = "rgba(17,25,40,0.92)";
        let stroke = "rgba(148,163,184,0.5)";
        let borderWidth = 1.5;
        let costColor = "#cbd5f5";

        if (level >= maxLevel) {
            fill = "rgba(22,101,52,0.45)";
            stroke = "rgba(74,222,128,0.85)";
            borderWidth = 2.5;
            costColor = "#4ade80";
        } else if (level > 0) {
            fill = "rgba(37,99,235,0.35)";
            stroke = "rgba(59,130,246,0.85)";
            borderWidth = 2;
            costColor = affordable ? "#38bdf8" : "#cbd5f5";
        } else if (canUpgrade && affordable) {
            fill = "rgba(30,64,175,0.35)";
            stroke = "rgba(96,165,250,0.9)";
            borderWidth = 2;
            costColor = "#60a5fa";
        } else if (canUpgrade) {
            fill = "rgba(76,29,149,0.35)";
            stroke = "rgba(129,140,248,0.9)";
            borderWidth = 2;
            costColor = "#cbd5f5";
        }

        return {
            level,
            maxLevel,
            nextLevel,
            cost,
            fill,
            stroke,
            borderWidth,
            costColor,
            prerequisitesMet,
            blocked,
            satisfiedPrerequisites: prereqSatisfied.length,
            totalPrerequisites: node.prerequisites.length
        };
    }

    _evalPrerequisiteState(pre) {
        const current = talentManager.getTalentLevel(pre.name);
        return {
            met: current >= pre.level,
            excess: current > pre.level
        };
    }

    _getNodeTopLeft(node) {
        return {
            x: node.cx - this.options.nodeWidth / 2,
            y: node.cy - this.options.nodeHeight / 2
        };
    }

    _getNodeCenter(node) {
        return {
            x: node.cx,
            y: node.cy
        };
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    handleEvent(event) {
        if (!this.visible) return false;
        const { offsetX = 0, offsetY = 0, type } = event;

        if (this._handleZoomControlEvent(event)) {
            return true;
        }

        const inside = this.contains(offsetX, offsetY);

        if (type === "wheel" && inside) {
            event.preventDefault?.();
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
            const deltaX = (event.deltaX || 0) * unit;
            const deltaY = (event.deltaY || 0) * unit;
            if (event.shiftKey || event.altKey) {
                const panFactor = 0.35 / this.zoom;
                this.offset.x -= deltaX * panFactor;
                this.offset.y -= deltaY * panFactor;
            } else {
                if (deltaY) {
                    const anchor = { x: offsetX, y: offsetY };
                    const scale = Math.exp(-deltaY * 0.0015);
                    if (Number.isFinite(scale) && scale > 0) {
                        this._setZoom(this.zoom * scale, anchor);
                    }
                }
                if (deltaX) {
                    const panFactor = 0.25 / this.zoom;
                    this.offset.x -= deltaX * panFactor;
                }
            }
            return true;
        }

        if (!inside && type !== "mouseup") {
            if (!this.isPanning) {
                this.hoverNode = null;
            }
            return false;
        }

        if (type === "mousedown") {
            if (event.button === 0) {
                const node = this._pickNode(offsetX, offsetY);
                if (node) {
                    this.activeNode = node;
                    return true;
                }
            }
            this.isPanning = true;
            this.lastPointer = { x: offsetX, y: offsetY };
            return true;
        }

        if (type === "mousemove") {
            if (this.isPanning && this.lastPointer) {
                const dx = (offsetX - this.lastPointer.x) / this.zoom;
                const dy = (offsetY - this.lastPointer.y) / this.zoom;
                this.offset.x += dx;
                this.offset.y += dy;
                this.lastPointer = { x: offsetX, y: offsetY };
                return true;
            }
            const node = this._pickNode(offsetX, offsetY);
            this.hoverNode = node;
            return !!node;
        }

        if (type === "mouseup") {
            if (this.isPanning) {
                this.isPanning = false;
                this.lastPointer = null;
            }
            if (event.button === 0) {
                const node = this._pickNode(offsetX, offsetY);
                if (node && node === this.activeNode) {
                    this._attemptUnlock(node);
                    this.activeNode = null;
                    return true;
                }
            }
            this.activeNode = null;
            return inside;
        }

        return false;
    }

    _handleZoomControlEvent(event) {
        if (!this.visible || !this._zoomUI) return false;
        const { type } = event;
        const offsetX = event.offsetX;
        const offsetY = event.offsetY;
        if (typeof offsetX !== "number" || typeof offsetY !== "number") {
            return false;
        }

        const point = { x: offsetX, y: offsetY };
        const ui = this._zoomUI;
        const withinBounds = this._pointInRect(point, ui.bounds);

        if (type === "mousedown") {
            if (event.button !== undefined && event.button !== 0) return false;
            if (!withinBounds && !this._pointOnKnob(point, ui.knob) && !this._pointInRect(point, ui.trackExtended)) {
                return false;
            }
            if (this._pointInRect(point, ui.minus)) {
                this._setZoom(this.zoom - this.options.zoomStep, this._getViewCenter());
                this.activeNode = null;
                this.hoverNode = null;
                return true;
            }
            if (this._pointInRect(point, ui.plus)) {
                this._setZoom(this.zoom + this.options.zoomStep, this._getViewCenter());
                this.activeNode = null;
                this.hoverNode = null;
                return true;
            }
            if (this._pointOnKnob(point, ui.knob) || this._pointInRect(point, ui.trackExtended)) {
                this._zoomDragging = true;
                this._updateZoomFromSlider(offsetX);
                this.activeNode = null;
                this.hoverNode = null;
                return true;
            }
            return withinBounds;
        }

        if (type === "mousemove") {
            if (this._zoomDragging) {
                this._updateZoomFromSlider(offsetX);
                return true;
            }
            if (withinBounds) {
                this.hoverNode = null;
                return true;
            }
            return false;
        }

        if (type === "mouseup") {
            if (this._zoomDragging) {
                this._zoomDragging = false;
                return true;
            }
            return false;
        }

        if (type === "wheel" && withinBounds) {
            return true;
        }

        return false;
    }

    _pickNode(screenX, screenY) {
        const world = this._screenToWorld(screenX, screenY);
        for (const node of this.nodes) {
            const { x, y } = this._getNodeTopLeft(node);
            if (world.x >= x && world.x <= x + this.options.nodeWidth &&
                world.y >= y && world.y <= y + this.options.nodeHeight) {
                return node;
            }
        }
        return null;
    }

    _screenToWorld(px, py) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        return {
            x: (px - centerX) / this.zoom - this.offset.x,
            y: (py - centerY) / this.zoom - this.offset.y
        };
    }

    _getViewCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    _attemptUnlock(node) {
        const evaluation = this._evaluateUnlock(node);
        if (!evaluation.ok) {
            this.onAttemptUnlock?.(evaluation);
            return;
        }
        const result = talentManager.unlockTalent(node.name);
        if (result.ok) {
            this.onAttemptUnlock?.({
                ok: true,
                message: `${node.name} 已提升至 ${result.level} 级`,
                node,
                level: result.level
            });
        } else {
            const mapped = this._mapUnlockFailure(result.reason, node);
            this.onAttemptUnlock?.(mapped);
        }
    }

    _evaluateUnlock(node) {
        const state = this._evalNodeState(node);
        if (state.level >= state.maxLevel) {
            return { ok: false, reason: "max_level", message: `${node.name} 已达到最大等级`, node };
        }
        if (node.prerequisites.length > 0 && !node.prerequisites.some(pre => talentManager.hasTalentLevel(pre.name, pre.level))) {
            return {
                ok: false,
                reason: "prerequisite_any",
                message: "需要任意一个前置达到要求等级",
                node
            };
        }
        if (talentManager.isBlockedByExcludes(node.name)) {
            return { ok: false, reason: "excluded", message: `${node.name} 与已激活的天赋互斥`, node };
        }
        const cost = state.cost;
        if (!talentManager.hasFragments(cost)) {
            return { ok: false, reason: "fragments", message: `灵魂碎片不足（需要 ${cost}）`, node };
        }
        return { ok: true, cost, node };
    }

    _mapUnlockFailure(reason, node) {
        switch (reason) {
            case "no_such_talent":
                return { ok: false, reason, message: "未找到该天赋", node };
            case "max_level":
                return { ok: false, reason, message: `${node.name} 已达最大等级`, node };
            case "req_not_met":
                return { ok: false, reason, message: "尚未满足解锁条件", node };
            case "prerequisite_any":
                return { ok: false, reason, message: "需要任意一个前置天赋达到指定等级", node };
            case "no_fragments":
                return { ok: false, reason, message: "灵魂碎片不足", node };
            default:
                return { ok: false, reason: reason ?? "unknown", message: "无法解锁该天赋", node };
        }
    }

    _refreshTooltip() {
        if (!this.hoverNode) return;
        const node = this.hoverNode;
        const talent = node.talent;
        const state = this._evalNodeState(node);
        const costLabel = state.nextLevel > state.maxLevel ? "已满级" : `${state.cost} 灵魂碎片`;
        const lines = [];
        lines.push(`${node.name}（${state.level}/${state.maxLevel}）`);
        lines.push("--------------");
        if (talent.description) {
            for (const line of talent.description.split("\n")) {
                lines.push(line.trim());
            }
            lines.push("--------------");
        }
        lines.push(`下一等级消耗：${costLabel}`);
        lines.push(`当前碎片：${talentManager.soulFragments}`);
        if (node.prerequisites.length) {
            lines.push(`前置（满足任意一个即可）：`);
            for (const pre of node.prerequisites) {
                const current = talentManager.getTalentLevel(pre.name);
                const status = current >= pre.level ? "✓" : "✕";
                lines.push(`  ${status} ${pre.name} ${current}/${pre.level}`);
            }
            lines.push(`已满足：${state.satisfiedPrerequisites}/${state.totalPrerequisites}`);
        } else {
            lines.push("前置：无");
        }
        const excludes = Array.from(talent.excludes || []);
        if (excludes.length) {
            lines.push(`互斥：${excludes.join("、")}`);
        }
        if (state.blocked) {
            lines.push("状态：互斥阻塞");
        } else if (!state.prerequisitesMet) {
            lines.push("状态：待满足前置");
        } else if (state.level >= state.maxLevel) {
            lines.push("状态：已满级");
        } else if (state.nextLevel <= state.maxLevel) {
            const affordable = talentManager.hasFragments(state.cost);
            lines.push(`状态：${affordable ? "可升级" : "碎片不足"}`);
        }
        uiManager.setTooltip({
            rawText: lines.join("\n"),
            x: this.x + this.width + 16,
            y: this.y + 24,
            width: 360,
            padding: 12,
            lineHeight: 20,
            font: '14px "Noto Sans SC", sans-serif'
        });
    }

    _updateZoomFromSlider(pointerX) {
        if (!this._zoomUI) return;
        const { track } = this._zoomUI;
        if (!track || track.width <= 0) return;
        const range = Math.max(0.0001, this.options.maxZoom - this.options.minZoom);
        const ratio = Math.min(1, Math.max(0, (pointerX - track.x) / track.width));
        const desired = this.options.minZoom + ratio * range;
        this._setZoom(desired, this._getViewCenter());
    }

    _pointInRect(point, rect) {
        if (!rect) return false;
        return point.x >= rect.x && point.x <= rect.x + rect.width &&
            point.y >= rect.y && point.y <= rect.y + rect.height;
    }

    _pointOnKnob(point, knob) {
        if (!knob) return false;
        const dx = point.x - knob.cx;
        const dy = point.y - knob.cy;
        return Math.sqrt(dx * dx + dy * dy) <= knob.r + 4;
    }

    _wrapText(ctx, text, maxWidth, maxLines) {
        if (!text) return [];
        const lines = [];
        const chars = Array.from(text);
        let current = "";

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const candidate = current + char;
            if (ctx.measureText(candidate).width <= maxWidth) {
                current = candidate;
                continue;
            }

            if (lines.length === maxLines - 1) {
                const base = current && current.trim().length ? current.trim() : char;
                lines.push(this._truncateWithEllipsis(ctx, base, maxWidth));
                return lines;
            }

            const trimmedCurrent = current.trim();
            if (trimmedCurrent) {
                lines.push(trimmedCurrent);
            }
            current = char;
        }

        if (current && current.trim()) {
            if (lines.length === maxLines) {
                lines[maxLines - 1] = this._truncateWithEllipsis(ctx, lines[maxLines - 1], maxWidth);
            } else {
                lines.push(current.trim());
            }
        }

        return lines.slice(0, maxLines);
    }

    _truncateWithEllipsis(ctx, text, maxWidth) {
        const dotsWidth = ctx.measureText("…").width;
        let chars = Array.from(text.trim());
        while (chars.length > 0 && ctx.measureText(chars.join("") + "…").width > maxWidth) {
            chars.pop();
        }
        if (chars.length === 0) {
            return "…";
        }
        return `${chars.join("")}…`;
    }
}

export default TalentTreeView;
