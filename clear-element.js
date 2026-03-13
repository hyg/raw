#!/usr/bin/env node
/**
 * 遍历 food/e.*.yaml 文件
 * 将 element 字段中指定的 item 移到 comment 字段下
 * 
 * 用法：node clear-element.js <元素名称>
 * 示例：node clear-element.js 胆固醇
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const FOOD_DIR = path.join(__dirname, 'food');

// 获取命令行参数
const itemName = process.argv[2];

if (!itemName) {
  console.error('用法：node clear-element.js <元素名称>');
  console.error('示例：node clear-element.js 胆固醇');
  process.exit(1);
}

/**
 * 获取所有 e.*.yaml 文件
 */
function getTargetFiles() {
  const files = fs.readdirSync(FOOD_DIR);
  return files
    .filter(f => /^e\..+\.yaml$/.test(f))
    .map(f => path.join(FOOD_DIR, f));
}

/**
 * 处理单个文件
 * @param {string} filePath - 文件路径
 * @param {string} itemName - 要移动的元素名称
 * @returns {boolean} - 是否进行了修改
 */
function processFile(filePath, itemName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(content);

  if (!data || !data.element) {
    return false;
  }

  // 检查 element 中是否有指定元素
  if (!data.element[itemName]) {
    return false;
  }

  // 提取元素数据
  const itemData = data.element[itemName];

  // 从 element 中删除
  delete data.element[itemName];

  // 添加到 comment 字段
  if (!data.comment) {
    data.comment = {};
  }
  data.comment[itemName] = itemData;

  // 写回文件
  const newYaml = yaml.dump(data, {
    indent: 2,
    lineWidth: -1, // 不限制行宽
    noRefs: true,  // 不使用引用
    quotingType: '"',
    forceQuotes: false,
  });

  fs.writeFileSync(filePath, newYaml, 'utf8');
  return true;
}

/**
 * 主函数
 */
function main() {
  const files = getTargetFiles();
  console.log(`找到 ${files.length} 个 e.*.yaml 文件`);

  let modifiedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const modified = processFile(file, itemName);
      if (modified) {
        modifiedCount++;
        console.log(`已修改：${path.basename(file)}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`处理失败 ${path.basename(file)}: ${err.message}`);
    }
  }

  console.log(`\n完成！`);
  console.log(`  修改：${modifiedCount} 个文件`);
  console.log(`  失败：${errorCount} 个文件`);
}

// 检查 js-yaml 是否安装
try {
  require.resolve('js-yaml');
} catch (e) {
  console.error('错误：需要安装 js-yaml 模块');
  console.error('请运行：npm install js-yaml');
  process.exit(1);
}

main();
