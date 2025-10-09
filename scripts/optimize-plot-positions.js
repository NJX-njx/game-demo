/**
 * 优化所有剧情交互点的位置
 * 确保剧情交互点位于玩家正常行走能到达的地方
 */
import fs from 'fs';
import path from 'path';

const plotDataPath = '/Users/njx/Documents/git-projects/game-demo/Plot.V3/plot-data.json';
const stagesDir = '/Users/njx/Documents/git-projects/game-demo/assets/stages';

// 读取剧情数据
const plotData = JSON.parse(fs.readFileSync(plotDataPath, 'utf-8'));
let optimizedCount = 0;

// 遍历所有剧情交互配置
Object.keys(plotData.interactions).forEach(chapterKey => {
    const chapter = plotData.interactions[chapterKey];
    
    Object.keys(chapter).forEach(roomKey => {
        const interactions = chapter[roomKey];
        const chapterNum = chapterKey.replace('Chapter', '');
        const roomNum = roomKey.replace(`Lv${chapterNum}-`, '');
        
        // 读取对应的地图文件
        const mapPath = path.join(stagesDir, chapterKey, `Lv${chapterNum}-${roomNum}.json`);
        
        if (!fs.existsSync(mapPath)) {
            console.log(`⚠️  地图文件不存在: ${mapPath}`);
            return;
        }
        
        try {
            const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
            const playerSpawn = mapData.playerSpawn || { x: 100, y: 500 };
            
            // 优化每个交互点的位置
            interactions.forEach((interaction, index) => {
                const oldPos = { ...interaction.position };
                const oldSize = interaction.size ? { ...interaction.size } : null;
                let changed = false;
                
                // 策略1: 如果交互点在屏幕上半部分（y < 360），可能需要调整
                // 大多数游戏地面在 y=500-680 之间
                if (interaction.position.y < 400) {
                    // 根据玩家出生点调整位置
                    const groundY = playerSpawn.y - 40; // 地面稍微高于出生点
                    interaction.position.y = Math.max(groundY, 500);
                    
                    // 如果是第一个交互点，放在接近出生点的地方
                    if (index === 0) {
                        interaction.position.x = Math.max(playerSpawn.x + 120, 140);
                    }
                    
                    changed = true;
                }
                
                // 策略2: 调整尺寸，使交互点更容易触发
                if (interaction.size) {
                    if (interaction.size.y < 80) {
                        interaction.size.y = 80;
                        changed = true;
                    }
                    if (interaction.size.x < 60) {
                        interaction.size.x = 60;
                        changed = true;
                    }
                }
                
                if (changed) {
                    optimizedCount++;
                    console.log(`✅ 优化: ${chapterKey}/${roomKey} - 交互点 ${index + 1}`);
                    console.log(`   位置: (${oldPos.x}, ${oldPos.y}) -> (${interaction.position.x}, ${interaction.position.y})`);
                    if (oldSize && interaction.size) {
                        console.log(`   尺寸: (${oldSize.x}x${oldSize.y}) -> (${interaction.size.x}x${interaction.size.y})`);
                    }
                }
            });
        } catch (error) {
            console.error(`❌ 处理失败: ${mapPath}`, error.message);
        }
    });
});

// 写回剧情数据
fs.writeFileSync(plotDataPath, JSON.stringify(plotData, null, 2), 'utf-8');

console.log('\n' + '='.repeat(60));
console.log(`📊 优化完成！共优化 ${optimizedCount} 个交互点`);
console.log('='.repeat(60));
