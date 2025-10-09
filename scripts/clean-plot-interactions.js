/**
 * 清理所有地图文件中的剧情交互点
 * 移除所有 event 为 plot 的交互点，只保留非剧情事件
 */
import fs from 'fs';
import path from 'path';

const stagesDir = '/Users/njx/Documents/git-projects/game-demo/assets/stages';
let totalCleaned = 0;
let totalFiles = 0;

function cleanMapFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const mapData = JSON.parse(content);
        
        if (!mapData.interactions || !Array.isArray(mapData.interactions)) {
            return { cleaned: false, count: 0 };
        }
        
        const originalLength = mapData.interactions.length;
        let plotEventCount = 0;
        
        // 过滤掉所有包含 plot 事件的交互点
        mapData.interactions = mapData.interactions.filter(interaction => {
            if (!interaction.events || !Array.isArray(interaction.events)) {
                return true;
            }
            
            // 检查是否包含 plot 事件
            const hasPlotEvent = interaction.events.some(event => event.event === 'plot');
            if (hasPlotEvent) {
                plotEventCount++;
                return false; // 移除整个交互点
            }
            
            return true;
        });
        
        if (plotEventCount > 0) {
            // 写回文件
            fs.writeFileSync(filePath, JSON.stringify(mapData, null, 4), 'utf-8');
            return { cleaned: true, count: plotEventCount };
        }
        
        return { cleaned: false, count: 0 };
    } catch (error) {
        console.error(`处理文件失败: ${filePath}`, error.message);
        return { cleaned: false, count: 0, error: error.message };
    }
}

function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            traverseDirectory(fullPath);
        } else if (file.endsWith('.json')) {
            totalFiles++;
            const result = cleanMapFile(fullPath);
            
            if (result.cleaned) {
                totalCleaned += result.count;
                console.log(`✅ 已清理: ${path.relative(stagesDir, fullPath)} - 移除 ${result.count} 个剧情交互点`);
            } else if (result.error) {
                console.log(`❌ 失败: ${path.relative(stagesDir, fullPath)} - ${result.error}`);
            }
        }
    });
}

console.log('🚀 开始清理地图文件中的剧情交互点...\n');
traverseDirectory(stagesDir);
console.log('\n' + '='.repeat(60));
console.log(`📊 清理完成！`);
console.log(`   处理文件总数: ${totalFiles}`);
console.log(`   移除剧情交互点总数: ${totalCleaned}`);
console.log('='.repeat(60));
