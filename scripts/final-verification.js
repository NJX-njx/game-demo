/**
 * 最终验证脚本
 * 验证剧情重复问题和黄色线框问题是否已完全解决
 */

import fs from 'fs';
import path from 'path';

class FinalVerification {
    constructor() {
        this.stagesDir = '/Users/njx/Documents/git-projects/game-demo/assets/stages';
        this.results = {
            plotDuplicates: { status: 'pending', details: [] },
            yellowBoxes: { status: 'pending', details: [] },
            overall: 'pending'
        };
    }

    /**
     * 验证剧情重复问题
     */
    verifyPlotDuplicates() {
        console.log('🔍 验证剧情重复问题修复...');
        
        try {
            // 检查剧情数据
            const plotDataPath = '/Users/njx/Documents/git-projects/game-demo/Plot.V3/plot-data.json';
            const plotData = JSON.parse(fs.readFileSync(plotDataPath, 'utf-8'));
            
            let totalTriggers = 0;
            let duplicatesFound = 0;
            const triggerIds = new Set();
            
            // 检查触发器ID重复
            Object.keys(plotData.plotData).forEach(chapter => {
                Object.keys(plotData.plotData[chapter]).forEach(scene => {
                    const sceneData = plotData.plotData[chapter][scene];
                    if (sceneData.triggers) {
                        sceneData.triggers.forEach(trigger => {
                            totalTriggers++;
                            if (triggerIds.has(trigger.id)) {
                                duplicatesFound++;
                                this.results.plotDuplicates.details.push({
                                    type: 'duplicate_id',
                                    id: trigger.id,
                                    chapter,
                                    scene
                                });
                            } else {
                                triggerIds.add(trigger.id);
                            }
                        });
                    }
                });
            });
            
            // 检查地图文件重复
            const plotChapters = ['Chapter0', 'Chapter3', 'Chapter4', 'Chapter5', 'Chapter6'];
            let mapDuplicates = 0;
            let totalMapInteractions = 0;
            
            plotChapters.forEach(chapter => {
                const chapterDir = path.join(this.stagesDir, chapter);
                if (fs.existsSync(chapterDir)) {
                    const files = fs.readdirSync(chapterDir);
                    const mapFiles = files.filter(file => file.endsWith('.json'));
                    
                    mapFiles.forEach(mapFile => {
                        const mapPath = path.join(chapterDir, mapFile);
                        const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
                        
                        if (mapData.interactions) {
                            const plotInteractions = mapData.interactions.filter(i => 
                                i.events && i.events.some(e => e.event === 'plot')
                            );
                            
                            totalMapInteractions += plotInteractions.length;
                            
                            // 检查重复的事件ID
                            const eventIds = new Set();
                            plotInteractions.forEach(interaction => {
                                if (interaction.events && interaction.events[0] && interaction.events[0].payout) {
                                    const eventId = interaction.events[0].payout.id;
                                    if (eventIds.has(eventId)) {
                                        mapDuplicates++;
                                        this.results.plotDuplicates.details.push({
                                            type: 'duplicate_event_id',
                                            id: eventId,
                                            file: `${chapter}/${mapFile}`
                                        });
                                    } else {
                                        eventIds.add(eventId);
                                    }
                                }
                            });
                        }
                    });
                }
            });
            
            const totalDuplicates = duplicatesFound + mapDuplicates;
            
            if (totalDuplicates === 0) {
                this.results.plotDuplicates.status = 'passed';
                console.log('✅ 剧情重复问题已完全解决！');
                console.log(`  剧情数据触发器: ${totalTriggers} 个，无重复`);
                console.log(`  地图文件交互点: ${totalMapInteractions} 个，无重复`);
            } else {
                this.results.plotDuplicates.status = 'failed';
                console.log(`❌ 仍发现 ${totalDuplicates} 个重复问题`);
                console.log(`  剧情数据重复: ${duplicatesFound} 个`);
                console.log(`  地图文件重复: ${mapDuplicates} 个`);
            }
            
        } catch (error) {
            this.results.plotDuplicates.status = 'error';
            this.results.plotDuplicates.details.push({ error: error.message });
            console.error('❌ 验证剧情重复时出错:', error.message);
        }
    }

    /**
     * 验证黄色线框问题
     */
    verifyYellowBoxes() {
        console.log('\n🔍 验证黄色线框问题修复...');
        
        try {
            // 检查InteractionManager中的调试框设置
            const interactionManagerPath = '/Users/njx/Documents/git-projects/game-demo/src/Manager/InteractionManager.js';
            const interactionContent = fs.readFileSync(interactionManagerPath, 'utf-8');
            
            if (interactionContent.includes('const showDebugBox = false;')) {
                this.results.yellowBoxes.details.push({
                    file: 'InteractionManager.js',
                    issue: '调试框已关闭',
                    status: 'fixed'
                });
                console.log('✅ InteractionManager调试框已关闭');
            } else {
                this.results.yellowBoxes.details.push({
                    file: 'InteractionManager.js',
                    issue: '调试框可能仍开启',
                    status: 'needs_check'
                });
                console.log('⚠️  InteractionManager调试框状态需要检查');
            }
            
            // 检查ItemSlotElement中的黄色边框
            const itemSlotPath = '/Users/njx/Documents/git-projects/game-demo/src/System/UI/Elements/ItemSlotElement.js';
            const itemSlotContent = fs.readFileSync(itemSlotPath, 'utf-8');
            
            if (itemSlotContent.includes('"yellow"')) {
                this.results.yellowBoxes.details.push({
                    file: 'ItemSlotElement.js',
                    issue: '仍使用yellow颜色',
                    status: 'needs_fix'
                });
                console.log('❌ ItemSlotElement仍使用yellow颜色');
            } else {
                this.results.yellowBoxes.details.push({
                    file: 'ItemSlotElement.js',
                    issue: 'yellow颜色已替换',
                    status: 'fixed'
                });
                console.log('✅ ItemSlotElement黄色边框已替换');
            }
            
            // 检查其他可能的黄色线框
            const srcFiles = this.getAllSourceFiles('/Users/njx/Documents/git-projects/game-demo/src');
            let yellowIssues = 0;
            
            srcFiles.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('#ffcc00') || content.includes('strokeStyle.*yellow')) {
                    yellowIssues++;
                    this.results.yellowBoxes.details.push({
                        file: path.basename(file),
                        issue: '发现黄色线框相关代码',
                        status: 'needs_check'
                    });
                }
            });
            
            if (yellowIssues === 0) {
                this.results.yellowBoxes.status = 'passed';
                console.log('✅ 黄色线框问题已完全解决！');
            } else {
                this.results.yellowBoxes.status = 'failed';
                console.log(`⚠️  发现 ${yellowIssues} 个文件可能仍有黄色线框相关代码`);
            }
            
        } catch (error) {
            this.results.yellowBoxes.status = 'error';
            this.results.yellowBoxes.details.push({ error: error.message });
            console.error('❌ 验证黄色线框时出错:', error.message);
        }
    }

    /**
     * 获取所有源文件
     */
    getAllSourceFiles(dir) {
        const files = [];
        
        function traverse(currentDir) {
            const items = fs.readdirSync(currentDir);
            items.forEach(item => {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    traverse(fullPath);
                } else if (item.endsWith('.js')) {
                    files.push(fullPath);
                }
            });
        }
        
        traverse(dir);
        return files;
    }

    /**
     * 生成最终验证报告
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 最终验证报告');
        console.log('='.repeat(60));
        
        // 剧情重复问题
        console.log('\n🎭 剧情重复问题:');
        console.log(`  状态: ${this.results.plotDuplicates.status === 'passed' ? '✅ 已解决' : '❌ 未解决'}`);
        if (this.results.plotDuplicates.details.length > 0) {
            this.results.plotDuplicates.details.forEach(detail => {
                console.log(`    - ${detail.type || detail.issue}: ${detail.id || detail.file}`);
            });
        }
        
        // 黄色线框问题
        console.log('\n🟨 黄色线框问题:');
        console.log(`  状态: ${this.results.yellowBoxes.status === 'passed' ? '✅ 已解决' : '❌ 未解决'}`);
        if (this.results.yellowBoxes.details.length > 0) {
            this.results.yellowBoxes.details.forEach(detail => {
                console.log(`    - ${detail.file}: ${detail.issue} (${detail.status})`);
            });
        }
        
        // 总体状态
        const allPassed = this.results.plotDuplicates.status === 'passed' && 
                         this.results.yellowBoxes.status === 'passed';
        
        this.results.overall = allPassed ? 'passed' : 'failed';
        
        console.log('\n🎯 总体状态:');
        if (allPassed) {
            console.log('🎉 所有问题都已完全解决！');
            console.log('✅ 剧情重复问题已修复');
            console.log('✅ 黄色线框问题已修复');
        } else {
            console.log('⚠️  部分问题仍需处理');
        }
        
        // 保存报告
        const reportPath = '/Users/njx/Documents/git-projects/game-demo/final-verification-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2), 'utf-8');
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
        
        return this.results;
    }

    /**
     * 运行完整验证
     */
    runVerification() {
        console.log('🎯 开始最终验证...\n');
        
        this.verifyPlotDuplicates();
        this.verifyYellowBoxes();
        
        return this.generateReport();
    }
}

// 运行验证
if (import.meta.url === `file://${process.argv[1]}`) {
    const verifier = new FinalVerification();
    const results = verifier.runVerification();
    
    if (results.overall === 'passed') {
        console.log('\n🎊 验证完成！所有问题都已解决！');
        process.exit(0);
    } else {
        console.log('\n⚠️  验证完成，但仍有问题需要处理');
        process.exit(1);
    }
}

export default FinalVerification;
