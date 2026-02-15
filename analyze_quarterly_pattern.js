#!/usr/bin/env node
/**
 * 季度内月份对比分析 - 寻找季度末效应
 * 分析每个季度：前两个月 vs 第三个月
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const healthDir = './health';

// 季节定义
const quarters = {
    'Q1': { months: [1, 2, 3], name: '第一季度(冬-春)', early: [1, 2], late: [3] },
    'Q2': { months: [4, 5, 6], name: '第二季度(春-夏)', early: [4, 5], late: [6] },
    'Q3': { months: [7, 8, 9], name: '第三季度(夏-秋)', early: [7, 8], late: [9] },
    'Q4': { months: [10, 11, 12], name: '第四季度(秋-冬)', early: [10, 11], late: [12] }
};

function parseDateTime(dtStr) {
    if (!dtStr || dtStr.length < 14) return null;
    const year = parseInt(dtStr.substring(0, 4));
    const month = parseInt(dtStr.substring(4, 6)) - 1;
    const day = parseInt(dtStr.substring(6, 8));
    const hour = parseInt(dtStr.substring(8, 10));
    const minute = parseInt(dtStr.substring(10, 12));
    const second = parseInt(dtStr.substring(12, 14));
    return new Date(year, month, day, hour, minute, second);
}

function loadSleepData(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const data = yaml.load(content);
        if (!data || !data.date) return null;
        
        const dateStr = String(data.date);
        let sleepTime = null;
        let wakeTime = null;
        
        if (data.sleep && data.sleep.time) sleepTime = String(data.sleep.time);
        if (data.wake && data.wake.time) wakeTime = String(data.wake.time);
        
        if (sleepTime && wakeTime && sleepTime.length >= 14 && wakeTime.length >= 14) {
            return { 
                date: dateStr, 
                sleepTime, 
                wakeTime,
                sleepDt: parseDateTime(sleepTime),
                wakeDt: parseDateTime(wakeTime)
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

function formatTime(dt) {
    if (!dt) return 'N/A';
    return dt.toTimeString().substring(0, 5);
}

function timeToDecimal(dt) {
    if (!dt) return 0;
    return dt.getHours() + dt.getMinutes() / 60 + dt.getSeconds() / 3600;
}

function calculateStats(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const median = n % 2 === 0 ? (sorted[Math.floor(n/2) - 1] + sorted[Math.floor(n/2)]) / 2 : sorted[Math.floor(n/2)];
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { mean, median, stdDev, min, max, count: n };
}

function main() {
    console.log('='.repeat(120));
    console.log('                 季度内月份对比分析 - 寻找季度末效应');
    console.log('='.repeat(120));
    
    // 加载所有数据
    const files = fs.readdirSync(healthDir)
        .filter(f => f.match(/^d\.\d{8}\.yaml$/))
        .map(f => path.join(healthDir, f))
        .sort();
    
    const dataByDate = {};
    for (const filepath of files) {
        const record = loadSleepData(filepath);
        if (record) dataByDate[record.date] = record;
    }
    
    // 计算生物周期和各项指标
    const dailyData = [];
    const dates = Object.keys(dataByDate).sort();
    
    for (let i = 1; i < dates.length; i++) {
        const prevDate = dates[i-1];
        const currDate = dates[i];
        
        const prev = dataByDate[prevDate];
        const curr = dataByDate[currDate];
        
        if (!prev.sleepDt || !curr.sleepDt || !prev.wakeDt || !curr.wakeDt) continue;
        
        // 计算生物周期
        const sleepToSleepMs = curr.sleepDt - prev.sleepDt;
        const sleepToSleepHours = sleepToSleepMs / (1000 * 60 * 60);
        
        // 计算睡眠时间
        const sleepDurationMs = prev.wakeDt - prev.sleepDt;
        const sleepDurationHours = sleepDurationMs / (1000 * 60 * 60);
        
        // 计算清醒时间
        const awakeHours = sleepToSleepHours - sleepDurationHours;
        
        // 入睡和醒来时间（转换为小时的小数）
        const sleepStartHour = timeToDecimal(prev.sleepDt);
        const wakeUpHour = timeToDecimal(prev.wakeDt);
        
        if (sleepToSleepHours >= 20 && sleepToSleepHours <= 28 && 
            sleepDurationHours > 3 && sleepDurationHours < 14) {
            
            const year = parseInt(currDate.substring(0, 4));
            const month = parseInt(currDate.substring(4, 6));
            
            // 判断属于哪个季度和季度内的哪个阶段
            let quarter = null;
            let quarterPhase = null;
            
            for (const [q, info] of Object.entries(quarters)) {
                if (info.months.includes(month)) {
                    quarter = q;
                    if (info.early.includes(month)) quarterPhase = 'early';
                    else quarterPhase = 'late';
                    break;
                }
            }
            
            if (quarter && quarterPhase) {
                dailyData.push({
                    date: currDate,
                    year,
                    month,
                    quarter,
                    quarterPhase,
                    bioPeriod: sleepToSleepHours,
                    sleepDuration: sleepDurationHours,
                    awakeDuration: awakeHours,
                    sleepStartHour,
                    wakeUpHour
                });
            }
        }
    }
    
    console.log(`\n📊 数据加载完成：共 ${dailyData.length} 条有效记录\n`);
    
    // 按季度和阶段分组统计
    const quarterPhaseStats = {};
    
    for (const d of dailyData) {
        const key = `${d.quarter}_${d.quarterPhase}`;
        if (!quarterPhaseStats[key]) {
            quarterPhaseStats[key] = [];
        }
        quarterPhaseStats[key].push(d);
    }
    
    // 一、总体概览
    console.log('='.repeat(120));
    console.log('一、季度内分组统计概览');
    console.log('='.repeat(120));
    
    console.log('\n📈 各季度阶段记录数：');
    console.log('-'.repeat(80));
    console.log('季度        阶段        月份        记录数    占比');
    console.log('-'.repeat(80));
    
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const earlyKey = `${q}_early`;
        const lateKey = `${q}_late`;
        
        const earlyCount = quarterPhaseStats[earlyKey] ? quarterPhaseStats[earlyKey].length : 0;
        const lateCount = quarterPhaseStats[lateKey] ? quarterPhaseStats[lateKey].length : 0;
        const total = earlyCount + lateCount;
        
        console.log(`${quarters[q].name.padEnd(12)} 前两个月  ${quarters[q].early.map(m=>m+'月').join(',').padEnd(8)}  ${String(earlyCount).padEnd(6)}  ${(earlyCount/total*100).toFixed(1)}%`);
        console.log(`${''.padEnd(12)} 第三个月  ${quarters[q].late.map(m=>m+'月').join(',').padEnd(8)}  ${String(lateCount).padEnd(6)}  ${(lateCount/total*100).toFixed(1)}%`);
        console.log('-'.repeat(80));
    }
    
    // 二、详细对比分析
    console.log('\n\n');
    console.log('='.repeat(120));
    console.log('二、季度内详细对比分析（前两个月 vs 第三个月）');
    console.log('='.repeat(120));
    
    const comparisonResults = [];
    
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        console.log(`\n${'━'.repeat(120)}`);
        console.log(`${quarters[q].name} 对比分析`);
        console.log(`${'━'.repeat(120)}\n`);
        
        const earlyKey = `${q}_early`;
        const lateKey = `${q}_late`;
        
        const earlyData = quarterPhaseStats[earlyKey] || [];
        const lateData = quarterPhaseStats[lateKey] || [];
        
        if (earlyData.length === 0 || lateData.length === 0) {
            console.log(`  ⚠️ 数据不足，跳过`);
            continue;
        }
        
        // 计算各项指标
        const earlyBioPeriod = calculateStats(earlyData.map(d => d.bioPeriod));
        const lateBioPeriod = calculateStats(lateData.map(d => d.bioPeriod));
        
        const earlySleep = calculateStats(earlyData.map(d => d.sleepDuration));
        const lateSleep = calculateStats(lateData.map(d => d.sleepDuration));
        
        const earlyAwake = calculateStats(earlyData.map(d => d.awakeDuration));
        const lateAwake = calculateStats(lateData.map(d => d.awakeDuration));
        
        const earlySleepStart = calculateStats(earlyData.map(d => d.sleepStartHour));
        const lateSleepStart = calculateStats(lateData.map(d => d.sleepStartHour));
        
        const earlyWakeUp = calculateStats(earlyData.map(d => d.wakeUpHour));
        const lateWakeUp = calculateStats(lateData.map(d => d.wakeUpHour));
        
        // 打印对比表格
        console.log('┌────────────────────────────────────────────────────────────────────────────────────────────┐');
        console.log('│ 指标                    前两个月(平均值)        第三个月(平均值)        差异              │');
        console.log('├────────────────────────────────────────────────────────────────────────────────────────────┤');
        
        const diffBio = lateBioPeriod.mean - earlyBioPeriod.mean;
        const diffSleep = lateSleep.mean - earlySleep.mean;
        const diffAwake = lateAwake.mean - earlyAwake.mean;
        const diffSleepStart = lateSleepStart.mean - earlySleepStart.mean;
        const diffWakeUp = lateWakeUp.mean - earlyWakeUp.mean;
        
        // 处理跨午夜的时间差
        const normalizeTimeDiff = (diff) => {
            if (diff > 12) return diff - 24;
            if (diff < -12) return diff + 24;
            return diff;
        };
        
        const normDiffSleepStart = normalizeTimeDiff(diffSleepStart);
        const normDiffWakeUp = normalizeTimeDiff(diffWakeUp);
        
        console.log(`│ 生物周期                ${earlyBioPeriod.mean.toFixed(2)}h               ${lateBioPeriod.mean.toFixed(2)}h               ${(diffBio >= 0 ? '+' : '').padEnd(4)}${diffBio.toFixed(2)}h          │`);
        console.log(`│ 睡眠时间                ${earlySleep.mean.toFixed(2)}h                ${lateSleep.mean.toFixed(2)}h                ${(diffSleep >= 0 ? '+' : '').padEnd(4)}${diffSleep.toFixed(2)}h          │`);
        console.log(`│ 清醒时间                ${earlyAwake.mean.toFixed(2)}h               ${lateAwake.mean.toFixed(2)}h               ${(diffAwake >= 0 ? '+' : '').padEnd(4)}${diffAwake.toFixed(2)}h          │`);
        console.log(`│ 入睡时间                ${formatTimeFromDecimal(earlySleepStart.mean)}                ${formatTimeFromDecimal(lateSleepStart.mean)}                ${(normDiffSleepStart >= 0 ? '+' : '').padEnd(4)}${Math.abs(normDiffSleepStart*60).toFixed(0)}min       │`);
        console.log(`│ 醒来时间                ${formatTimeFromDecimal(earlyWakeUp.mean)}                ${formatTimeFromDecimal(lateWakeUp.mean)}                ${(normDiffWakeUp >= 0 ? '+' : '').padEnd(4)}${Math.abs(normDiffWakeUp*60).toFixed(0)}min       │`);
        console.log(`│ 周期规律性(标准差)      ${earlyBioPeriod.stdDev.toFixed(2)}h                ${lateBioPeriod.stdDev.toFixed(2)}h                ${(lateBioPeriod.stdDev - earlyBioPeriod.stdDev >= 0 ? '+' : '').padEnd(4)}${(lateBioPeriod.stdDev - earlyBioPeriod.stdDev).toFixed(2)}h          │`);
        console.log(`│ 睡眠规律性(标准差)      ${earlySleep.stdDev.toFixed(2)}h                ${lateSleep.stdDev.toFixed(2)}h                ${(lateSleep.stdDev - earlySleep.stdDev >= 0 ? '+' : '').padEnd(4)}${(lateSleep.stdDev - earlySleep.stdDev).toFixed(2)}h          │`);
        console.log('└────────────────────────────────────────────────────────────────────────────────────────────┘');
        
        // 记录结果
        comparisonResults.push({
            quarter: q,
            quarterName: quarters[q].name,
            early: { count: earlyData.length, bioPeriod: earlyBioPeriod, sleep: earlySleep, awake: earlyAwake, sleepStart: earlySleepStart, wakeUp: earlyWakeUp },
            late: { count: lateData.length, bioPeriod: lateBioPeriod, sleep: lateSleep, awake: lateAwake, sleepStart: lateSleepStart, wakeUp: lateWakeUp },
            differences: { bioPeriod: diffBio, sleep: diffSleep, awake: diffAwake, sleepStart: normDiffSleepStart, wakeUp: normDiffWakeUp }
        });
        
        // 解读
        console.log('\n📊 季度内变化解读：');
        
        // 生物周期变化
        if (Math.abs(diffBio) > 0.1) {
            if (diffBio > 0) {
                console.log(`  • 生物周期延长：第三个月比前两个月长 ${diffBio.toFixed(2)}h`);
                console.log(`    可能是"季度末拖延"现象，倾向于晚睡晚起`);
            } else {
                console.log(`  • 生物周期缩短：第三个月比前两个月短 ${Math.abs(diffBio).toFixed(2)}h`);
                console.log(`    可能是"季度末冲刺"现象，倾向于早睡早起`);
            }
        } else {
            console.log(`  • 生物周期稳定：季度内无明显变化（差异${Math.abs(diffBio).toFixed(2)}h < 0.1h）`);
        }
        
        // 睡眠时间变化
        if (Math.abs(diffSleep) > 0.1) {
            if (diffSleep > 0) {
                console.log(`  • 睡眠增加：第三个月睡眠增加 ${diffSleep.toFixed(2)}h，可能是季度末疲劳累积`);
            } else {
                console.log(`  • 睡眠减少：第三个月睡眠减少 ${Math.abs(diffSleep).toFixed(2)}h，可能是季度末忙碌`);
            }
        }
        
        // 入睡时间变化
        if (Math.abs(normDiffSleepStart) > 0.17) { // 10分钟
            if (normDiffSleepStart > 0) {
                console.log(`  • 入睡推迟：第三个月比前两个月晚睡 ${(normDiffSleepStart*60).toFixed(0)} 分钟`);
            } else {
                console.log(`  • 入睡提前：第三个月比前两个月早睡 ${Math.abs(normDiffSleepStart*60).toFixed(0)} 分钟`);
            }
        }
        
        // 规律性变化
        const regularityChange = lateBioPeriod.stdDev - earlyBioPeriod.stdDev;
        if (Math.abs(regularityChange) > 0.2) {
            if (regularityChange > 0) {
                console.log(`  • 规律性下降：第三个月作息更不规律（标准差增加 ${regularityChange.toFixed(2)}h）`);
            } else {
                console.log(`  • 规律性提升：第三个月作息更规律（标准差减少 ${Math.abs(regularityChange).toFixed(2)}h）`);
            }
        }
    }
    
    // 三、跨季度规律总结
    console.log('\n\n');
    console.log('='.repeat(120));
    console.log('三、跨季度规律总结 - 季度末效应分析');
    console.log('='.repeat(120));
    
    // 统计各指标的变化方向
    const bioPeriodChanges = comparisonResults.map(r => r.differences.bioPeriod);
    const sleepChanges = comparisonResults.map(r => r.differences.sleep);
    const awakeChanges = comparisonResults.map(r => r.differences.awake);
    const sleepStartChanges = comparisonResults.map(r => r.differences.sleepStart);
    const wakeUpChanges = comparisonResults.map(r => r.differences.wakeUp);
    
    console.log('\n🔍 季度内变化方向统计（第三个月 vs 前两个月）：\n');
    
    const countDirection = (changes, threshold = 0.05) => {
        const increased = changes.filter(c => c > threshold).length;
        const decreased = changes.filter(c => c < -threshold).length;
        const stable = changes.filter(c => Math.abs(c) <= threshold).length;
        return { increased, decreased, stable };
    };
    
    const bioDir = countDirection(bioPeriodChanges);
    const sleepDir = countDirection(sleepChanges);
    const awakeDir = countDirection(awakeChanges);
    const sleepStartDir = countDirection(sleepStartChanges, 0.083); // 5分钟
    const wakeUpDir = countDirection(wakeUpChanges, 0.083);
    
    console.log('┌────────────────────┬─────────┬─────────┬─────────┬────────────────────┐');
    console.log('│ 指标               │ 增加    │ 减少    │ 稳定    │ 主要趋势           │');
    console.log('├────────────────────┼─────────┼─────────┼─────────┼────────────────────┤');
    
    const printRow = (name, dirs, values) => {
        const maxCount = Math.max(dirs.increased, dirs.decreased, dirs.stable);
        let trend = '';
        if (dirs.increased === maxCount) trend = '倾向于增加';
        else if (dirs.decreased === maxCount) trend = '倾向于减少';
        else trend = '无明显趋势';
        
        const avgChange = values.reduce((a, b) => a + b, 0) / values.length;
        
        console.log(`│ ${name.padEnd(16)} │ ${String(dirs.increased).padEnd(5)}   │ ${String(dirs.decreased).padEnd(5)}   │ ${String(dirs.stable).padEnd(5)}   │ ${trend.padEnd(16)} │`);
    };
    
    printRow('生物周期', bioDir, bioPeriodChanges);
    printRow('睡眠时间', sleepDir, sleepChanges);
    printRow('清醒时间', awakeDir, awakeChanges);
    printRow('入睡时间', sleepStartDir, sleepStartChanges);
    printRow('醒来时间', wakeUpDir, wakeUpChanges);
    
    console.log('└────────────────────┴─────────┴─────────┴─────────┴────────────────────┘');
    
    // 四、季度末效应总结
    console.log('\n\n');
    console.log('='.repeat(120));
    console.log('四、季度末效应综合评估');
    console.log('='.repeat(120));
    
    console.log('\n📊 季度内平均变化（第三个月 - 前两个月）：\n');
    
    const avgBioChange = bioPeriodChanges.reduce((a, b) => a + b, 0) / bioPeriodChanges.length;
    const avgSleepChange = sleepChanges.reduce((a, b) => a + b, 0) / sleepChanges.length;
    const avgAwakeChange = awakeChanges.reduce((a, b) => a + b, 0) / awakeChanges.length;
    const avgSleepStartChange = sleepStartChanges.reduce((a, b) => a + b, 0) / sleepStartChanges.length;
    const avgWakeUpChange = wakeUpChanges.reduce((a, b) => a + b, 0) / wakeUpChanges.length;
    
    console.log(`生物周期平均变化：${(avgBioChange >= 0 ? '+' : '').padEnd(4)}${avgBioChange.toFixed(3)}h (${(avgBioChange*60).toFixed(1)}分钟)`);
    console.log(`睡眠时间平均变化：${(avgSleepChange >= 0 ? '+' : '').padEnd(4)}${avgSleepChange.toFixed(3)}h (${(avgSleepChange*60).toFixed(1)}分钟)`);
    console.log(`清醒时间平均变化：${(avgAwakeChange >= 0 ? '+' : '').padEnd(4)}${avgAwakeChange.toFixed(3)}h (${(avgAwakeChange*60).toFixed(1)}分钟)`);
    console.log(`入睡时间平均变化：${(avgSleepStartChange >= 0 ? '+' : '').padEnd(4)}${(avgSleepStartChange*60).toFixed(1)}分钟`);
    console.log(`醒来时间平均变化：${(avgWakeUpChange >= 0 ? '+' : '').padEnd(4)}${(avgWakeUpChange*60).toFixed(1)}分钟`);
    
    console.log('\n🎯 季度末效应判定：\n');
    
    // 判定是否存在季度末效应
    const significantChanges = [];
    
    if (Math.abs(avgBioChange) > 0.05) {
        significantChanges.push(`生物周期${avgBioChange > 0 ? '延长' : '缩短'} ${Math.abs(avgBioChange*60).toFixed(1)}分钟`);
    }
    if (Math.abs(avgSleepChange) > 0.05) {
        significantChanges.push(`睡眠时间${avgSleepChange > 0 ? '增加' : '减少'} ${Math.abs(avgSleepChange*60).toFixed(1)}分钟`);
    }
    if (Math.abs(avgSleepStartChange) > 0.03) {
        significantChanges.push(`入睡时间${avgSleepStartChange > 0 ? '推迟' : '提前'} ${Math.abs(avgSleepStartChange*60).toFixed(1)}分钟`);
    }
    
    if (significantChanges.length > 0) {
        console.log('✅ 发现季度末效应：');
        significantChanges.forEach((change, i) => {
            console.log(`   ${i+1}. ${change}`);
        });
        
        // 分析类型
        if (avgBioChange > 0.05 && avgSleepStartChange > 0.03) {
            console.log('\n📌 季度末模式："拖延型"');
            console.log('   特征：第三个月倾向于晚睡晚起，生物周期延长');
            console.log('   可能原因：季度末工作/生活压力增大，导致作息推迟');
        } else if (avgBioChange < -0.05) {
            console.log('\n📌 季度末模式："冲刺型"');
            console.log('   特征：第三个月倾向于早睡早起，生物周期缩短');
            console.log('   可能原因：季度末需要完成目标，提前起床工作');
        } else if (Math.abs(avgBioChange) <= 0.05) {
            console.log('\n📌 季度末模式："稳定型"');
            console.log('   特征：季度内生物节律保持稳定，无明显季度末效应');
            console.log('   意义：作息非常规律，不受季度时间节点影响');
        }
    } else {
        console.log('❌ 未发现显著的季度末效应');
        console.log('   季度内作息保持稳定，无明显变化规律');
        console.log('   说明您的生物钟非常强健，不受时间节点影响');
    }
    
    // 五、各季度独特模式
    console.log('\n\n');
    console.log('='.repeat(120));
    console.log('五、各季度独特模式分析');
    console.log('='.repeat(120));
    
    console.log('\n📊 各季度第三个月特征：\n');
    
    comparisonResults.forEach(r => {
        console.log(`${r.quarterName}（${r.quarter}）：`);
        
        const bioDiff = r.differences.bioPeriod;
        const sleepDiff = r.differences.sleep;
        const awakeDiff = r.differences.awake;
        
        let pattern = [];
        
        if (Math.abs(bioDiff) > 0.1) {
            pattern.push(bioDiff > 0 ? '周期延长' : '周期缩短');
        }
        if (Math.abs(sleepDiff) > 0.1) {
            pattern.push(sleepDiff > 0 ? '睡眠增加' : '睡眠减少');
        }
        if (Math.abs(awakeDiff) > 0.1) {
            pattern.push(awakeDiff > 0 ? '清醒增加' : '清醒减少');
        }
        
        if (pattern.length > 0) {
            console.log(`  第三个月特征：${pattern.join('，')}`);
            console.log(`  具体数据：周期${bioDiff >= 0 ? '+' : ''}${bioDiff.toFixed(2)}h，睡眠${sleepDiff >= 0 ? '+' : ''}${sleepDiff.toFixed(2)}h，清醒${awakeDiff >= 0 ? '+' : ''}${awakeDiff.toFixed(2)}h`);
        } else {
            console.log(`  第三个月特征：无明显变化，保持稳定`);
        }
        console.log();
    });
    
    // 六、建议
    console.log('\n');
    console.log('='.repeat(120));
    console.log('六、个性化建议');
    console.log('='.repeat(120));
    
    console.log('\n💡 基于季度末效应分析的建议：\n');
    
    if (Math.abs(avgBioChange) > 0.05) {
        console.log('1️⃣ 季度末作息调整：');
        if (avgBioChange > 0) {
            console.log('   • 您在季度末倾向于晚睡晚起，建议：');
            console.log('     - 第三个月提前30分钟准备睡觉');
            console.log('     - 避免季度末过度加班影响睡眠');
            console.log('     - 设置更严格的睡前提醒');
        } else {
            console.log('   • 您在季度末倾向于早睡早起，建议：');
            console.log('     - 利用这种"冲刺模式"完成重要任务');
            console.log('     - 注意保证充足睡眠，避免过度疲劳');
        }
    } else {
        console.log('1️⃣ 季度末作息稳定：');
        console.log('   • 您的作息在季度内非常稳定，这是健康的标志');
        console.log('   • 继续保持这种稳定的生物钟节律');
    }
    
    console.log('\n2️⃣ 季度规划建议：');
    const maxDiffQuarter = comparisonResults.reduce((max, r) => 
        Math.abs(r.differences.bioPeriod) > Math.abs(max.differences.bioPeriod) ? r : max
    );
    
    console.log(`   • ${maxDiffQuarter.quarterName}的季度末变化最大，建议：`);
    console.log(`     - 在该季度第三个月特别关注作息规律`);
    console.log(`     - 提前做好时间管理和压力调节`);
    
    console.log('\n3️⃣ 长期观察建议：');
    console.log('   • 继续记录睡眠数据，观察季度末效应是否持续');
    console.log('   • 如果发现某季度变化加剧，及时调整作息策略');
    console.log('   • 季度初制定目标时，考虑季度末可能的作息变化');
    
    console.log('\n' + '='.repeat(120));
    console.log('分析完成 - 季度内月份对比与季度末效应分析');
    console.log('='.repeat(120));
}

function formatTimeFromDecimal(decimal) {
    let hours = Math.floor(decimal);
    let minutes = Math.round((decimal - hours) * 60);
    
    if (hours >= 24) hours -= 24;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

main();
