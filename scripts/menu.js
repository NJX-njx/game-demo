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
        name: "王厚与",
        role: "游戏策划",
        bio: "代码呢？救一下啊！",
        avatar: "assets/avatars/wanghouyu.png",
        link: "pages/wanghouyu.html"
    },
    {
        name: "倪家兴",
        role: "主程序员",
        bio: "写代码，活着写代码......",
        avatar: "assets/avatars/nijiaxing.png",
        link: "pages/nijiaxing.html"
    },
    {
        name: "宋昊润",
        role: "主程序员",
        bio: "感谢ChatGPT对本项目的大力支持",
        avatar: "assets/avatars/songhaorun.png",
        link: "pages/songhaorun.html"
    },
    {
        name: "龙云",
        role: "美术总监",
        bio: "美工干不完真的干不完（QAQ）",
        avatar: "assets/avatars/longyun.png",
        link: "pages/longyun.html"
    },
    {
        name: "肖一达",
        role: "音乐总监",
        bio: "本游戏所有音乐音效均未使用AI",
        avatar: "assets/avatars/xiaoyida.png",
        link: "pages/xiaoyida.html"
    },
    {
        name: "杨雨宸",
        role: "主程序员",
        bio: "喜欢我的石山代码吗=w=",
        avatar: "assets/avatars/yangyuchen.png",
        link: "pages/yangyuchen.html"
    },
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
    // 初始化剧情模式选择系统
    initPlotModeSystem();
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

    // 清空列表
    saveList.innerHTML = '';

    // 检查是否有存档数据
    const saveSlots = currentPlayer?.saveSlots || [];
    let hasAnySave = false;

    // 生成8个存档槽位
    for (let i = 0; i < 8; i++) {
        const save = saveSlots[i];
        const saveSlot = document.createElement('div');
        saveSlot.className = `save-slot ${!save ? 'empty' : ''}`;
        saveSlot.dataset.slot = i + 1;

        if (save) {
            hasAnySave = true;
            saveSlot.innerHTML = `
                <div class="save-slot-header">
                    <span class="save-slot-number">存档 ${i + 1}</span>
                    <span class="save-slot-status">已保存</span>
                </div>
                <div class="save-slot-content">
                    <div class="save-preview">
                        <span>🎮</span>
                    </div>
                    <div class="save-info">
                        <div class="save-time">${new Date(save.timestamp).toLocaleString()}</div>
                        <div class="save-location">第${save.layer + 1}层 - 房间${save.room + 1}</div>
                        <div class="save-hp">❤️ ${save.playerHp || 100} HP</div>
                    </div>
                </div>
                <div class="save-slot-actions">
                    <button class="load-save-btn" data-slot="${i + 1}">加载</button>
                    <button class="delete-save-btn" data-slot="${i + 1}">删除</button>
                </div>
            `;

            // 绑定加载事件
            saveSlot.querySelector('.load-save-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                localStorage.setItem('selected_slot', String(i + 1));
                window.location.href = 'game.html';
            });

            // 绑定删除事件
            saveSlot.querySelector('.delete-save-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除存档 ${i + 1} 吗？`)) {
                    deleteSaveSlot(i + 1);
                }
            });
        } else {
            saveSlot.innerHTML = `
                <div class="save-slot-header">
                    <span class="save-slot-number">存档 ${i + 1}</span>
                    <span class="save-slot-status">空槽位</span>
                </div>
                <div class="save-slot-content">
                    <div class="save-preview empty">
                        <span>空</span>
                    </div>
                    <div class="save-info">
                        <div class="save-time">暂无存档</div>
                        <div class="save-location">点击开始游戏</div>
                    </div>
                </div>
                <div class="save-slot-actions">
                    <button class="load-save-btn" disabled>加载</button>
                    <button class="delete-save-btn" disabled>删除</button>
                </div>
            `;
        }

        saveList.appendChild(saveSlot);
    }

    // 如果没有任何存档，显示提示信息
    if (!hasAnySave) {
        const noSavesDiv = document.createElement('div');
        noSavesDiv.className = 'no-saves';
        noSavesDiv.innerHTML = `
            <div class="no-saves-icon">💾</div>
            <div class="no-saves-text">暂无存档</div>
            <div class="no-saves-hint">开始游戏后，在暂停界面选择"存档"来保存进度</div>
        `;
        saveList.appendChild(noSavesDiv);
    }
}

/**
 * 删除指定槽位的存档
 * @param {number} slotId 槽位编号（1-based）
 */
function deleteSaveSlot(slotId) {
    try {
        const currentPlayer = JSON.parse(localStorage.getItem("present_data"));
        if (!currentPlayer) return;

        const slotIndex = slotId - 1;
        if (currentPlayer.saveSlots && currentPlayer.saveSlots[slotIndex]) {
            delete currentPlayer.saveSlots[slotIndex];
            localStorage.setItem("present_data", JSON.stringify(currentPlayer));
            
            // 重新渲染存档列表
            renderSaveSlots();
            
            // 显示删除成功提示
            showToast('存档删除成功', 'success');
        }
    } catch (error) {
        console.error('删除存档失败:', error);
        showToast('删除存档失败', 'error');
    }
}

/**
 * 显示提示消息
 * @param {string} message 提示消息
 * @param {string} type 类型：'success' | 'error' | 'info'
 */
function showToast(message, type = 'info') {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(3, 102, 241, 0.9)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 开始游戏按钮逻辑
(() => {
    const startBtn = document.getElementById('start-game');
    startBtn?.addEventListener('click', () => {
        // 清除选中的存档槽位，表示开始新游戏
        localStorage.removeItem('selected_slot');
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
                <a href="${member.link}" class="member-avatar-link" target="_self">
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

// ==============================================
// 6. 剧情模式选择系统实现
// ==============================================
function initPlotModeSystem() {
    // 获取DOM元素
    const plotModeOnBtn = document.getElementById('plot-mode-on');
    const plotModeOffBtn = document.getElementById('plot-mode-off');

    // 从localStorage加载剧情模式设置，默认为有剧情
    const savedPlotMode = Store.get('plot_mode') || 'on';
    
    // 初始化按钮状态
    updatePlotModeButtons(savedPlotMode);

    // 绑定点击事件
    plotModeOnBtn?.addEventListener('click', () => {
        setPlotMode('on');
    });

    plotModeOffBtn?.addEventListener('click', () => {
        setPlotMode('off');
    });
}

/**
 * 设置剧情模式
 * @param {string} mode - 'on' 或 'off'
 */
function setPlotMode(mode) {
    // 保存到localStorage
    Store.set('plot_mode', mode);
    
    // 更新按钮状态
    updatePlotModeButtons(mode);
    
    // 显示提示
    const modeText = mode === 'on' ? '有剧情' : '无剧情';
    showToast(`已切换到${modeText}模式`, 'success');
    
    console.log(`剧情模式已设置为: ${modeText}`);
}

/**
 * 更新剧情模式按钮状态
 * @param {string} mode - 'on' 或 'off'
 */
function updatePlotModeButtons(mode) {
    const plotModeOnBtn = document.getElementById('plot-mode-on');
    const plotModeOffBtn = document.getElementById('plot-mode-off');
    
    if (mode === 'on') {
        plotModeOnBtn?.classList.add('active');
        plotModeOffBtn?.classList.remove('active');
    } else {
        plotModeOnBtn?.classList.remove('active');
        plotModeOffBtn?.classList.add('active');
    }
}

/**
 * 获取当前剧情模式设置
 * @returns {string} 'on' 或 'off'
 */
function getPlotMode() {
    return Store.get('plot_mode') || 'on';
}
