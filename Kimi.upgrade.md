# 项目代码和文档改进建议

## 一、架构设计层面

### 1. 数据存储架构重构

**现状分析：**
- 食物数据使用 YAML 文件存储（d.YYYYMMDD.yaml），10 年积累超过 3500 个文件
- 食材营养成分数据使用独立的 e.*.yaml 文件
- NRV 配置分散在多个版本文件中（NRV.1750.yaml ~ NRV.2050.yaml）

**问题：**
- 文件系统 I/O 开销大，尤其在做年度统计时
- 无法支持复杂查询（如：查询某段时间内某种营养素的摄入趋势）
- 缺乏事务性，数据一致性难以保证
- 备份和同步效率低下

**建议方案：**

```yaml
# 方案A：SQLite + 文件混合存储
数据库:
  - 存储: 日常记录（food_log, health_log）
  - 优势: 查询高效，支持复杂分析
  
YAML文件:
  - 存储: 食材营养成分定义、NRV配置
  - 优势: 人工可读，版本控制友好

# 方案B：时间序列数据库（如 InfluxDB）
适用场景:
  - 健康数据具有明显的时序特征
  - 支持按时间聚合查询
  - 适合长期趋势分析
```

### 2. 业务逻辑分层

**当前问题：**
raw.js 中数据加载、统计计算、报告生成、文件操作全部混杂在一起。

**建议分层架构：**

```
src/
├── core/
│   ├── data-loader.js      # 数据加载层
│   ├── calculator.js       # 营养计算引擎
│   └── validator.js        # 数据验证
├── models/
│   ├── FoodLog.js          # 食物日志模型
│   ├── HealthLog.js        # 健康日志模型
│   └── FoodElement.js      # 食材成分模型
├── services/
│   ├── report-service.js   # 报告生成服务
│   ├── plan-service.js     # 计划生成服务
│   └── sync-service.js     # 数据同步服务
├── adapters/
│   ├── yaml-adapter.js     # YAML 文件适配器
│   ├── database-adapter.js # 数据库适配器
│   └── r-script-adapter.js # R 脚本生成器
└── cli/
    └── commands/           # 命令行接口
```

## 二、数据模型优化

### 1. YAML Schema 标准化

**当前食物日志格式：**
```yaml
date: 20150401
food:
- time: 20150401062500
  name: 杂粮粥
  amount: 40
  unit: g
```

**改进建议：**
```yaml
# 使用 JSON Schema 定义数据结构
$schema: "http://json-schema.org/draft-07/schema#"
title: FoodLog
type: object
required:
  - date
  - version
properties:
  date:
    type: string
    pattern: "^\\d{8}$"
  version:
    type: string
    enum: ["2.0"]
  meals:
    type: array
    items:
      type: object
      properties:
        time:
          type: string
          pattern: "^\\d{14}$"
        items:
          type: array
          items:
            type: object
            properties:
              food_id:    # 使用ID而非名称，避免歧义
                type: string
              amount:
                type: number
                minimum: 0
              unit:
                type: string
                enum: [g, mg, μg, ml, L]
```

### 2. 营养成分数据库规范化

**建议创建统一的食材数据库：**

```yaml
# food-database.yaml
schema_version: "2.0"
last_updated: "2024-01-15"

foods:
  F001:
    name: 黑豆粉
    category: 豆制品
    elements_per_100g:
      热量: { amount: 447, unit: kcal }
      蛋白质: { amount: 28.9, unit: g }
      # ...
    aliases: [黑豆粉末, black bean powder]  # 支持多种名称
    source: 中国食物成分表2023
    
  F002:
    name: 杂粮粥
    category: 复合食物
    recipe:  # 支持递归定义
      - { food_id: F003, ratio: 0.3 }
      - { food_id: F004, ratio: 0.2 }
      - { food_id: F005, ratio: 0.5 }
```

## 三、代码质量提升

### 1. 单元换算系统重构

**当前实现的问题：**
```javascript
// 手动维护的换算矩阵，容易出错
var fRate = {
  ng: { μg: 0.001, mg: 0.001 * 0.001, ... },
  // 需要维护 n*(n-1) 个换算关系
};
```

**建议方案：**
```javascript
// 使用基准单位模式
const BASE_UNIT = {
  mass: 'g',
  volume: 'ml', 
  energy: 'kcal'
};

const UNIT_RATIOS = {
  mass: {
    ng: 1e-9,
    μg: 1e-6,
    mg: 1e-3,
    g: 1,
    kg: 1e3
  },
  volume: {
    ul: 1e-3,
    ml: 1,
    L: 1e3
  },
  energy: {
    cal: 1,
    kcal: 1e3,
    kj: 238.9
  }
};

// 统一换算函数
function convert(value, fromUnit, toUnit, dimension) {
  const ratios = UNIT_RATIOS[dimension];
  return value * ratios[fromUnit] / ratios[toUnit];
}
```

### 2. 报告生成模板化

**当前实现：**
```javascript
// 字符串拼接方式，难以维护
var wstr = d + "\r\n" + w1 + "\r\n" + 
  'plot(c(1:' + cnt + '),weight1,type="s",...)';
```

**建议方案：**
```javascript
// 使用模板引擎
const R_TEMPLATE = `
# 自动生成于 {{generated_at}}

date <- c({{dates}})
weight1 <- c({{weights_before}})
weight2 <- c({{weights_after}})

opar <- par(mar = c(5,4,4,5))
plot(c(1:{{count}}), weight1, type="s", col="red",
     xaxt="n", xlab="date", ylab="weight(kg)",
     ylim=range({{ymin}}:{{ymax}}))
lines(c(1:{{count}}), weight2, type="s", col="blue")
`;

function generateRScript(data) {
  return Mustache.render(R_TEMPLATE, {
    dates: data.dates.map(d => `"${d}"`).join(','),
    weights_before: data.weightsBefore.join(','),
    // ...
  });
}
```

## 四、功能增强建议

### 1. 智能营养建议系统

```javascript
// 基于历史数据的营养缺口分析
class NutritionAdvisor {
  analyzeDeficits(dateRange) {
    const stats = this.calculateStats(dateRange);
    const deficits = [];
    
    for (const [element, target] of Object.entries(this.targets)) {
      const actual = stats[element]?.avg || 0;
      if (actual < target * 0.8) {
        deficits.push({
          element,
          current: actual,
          target,
          gap: target - actual,
          suggestions: this.findFoodsRichIn(element)
        });
      }
    }
    
    return deficits;
  }
}
```

### 2. 食物相似性推荐

```javascript
// 基于营养成分的相似度计算
function calculateFoodSimilarity(food1, food2) {
  const elements1 = food1.elements;
  const elements2 = food2.elements;
  
  // 使用余弦相似度
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const element of Object.keys(elements1)) {
    const v1 = elements1[element]?.amount || 0;
    const v2 = elements2[element]?.amount || 0;
    
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}
```

## 五、DevOps 改进

### 1. 自动化测试体系

```javascript
// test/food-calculator.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { calculateNutrition } = require('../src/calculator');

describe('营养计算', () => {
  test('基础食材计算', () => {
    const food = { name: '鸡蛋', amount: 100, unit: 'g' };
    const result = calculateNutrition(food);
    
    assert.strictEqual(result['蛋白质'].amount, 13.3);
    assert.strictEqual(result['脂肪'].amount, 8.8);
  });
  
  test('复合食物递归计算', () => {
    const compositeFood = {
      name: '杂粮粥',
      recipe: [
        { name: '大米', amount: 50, unit: 'g' },
        { name: '小米', amount: 30, unit: 'g' }
      ]
    };
    
    const result = calculateNutrition(compositeFood);
    // 验证递归展开正确
  });
  
  test('单位换算', () => {
    const food = { name: '牛奶', amount: 250, unit: 'ml' };
    const result = calculateNutrition(food);
    // 验证体积到质量的换算
  });
});
```

### 2. CI/CD 配置

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Lint code
        run: npm run lint
        
      - name: Validate YAML schemas
        run: npm run validate-yaml
        
      - name: Generate coverage report
        run: npm run coverage
```

## 六、文档体系重构

### 1. 文档结构建议

```
docs/
├── README.md                 # 项目简介和快速开始
├── ARCHITECTURE.md           # 架构设计文档
├── DATA_MODEL.md             # 数据模型文档
├── API.md                    # API 文档
├── USER_GUIDE.md             # 用户指南
├── DEVELOPMENT.md            # 开发指南
└── CHANGELOG.md              # 变更日志
```

### 2. 自动化文档生成

```javascript
// scripts/generate-docs.js
const jsdoc2md = require('jsdoc-to-markdown');
const fs = require('fs');

async function generateAPIDocs() {
  const docs = await jsdoc2md.render({
    files: 'src/**/*.js',
    template: './docs/templates/api.hbs'
  });
  
  fs.writeFileSync('./docs/API.md', docs);
}

// 从 YAML Schema 生成数据模型文档
function generateDataModelDocs() {
  const schema = yaml.load(fs.readFileSync('./schemas/food-log.yaml'));
  const markdown = generateMarkdownFromSchema(schema);
  fs.writeFileSync('./docs/DATA_MODEL.md', markdown);
}
```

## 七、具体文件改进清单

### README.md
- [ ] 添加项目徽章（构建状态、版本号等）
- [ ] 提供快速开始指南（Quick Start）
- [ ] 添加功能截图或示例输出
- [ ] 明确系统依赖（Node.js 版本、R 环境等）

### package.json
- [ ] 添加 `engines` 字段指定 Node.js 版本
- [ ] 添加测试、lint、format 脚本
- [ ] 添加 `keywords` 和 `repository` 信息
- [ ] 分离 `dependencies` 和 `devDependencies`

### .gitignore
- [ ] 移除对 `package.json` 的忽略
- [ ] 添加 `.env`、日志文件、临时文件
- [ ] 添加 IDE 配置文件

### last.bat
- [ ] 替换为跨平台的 Node.js 脚本
- [ ] 添加参数验证和错误处理
- [ ] 添加备份机制（复制前创建备份）
- [ ] 添加日志记录

### raw.js
- [ ] 提取配置到独立文件
- [ ] 使用 async/await 替代回调
- [ ] 添加输入验证中间件
- [ ] 实现日志分级（info/warn/error）
- [ ] 提取 R 脚本模板

## 八、渐进式迁移计划

### 第一阶段：代码整理（1-2周）
1. 添加 ESLint + Prettier 配置
2. 清理注释代码
3. 修复明显的 bug 和拼写错误
4. 添加基础单元测试

### 第二阶段：数据层抽象（2-3周）
1. 创建数据加载器抽象层
2. 实现 YAML 适配器
3. 编写数据迁移脚本
4. 保持向后兼容性

### 第三阶段：功能增强（3-4周）
1. 实现 SQLite 存储选项
2. 开发 Web API
3. 创建可视化仪表盘
4. 添加智能分析功能

### 第四阶段：现代化改造（持续）
1. TypeScript 迁移
2. 微服务架构拆分
3. 移动端应用开发
4. 云同步功能

---

**优先级矩阵：**

| 改进项 | 影响 | 工作量 | 优先级 |
|--------|------|--------|--------|
| 数据库迁移 | 高 | 高 | P1 |
| 代码模块化 | 高 | 中 | P1 |
| 单元测试 | 高 | 中 | P1 |
| CI/CD | 中 | 低 | P2 |
| 文档重构 | 中 | 中 | P2 |
| TypeScript | 中 | 高 | P3 |
| Web 界面 | 低 | 高 | P3 |
