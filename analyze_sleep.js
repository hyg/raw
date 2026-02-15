#!/usr/bin/env node
/**
 * 分析睡眠日志，计算每天清醒时间
 * 清醒时间 = 下一天的入睡时间(sleep.time) - 当天的醒来时间(wake.time)
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const healthDir = './health';

// 星期名称
const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function parseDateTime(dtStr) {
    // 解析 YYYYMMDDHHMMSS 格式
    const year = parseInt(dtStr.substring(0, 4));
    const month = parseInt(dtStr.substring(4, 6)) - 1; // 0-based
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
        
        if (!data || !data.date) {
            return null;
        }
        
        const dateStr = String(data.date);
        
        // 获取睡眠和醒来时间
        let sleepTime = null;
        let wakeTime = null;
        
        if (data.sleep && data.sleep.time) {
            sleepTime = String(data.sleep.time);
        }
        
        if (data.wake && data.wake.time) {
            wakeTime = String(data.wake.time);
        }
        
        if (sleepTime && wakeTime && sleepTime.length >= 14 && wakeTime.length >= 14) {
            return {
                date: dateStr,
                sleepTime: sleepTime,
                wakeTime: wakeTime
            };
        }
        return null;
    } catch (e) {
        console.error(`Error loading ${filepath}: ${e.message}`);
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
    return weekdayNames[dt.getDay() === 0 ? 6 : dt.getDay() - 1]; // 调整为周一开头
}

function main() {
    // 获取所有日志文件
    const files = fs.readdirSync(healthDir)
        .filter(f => f.match(/^d\.\d{8}\.yaml$/))
        .map(f => path.join(healthDir, f))
        .sort();
    
    console.log(`找到 ${files.length} 个日志文件\n`);
    
    // 加载所有数据到一个对象，以日期为key
    const dataByDate = {};
    for (const filepath of files) {
        const record = loadSleepData(filepath);
        if (record) {
            dataByDate[record.date] = record;
        }
    }
    
    console.log(`成功加载 ${Object.keys(dataByDate).length} 条记录\n`);
    
    // 计算每天的清醒时间
    // 清醒时间 = 下一天的 sleep.time - 当天的 wake.time
    const dailyData = [];
    const dates = Object.keys(dataByDate).sort();
    
    for (let i = 0; i < dates.length - 1; i++) {
        const currentDate = dates[i];
        const nextDate = dates[i + 1];
        
        const currentRecord = dataByDate[currentDate];
        const nextRecord = dataByDate[nextDate];
        
        // 当天的醒来时间
        const wakeTime = currentRecord.wakeTime;
        // 下一天的入睡时间（即当天晚上的入睡时间）
        const sleepTime = nextRecord.sleepTime;
        
        const wakeDt = parseDateTime(wakeTime);
        const sleepDt = parseDateTime(sleepTime);
        
        // 计算清醒时间（小时）
        const awakeDurationMs = sleepDt - wakeDt;
        const awakeHours = awakeDurationMs / (1000 * 60 * 60);
        
        // 只记录合理的清醒时间（0-24小时）
        if (awakeHours >= 0 && awakeHours <= 24) {
            dailyData.push({
                date: currentDate,
                wakeTime: wakeTime,
                sleepTime: sleepTime,
                wakeFormatted: formatDateTime(wakeTime),
                sleepFormatted: formatDateTime(sleepTime),
                awakeHours: awakeHours,
                weekday: getWeekdayName(currentDate)
            });
        }
    }
    
    console.log(`有效清醒时间记录: ${dailyData.length} 条\n`);
    
    // 输出每天的清醒时间列表
    console.log('='.repeat(110));
    console.log('每天的清醒时间列表（从当天醒来到当天晚上入睡）');
    console.log('='.repeat(110));
    console.log('日期'.padEnd(12) + ' ' + '星期'.padEnd(6) + ' ' + '醒来时间'.padEnd(22) + ' ' + '入睡时间'.padEnd(22) + ' ' + '清醒小时数'.padStart(12));
    console.log('-'.repeat(110));
    
    for (const d of dailyData) {
        console.log(`${d.date.padEnd(12)} ${d.weekday.padEnd(6)} ${d.wakeFormatted.padEnd(22)} ${d.sleepFormatted.padEnd(22)} ${d.awakeHours.toFixed(2).padStart(10)}h`);
    }
    
    console.log();
    console.log('='.repeat(110));
    console.log('统计信息');
    console.log('='.repeat(110));
    
    // 基本统计
    const awakeHoursList = dailyData.map(d => d.awakeHours);
    const totalDays = dailyData.length;
    const avgAwake = awakeHoursList.reduce((a, b) => a + b, 0) / totalDays;
    const minAwake = Math.min(...awakeHoursList);
    const maxAwake = Math.max(...awakeHoursList);
    
    console.log(`总天数: ${totalDays}`);
    console.log(`平均清醒时间: ${avgAwake.toFixed(2)} 小时`);
    console.log(`最短清醒时间: ${minAwake.toFixed(2)} 小时`);
    console.log(`最长清醒时间: ${maxAwake.toFixed(2)} 小时`);
    
    // 找出最短和最长的记录
    const minRecord = dailyData.reduce((min, d) => d.awakeHours < min.awakeHours ? d : min);
    const maxRecord = dailyData.reduce((max, d) => d.awakeHours > max.awakeHours ? d : max);
    
    console.log(`\n最短清醒时间: ${minRecord.date} (${minRecord.weekday}) - ${minAwake.toFixed(2)}小时`);
    console.log(`  醒来: ${minRecord.wakeFormatted}, 入睡: ${minRecord.sleepFormatted}`);
    console.log(`\n最长清醒时间: ${maxRecord.date} (${maxRecord.weekday}) - ${maxAwake.toFixed(2)}小时`);
    console.log(`  醒来: ${maxRecord.wakeFormatted}, 入睡: ${maxRecord.sleepFormatted}`);
    
    console.log();
    console.log('='.repeat(110));
    console.log('按星期几分组统计');
    console.log('='.repeat(110));
    console.log('星期'.padEnd(8) + ' ' + '记录数'.padEnd(8) + ' ' + '平均清醒时间'.padEnd(18) + ' ' + '最短'.padEnd(12) + ' ' + '最长'.padEnd(12) + ' ' + '标准差'.padEnd(12));
    console.log('-'.repeat(110));
    
    // 按星期几分组
    const weekdayStats = {};
    for (const d of dailyData) {
        if (!weekdayStats[d.weekday]) {
            weekdayStats[d.weekday] = [];
        }
        weekdayStats[d.weekday].push(d.awakeHours);
    }
    
    for (const wd of weekdayNames) {
        if (weekdayStats[wd]) {
            const hours = weekdayStats[wd];
            const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
            const min = Math.min(...hours);
            const max = Math.max(...hours);
            // 计算标准差
            const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
            const stdDev = Math.sqrt(variance);
            console.log(`${wd.padEnd(8)} ${String(hours.length).padEnd(8)} ${avg.toFixed(2).padEnd(18)} ${min.toFixed(2).padEnd(12)} ${max.toFixed(2).padEnd(12)} ${stdDev.toFixed(2).padEnd(12)}`);
        }
    }
    
    console.log();
    console.log('='.repeat(110));
    console.log('数据覆盖的时间范围');
    console.log('='.repeat(110));
    
    const dateObjs = dailyData.map(d => {
        const year = parseInt(d.date.substring(0, 4));
        const month = parseInt(d.date.substring(4, 6)) - 1;
        const day = parseInt(d.date.substring(6, 8));
        return new Date(year, month, day);
    });
    
    const startDate = new Date(Math.min(...dateObjs));
    const endDate = new Date(Math.max(...dateObjs));
    const dateRange = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const coverage = (dailyData.length / dateRange) * 100;
    
    const formatDate = (d) => `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
    
    console.log(`开始日期: ${formatDate(startDate)} (${weekdayNames[startDate.getDay() === 0 ? 6 : startDate.getDay() - 1]})`);
    console.log(`结束日期: ${formatDate(endDate)} (${weekdayNames[endDate.getDay() === 0 ? 6 : endDate.getDay() - 1]})`);
    console.log(`时间跨度: ${dateRange} 天`);
    console.log(`有效记录: ${dailyData.length} 天`);
    console.log(`数据覆盖率: ${coverage.toFixed(1)}%`);
    
    console.log();
    console.log('='.repeat(110));
    console.log('清醒时间分布');
    console.log('='.repeat(110));
    
    const ranges = [
        [0, 12, "少于12小时"],
        [12, 14, "12-14小时"],
        [14, 16, "14-16小时"],
        [16, 18, "16-18小时"],
        [18, 20, "18-20小时"],
        [20, 100, "超过20小时"]
    ];
    
    for (const [min, max, label] of ranges) {
        const count = awakeHoursList.filter(h => h >= min && h < max).length;
        const percentage = (count / awakeHoursList.length) * 100;
        const bar = '█'.repeat(Math.floor(percentage / 2));
        console.log(`${label.padEnd(15)}: ${String(count).padStart(4)} 天 (${percentage.toFixed(1).padStart(5)}%) ${bar}`);
    }
    
    console.log();
    console.log('='.repeat(110));
    console.log('月度趋势统计（每月平均清醒时间）');
    console.log('='.repeat(110));
    
    // 按年月分组
    const monthlyStats = {};
    for (const d of dailyData) {
        const yearMonth = d.date.substring(0, 6); // YYYYMM
        if (!monthlyStats[yearMonth]) {
            monthlyStats[yearMonth] = [];
        }
        monthlyStats[yearMonth].push(d.awakeHours);
    }
    
    console.log('年月'.padEnd(10) + ' ' + '记录数'.padEnd(8) + ' ' + '平均清醒时间'.padEnd(15) + ' ' + '最短'.padEnd(10) + ' ' + '最长'.padEnd(10));
    console.log('-'.repeat(110));
    
    const sortedMonths = Object.keys(monthlyStats).sort();
    for (const ym of sortedMonths) {
        const hours = monthlyStats[ym];
        const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
        const min = Math.min(...hours);
        const max = Math.max(...hours);
        const year = ym.substring(0, 4);
        const month = ym.substring(4, 6);
        console.log(year + '年' + month + '月   ' + String(hours.length).padEnd(8) + ' ' + avg.toFixed(2).padEnd(15) + ' ' + min.toFixed(2).padEnd(10) + ' ' + max.toFixed(2).padEnd(10));
    }
}

main();
