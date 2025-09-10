// ==============================================
// 1. 工具类
// ==============================================
class Store {
    static get(key) {
        return localStorage.getItem(key);
    }
    
    static set(key, value) {
        localStorage.setItem(key, value);
    }
    
    static remove(key) {
        localStorage.removeItem(key);
    }
}

class Auth {
    static getToken() {
        return "current_user_123";
    }
}

// ==============================================
// 2. 制作人员数据
// ==============================================
const creditsData = [
    {
        name: "张三",
        role: "主程序员",
        bio: "负责游戏核心逻辑和系统架构设计，主导存档与成就模块开发",
        avatar: "assets/avatars/zhangsan.png",
        link: "/pages/zhangsan.html"
    },
        {
        name: "王五",
        role: "策划总监",
        bio: "设计游戏关卡流程与成就体系，把控游戏整体玩法体验",
        avatar: "assets/avatars/wangwu.png",
        link: "/pages/wangwu.html"
    },
    {
        name: "李四",
        role: "美术设计师",
        bio: "负责游戏背景、UI界面及角色立绘设计，定义游戏视觉风格",
        avatar: "assets/avatars/lisi.png",
        link: "/pages/lisi.html"
    }

];

// ==============================================
// 3. 页面初始化
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("[menu.js] 主菜单基础初始化完成");

    // 初始化存档系统
    initSaveSystem();
    // 初始化制作人员系统
    initCreditsSystem();
    // 初始化成就系统
    if (window.initAchievementSystem) {
        window.initAchievementSystem();
    } else {
        console.error("[menu.js] 请先加载 AchievementSystem.js！");
    }
});

// ==============================================
// 4. 存档系统实现
// ==============================================
function initSaveSystem() {
    // 获取DOM元素
    const savePanel = document.getElementById('save-panel');
    const showSavesBtn = document.getElementById('show-saves');
    const closeSavePanelBtn = document.getElementById('close-save-panel');
    const saveBackdrop = document.getElementById('save-backdrop');
    const saveList = document.getElementById('save-list');

    // 显示存档面板
    showSavesBtn?.addEventListener('click', () => {
        savePanel.style.opacity = '1';
        savePanel.style.pointerEvents = 'auto';
        renderSaveSlots();
    });

    // 关闭存档面板
    closeSavePanelBtn?.addEventListener('click', closeSavePanel);
    saveBackdrop?.addEventListener('click', closeSavePanel);

    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && savePanel.style.opacity === '1') {
            closeSavePanel();
        }
    });
}

function closeSavePanel() {
    const savePanel = document.getElementById('save-panel');
    savePanel.style.opacity = '0';
    savePanel.style.pointerEvents = 'none';
}

function renderSaveSlots() {
    const saveList = document.getElementById('save-list');
    const currentPlayer = JSON.parse(localStorage.getItem("present_data"));
    
    if (!currentPlayer?.saveSlots) {
        saveList.innerHTML = '<div class="no-saves">暂无存档</div>';
        return;
    }

    saveList.innerHTML = '';
    currentPlayer.saveSlots.forEach((save, index) => {
        if (!save) return;
        
        const saveSlot = document.createElement('div');
        saveSlot.className = 'save-slot';
        saveSlot.innerHTML = `
            <div class="save-preview"></div>
            <div class="save-info">
                <div class="save-time">${new Date(save.timestamp).toLocaleString()}</div>
                <div class="save-location">第${save.layer + 1}层 - 房间${save.room + 1}</div>
            </div>
            <button class="load-save-btn" data-slot="${index}">加载</button>
        `;
        
        saveSlot.querySelector('.load-save-btn').addEventListener('click', () => {
            localStorage.setItem('selected_slot', String(index + 1));
            window.location.href = 'game.html';
        });
        
        saveList.appendChild(saveSlot);
    });
}

// 开始游戏按钮逻辑
(() => {
    const startBtn = document.getElementById('start-game');
    startBtn?.addEventListener('click', () => {
        const selected = localStorage.getItem('selected_slot');
        const slot = Math.max(1, parseInt(selected || '1', 10) || 1);
        localStorage.setItem('selected_slot', String(slot));
        window.location.href = 'game.html';
    });
})();

// ==============================================
// 5. 制作人员系统实现
// ==============================================
function initCreditsSystem() {
    // 获取DOM元素
    const showCreditsBtn = document.getElementById('show-credits-btn');
    const creditsPanel = document.getElementById('credits-panel');
    const closeCreditsPanelBtn = document.getElementById('close-credits-panel');
    const creditsBackdrop = document.getElementById('credits-backdrop');
    const creditsCarousel = document.getElementById('credits-carousel');
    const carouselDots = document.getElementById('carousel-dots');

    // 渲染轮播内容
    function renderCreditsCarousel() {
        if (creditsData.length === 0) {
            creditsCarousel.innerHTML = '<div class="no-credits">暂无制作人员信息</div>';
            carouselDots.innerHTML = '';
            return;
        }

        // 清空原有内容
        creditsCarousel.innerHTML = '';
        carouselDots.innerHTML = '';

        // 生成轮播幻灯片和导航点
        creditsData.forEach((member, index) => {
            // 生成幻灯片项
            const slide = document.createElement('div');
            slide.className = `credits-slide ${index === 0 ? 'active' : ''}`;
            slide.innerHTML = `
                <a href="${member.link}" class="member-avatar-link" target="_blank">
                    <div class="member-avatar" style="background-image: url('${member.avatar}')"></div>
                </a>
                <div class="member-info">
                    <h3 class="member-name">${member.name}</h3>
                    <p class="member-role">${member.role}</p>
                    <p class="member-bio">${member.bio}</p>
                </div>
            `;
            creditsCarousel.appendChild(slide);

            // 生成导航点
            const dot = document.createElement('button');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.dataset.index = index;
            dot.addEventListener('click', () => switchToSlide(index));
            carouselDots.appendChild(dot);
        });
    }

    // 切换轮播幻灯片
    function switchToSlide(targetIndex) {
        const slides = document.querySelectorAll('.credits-slide');
        const dots = document.querySelectorAll('.carousel-dots .dot');

        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === targetIndex);
        });

        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === targetIndex);
        });
    }

    // 显示制作人员面板
    function showCreditsPanel() {
        creditsPanel.style.opacity = '1';
        creditsPanel.style.pointerEvents = 'auto';
        renderCreditsCarousel();
    }

    // 关闭制作人员面板
    function closeCreditsPanel() {
        creditsPanel.style.opacity = '0';
        creditsPanel.style.pointerEvents = 'none';
    }

    // 绑定事件
    showCreditsBtn?.addEventListener('click', showCreditsPanel);
    closeCreditsPanelBtn?.addEventListener('click', closeCreditsPanel);
    creditsBackdrop?.addEventListener('click', closeCreditsPanel);
    
    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && creditsPanel.style.opacity === '1') {
            closeCreditsPanel();
        }
    });
}
