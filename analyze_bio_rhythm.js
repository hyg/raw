#!/usr/bin/env node
/**
 * 生物节律深度分析 - 改进算法
 * 基于实际生物周期（入睡-入睡 或 醒来-醒来）而非假设的24小时
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const healthDir = './health';
const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const seasons = {
    '春季': [3, 4, 5],
    '夏季': [6, 7, 8],
    '秋季': [9, 10, 11],
    '冬季': [12, 1, 2]
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

function getSeason(month) {
    for (const [season, months] of Object.entries(seasons)) {
        if (months.includes(month)) return season;
    }
    return '未知';
}

function formatDateTime(dt) {
    if (!dt) return 'N/A';
    return dt.toISOString().replace('T', ' ').substring(0, 19);
}

function formatDuration(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m}m`;
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
    
    // 计算百分位数
    const p25 = sorted[Math.floor(n * 0.25)];
    const p75 = sorted[Math.floor(n * 0.75)];
    
    return { mean, median, stdDev, min, max, count: n, p25, p75 };
}

function main() {
    console.log('='.repeat(110));
    console.log('              生物节律深度分析报告 - 基于实际周期长度');
    console.log('='.repeat(110));
    
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
    
    console.log(`\n📊 数据加载完成：共 ${Object.keys(dataByDate).length} 天记录\n`);
    
    // 计算生物周期
    // 方法1: 入睡-入睡周期（Circadian Period）
    // 方法2: 醒来-醒来周期
    const bioCycles = [];
    const dates = Object.keys(dataByDate).sort();
    
    for (let i = 1; i < dates.length; i++) {
        const prevDate = dates[i-1];
        const currDate = dates[i];
        
        const prev = dataByDate[prevDate];
        const curr = dataByDate[currDate];
        
        if (!prev.sleepDt || !curr.sleepDt || !prev.wakeDt || !curr.wakeDt) continue;
        
        // 计算入睡-入睡周期（真实的生物周期）
        const sleepToSleepMs = curr.sleepDt - prev.sleepDt;
        const sleepToSleepHours = sleepToSleepMs / (1000 * 60 * 60);
        
        // 计算醒来-醒来周期
        const wakeToWakeMs = curr.wakeDt - prev.wakeDt;
        const wakeToWakeHours = wakeToWakeMs / (1000 * 60 * 60);
        
        // 计算睡眠时间
        const sleepDurationMs = prev.wakeDt - prev.sleepDt;
        const sleepDurationHours = sleepDurationMs / (1000 * 60 * 60);
        
        // 计算清醒时间（基于实际周期）
        const awakeHoursBio = sleepToSleepHours - sleepDurationHours;
        
        // 计算24小时假设下的清醒时间（用于对比）
        const awakeHours24h = 24 - sleepDurationHours;
        
        // 只保留合理的周期（20-28小时为正常范围）
        if (sleepToSleepHours >= 20 && sleepToSleepHours <= 28 && 
            wakeToWakeHours >= 20 && wakeToWakeHours <= 28 &&
            sleepDurationHours > 0 && sleepDurationHours < 16) {
            
            const year = parseInt(currDate.substring(0, 4));
            const month = parseInt(currDate.substring(4, 6));
            const isWeekend = [0, 6].includes(curr.wakeDt.getDay());
            
            bioCycles.push({
                date: currDate,
                year,
                month,
                season: getSeason(month),
                isWeekend,
                
                // 周期长度
                sleepToSleepHours,  // 入睡-入睡周期
                wakeToWakeHours,    // 醒来-醒来周期
                
                // 睡眠时间
                sleepDurationHours,
                sleepStart: prev.sleepDt,
                sleepEnd: prev.wakeDt,
                
                // 清醒时间对比
                awakeHoursBio,      // 基于生物周期的清醒时间
                awakeHours24h,      // 基于24h假设的清醒时间
                
                // 周期偏差（相对于24小时）
                periodDeviation: sleepToSleepHours - 24
            });
        }
    }
    
    console.log(`✅ 有效生物周期数据：${bioCycles.length} 个周期\n`);
    
    // 一、生物周期长度总体统计
    console.log('='.repeat(110));
    console.log('一、生物周期长度总体统计（入睡-入睡 / 醒来-醒来）');
    console.log('='.repeat(110));
    
    const sleepPeriodStats = calculateStats(bioCycles.map(c => c.sleepToSleepHours));
    const wakePeriodStats = calculateStats(bioCycles.map(c => c.wakeToWakeHours));
    const deviationStats = calculateStats(bioCycles.map(c => c.periodDeviation));
    
    console.log('\n📏 周期长度统计：');
    console.log('-'.repeat(90));
    console.log('周期类型            平均      中位数    标准差    最短      最长      P25      P75');
    console.log('-'.repeat(90));
    console.log(`入睡-入睡周期      ${sleepPeriodStats.mean.toFixed(2)}h    ${sleepPeriodStats.median.toFixed(2)}h    ${sleepPeriodStats.stdDev.toFixed(2)}h    ${sleepPeriodStats.min.toFixed(2)}h    ${sleepPeriodStats.max.toFixed(2)}h    ${sleepPeriodStats.p25.toFixed(2)}h    ${sleepPeriodStats.p75.toFixed(2)}h`);
    console.log(`醒来-醒来周期      ${wakePeriodStats.mean.toFixed(2)}h    ${wakePeriodStats.median.toFixed(2)}h    ${wakePeriodStats.stdDev.toFixed(2)}h    ${wakePeriodStats.min.toFixed(2)}h    ${wakePeriodStats.max.toFixed(2)}h    ${wakePeriodStats.p25.toFixed(2)}h    ${wakePeriodStats.p75.toFixed(2)}h`);
    console.log(`周期偏差(相对24h)  ${deviationStats.mean.toFixed(2)}h    ${deviationStats.median.toFixed(2)}h    ${deviationStats.stdDev.toFixed(2)}h    ${deviationStats.min.toFixed(2)}h    ${deviationStats.max.toFixed(2)}h    ${deviationStats.p25.toFixed(2)}h    ${deviationStats.p75.toFixed(2)}h`);
    
    console.log('\n📝 解读：');
    const avgPeriod = sleepPeriodStats.mean;
    if (avgPeriod > 24.2) {
        console.log(`  • 您的生物周期(${avgPeriod.toFixed(2)}h) 明显长于24小时，属于"夜猫子型"节律`);
        console.log(`  • 每天自然倾向于晚睡晚起约${(avgPeriod - 24).toFixed(2)}小时`);
    } else if (avgPeriod < 23.8) {
        console.log(`  • 您的生物周期(${avgPeriod.toFixed(2)}h) 短于24小时，属于"早起鸟型"节律`);
        console.log(`  • 每天自然倾向于早睡早起`);
    } else {
        console.log(`  • 您的生物周期(${avgPeriod.toFixed(2)}h) 接近24小时，属于标准节律型`);
    }
    console.log(`  • 周期波动标准差：${sleepPeriodStats.stdDev.toFixed(2)}小时，${sleepPeriodStats.stdDev < 1 ? '非常稳定' : sleepPeriodStats.stdDev < 2 ? '相对稳定' : '波动较大'}`);
    
    // 二、季节对生物周期的影响
    console.log('\n\n');
    console.log('='.repeat(110));
    console.log('二、生物周期的季节性变化分析');
    console.log('='.repeat(110));
    
    const seasonCycles = {};
    for (const c of bioCycles) {
        if (!seasonCycles[c.season]) seasonCycles[c.season] = [];
        seasonCycles[c.season].push(c);
    }
    
    console.log('\n🌍 季节周期统计：');
    console.log('-'.repeat(100));
    console.log('季节      记录数    平均周期    中位数     标准差     与24h差    相对变化    规律性');
    console.log('-'.repeat(100));
    
    const seasonStats = [];
    for (const season of ['春季', '夏季', '秋季', '冬季']) {
        if (seasonCycles[season]) {
            const cycles = seasonCycles[season];
            const periods = cycles.map(c => c.sleepToSleepHours);
            const stats = calculateStats(periods);
            const deviation = stats.mean - 24;
            const relativeChange = ((stats.mean - sleepPeriodStats.mean) / sleepPeriodStats.mean * 100);
            const regularity = stats.stdDev < 1 ? '⭐⭐⭐ 高' : stats.stdDev < 1.5 ? '⭐⭐ 中' : '⭐ 低';
            
            seasonStats.push({ season, stats, deviation, relativeChange, cycles });
            
            console.log(`${season.padEnd(6)}    ${String(cycles.length).padEnd(6)}  ${stats.mean.toFixed(2)}h     ${stats.median.toFixed(2)}h     ${stats.stdDev.toFixed(2)}h     ${(deviation >= 0 ? '+' : '').padEnd(4)}${deviation.toFixed(2)}h     ${(relativeChange >= 0 ? '+' : '').padEnd(4)}${relativeChange.toFixed(1)}%      ${regularity}`);
        }
    }
    
    // 找出季节差异
    const sortedByPeriod = [...seasonStats].sort((a, b) => b.stats.mean - a.stats.mean);
    console.log('\n🔍 季节差异分析：');
    console.log(`  • 周期最长的季节：${sortedByPeriod[0].season} (${sortedByPeriod[0].stats.mean.toFixed(2)}h)`);
    console.log(`  • 周期最短的季节：${sortedByPeriod[3].season} (${sortedByPeriod[3].stats.mean.toFixed(2)}h)`);
    console.log(`  • 季节间最大差异：${(sortedByPeriod[0].stats.mean - sortedByPeriod[3].stats.mean).toFixed(2)}小时`);
    
    // 三、月度生物节律分析
    console.log('\n\n');
    console.log('='.repeat(110));
    console.log('三、月度生物节律详细分析');
    console.log('='.repeat(110));
    
    const monthCycles = {};
    for (const c of bioCycles) {
        if (!monthCycles[c.month]) monthCycles[c.month] = [];
        monthCycles[c.month].push(c);
    }
    
    console.log('\n📅 月度周期统计：');
    console.log('-'.repeat(100));
    console.log('月份      记录数    平均周期    中位数     标准差     与24h差    相对年均    生物节律类型');
    console.log('-'.repeat(100));
    
    const monthStats = [];
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    for (let m = 1; m <= 12; m++) {
        if (monthCycles[m]) {
            const cycles = monthCycles[m];
            const periods = cycles.map(c => c.sleepToSleepHours);
            const stats = calculateStats(periods);
            const deviation = stats.mean - 24;
            const relativeToYear = stats.mean - sleepPeriodStats.mean;
            
            let rhythmType = '';
            if (stats.mean > 24.3) rhythmType = '🦉 夜猫子型';
            else if (stats.mean < 23.7) rhythmType = '🐦 早起鸟型';
            else rhythmType = '⚖️ 标准型';
            
            monthStats.push({ month: m, monthName: monthNames[m-1], stats, deviation, relativeToYear });
            
            console.log(`${monthNames[m-1].padEnd(6)}    ${String(cycles.length).padEnd(6)}  ${stats.mean.toFixed(2)}h     ${stats.median.toFixed(2)}h     ${stats.stdDev.toFixed(2)}h     ${(deviation >= 0 ? '+' : '').padEnd(4)}${deviation.toFixed(2)}h     ${(relativeToYear >= 0 ? '+' : '').padEnd(4)}${relativeToYear.toFixed(2)}h     ${rhythmType}`);
        }
    }
    
    // 找出月度极值
    const sortedMonths = [...monthStats].sort((a, b) => b.stats.mean - a.stats.mean);
    console.log('\n🌙 月度生物节律特征：');
    console.log(`  周期最长的月份 TOP 3：`);
    for (let i = 0; i < 3; i++) {
        const m = sortedMonths[i];
        console.log(`    ${i+1}. ${m.monthName}：${m.stats.mean.toFixed(2)}h (${m.deviation >= 0 ? '+' : ''}${m.deviation.toFixed(2)}h vs 24h)`);
    }
    console.log(`\n  周期最短的月份 TOP 3：`);
    for (let i = sortedMonths.length - 3; i < sortedMonths.length; i++) {
        const idx = i - (sortedMonths.length - 3) + 1;
        const m = sortedMonths[i];
        console.log(`    ${idx}. ${m.monthName}：${m.stats.mean.toFixed(2)}h (${m.deviation >= 0 ? '+' : ''}${m.deviation.toFixed(2)}h vs 24h)`);
    }
    
    // 四、清醒时间对比分析
    console.log('\n\n');
    console.log('='.repeat(110));
    console.log('四、清醒时间对比：24h假设 vs 实际生物周期');
    console.log('='.repeat(110));
    
    const awakeBioStats = calculateStats(bioCycles.map(c => c.awakeHoursBio));
    const awake24hStats = calculateStats(bioCycles.map(c => c.awakeHours24h));
    const difference = bioCycles.map(c => c.awakeHoursBio - c.awakeHours24h);
    const diffStats = calculateStats(difference);
    
    console.log('\n⏰ 清醒时间统计对比：');
    console.log('-'.repeat(80));
    console.log('计算方法            平均      中位数    标准差    最短      最长');
    console.log('-'.repeat(80));
    console.log(`24h假设法          ${awake24hStats.mean.toFixed(2)}h    ${awake24hStats.median.toFixed(2)}h    ${awake24hStats.stdDev.toFixed(2)}h    ${awake24hStats.min.toFixed(2)}h    ${awake24hStats.max.toFixed(2)}h`);
    console.log(`生物周期法         ${awakeBioStats.mean.toFixed(2)}h    ${awakeBioStats.median.toFixed(2)}h    ${awakeBioStats.stdDev.toFixed(2)}h    ${awakeBioStats.min.toFixed(2)}h    ${awakeBioStats.max.toFixed(2)}h`);
    console.log(`差异(生物-24h)     ${diffStats.mean.toFixed(2)}h    ${diffStats.median.toFixed(2)}h    ${diffStats.stdDev.toFixed(2)}h    ${diffStats.min.toFixed(2)}h    ${diffStats.max.toFixed(2)}h`);
    
    console.log('\n📊 解读：');
    const avgDiff = diffStats.mean;
    if (Math.abs(avgDiff) < 0.1) {
        console.log(`  • 两种方法差异很小(${avgDiff.toFixed(2)}h)，说明您的生物周期接近24小时`);
    } else if (avgDiff > 0) {
        console.log(`  • 生物周期法计算的清醒时间比24h法多${avgDiff.toFixed(2)}小时`);
        console.log(`  • 这意味着您的实际生物周期(${sleepPeriodStats.mean.toFixed(2)}h) > 24小时`);
        console.log(`  • 如果用24h法，会低估您的实际清醒时间`);
    } else {
        console.log(`  • 生物周期法计算的清醒时间比24h法少${Math.abs(avgDiff).toFixed(2)}小时`);
        console.log(`  • 这意味着您的实际生物周期(${sleepPeriodStats.mean.toFixed(2)}h) < 24小时`);
    }
    
    // 五、年度生物节律趋势
    console.log('\n\n');
    console.log('='.repeat(110));
    console.log('五、年度生物节律长期趋势 (2015-2026)');
    console.log('='.repeat(110));
    
    const yearCycles = {};
    for (const c of bioCycles) {
        if (!yearCycles[c.year]) yearCycles[c.year] = [];
        yearCycles[c.year].push(c);
    }
    
    console.log('\n📈 年度周期变化：');
    console.log('-'.repeat(95));
    console.log('年份      记录数    平均周期    中位数     标准差     与24h差    变化趋势    节律类型');
    console.log('-'.repeat(95));
    
    const years = Object.keys(yearCycles).sort();
    let prevPeriod = null;
    const yearTrendData = [];
    
    for (const year of years) {
        const cycles = yearCycles[year];
        const periods = cycles.map(c => c.sleepToSleepHours);
        const stats = calculateStats(periods);
        const deviation = stats.mean - 24;
        
        let trend = '';
        if (prevPeriod !== null) {
            const change = stats.mean - prevPeriod;
            if (change > 0.1) trend = '↑延长';
            else if (change < -0.1) trend = '↓缩短';
            else trend = '→稳定';
        }
        
        let rhythmType = '';
        if (stats.mean > 24.3) rhythmType = '🦉 夜猫子';
        else if (stats.mean < 23.7) rhythmType = '🐦 早起鸟';
        else rhythmType = '⚖️ 标准型';
        
        yearTrendData.push({ year: parseInt(year), stats, deviation });
        console.log(`${year.padEnd(6)}    ${String(cycles.length).padEnd(6)}  ${stats.mean.toFixed(2)}h     ${stats.median.toFixed(2)}h     ${stats.stdDev.toFixed(2)}h     ${(deviation >= 0 ? '+' : '').padEnd(4)}${deviation.toFixed(2)}h     ${trend.padEnd(6)}    ${rhythmType}`);
        
        prevPeriod = stats.mean;
    }
    
    // 计算长期趋势线
    const n = yearTrendData.length;
    const sumX = yearTrendData.reduce((s, y, i) => s + i, 0);
    const sumY = yearTrendData.reduce((s, y) => s + y.stats.mean, 0);
    const sumXY = yearTrendData.reduce((s, y, i) => s + i * y.stats.mean, 0);
    const sumXX = yearTrendData.reduce((s, y, i) => s + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    console.log('\n📉 长期趋势线：');
    console.log(`  方程：周期(h) = ${slope.toFixed(4)} × 年份序号 + ${intercept.toFixed(2)}`);
    console.log(`  趋势：每${slope > 0 ? '年延长' : '年缩短'} ${Math.abs(slope * 60).toFixed(1)} 分钟`);
    console.log(`  10年累计变化：${(slope * 10 * 60).toFixed(1)} 分钟`);
    
    if (Math.abs(slope) < 0.02) {
        console.log(`  📌 结论：生物周期非常稳定，10年间变化小于12分钟`);
    } else if (slope > 0) {
        console.log(`  📌 结论：生物周期逐渐延长，倾向于晚睡晚起`);
    } else {
        console.log(`  📌 结论：生物周期逐渐缩短，倾向于早睡早起`);
    }
    
    // 六、社会时差分析（工作日vs周末）
    console.log('\n\n');
    console.log('='.repeat(110));
    console.log('六、社会时差分析（工作日 vs 周末）');
    console.log('='.repeat(110));
    
    const weekdayCycles = bioCycles.filter(c => !c.isWeekend);
    const weekendCycles = bioCycles.filter(c => c.isWeekend);
    
    const weekdayPeriodStats = calculateStats(weekdayCycles.map(c => c.sleepToSleepHours));
    const weekendPeriodStats = calculateStats(weekendCycles.map(c => c.sleepToSleepHours));
    const weekdaySleepStats = calculateStats(weekdayCycles.map(c => c.sleepDurationHours));
    const weekendSleepStats = calculateStats(weekendCycles.map(c => c.sleepDurationHours));
    
    console.log('\n🏢 工作日 vs 🏖️ 周末对比：');
    console.log('-'.repeat(85));
    console.log('指标                工作日          周末            差异');
    console.log('-'.repeat(85));
    console.log(`平均周期           ${weekdayPeriodStats.mean.toFixed(2)}h        ${weekendPeriodStats.mean.toFixed(2)}h        ${(weekendPeriodStats.mean - weekdayPeriodStats.mean).toFixed(2)}h`);
    console.log(`周期标准差         ${weekdayPeriodStats.stdDev.toFixed(2)}h        ${weekendPeriodStats.stdDev.toFixed(2)}h        ${(weekendPeriodStats.stdDev - weekdayPeriodStats.stdDev).toFixed(2)}h`);
    console.log(`平均睡眠时间       ${weekdaySleepStats.mean.toFixed(2)}h        ${weekendSleepStats.mean.toFixed(2)}h        ${(weekendSleepStats.mean - weekdaySleepStats.mean).toFixed(2)}h`);
    console.log(`睡眠标准差         ${weekdaySleepStats.stdDev.toFixed(2)}h        ${weekendSleepStats.stdDev.toFixed(2)}h        ${(weekendSleepStats.stdDev - weekdaySleepStats.stdDev).toFixed(2)}h`);
    
    console.log('\n🔄 社会时差解读：');
    const socialJetlag = weekendPeriodStats.mean - weekdayPeriodStats.mean;
    if (Math.abs(socialJetlag) < 0.2) {
        console.log(`  • 社会时差很小(${socialJetlag.toFixed(2)}h)，说明您工作日和周末作息一致`);
        console.log(`  • 这是非常健康的作息模式，避免了"社交时差"的危害`);
    } else if (socialJetlag > 0) {
        console.log(`  • 周末周期比工作日长${socialJetlag.toFixed(2)}小时，存在正向社交时差`);
        console.log(`  • 说明您周末倾向于晚睡晚起，周一需要调整`);
        console.log(`  • 建议：尽量保持周末和工作日相似的作息`);
    } else {
        console.log(`  • 周末周期比工作日短${Math.abs(socialJetlag).toFixed(2)}小时，存在负向社交时差`);
        console.log(`  • 说明您周末反而起得更早`);
    }
    
    // 七、核心发现总结
    console.log('\n\n');
    console.log('='.repeat(110));
    console.log('七、核心发现与生物节律规律总结');
    console.log('='.repeat(110));
    
    console.log('\n🎯 关键发现：\n');
    
    // 1. 生物节律类型
    console.log('1️⃣ 生物节律类型判定：');
    if (sleepPeriodStats.mean > 24.2) {
        console.log(`   • 您的生物周期为 ${sleepPeriodStats.mean.toFixed(2)} 小时，明显长于24小时`);
        console.log(`   • 属于 🦉 "夜猫子型" (Delayed Sleep Phase)`);
        console.log(`   • 自然倾向：每天比前一天晚睡${(sleepPeriodStats.mean - 24).toFixed(2)} × 60 ≈ ${((sleepPeriodStats.mean - 24) * 60).toFixed(0)}分钟`);
    } else if (sleepPeriodStats.mean < 23.8) {
        console.log(`   • 您的生物周期为 ${sleepPeriodStats.mean.toFixed(2)} 小时，短于24小时`);
        console.log(`   • 属于 🐦 "早起鸟型" (Advanced Sleep Phase)`);
    } else {
        console.log(`   • 您的生物周期为 ${sleepPeriodStats.mean.toFixed(2)} 小时，接近24小时`);
        console.log(`   • 属于 ⚖️ "标准节律型"`);
    }
    
    // 2. 季节性规律
    console.log('\n2️⃣ 季节性生物节律规律：');
    const maxSeasonDiff = sortedByPeriod[0].stats.mean - sortedByPeriod[sortedByPeriod.length - 1].stats.mean;
    console.log(`   • 季节间最大周期差异：${maxSeasonDiff.toFixed(2)}小时`);
    console.log(`   • ${sortedByPeriod[0].season}周期最长(${sortedByPeriod[0].stats.mean.toFixed(2)}h)，可能是日照时间影响`);
    console.log(`   • ${sortedByPeriod[3].season}周期最短(${sortedByPeriod[3].stats.mean.toFixed(2)}h)，可能进入"节能模式"`);
    
    // 3. 长期趋势
    console.log('\n3️⃣ 10年长期趋势：');
    if (Math.abs(slope) < 0.01) {
        console.log(`   • 生物周期极其稳定，10年间几乎无变化`);
        console.log(`   • 说明您的生物钟非常强健，不受年龄/环境影响`);
    } else if (slope > 0) {
        console.log(`   • 生物周期在逐渐延长，每年增加${(slope * 60).toFixed(1)}分钟`);
        console.log(`   • 10年累计延长${(slope * 10 * 60).toFixed(1)}分钟`);
        console.log(`   • 可能原因：年龄增长、生活压力、电子设备使用增加`);
    } else {
        console.log(`   • 生物周期在逐渐缩短，每年减少${(Math.abs(slope) * 60).toFixed(1)}分钟`);
        console.log(`   • 10年累计缩短${(Math.abs(slope) * 10 * 60).toFixed(1)}分钟`);
        console.log(`   • 可能原因：健康意识提升、作息规律化`);
    }
    
    // 4. 社会时差
    console.log('\n4️⃣ 社会时差评估：');
    if (Math.abs(socialJetlag) < 0.3) {
        console.log(`   • ✅ 优秀！社会时差仅${Math.abs(socialJetlag).toFixed(2)}小时，避免了时差危害`);
        console.log(`   • 工作日和周末保持一致，有利于健康`);
    } else {
        console.log(`   • ⚠️ 社会时差${socialJetlag.toFixed(2)}小时，建议调整`);
        console.log(`   • 长期社交时差可能导致代谢问题和免疫力下降`);
    }
    
    // 5. 与24h假设的对比意义
    console.log('\n5️⃣ 科学分析的意义：');
    console.log(`   • 24小时假设法计算的清醒时间：${awake24hStats.mean.toFixed(2)}小时`);
    console.log(`   • 生物周期法计算的清醒时间：${awakeBioStats.mean.toFixed(2)}小时`);
    console.log(`   • 差异：${diffStats.mean.toFixed(2)}小时 (${(diffStats.mean / awake24hStats.mean * 100).toFixed(1)}%)`);
    console.log(`   • 结论：用实际生物周期计算更准确反映真实生理状态`);
    
    // 建议
    console.log('\n\n💡 个性化建议：\n');
    if (sleepPeriodStats.mean > 24.2) {
        console.log('   🦉 夜猫子型建议：');
        console.log('      • 您的自然节律比24小时长，不要强行要求自己和早起鸟一样');
        console.log('      • 如果可能，安排工作时间与您的生物节律匹配');
        console.log('      • 早上需要更多光照来帮助调整');
    } else if (sleepPeriodStats.mean < 23.8) {
        console.log('   🐦 早起鸟型建议：');
        console.log('      • 您的自然节律较短，适合早睡早起');
        console.log('      • 这是社会公认的理想作息模式，继续保持');
    } else {
        console.log('   ⚖️ 标准型建议：');
        console.log('      • 您的生物周期接近24小时，容易适应社会作息');
        console.log('      • 保持当前的作息规律即可');
    }
    
    console.log('\n   🌍 季节性调整建议：');
    console.log(`      • ${sortedByPeriod[0].season}注意：您的周期最长，可能需要更多自律才能按时起床`);
    console.log(`      • ${sortedByPeriod[3].season}优势：您的周期最短，自然倾向于早睡早起，适合养成好习惯`);
    
    console.log('\n' + '='.repeat(110));
    console.log('分析完成 - 基于真实生物周期长度的科学分析');
    console.log('='.repeat(110));
}

main();
