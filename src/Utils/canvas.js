export const canvas_game = document.getElementById('game-canvas');
export const canvas_ui = document.getElementById('ui-canvas');
export const ctx_game = canvas_game.getContext('2d');
export const ctx_ui = canvas_ui.getContext('2d');
export const sizes = { width: 1440, height: 720 }
export function drawSprite(ctx, image, x, y, width, height, facing = 1) {
    ctx.save();

    if (facing === -1) {
        // 左翻转
        ctx.translate(x + width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, width, height);
    } else {
        // 正常绘制
        ctx.drawImage(image, x, y, width, height);
    }

    ctx.restore();
}
