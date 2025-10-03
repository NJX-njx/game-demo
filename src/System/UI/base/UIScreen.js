export class UIScreen {
    constructor(name, options = {}) {
        this.name = name;
        this.elements = [];
        this.visible = false;
        this.blocksGame = !!options.blocksGame;
    }

    addElement(el) { this.elements.push(el); }
    show() { this.visible = true; }
    hide() { this.visible = false; }

    draw(ctx) {
        if (!this.visible) return;
        for (let el of this.elements) el.draw(ctx);
    }

    handleEvent(event) {
        if (!this.visible) return false;
        for (let i = this.elements.length - 1; i >= 0; i--) {
            if (this.elements[i].handleEvent(event)) return true;
        }
        return false;
    }
}