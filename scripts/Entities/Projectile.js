class Projectile extends Entity {
    /**
     * @param {Vector} position 初始位置
     * @param {Vector} velocity 速度
     * @param {number} damage 伤害
     * @param {Vector} size 碰撞盒大小
     * @param {number} lifetime 存活时间，单位毫秒
     */
    constructor(position, velocity, damage = 1, size = new Vector(10, 10)) {
        super(position, size, velocity);
        this.type = "projectile";
        this.damage = damage;
        this.alive = true;
        this.hurtBox = this.hitbox; // 可被敌人碰撞检测
    }

    update(deltaTime) {
        if (!this.alive) return;

        // 刚体移动 + 碰撞检测
        const deltaFrame = 60 * deltaTime / 1000;
        const side = this.rigidMove(deltaFrame);
        if (side) {
            this.alive = false; // 碰到墙/地面就消失
            return;
        }

        // 敌人碰撞检测
        window.enemies.forEach(enemy => {
            if (this.hurtBox.checkHit(enemy.hurtBox)) {
                enemy.takeDamage(this.damage);
                this.alive = false;
            }
        });
    }

    draw() {
        if (!this.alive) return;
        const ctx = window.$game.ctx;
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);
    }
}
