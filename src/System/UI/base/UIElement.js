export class UIElement {
    constructor(x, y, width, height) {
        this.x = x; this.y = y;
        this.width = width; this.height = height;
        this.visible = true;
        this.draggable = false;
        this.dragging = false;
    }

    draw(ctx) { }
    update(dt) { }

    contains(px, py) {
        return px >= this.x && px <= this.x + this.width &&
            py >= this.y && py <= this.y + this.height;
    }

    handleEvent(event) {
        return false; // 返回 true 表示事件已被消费
    }
}
