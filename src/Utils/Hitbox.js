export class Hitbox {
    /**
     * @param {Vector} position
     * @param {Vector} size
     */
    constructor(position, size) {
        this.position = position;  // 左上角位置
        this.size = size;          // 宽度和高度作为一个 Vector
    }

    // 返回一个新的 hitbox，位置和大小都加上对应的偏移量
    add(positiondiff, sizediff = new Vector(0, 0)) {
        return new Hitbox(positiondiff.addVector(this.position), sizediff.addVector(this.size));
    }

    // 获取中心点的位置
    getCenter() {
        return this.position.addVector(this.size.scale(0.5));
    }

    // 获取左上角点的位置（就是 position）
    getTopLeft() {
        return this.position;
    }

    // 获取右下角点的位置
    getBottomRight() {
        return this.position.addVector(this.size);
    }

    // 检查某点是否在 hitbox 内
    contains(point) {
        const topLeft = this.getTopLeft();
        const bottomRight = this.getBottomRight();

        return (
            point.x >= topLeft.x && point.x <= bottomRight.x &&
            point.y >= topLeft.y && point.y <= bottomRight.y
        );
    }

    // 检查两个 hitbox 是否相交
    checkHit(other) {
        const thisLeft = this.getTopLeft().x;
        const thisRight = this.getBottomRight().x;
        const thisTop = this.getTopLeft().y;
        const thisBottom = this.getBottomRight().y;

        const otherLeft = other.getTopLeft().x;
        const otherRight = other.getBottomRight().x;
        const otherTop = other.getTopLeft().y;
        const otherBottom = other.getBottomRight().y;

        // 检查是否不相交
        if (
            thisRight <= otherLeft ||  // this 在 other 的左边
            thisLeft >= otherRight ||  // this 在 other 的右边
            thisTop >= otherBottom ||  // this 在 other 的下面
            thisBottom <= otherTop     // this 在 other 的上面
        ) {
            return false;  // 没有碰撞
        }

        return true;  // 有碰撞
    }

    // 检查一组 hitbox 是否与当前 hitbox 相交，若相交则执行回调函数并返回第一个相交的 hitbox，否则返回 null
    checkHits(tiles, operate) {
        for (let tile of tiles) {
            if (this.checkHit(tile)) {
                operate();
                return tile;
            }
        }
        return null;
    }

    outofMap() {
        return !this.checkHit(window.$game.mapManager.mapHitbox);
    }

    // 合并两个 hitbox，返回一个新的包含两个 hitbox 的最小 hitbox
    merge(other) {
        let newLeftup = new Vector(Math.min(this.position.x, other.position.x), Math.min(this.position.y, other.position.y));
        let newRightdown = new Vector(Math.max(this.position.x + this.size.x, other.position.x + other.size.x), Math.max(this.position.y + this.size.y, other.position.y + other.size.y));
        return createHitbox(newLeftup, newRightdown);
    }

    // 计算两个 hitbox 的交集，返回一个新的 hitbox，如果没有交集则返回 null
    clip(other) {
        let newLeftup = new Vector(Math.max(this.position.x, other.position.x), Math.max(this.position.y, other.position.y));
        let newRightdown = new Vector(Math.min(this.position.x + this.size.x, other.position.x + other.size.x), Math.min(this.position.y + this.size.y, other.position.y + other.size.y));
        return createHitbox(newLeftup, newRightdown);
    }
}
const createHitbox = (leftUp, rightDown) => {
    if (leftUp.x >= rightDown.x || leftUp.y >= rightDown.y) {
        return null;
    }
    return new Hitbox(leftUp, rightDown.subVector(leftUp));
}
