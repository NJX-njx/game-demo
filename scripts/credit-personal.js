// ==============================================
// 1. 平滑滚动（点击锚点时生效，如需扩展可添加）
// ==============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// ==============================================
// 2. 回到顶部按钮（如需可添加到页面，此处为逻辑示例）
// ==============================================
function initBackToTop() {
    const backToTopBtn = document.createElement('button');
    backToTopBtn.textContent = "↑ 回到顶部";
    backToTopBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 16px;
        background-color: rgba(3, 102, 241, 0.8);
        color: #f8fafc;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        z-index: 50;
        transition: all 0.3s ease;
        display: none;
    `;
    document.body.appendChild(backToTopBtn);

    // 滚动显示/隐藏按钮
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    // 点击回到顶部
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initBackToTop(); // 如需回到顶部功能，解开注释
    console.log("[credit-personal.js] 个人介绍页初始化完成");
});