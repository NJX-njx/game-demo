export const canvas_game = document.getElementById('game-canvas');
export const canvas_ui = document.getElementById('ui-canvas');
export const ctx_game = canvas_game.getContext('2d');
export const ctx_ui = canvas_ui.getContext('2d');
export const sizes = { width: 1440, height: 720 }

/**
 * Sync canvas internal pixel buffer size with the CSS display size.
 * Handles devicePixelRatio for crisp rendering and applies visual transform
 * to game canvas to emulate the original 80px left offset in design.
 */
export function setupCanvasResize() {
    function resizeOnce() {
        const dpr = window.devicePixelRatio || 1;

        // get the computed size of the canvas in CSS pixels
        const rectGame = canvas_game.getBoundingClientRect();
        const rectUI = canvas_ui.getBoundingClientRect();

        // set actual pixel size
        const targetGameWidth = Math.max(1, Math.round(rectGame.width * dpr));
        const targetGameHeight = Math.max(1, Math.round(rectGame.height * dpr));
        if (canvas_game.width !== targetGameWidth || canvas_game.height !== targetGameHeight) {
            canvas_game.width = targetGameWidth;
            canvas_game.height = targetGameHeight;
            // scale the drawing context so existing drawing code using design coords still works
            ctx_game.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        const targetUIWidth = Math.max(1, Math.round(rectUI.width * dpr));
        const targetUIHeight = Math.max(1, Math.round(rectUI.height * dpr));
        if (canvas_ui.width !== targetUIWidth || canvas_ui.height !== targetUIHeight) {
            canvas_ui.width = targetUIWidth;
            canvas_ui.height = targetUIHeight;
            ctx_ui.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // Apply visual transform to game canvas to shift the middle viewport by design offset
        // Compute scale factor between CSS display and design resolution
        const scaleX = rectGame.width / sizes.width;
        const scaleY = rectGame.height / sizes.height;
        const scale = Math.min(scaleX || 1, scaleY || 1) || 1;
        const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-offset')) || 80;
        const offsetPx = offset * scale;
        // Use CSS transform to translate the visuals (doesn't change internal coordinates)
        canvas_game.style.transform = `translateX(${offsetPx}px) scale(${scale / (dpr || 1)})`;
        canvas_ui.style.transform = `scale(${scale / (dpr || 1)})`;
        canvas_game.style.transformOrigin = '0 0';
        canvas_ui.style.transformOrigin = '0 0';
    }

    // debounce resize
    let resizeTimer = null;
    function onResize() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resizeOnce();
            resizeTimer = null;
        }, 50);
    }

    // initial
    resizeOnce();
    window.addEventListener('resize', onResize);
    // also observe fullscreen change because fullscreen might change CSS sizes
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(ev => {
        window.addEventListener(ev, onResize);
    });

    return () => {
        window.removeEventListener('resize', onResize);
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(ev => {
            window.removeEventListener(ev, onResize);
        });
    };
}
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
