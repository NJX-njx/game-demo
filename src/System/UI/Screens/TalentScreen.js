import { UIScreen } from "../base/UIScreen";
import { TalentTreeView } from "../Elements/TalentTreeView";
import { UIButton } from "../Elements/UIButton";
import { talentManager } from "../../Talent/TalentManager";
import { itemManager } from "../../Item/ItemManager";
import { itemBar } from "./ItemBarSeen";
import { eventBus as bus, EventTypes as Events } from "../../../Manager/EventBus";
import { game } from "../../../Game";

class TalentScreen extends UIScreen {
    constructor() {
        super("talentTree", { blocksGame: true });

        this.panel = { x: 80, y: 36, width: 1280, height: 648 };

        this.treeView = new TalentTreeView(
            this.panel.x + 28,
            this.panel.y + 108,
            this.panel.width - 56,
            this.panel.height - 156,
            {
                onAttemptUnlock: (result) => this._handleUnlockFeedback(result)
            }
        );
        this.addElement(this.treeView);

        this.closeButton = new UIButton(
            this.panel.x + this.panel.width - 110,
            this.panel.y + 26,
            96,
            40,
            "关闭",
            () => {
                game.popUI();
            }
        );
        this.addElement(this.closeButton);

        this.message = null;
        this._unlockDispose = null;
    }

    show() {
        super.show();
        this.treeView.rebuild();
        itemManager.dragging = false;
        itemManager.draggingFrom = null;
        itemManager.draggingItem = null;
        itemBar?.clearHoverState?.();
        this._attachListeners();
    }

    hide() {
        super.hide();
        this._detachListeners();
        this.message = null;
    }

    _attachListeners() {
        this._detachListeners();
        this._unlockDispose = bus.on({
            event: Events.talent.unlock,
            handler: (payload) => {
                this._handleUnlockFeedback({
                    ok: true,
                    message: `${payload.name} 已提升至 ${payload.level} 级`
                });
            }
        });
    }

    _detachListeners() {
        if (typeof this._unlockDispose === "function") this._unlockDispose();
        this._unlockDispose = null;
    }

    _handleUnlockFeedback(result) {
        if (!result) return;
        const duration = result.ok ? 1800 : 3000;
        this.message = {
            text: result.message || (result.ok ? "解锁成功" : "无法解锁该天赋"),
            ok: !!result.ok,
            expireAt: performance.now() + duration
        };
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.fillStyle = "rgba(2,6,23,0.82)";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.fillStyle = "rgba(15,23,42,0.94)";
        roundRect(ctx, this.panel.x, this.panel.y, this.panel.width, this.panel.height, 20, true, false);

        ctx.font = "28px \"Noto Sans SC\", sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("天赋树", this.panel.x + 32, this.panel.y + 28);

        ctx.font = "14px Inter";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`灵魂碎片：${talentManager.soulFragments}`, this.panel.x + 32, this.panel.y + 68);
        ctx.fillText(`已解锁：${this._countUnlocked()} / ${this.treeView.nodes.length}`, this.panel.x + 32, this.panel.y + 92);

        ctx.textAlign = "right";
        ctx.fillText("滚轮缩放，左键升级，拖拽空白处移动视角，按 T 键快速打开/关闭", this.panel.x + this.panel.width - 32, this.panel.y + 68);

        if (this.message && performance.now() < this.message.expireAt) {
            ctx.font = "16px Inter";
            ctx.fillStyle = this.message.ok ? "#4ade80" : "#f87171";
            ctx.textAlign = "center";
            ctx.fillText(this.message.text, this.panel.x + this.panel.width / 2, this.panel.y + this.panel.height - 36);
        } else {
            this.message = null;
        }

        ctx.restore();

        super.draw(ctx);
    }

    _countUnlocked() {
        return this.treeView.nodes.reduce((acc, node) => acc + (talentManager.getTalentLevel(node.name) > 0 ? 1 : 0), 0);
    }
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

export const talentScreen = new TalentScreen();
