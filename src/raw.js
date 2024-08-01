const food = require('./food.js');

const { Command } = require('commander');
var program = new Command();

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

const debug = false;
food.debug = debug;

program
    .name('raw')
    .description('个人领域的野生部分')
    .version('0.1.0');

const foodcommand = program
    .command('food')
    .description('饮食管理');

foodcommand
    .command("init <mode>")
    .description('初始化：绑定时间模版，创建日计划、次日规划、手稿及元数据文件。')
    .action((mode) => {
        log("init:", mode);
        var dayobj = food.makedayobj(mode);
        food.makedayplan(dayobj);
        food.maketomorrowinfo();
    });


foodcommand
    .command("test [data]")
    .description('测试新代码')
    .action((data) => {
        log("test:", data);
        var dayobj = food.loaddayobj();
        food.makedayplan(dayobj);
        food.maketomorrowinfo();
    });

program.parse();