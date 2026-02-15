#!/usr/bin/env node
/**
 * 深度分析睡眠日志 - 季节、月份、年度趋势分析
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const healthDir = './health';

// 星期名称
const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 季节定义
const seasons = {
    '春季': [3, 4, 5],
    '夏季': [6, 7, 8],
    '秋季': [9, 10, 11],
    '冬季': [12, 1, 2]
};

function parseDateTime(dtStr) {
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
            return { date: dateStr, sleepTime, wakeTime };
        }
        return null;
    } catch (e) {
        return null;
    }
}

function formatDateTime(dtStr) {
    const dt = parseDateTime(dtStr);
    return dt.toISOString().replace('T', ' ').substring(0, 19);
}

function getWeekdayName(dateStr) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const dt = new Date(year, month, day);
    return weekdayNames[dt.getDay() === 0 ? 6 : dt.getDay() - 1];
}

function getSeason(month) {
    for (const [season, months] of Object.entries(seasons)) {
        if (months.includes(month)) return season;
    }
    return '未知';
}

function calculateStats(values) {
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
    
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { mean, median, stdDev, min, max, count: n };
}

function main() {
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
    
    // 计算每天的清醒时间
    const dailyData = [];
    const dates = Object.keys(dataByDate).sort();
    
    for (let i = 0; i < dates.length - 1; i++) {
        const currentDate = dates[i];
        const nextDate = dates[i + 1];
        
        const wakeTime = dataByDate[currentDate].wakeTime;
        const sleepTime = dataByDate[nextDate].sleepTime;
        
        const wakeDt = parseDateTime(wakeTime);
        const sleepDt = parseDateTime(sleepTime);
        const awakeHours = (sleepDt - wakeDt) / (1000 * 60 * 60);
        
        if (awakeHours >= 0 && awakeHours <= 24) {
            const year = parseInt(currentDate.substring(0, 4));
            const month = parseInt(currentDate.substring(4, 6));
            
            dailyData.push({
                date: currentDate,
                awakeHours,
                year,
                month,
                season: getSeason(month),
                weekday: getWeekdayName(currentDate)
            });
        }
    }
    
    console.log('='.repeat(100));
    console.log('                    睡眠日志深度分析报告');
    console.log('='.repeat(100));
    console.log(`\n数据概览：共 ${dailyData.length} 天有效记录，时间跨度 ${dates[0]} 至 ${dates[dates.length-1]}\n`);
    
    const globalStats = calculateStats(dailyData.map(d => d.awakeHours));
    console.log('全局统计：');
    console.log(`  平均清醒时间：${globalStats.mean.toFixed(2)} 小时`);
    console.log(`  中位数：${globalStats.median.toFixed(2)} 小时`);
    console.log(`  标准差：${globalStats.stdDev.toFixed(2)} 小时`);
    console.log(`  范围：${globalStats.min.toFixed(2)} - ${globalStats.max.toFixed(2)} 小时\n`);
    
    // 按季节分析
    console.log('='.repeat(100));
    console.log('一、按季节分析');
    console.log('='.repeat(100));
    
    const seasonData = {};
    for (const d of dailyData) {
        if (!seasonData[d.season]) seasonData[d.season] = [];
        seasonData[d.season].push(d.awakeHours);
    }
    
    console.log('\n季节统计汇总：');
    console.log('-'.repeat(90));
    console.log('季节      记录天数    平均(小时)   中位数       标准差       最短        最长        与年均差');
    console.log('-'.repeat(90));
    
    for (const season of ['春季', '夏季', '秋季', '冬季']) {
        if (seasonData[season]) {
            const stats = calculateStats(seasonData[season]);
            const diff = stats.mean - globalStats.mean;
            console.log(`${season.padEnd(6)}    ${String(stats.count).padEnd(8)}  ${stats.mean.toFixed(2).padEnd(10)} ${stats.median.toFixed(2).padEnd(10)} ${stats.stdDev.toFixed(2).padEnd(10)} ${stats.min.toFixed(2).padEnd(10)} ${stats.max.toFixed(2).padEnd(10)} ${(diff >= 0 ? '+' : '').padEnd(4)}${diff.toFixed(2)}`);
        }
    }
    
    // 季节分布
    console.log('\n\n季节清醒时间分布：');
    console.log('-'.repeat(80));
    const ranges = [
        [0, 12, '<12小时'],
        [12, 14, '12-14h'],
        [14, 16, '14-16h'],
        [16, 18, '16-18h'],
        [18, 20, '18-20h'],
        [20, 24, '>20小时']
    ];
    
    console.log('季节      ' + ranges.map(r => r[2].padEnd(10)).join(' '));
    console.log('-'.repeat(80));
    
    for (const season of ['春季', '夏季', '秋季', '冬季']) {
        if (seasonData[season]) {
            const hours = seasonData[season];
            let row = season.padEnd(8);
            for (const [min, max, label] of ranges) {
                const count = hours.filter(h => h >= min && h < max).length;
                const pct = (count / hours.length * 100).toFixed(1);
                row += `  ${(count + '天/' + pct + '%').padEnd(10)}`;
            }
            console.log(row);
        }
    }
    
    // 按月份分析
    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('二、按月份详细分析');
    console.log('='.repeat(100));
    
    const monthData = {};
    for (const d of dailyData) {
        const key = d.month;
        if (!monthData[key]) monthData[key] = [];
        monthData[key].push(d.awakeHours);
    }
    
    console.log('\n月份统计详情：');
    console.log('-'.repeat(95));
    console.log('月份      记录天数    平均        中位数      标准差      最短       最长       与年均差    规律性');
    console.log('-'.repeat(95));
    
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    for (let m = 1; m <= 12; m++) {
        if (monthData[m]) {
            const stats = calculateStats(monthData[m]);
            const diff = stats.mean - globalStats.mean;
            const regularity = stats.stdDev < 2.5 ? '高' : stats.stdDev < 3.0 ? '中' : '低';
            console.log(`${monthNames[m-1].padEnd(6)}    ${String(stats.count).padEnd(8)}  ${stats.mean.toFixed(2).padEnd(8)}  ${stats.median.toFixed(2).padEnd(8)}  ${stats.stdDev.toFixed(2).padEnd(8)}  ${stats.min.toFixed(2).padEnd(7)}  ${stats.max.toFixed(2).padEnd(7)}  ${(diff >= 0 ? '+' : '').padEnd(4)}${diff.toFixed(2).padEnd(6)}  ${regularity}`);
        }
    }
    
    // 年度趋势分析
    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('三、年度趋势分析 (2015-2026)');
    console.log('='.repeat(100));
    
    const yearData = {};
    for (const d of dailyData) {
        if (!yearData[d.year]) yearData[d.year] = [];
        yearData[d.year].push(d.awakeHours);
    }
    
    console.log('\n年度统计：');
    console.log('-'.repeat(95));
    console.log('年份      记录天数    平均        中位数      标准差      最短       最长       变化趋势');
    console.log('-'.repeat(95));
    
    const years = Object.keys(yearData).sort();
    let prevMean = null;
    
    for (const year of years) {
        const stats = calculateStats(yearData[year]);
        let trend = '';
        if (prevMean !== null) {
            const change = stats.mean - prevMean;
            if (change > 0.3) trend = '↑上升';
            else if (change < -0.3) trend = '↓下降';
            else trend = '→平稳';
        }
        console.log(`${year.padEnd(6)}    ${String(stats.count).padEnd(8)}  ${stats.mean.toFixed(2).padEnd(8)}  ${stats.median.toFixed(2).padEnd(8)}  ${stats.stdDev.toFixed(2).padEnd(8)}  ${stats.min.toFixed(2).padEnd(7)}  ${stats.max.toFixed(2).padEnd(7)}  ${trend}`);
        prevMean = stats.mean;
    }
    
    // 找出最规律和最变化的年份
    console.log('\n\n年度规律性排名（按标准差，越小越规律）：');
    console.log('-'.repeat(50));
    const yearStats = years.map(year => ({
        year,
        stats: calculateStats(yearData[year])
    })).sort((a, b) => a.stats.stdDev - b.stats.stdDev);
    
    console.log('最规律的5年：');
    for (let i = 0; i < Math.min(5, yearStats.length); i++) {
        const y = yearStats[i];
        console.log(`  ${i+1}. ${y.year}年：标准差 ${y.stats.stdDev.toFixed(2)}，平均 ${y.stats.mean.toFixed(2)}小时`);
    }
    
    console.log('\n变化最大的5年：');
    for (let i = yearStats.length - 1; i >= Math.max(0, yearStats.length - 5); i--) {
        const idx = yearStats.length - i;
        const y = yearStats[i];
        console.log(`  ${idx}. ${y.year}年：标准差 ${y.stats.stdDev.toFixed(2)}，平均 ${y.stats.mean.toFixed(2)}小时`);
    }
    
    // 长期趋势分析
    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('四、长期趋势分析');
    console.log('='.repeat(100));
    
    // 计算线性趋势
    const yearMeans = years.map((year, idx) => ({
        year: parseInt(year),
        idx,
        mean: calculateStats(yearData[year]).mean
    }));
    
    const n = yearMeans.length;
    const sumX = yearMeans.reduce((s, y) => s + y.idx, 0);
    const sumY = yearMeans.reduce((s, y) => s + y.mean, 0);
    const sumXY = yearMeans.reduce((s, y) => s + y.idx * y.mean, 0);
    const sumXX = yearMeans.reduce((s, y) => s + y.idx * y.idx, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    console.log('\n长期趋势线方程：Y = ' + slope.toFixed(4) + ' * X + ' + intercept.toFixed(2));
    console.log(`趋势解读：每年清醒时间${slope > 0 ? '增加' : '减少'} ${Math.abs(slope).toFixed(4)} 小时`);
    console.log(`10年累计变化：${(slope * 10).toFixed(2)} 小时`);
    
    // 分阶段分析
    console.log('\n\n阶段分析：');
    const earlyYears = years.slice(0, 3);
    const midYears = years.slice(Math.floor(years.length/2) - 1, Math.floor(years.length/2) + 2);
    const lateYears = years.slice(-3);
    
    const earlyAvg = earlyYears.reduce((s, y) => s + calculateStats(yearData[y]).mean, 0) / earlyYears.length;
    const midAvg = midYears.reduce((s, y) => s + calculateStats(yearData[y]).mean, 0) / midYears.length;
    const lateAvg = lateYears.reduce((s, y) => s + calculateStats(yearData[y]).mean, 0) / lateYears.length;
    
    console.log(`早期 (${earlyYears[0]}-${earlyYears[earlyYears.length-1]})：平均 ${earlyAvg.toFixed(2)} 小时`);
    console.log(`中期 (${midYears[0]}-${midYears[midYears.length-1]})：平均 ${midAvg.toFixed(2)} 小时`);
    console.log(`近期 (${lateYears[0]}-${lateYears[lateYears.length-1]})：平均 ${lateAvg.toFixed(2)} 小时`);
    
    // 季节性规律总结
    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('五、季节性规律发现');
    console.log('='.repeat(100));
    
    console.log('\n📊 季节对比分析：\n');
    
    // 找出每个季节的特征
    const seasonOrder = ['春季', '夏季', '秋季', '冬季'];
    const seasonStats = seasonOrder.map(s => ({
        season: s,
        stats: calculateStats(seasonData[s] || [])
    }));
    
    // 按平均值排序
    const sortedByMean = [...seasonStats].sort((a, b) => b.stats.mean - a.stats.mean);
    console.log('清醒时间最长的季节：');
    sortedByMean.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.season}：${s.stats.mean.toFixed(2)} 小时 (${s.stats.count}天)`);
    });
    
    // 按规律性排序
    const sortedByStd = [...seasonStats].sort((a, b) => a.stats.stdDev - b.stats.stdDev);
    console.log('\n作息最规律的季节（按标准差）：');
    sortedByStd.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.season}：标准差 ${s.stats.stdDev.toFixed(2)} 小时`);
    });
    
    // 月度极值分析
    console.log('\n\n📅 月份特征分析：\n');
    
    const monthStats = [];
    for (let m = 1; m <= 12; m++) {
        if (monthData[m]) {
            monthStats.push({
                month: m,
                monthName: monthNames[m-1],
                stats: calculateStats(monthData[m])
            });
        }
    }
    
    const sortedMonths = [...monthStats].sort((a, b) => b.stats.mean - a.stats.mean);
    console.log('清醒时间最长的月份 TOP 3：');
    for (let i = 0; i < 3; i++) {
        const m = sortedMonths[i];
        console.log(`  ${i+1}. ${m.monthName}：${m.stats.mean.toFixed(2)} 小时，中位数 ${m.stats.median.toFixed(2)} 小时`);
    }
    
    console.log('\n清醒时间最短的月份 TOP 3：');
    for (let i = sortedMonths.length - 3; i < sortedMonths.length; i++) {
        const idx = i - (sortedMonths.length - 3) + 1;
        const m = sortedMonths[i];
        console.log(`  ${idx}. ${m.monthName}：${m.stats.mean.toFixed(2)} 小时，中位数 ${m.stats.median.toFixed(2)} 小时`);
    }
    
    // 规律总结
    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('六、核心发现与规律总结');
    console.log('='.repeat(100));
    
    console.log('\n🎯 主要发现：\n');
    
    // 1. 季节差异
    const maxSeasonDiff = sortedByMean[0].stats.mean - sortedByMean[sortedByMean.length - 1].stats.mean;
    console.log(`1. 季节差异显著：最长与最短季节相差 ${maxSeasonDiff.toFixed(2)} 小时`);
    console.log(`   - ${sortedByMean[0].season}清醒时间最长 (${sortedByMean[0].stats.mean.toFixed(2)}h)`);
    console.log(`   - ${sortedByMean[sortedByMean.length-1].season}清醒时间最短 (${sortedByMean[sortedByMean.length-1].stats.mean.toFixed(2)}h)`);
    
    // 2. 年度趋势
    console.log(`\n2. 长期趋势：10年间清醒时间${slope > 0 ? '增加' : '减少'}了 ${Math.abs(slope * 10).toFixed(2)} 小时`);
    if (Math.abs(slope * 10) < 1) {
        console.log('   - 整体作息非常稳定，变化幅度小于1小时');
    } else if (slope < 0) {
        console.log('   - 呈现早睡早起的趋势，可能是作息逐渐规律化');
    } else {
        console.log('   - 清醒时间略微增加，可能有熬夜增多的情况');
    }
    
    // 3. 规律性
    console.log(`\n3. 规律性分析：整体标准差 ${globalStats.stdDev.toFixed(2)} 小时`);
    console.log(`   - ${yearStats.filter(y => y.stats.stdDev < 2.5).length} 个年份作息非常规律（标准差<2.5）`);
    console.log(`   - ${yearStats.filter(y => y.stats.stdDev >= 3.0).length} 个年份作息波动较大（标准差≥3.0）`);
    
    // 4. 月份规律
    const monthlyDiff = sortedMonths[0].stats.mean - sortedMonths[sortedMonths.length-1].stats.mean;
    console.log(`\n4. 月度规律：不同月份清醒时间相差 ${monthlyDiff.toFixed(2)} 小时`);
    
    // 5. 建议
    console.log('\n\n💡 建议：');
    console.log('   - 继续保持规律的作息习惯');
    if (slope < -0.1) {
        console.log('   - 注意避免过度缩短清醒时间，保持充足的活动时间');
    } else if (slope > 0.1) {
        console.log('   - 注意控制清醒时间，确保充足的睡眠');
    } else {
        console.log('   - 当前作息模式健康稳定，继续保持');
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('分析完成');
    console.log('='.repeat(100));
}

main();
