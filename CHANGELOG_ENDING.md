# 通关自动返回菜单功能实现

## 修改说明

实现了游戏通关后自动返回主菜单的功能。当玩家完成 Chapter 6 Level 3 的最终剧情（plot6-3-63-1）后，系统将自动在1秒延迟后跳转回主菜单页面。

## 修改文件

### 1. `/src/Manager/PlotManager.js`

**修改内容：**
- 在 `constructor()` 中添加了 `currentPlotEventId` 属性，用于追踪当前播放的剧情事件ID
- 在 `playPlot()` 方法中，播放剧情前记录当前剧情ID到 `this.currentPlotEventId`

**关键代码：**
```javascript
// 构造函数中新增
this.currentPlotEventId = null; // 当前播放的剧情事件ID

// playPlot 方法中新增
this.currentPlotEventId = eventId; // 记录当前播放的剧情ID
```

### 2. `/src/Manager/DialogManager.js`

**修改内容：**
- 在 `constructor()` 中添加了 `ENDING_PLOT_ID` 常量，定义通关剧情的ID为 `'plot6-3-63-1'`
- 在 `_printDialogLines()` 方法的末尾，对话结束后调用新增的 `_checkEndingPlot()` 方法
- 新增 `_checkEndingPlot()` 方法，检测当前剧情是否为通关剧情，如果是则延迟1秒后跳转到主菜单

**关键代码：**
```javascript
// 构造函数中新增
this.ENDING_PLOT_ID = 'plot6-3-63-1'; // 通关剧情ID

// _printDialogLines 方法末尾新增
this._checkEndingPlot();

// 新增方法
_checkEndingPlot() {
    // 动态导入 plotManager 避免循环依赖
    import('./PlotManager.js').then(module => {
        const plotManager = module.plotManager;
        if (plotManager.currentPlotEventId === this.ENDING_PLOT_ID) {
            console.log('通关剧情结束，准备返回菜单页面...');
            // 延迟跳转，给玩家一点时间
            setTimeout(() => {
                window.location.href = 'menu.html';
            }, 1000);
        }
    });
}
```

## 实现逻辑

1. **剧情追踪**：当 `PlotManager` 播放任何剧情时，都会将剧情ID保存到 `currentPlotEventId` 属性中
2. **对话结束检测**：`DialogManager` 在所有对话打印完毕并关闭对话框后，会检查当前播放的剧情ID
3. **通关判断**：如果当前剧情ID匹配通关剧情 `plot6-3-63-1`，则触发返回菜单逻辑
4. **平滑过渡**：使用1秒的延迟，让玩家有时间看完最后的对话框关闭动画

## 通关剧情信息

- **章节位置**：Chapter 6, Level 3
- **剧情ID**：`plot6-3-63-1`
- **触发方式**：自动触发（autoTrigger: true）
- **剧情内容**：最终结局动画和结算提示

## 测试建议

1. 进入游戏，通过正常流程或者跳关到达 Chapter 6 Level 3
2. 触发最终剧情，等待所有对话结束
3. 验证是否在对话结束约1秒后自动跳转回主菜单
4. 检查浏览器控制台，应该能看到 "通关剧情结束，准备返回菜单页面..." 的日志

## 注意事项

- 使用动态导入 `import('./PlotManager.js')` 来避免 `DialogManager` 和 `PlotManager` 之间的循环依赖
- 延迟1秒是为了给玩家更好的体验，避免突然跳转
- 如果需要修改通关剧情ID，只需修改 `DialogManager.js` 中的 `ENDING_PLOT_ID` 常量即可
