var fs = require('fs');
var yaml = require('js-yaml');
var os = require('os');
var child = require('child_process');
const { report } = require('process');
var convert = require('convert-units');
//const { markAsUntransferable } = require('worker_threads');

// log and basic data
var fmap = new Object();    // food log
var emap = new Object();    // element data
var hmap = new Object();    // health log

// NRV and DRIs dataset
var NRVfilename = "food/NRV.202409a.yaml";

// Statistics period
var daycnt = 0;
var startdate, enddate;
// Statistics report
var etable = new Object();  // element data
var ftable = new Object();  // food data
// element detail tables
//const Keyelement = "热量";
//const Keyelement = "蛋白质";
//const Keyelement = "脂肪";
//const Keyelement = "碳水化合物";
//const Keyelement = "钠";
//const Keyelement = "膳食纤维";
//const Keyelement = "钙";
//const Keyelement = "VC(抗坏血酸)";
//const Keyelement = "VA(视黄醇等)";
//const Keyelement = "VD3(胆钙化醇)";
//const Keyelement = "VB12(钴胺素)";
//const Keyelement = "VB1(硫胺素)";
//const Keyelement = "胆固醇";
//const Keyelement = "钒";

var keycnt = 1;
var Detailtable = new Object();
//var caloriesTable = new Object(); 
//var ProteinTable = new Object(); 
//var FatTable = new Object(); 
//var CarbohydrateTable = new Object(); 
//var SodiumTable  = new Object(); 
//var DietaryFiberTable = new Object();
//var CalciumTable = new Object();

//换算率
var fRate = {
    ng: { ng: 1, μg: 0.001, mg: 0.001 * 0.001, g: 0.001 * 0.001 * 0.001, kg: 0.001 * 0.001 * 0.001 * 0.001, t: 0.001 * 0.001 * 0.001 * 0.001 * 0.001, ul: 0.001 * 0.001, ml: 0.001 * 0.001 * 0.001, L: 0.001 * 0.001 * 0.001 * 0.001 },
    μg: { ng: 1000, μg: 1, mg: 0.001, g: 0.001 * 0.001, kg: 0.001 * 0.001 * 0.001, t: 0.001 * 0.001 * 0.001 * 0.001, ul: 0.001, ml: 0.001 * 0.001, L: 0.001 * 0.001 * 0.001 },
    mg: { ng: 1000 * 1000, 'μg': 1000, mg: 1, g: 0.001, kg: 0.001 * 0.001, t: 0.001 * 0.001 * 0.001, ul: 1, ml: 0.001, L: 0.001 * 0.001 },
    g: { ng: 1000 * 1000 * 1000, μg: 1000 * 1000, mg: 1000, g: 1, kg: 0.001, t: 0.001 * 0.001, ul: 1000, ml: 1, L: 0.001 },
    kg: { ng: 1000 * 1000 * 1000 * 1000, μg: 1000 * 1000, mg: 1000, g: 1000, kg: 1, t: 0.001, ul: 1000 * 1000, ml: 1000, L: 1 },
    t: { ng: 1000 * 1000 * 1000 * 1000 * 1000, μg: 1000 * 1000 * 1000, mg: 1000 * 1000, g: 1000 * 1000, kg: 1000, t: 1, ul: 1000 * 1000 * 1000, ml: 1000 * 1000, L: 1000 },
    ml: { ng: 1000 * 1000 * 1000, μg: 1000 * 1000, mg: 1000, g: 1, kg: 0.001, t: 0.001 * 0.001, ul: 1000, ml: 1, L: 0.001 },
    ul: { ng: 1000 * 1000, μg: 1000, ml: 1, g: 0.001, kg: 0.001 * 0.001, t: 0.001 * 0.001 * 0.001, ul: 1, ml: 0.001, L: 0.001 * 0.001 },
    L: { ng: 1000 * 1000 * 1000 * 1000, μg: 1000 * 1000, mg: 1000, g: 1000, kg: 1, t: 0.001, ul: 1000 * 1000, ml: 1000, L: 1 },
    kcal: { cal: 1000, kcal: 1, kj: 4.18 },
    kj: { cal: 238.9, kcal: 0.2389, kj: 1 }
};

const helpstr = `unkonw mode...
year mode: "node raw 2023"
month mode: "node raw 202304"
day mode: "node raw 20230410"
diff day mode:  "node raw -1"
period mode: "node raw 20230101 20230331"
today mode: "node raw"
plan mode: "node raw plan 15"`;
// read the arguments
var arguments = process.argv.splice(2);
if (arguments.length > 0) {
    if ((arguments.length == 1) & (arguments[0].length == 4)) {
        // year mode: "node raw 2023"
        startdate = arguments[0] + "0101";
        enddate = arguments[0] + "1231";
        loadmap();
        foodyearlog(arguments[0]);
        //showtables();
        maketable();
        makeRfile();
    } else if ((arguments.length == 1) & (arguments[0].length == 6)) {
        // month mode: "node raw 202304"
        //startdate = arguments[0]+"01";
        foodmonthreport(arguments[0]);

    } else if ((arguments.length == 1) & (arguments[0].length == 8)) {
        // day mode:"node raw 20230410"
        startdate = arguments[0];
        enddate = arguments[0];
        loadmap();
        fooddaylog(arguments[0]);
        //showtables();
        maketable();
        //makeRfile();
    } else if ((arguments.length == 1) & (arguments[0].length != 8) & (!isNaN(arguments[0]))) {
        // diff day mode:"node raw -1"
        var diff = parseInt(arguments[0]);

        startdate = datestr(diff);
        enddate = datestr(diff);
        //console.log("diff day mode. diff="+diff,startdate,enddate);
        loadmap();
        fooddaylog(datestr(diff));
        //showtables();
        maketable();
        //makeRfile();
    } else if ((arguments.length == 2) && (arguments[0] == "plan")) {
        // plan mode: "node raw plan 15"
        var long = parseInt(arguments[1]);
        startdate = "20150401";
        enddate = datestr(-364 + long);
        loadmap();
        makeplan(long);

    } else if ((arguments.length == 2) && (arguments[0].length == 8) && (arguments[1].length == 8)) {
        // period mode:"node raw 20230101 20230331"
        startdate = arguments[0];
        enddate = arguments[1];
        loadmap();
        foodperiodlog(startdate, enddate);
        //showtables();
        maketable();
        makeRfile();
    } else {
        console.log(helpstr);
        process.exit();
    }
} else {
    // today mode:"node raw"
    startdate = datestr();
    enddate = datestr();
    loadmap();
    fooddaylog(datestr());
    //showtables();
    maketable();
    //makeRfile();
}


// loaf element data
// load log between given period
function loadmap() {
    var startfilename = "d." + startdate + ".yaml";
    var endfilename = "d." + enddate + ".yaml";

    // d.file is daily log.
    // e.file is food data.
    // food -> element
    // food -> food
    try {
        fs.readdirSync("food").forEach(file => {
            if (file.substr(0, 2) == "d.") {
                if ((file >= startfilename) & (file <= endfilename)) {
                    f = yaml.load(fs.readFileSync("food/" + file, 'utf8'));
                    fmap[f.date] = f;
                }
            }
            if (file.substr(0, 2) == "e.") {
                e = yaml.load(fs.readFileSync("food/" + file, 'utf8'));
                emap[e.name] = e;
            }
        });

        fs.readdirSync("health").forEach(file => {
            if (file.substr(0, 2) == "d.") {
                if ((file >= startfilename) & (file <= endfilename)) {
                    h = yaml.load(fs.readFileSync("health/" + file, 'utf8'));
                    //if(!h.wake.weight) {console.log("can find wake data"+h.date);}
                    hmap[h.date] = h;
                }
            }
        });
    } catch (e) {
        // failure
        console.log("yaml read error！" + e);
    }

    /*     var sortelement = "膳食纤维";
        let keysSorted = Object.keys(emap).sort(function (a, b) { return ((emap[b].element== null)?0:((emap[b].element[sortelement]== null)?0:emap[b].element[sortelement].amount)) - ((emap[a].element==null)?0:((emap[a].element[sortelement]== null)?0:emap[a].element[sortelement].amount))});
    
        for (var j = 0; j < keysSorted.length; j++) {
            //console.log("makeplan() > keysSorted[%d]: %s",j,keysSorted[j]);
            var food = emap[keysSorted[j]];
            console.log("%d:%s\t%d%s/%f%s",j,keysSorted[j],((emap[keysSorted[j]].element== null)?0:((emap[keysSorted[j]].element[sortelement]== null)?0:emap[keysSorted[j]].element[sortelement].amount)),((emap[keysSorted[j]].element==null)?"kcal":((emap[keysSorted[j]].element[sortelement]== null)?"kcal":emap[keysSorted[j]].element[sortelement].unit)),emap[keysSorted[j]].amount,emap[keysSorted[j]].unit);
        } */

    /*
    // make the Nutritional composition table of mixtures
    var z = new Object();
    z.name = "花青素杂粮";
    z.amount = 100;
    z.unit = "g";
    z.element = new Object();

    for(e in emap["紫米"].element){
        if(z.element[e] === undefined){
            z.element[e] = new Object();
            z.element[e].amount = emap["紫米"].element[e].amount*2/3;
            z.element[e].unit = emap["紫米"].element[e].unit;
            z.element[e].nrv = emap["紫米"].element[e].nrv*2/3;
        }else{
            z.element[e].amount += emap["紫米"].element[e].amount*2/3;
            z.element[e].nrv += emap["紫米"].element[e].nrv*2/3;
        }
        //console.log(yaml.dump(z));
        //console.log("%s in 紫米:\n%s\n%s in 花青素杂粮:\n%s",e,yaml.dump(emap["紫米"].element[e]),e,yaml.dump(z.element[e]));
    }

    for(e in emap["花生"].element){
        if(z.element[e] === undefined){
            z.element[e] = new Object();
            z.element[e].amount = emap["花生"].element[e].amount/3;
            z.element[e].unit = emap["花生"].element[e].unit;
            z.element[e].nrv = emap["花生"].element[e].nrv/3;
        }else{
            z.element[e].amount += emap["花生"].element[e].amount/3;
            z.element[e].nrv += emap["花生"].element[e].nrv/3;
        }
    }

    for(e in z.element){
        z.element[e].amount = z.element[e].amount.toFixed(1);
        z.element[e].nrv = z.element[e].nrv.toFixed(1);
    }
    console.log("\n\n%s\n\n",yaml.dump(z));
    */
}

// plan mode: "node raw plan 15"
function makeplan(long) {
    //console.log("makeplan() > long =",long);
    var diff = 0;
    var hasdata = true;

    while (hasdata) {
        diff = diff - 365.25;
        var foodstat = new Object();
        var begindate = datestr(parseInt(diff));
        var lastdate = datestr(parseInt(diff + long));
        //console.log("makeplan() > %s ~ %s ",begindate,lastdate);
        //console.log("makeplan() > fmap:",fmap[begindate],fmap[lastdate]);
        if ((fmap[begindate] != null) || (fmap[lastdate] != null)) {
            for (var date in fmap) {
                if ((date >= begindate) && (date <= lastdate)) {
                    //console.log("makeplan() > date: ",date);
                    for (var i in fmap[date].food) {
                        var item = fmap[date].food[i];
                        if (foodstat[item.name] == null) {
                            foodstat[item.name] = new Object();
                            foodstat[item.name].amount = item.amount;
                            foodstat[item.name].unit = item.unit;
                            foodstat[item.name].cnt = 1;
                        } else {
                            if (foodstat[item.name].unit == item.unit) {
                                foodstat[item.name].amount = foodstat[item.name].amount + item.amount;
                                foodstat[item.name].cnt = foodstat[item.name].cnt + 1;
                            } else {
                                //console.log("makeplan() > unit different:\n"+yaml.dump(item));
                                console.log("makeplan() > unit different: %s vs %s\n%s\n%s", foodstat[item.name].unit, item.unit, yaml.dump(foodstat[item.name]), yaml.dump(item));
                            }
                        }
                    }
                }
            }
            let keysSorted = Object.keys(foodstat).sort(function (a, b) { return foodstat[b].cnt - foodstat[a].cnt });
            console.log("makeplan() > history: %s ~ %s", begindate, lastdate);
            //console.log("makeplan() > foodstat:\n"+yaml.dump(foodstat));
            //console.log("makeplan() > keysSorted:\n"+yaml.dump(keysSorted));
            for (var j = 0; j < keysSorted.length; j++) {
                //console.log("makeplan() > keysSorted[%d]: %s",j,keysSorted[j]);
                var food = foodstat[keysSorted[j]];
                console.log("%s %f %d", keysSorted[j], (food.amount / food.cnt).toFixed(2), food.cnt);
            }
        } else {
            hasdata = false;
        }
    }
}

// day mode and today mode
function fooddaylog(date) {
    if (fmap[date] === undefined)
        return; // have not record of today or yestoday yet

    fooddaysum(date, etable, ftable);
    daycnt++;
}

// period mode
function foodperiodlog(startdate, enddate) {
    for (var date in fmap) {
        if ((date >= startdate) && (date <= enddate)) {
            fooddaysum(date, etable, ftable);
            daycnt++;
        }
    }
}

// year mode
function foodyearlog(year) {
    for (var date in fmap) {
        if (date.slice(0, 4) == year) {
            fooddaysum(date, etable, ftable);
            daycnt++;
        }
    }
}

// season mode, or month mode in the last month of a season
function foodseasonreport(argument) {
    console.log("enter food season log:", argument);
    var theyear = parseInt(argument.slice(0, 4));
    var themonth = parseInt(argument.slice(4, 6));
    var theseason = themonth / 3;

    var thelastseason = (theseason == 1) ? 4 : theseason - 1;
    var theyearoflastseason = (theseason == 1) ? theyear - 1 : theyear;

    var lastyear = theyear - 1;

    var yearoflastmonth = (themonth == 1) ? theyear - 1 : theyear;
    var lastmonth = (themonth == 1) ? 12 : themonth - 1;
    var yearofnextmonth = (themonth == 12) ? theyear + 1 : theyear;
    var nextmonth = (themonth == 12) ? 1 : themonth + 1;
    var firstmonthofseason = themonth - 2;

    // this season
    startdate = theyear.toString() + (theseason * 3 - 2).toString().padStart(2, '0') + "01";
    enddate = argument + "31";
    console.log("this season:", startdate, enddate);
    etable = new Object();  // element data
    ftable = new Object();
    daycnt = 0;
    loadmap();
    for (var date in fmap) {
        if ((date >= startdate) & (date <= enddate)) {
            fooddaysum(date, etable, ftable);
            daycnt++;
        }
    }
    //showtables();
    maketable();
    makeRfile();

    // the last season
    startdate = theyearoflastseason.toString() + (thelastseason * 3 - 2).toString().padStart(2, '0') + "01";
    enddate = theyearoflastseason.toString() + (thelastseason * 3).toString().padStart(2, '0') + "31";
    console.log("last season:", startdate, enddate);
    var daycntoflastseason = 0;
    var etableoflastseason = new Object();  // element data
    var ftableoflastseason = new Object();  // food data
    loadmap();
    for (var date in fmap) {
        if ((date >= startdate) & (date < enddate)) {
            fooddaysum(date, etableoflastseason, ftableoflastseason);
            daycntoflastseason++;
        }
    }


    // the same season in the last year
    startdate = lastyear.toString() + (theseason * 3 - 2).toString().padStart(2, '0') + "01";
    enddate = lastyear.toString() + (theseason * 3).toString().padStart(2, '0') + "31";
    console.log("the same season in the last year:", startdate, enddate);
    var daycntoflastsameseason = 0;
    var etableoflastsameseason = new Object();  // element data
    var ftableoflastsameseason = new Object();  // food data
    //console.log("the same season of last year:",startdate,enddate);
    loadmap();
    for (var date in fmap) {
        if ((date >= startdate) & (date < enddate)) {
            fooddaysum(date, etableoflastsameseason, ftableoflastsameseason);
            daycntoflastsameseason++;
        }
    }
    //console.log("the same season of last year:",yaml.dump(etableoflastsameseason));

    // compare report
    var deltaonprev = new Object();
    var deltaonyear = new Object();

    for (var e in etable) {
        //console.log("for the etable. e=",e);
        if (etableoflastseason[e] != null) {
            deltaonprev[e] = (etable[e].amount / daycnt - etableoflastseason[e].amount / daycntoflastseason).toFixed(2);
        }
        else {
            deltaonprev[e] = (etable[e].amount / daycnt).toFixed(2);
        }

        if (etableoflastsameseason[e] != null) {
            deltaonyear[e] = (etable[e].amount / daycnt - etableoflastsameseason[e].amount / daycntoflastsameseason).toFixed(2);
        } else {
            deltaonyear[e] = (etable[e].amount / daycnt).toFixed(2);
        }

    }

    var reportstr = "\n---\n季度报告\n" + convertToChinaNum(theseason) + "季度\n\n日平均值，和" + convertToChinaNum(thelastseason) + "季度、去年" + convertToChinaNum(theseason) + "季度对比:\n";

    earray = ["热量", "蛋白质", "脂肪", "碳水化合物", "钠", "膳食纤维", "钙", "水"];
    earray.forEach(function (e, i) { reportstr = reportstr + e + (etable[e].amount / daycnt).toFixed(2) + etable[e].unit + "， " + signformat(deltaonprev[e]) + "、" + signformat(deltaonyear[e]) + etable[e].unit + "；\n"; });

    reportstr = reportstr + "\n";
    var esupply = new Object();
    var eobj = { "脂肪": { energy: 9, amdr: "（AMDR：20~30%）" }, "碳水化合物": { energy: 4, amdr: "（AMDR：50~65%）" }, "蛋白质": { energy: 4, amdr: "（AMDR：10~20%）" }, "膳食纤维": { energy: 2, amdr: "" } };
    for (var e in eobj) {
        esupply[e] = (etable[e].amount * eobj[e].energy / etable["热量"].amount * 100).toFixed(2);
        reportstr = reportstr + e + "供能" + esupply[e] + "% " + eobj[e].amdr + "\n";
    }

    console.log(reportstr);
}

// month mode
function foodmonthreport(argument) {
    var theyear = parseInt(argument.slice(0, 4));
    var themonth = parseInt(argument.slice(4, 6));
    var lastyear = theyear - 1;
    var yearoflastmonth = (themonth == 1) ? theyear - 1 : theyear;
    var lastmonth = (themonth == 1) ? 12 : themonth - 1;
    var yearofnextmonth = (themonth == 12) ? theyear + 1 : theyear;
    var nextmonth = (themonth == 12) ? 1 : themonth + 1;
    var firstmonthofseason = themonth - 2;

    // this month
    startdate = argument + "01";
    enddate = yearofnextmonth.toString() + nextmonth.toString().padStart(2, '0') + "00";
    daycnt = 0;
    loadmap();
    for (var date in fmap) {
        if (date.slice(0, 6) == argument) {
            fooddaysum(date, etable, ftable);
            daycnt++;
        }
    }
    //showtables();
    maketable();
    makeRfile();

    // the last month
    startdate = yearoflastmonth.toString() + lastmonth.toString().padStart(2, '0') + "01";
    enddate = argument + "00";
    var daycntoflastmonth = 0;
    var etableoflastmonth = new Object();  // element data
    var ftableoflastmonth = new Object();  // food data
    loadmap();
    for (var date in fmap) {
        if ((date >= startdate) & (date < enddate)) {
            fooddaysum(date, etableoflastmonth, ftableoflastmonth);
            daycntoflastmonth++;
        }
    }


    // the same month in the last year
    startdate = lastyear.toString() + themonth.toString().padStart(2, '0') + "01";
    enddate = (yearofnextmonth - 1).toString() + nextmonth.toString().padStart(2, '0') + "00";
    var daycntoflastsamemonth = 0;
    var etableoflastsamemonth = new Object();  // element data
    var ftableoflastsamemonth = new Object();  // food data
    //console.log("the same month of last year:",startdate,enddate);
    loadmap();
    for (var date in fmap) {
        if ((date >= startdate) & (date < enddate)) {
            fooddaysum(date, etableoflastsamemonth, ftableoflastsamemonth);
            daycntoflastsamemonth++;
        }
    }
    //console.log("the same month of last year:",yaml.dump(etableoflastsamemonth));

    // compare report
    var deltaonprev = new Object();
    var deltaonyear = new Object();

    for (var e in etable) {
        //console.log("for the etable. e=",e);
        if (etableoflastmonth[e] != null) {
            deltaonprev[e] = (etable[e].amount / daycnt - etableoflastmonth[e].amount / daycntoflastmonth).toFixed(2);
        }
        else {
            deltaonprev[e] = (etable[e].amount / daycnt).toFixed(2);
        }

        if (etableoflastsamemonth[e] != null) {
            deltaonyear[e] = (etable[e].amount / daycnt - etableoflastsamemonth[e].amount / daycntoflastsamemonth).toFixed(2);
        } else {
            deltaonyear[e] = (etable[e].amount / daycnt).toFixed(2);
        }

    }

    var reportstr = "\n---\n月度报告\n" + convertToChinaNum(themonth) + "月份\n\n日平均值，和" + convertToChinaNum(lastmonth) + "月份、去年" + convertToChinaNum(themonth) + "月份对比:\n";

    earray = ["热量", "蛋白质", "脂肪", "碳水化合物", "钠", "膳食纤维", "钙", "水"];
    earray.forEach(function (e, i) { reportstr = reportstr + e + (etable[e].amount / daycnt).toFixed(2) + etable[e].unit + "， " + signformat(deltaonprev[e]) + "、" + signformat(deltaonyear[e]) + etable[e].unit + "；\n"; });

    reportstr = reportstr + "\n";
    var esupply = new Object();
    var eobj = { "脂肪": { energy: 9, amdr: "（AMDR：20~30%）" }, "碳水化合物": { energy: 4, amdr: "（AMDR：50~65%）" }, "蛋白质": { energy: 4, amdr: "（AMDR：10~20%）" }, "膳食纤维": { energy: 2, amdr: "" } };
    for (var e in eobj) {
        esupply[e] = (etable[e].amount * eobj[e].energy / etable["热量"].amount * 100).toFixed(2);
        reportstr = reportstr + e + "供能" + esupply[e] + "% " + eobj[e].amdr + "\n";
    }

    console.log(reportstr);
    // season report?
    if ((themonth % 3) == 0) {
        foodseasonreport(argument);
    }

}

function maketable() {
    if (typeof Keyelement !== "undefined" && Keyelement !== null) {
        console.log(Keyelement + "明细表");
        console.table(Detailtable);
    }

    var NRV = yaml.load(fs.readFileSync(NRVfilename));
    var DRIsfilename = "food/DRIs." + NRV.DRIs + ".yaml";
    var DRIs = yaml.load(fs.readFileSync(DRIsfilename));
    //console.log("DRIsfilename:",DRIsfilename);

    // put NRV data into DRIs
    for (var element in NRV.element) {
        if (DRIs.element[element].unit == NRV.element[element].unit) {
            DRIs.element[element].RNI = NRV.element[element].amount;
        } else {
            console.log("maketalbe() > unit different between NRV and DRIs: " + element);
        }
    }
    //console.log("DRIs.element[\"VB12(钴胺素)\"].RNI:",DRIs.element["VB12(钴胺素)"].RNI);

    //console.log("maketable()> DRIs:\n"+yaml.dump(DRIs));
    //console.log("maketable()> etable:\n"+yaml.dump(etable));
    //return;

    if (JSON.stringify(etable) === "{}") {
        console.log("empty data.")
        return;
    }

    var elementtable = new Object();


    if (etable["热量"] != null) {
        if(etable["脂肪"].unit != "g"){
            etable["脂肪"].amount = convert(etable["脂肪"].amount).from(etable["脂肪"].unit).to('g');
            etable["脂肪"].unit = "g";
        }
        if(etable["蛋白质"].unit != "g"){
            etable["蛋白质"].amount = convert(etable["蛋白质"].amount).from(etable["蛋白质"].unit).to('g');
            etable["蛋白质"].unit = "g";
        }
        if(etable["碳水化合物"].unit != "g"){
            etable["碳水化合物"].amount = convert(etable["碳水化合物"].amount).from(etable["碳水化合物"].unit).to('g');
            etable["碳水化合物"].unit = "g";
        }
        console.log(">> 脂肪供能%d%%  碳水供能%d%%  蛋白质供能%d%% <<", (etable["脂肪"].amount * 9.0 * 100 / etable["热量"].amount).toFixed(2), (etable["碳水化合物"].amount * 4 * 100 / etable["热量"].amount).toFixed(2), (etable["蛋白质"].amount * 4 * 100 / etable["热量"].amount).toFixed(2));
        //console.log("名称\t\t总数量\t\t日均\t单位\tNRV(%)");
        let keysSorted = Object.keys(etable).sort(function (a, b) { return etable[a].nrv - etable[b].nrv })

        for (var i in keysSorted) {
            var name = keysSorted[i];
            var item = new Object();
            item["营养成分"] = name;
            //console.log("maketable()> name:"+name);
            if ((etable[name].unit == "g") && (etable[name].amount < 1)) {
                if (etable[name].amount < 0.001) {
                    etable[name].unit = "μg";
                    etable[name].amount = etable[name].amount * 1000000;
                } else {
                    etable[name].unit = "mg";
                    etable[name].amount = etable[name].amount * 1000;
                }
                //console.log("etable[name].amount:",etable[name].amount)
            }
            item["单位"] = etable[name].unit;
            item["总量"] = etable[name].amount.toFixed(2);
            item["日均"] = parseFloat((etable[name].amount / daycnt).toFixed(3));
            item["NRV(%)"] = parseFloat((etable[name].nrv / daycnt).toFixed(2));
            //console.log("maketable()> unit: "+ etable[name].unit);

            if (DRIs.element[name] != null) {
                var r;
                if ((fRate[DRIs.element[name].unit] !== undefined) && (fRate[DRIs.element[name].unit][etable[name].unit] !== undefined)) {
                    r = fRate[DRIs.element[name].unit][etable[name].unit];
                    //console.log("DRIs.element[name].unit:",DRIs.element[name].unit);
                    //console.log("etable[name].unit:",etable[name].unit);
                } else {
                    console.log("maketalbe() > unit different between etable and DRIs: " + name + " [" + DRIs.element[name].unit + "] [" + etable[name].unit + "] " + fRate[DRIs.element[name].unit] + " " + fRate[DRIs.element[name].unit][etable[name].unit]);
                }

                for (var param in DRIs.element[name]) {
                    if ((param != "unit") && (DRIs.element[name][param] != null) && (DRIs.element[name][param] != "")) {
                        item[param] = (DRIs.element[name][param] * r).toFixed(3);
                        //item[param] = convert(DRIs.element[name][param]).from(DRIs.element[name].unit).to(etable[name].unit).toFixed(2);
                        //item[param] = parseFloat((DRIs.element[name][param] * r).toFixed(2));
                        item[param + "(%)"] = parseFloat((100 * item["日均"] / item[param]).toFixed(2));
                    }
                }

                //console.log(r,item);
            } else {
                //console.log("maketable()> can't find it in DRIs: "+name);
            }
            elementtable[name] = item;
        }
        //console.table(elementtable, ["总量", "日均", "单位", "NRV(%)", "RNI", "RNI(%)", "AI", "AI(%)", "UL", "UL(%)", "PI_NCD", "SPL"]);
        console.table(elementtable, ["总量","日均", "单位", "NRV(%)", "RNI", "RNI(%)", "AI", "AI(%)", "UL", "UL(%)", "PI_NCD", "SPL"]);
    } else {
        console.log("all food have not element data...");
    }
    //console.log("typeof ftable"+typeof(ftable));
    if (Object.keys(ftable).length > 0) {
        console.log("\n\t\t未算入成份表的食物\n名称\t\t\t总数量\t\t日均\t单位");
        let foodSorted = Object.keys(ftable).sort(function (a, b) { return ftable[a].amount - ftable[b].amount })

        for (var i in foodSorted) {
            var name = foodSorted[i];
            var dayamount = ftable[name].amount / daycnt;

            var nametab = "\t\t\t"
            if (name.replace(/[^\x00-\xff]/g, '**').length >= 8) {
                nametab = "\t\t";
            }
            if (name.replace(/[^\x00-\xff]/g, '**').length >= 16) {
                nametab = "\t";
            }

            var amounttab = "\t\t";
            if (ftable[name].amount > 10000) {
                amounttab = "\t";
            }
            console.log(name + nametab + ftable[name].amount.toFixed(2) + amounttab + dayamount.toFixed(2) + "\t" + ftable[name].unit);
        }
    }
    if (daycnt > 1) {
        console.log("\n%s ~ %s : %d days.", startdate, enddate, daycnt);
    }
}

// display the tables
function showtables() {
    if (typeof Keyelement !== "undefined" && Keyelement !== null) {
        console.log(Keyelement + "明细表");
        console.table(Detailtable);
    }

    if (JSON.stringify(etable) === "{}") {
        console.log("empty data.")
        return;
    }
    if (etable["热量"] != null) {
        console.log(">> 脂肪供能%d%%  碳水供能%d%%  蛋白质供能%d%% <<", (etable["脂肪"].amount * 9.0 * 100 / etable["热量"].amount).toFixed(2), (etable["碳水化合物"].amount * 4 * 100 / etable["热量"].amount).toFixed(2), (etable["蛋白质"].amount * 4 * 100 / etable["热量"].amount).toFixed(2));
        console.log("名称\t\t总数量\t\t日均\t单位\tNRV(%)");
        let keysSorted = Object.keys(etable).sort(function (a, b) { return etable[a].nrv - etable[b].nrv })

        for (var i in keysSorted) {
            var name = keysSorted[i];
            if ((etable[name].unit == "g") && (etable[name].amount < 1)) {
                if (etable[name].amount < 0.001) {
                    etable[name].unit = "μg";
                    etable[name].amount = etable[name].amount * 1000000;
                } else {
                    etable[name].unit = "mg";
                    etable[name].amount = etable[name].amount * 1000;
                }
            }
            var dayamount = etable[name].amount / daycnt;
            var daynrv = etable[name].nrv / daycnt;
            var amounttab = "\t\t";
            if (etable[name].amount > 10000) {
                amounttab = "\t";
            }

            if (name.replace(/[^\x00-\xff]/g, '**').length < 8) {
                console.log(name + "\t\t" + etable[name].amount.toFixed(2) + amounttab + dayamount.toFixed(2) + "\t" + etable[name].unit + "\t" + daynrv.toFixed(2));
            } else {
                console.log(name + "\t" + etable[name].amount.toFixed(2) + amounttab + dayamount.toFixed(2) + "\t" + etable[name].unit + "\t" + daynrv.toFixed(2));
            }
        }
    } else {
        console.log("all food have not element data...");
    }
    //console.log("typeof ftable"+typeof(ftable));
    if (Object.keys(ftable).length > 0) {
        console.log("\n\t\t未算入成份表的食物\n名称\t\t\t总数量\t\t日均\t单位");
        let foodSorted = Object.keys(ftable).sort(function (a, b) { return ftable[a].amount - ftable[b].amount })

        for (var i in foodSorted) {
            var name = foodSorted[i];
            var dayamount = ftable[name].amount / daycnt;

            var nametab = "\t\t\t"
            if (name.replace(/[^\x00-\xff]/g, '**').length >= 8) {
                nametab = "\t\t";
            }
            if (name.replace(/[^\x00-\xff]/g, '**').length >= 16) {
                nametab = "\t";
            }

            var amounttab = "\t\t";
            if (ftable[name].amount > 10000) {
                amounttab = "\t";
            }
            console.log(name + nametab + ftable[name].amount.toFixed(2) + amounttab + dayamount.toFixed(2) + "\t" + ftable[name].unit);
        }
    }
    if (daycnt > 1) {
        console.log("\n%s ~ %s : %d days.", startdate, enddate, daycnt);
    }
}

// Statistics of the food,water,med and their element in the given day
function fooddaysum(date, etable, ftable) {
    d = fmap[date];
    var name, amount, unit, nrv, oldenergy;

    amount = 0;
    nrv = 0;
    if ("热量" in etable) {
        oldenergy = etable["热量"].amount;
    } else {
        oldenergy = 0;
    }


    for (var id in d.water) {
        let item = d.water[id];
        if (item.unit == "ml") amount += item.amount;
        if (item.unit == "l") amount += item.amount * 1000;
    }
    nrv = amount / 20;
    if ("水" in etable) {
        // element already in table
        etable["水"].amount += amount;
        etable["水"].nrv += nrv;
    } else {
        // new element
        etable["水"] = { "amount": amount, "unit": "ml", "nrv": nrv };
    }

    // food字段的格式与element字段不同。
    // 原因是同一种食材可能在food重复出现，以备将来表达烹饪步骤分次加入。
    var food = d.food;
    for (var id in food) {
        if (food[id].unit == undefined) {
            console.log("undefined unit. date:" + date + "\tfoodname:" + food[id].name)
        }
        if (foodsum(food[id].name, food[id].amount, food[id].unit, etable, ftable)) {
            delete food[id];
        } else {
            //newfood.push(item);
        }
    }

    for (var id in food) {
        if (food[id].name in ftable) {
            ftable[food[id].name].amount += food[id].amount;
        } else {
            ftable[food[id].name] = food[id];
        }
    }

    var med = d.med;

    for (var id in med) {
        if (med[id].name in emap) {//known med
            let meddata = emap[med[id].name];
            let r = med[id].amount / meddata.amount;  // 此处单位不能换算，务必人工写成相同。
            for (var e in meddata.element) {
                let item = new Object();
                item.amount = parseFloat(meddata.element[e].amount) * r;
                //console.log(meddata.element[e].unit);
                item.unit = meddata.element[e].unit.toLowerCase();
                item.nrv = parseFloat(meddata.element[e].nrv) * r;

                /* if (item.unit == "mg") {
                    item.unit = "g";
                    item.amount = item.amount / 1000;
                }
                if ((item.unit == "μg") || (item.unit == "μg")) {
                    item.unit = "g";
                    item.amount = item.amount / 1000000;
                }*/
                if (item.unit == "kj") {
                    item.unit = "kcal";
                    item.amount = item.amount * 0.239;
                }


                if (e in etable) {
                    /* if (item.unit != etable[e].unit) {
                        console.log("fooddaysum()> different unit:", item.unit, etable[e].unit,fRate[item.unit][etable[e].unit]);
                    } */
                    var rate = fRate[item.unit][etable[e].unit];
                    // element already in table
                    etable[e].amount += item.amount * rate;
                    etable[e].nrv += item.nrv;
                } else {
                    // new element
                    etable[e] = item;
                }
                // detail data
                if (typeof Keyelement !== "undefined" && Keyelement !== null) {
                    if (e == Keyelement) {
                        var data = new Object();
                        data["名称"] = med[id].name;
                        data["摄入数量"] = med[id].amount.toFixed(2) + med[id].unit;
                        data["含有" + Keyelement] = item.amount.toFixed(3) + item.unit;
                        data["累计摄入"] = etable[e].amount.toFixed(3) + item.unit;
                        data["累计nrv"] = etable[e].nrv.toFixed(2) + "%";

                        Detailtable[keycnt++] = data;
                    };
                };
                //if(e=="VC(抗坏血酸)") console.log(med[id].amount+med[id].unit+"的"+med[id].name+"\t含有"+item.amount.toFixed(10)+item.unit+"。\t累计摄入："+etable[e].amount.toFixed(10)+"\t累计nrv:"+etable[e].nrv.toFixed(2));
            }

            delete med[id];
        } else {//unknown med
            //console.log("unknown med:"+med[id].name+"\t"+med[id].amount+"\t"+med[id].unit);
            if (med[id].name in ftable) {
                ftable[med[id].name].amount += med[id].amount;
            } else {
                ftable[med[id].name] = med[id];
            }
            //console.log("ftable:"+ftable[med[id].name].name+"\t"+ftable[med[id].name].amount+"\t"+ftable[med[id].name].unit);
        }
    }

    // all food have not element data
    if (etable["热量"] != null) {
        fmap[date]["热量"] = (etable["热量"].amount - oldenergy).toFixed(3);
    } else {
        fmap[date]["热量"] = (0 - oldenergy).toFixed(3);
    }

}

function foodsum(foodname, foodamount, foodunit, etable, ftable) {
    //console.log("foodunit's type:"+typeof(foodunit));
    //console.log("foodsum:\t"+foodname+"\t"+foodamount+"\t"+foodunit);
    if (foodname in emap) {
        let fooddata = emap[foodname];

        // todo:check the unit (g,mg,kg,...) and change amount
        //console.log("fooddata.unit's type:"+typeof(fooddata.unit));
        let r = 1;
        if (foodunit == fooddata.unit) {
            r = foodamount / fooddata.amount;
        } else if ((fRate[foodunit] !== undefined) && (fRate[foodunit][fooddata.unit] !== undefined)) {
            r = foodamount * fRate[foodunit][fooddata.unit] / fooddata.amount;
        } else {
            console.log("unknow unit:\t" + foodunit + "\t" + fooddata.unit + "\tfoodname:" + foodname + "\tfoodamount:" + foodamount);
            return false;
        }

        // 递归结构的食材，food中有food。
        for (var id in fooddata.food) {
            foodsum(fooddata.food[id].name, fooddata.food[id].amount * r, fooddata.food[id].unit, etable, ftable);
        }

        // 基础食材，food中只有element.
        for (var e in fooddata.element) {
            let item = new Object();
            item.amount = parseFloat(fooddata.element[e].amount) * r;
            //console.log(fooddata.element[e].unit);
            item.unit = fooddata.element[e].unit.toLowerCase();
            item.nrv = parseFloat(fooddata.element[e].nrv) * r;

            /* if (item.unit == "mg") {
                item.unit = "g";
                item.amount = item.amount / 1000;
            }
            if ((item.unit == "μg") || (item.unit == "μg")) {
                item.unit = "g";
                item.amount = item.amount / 1000000;
            }*/
            if (item.unit == "kj") {
                item.unit = "kcal";
                item.amount = item.amount * 0.239;
            }

            /* console.log("e:"+e);
            if(etable[e]!= undefined){
                console.log("etable[e] before:%s %s",etable[e].amount,etable[e].unit);
            }else{
                console.log("etable[e] before is undefined");
            } */
            
            if (e in etable) {
                /* console.log("foodsum()> e:",foodname,e);
                if (item.unit != etable[e].unit) {
                    console.log("foodsum()> different unit:", item.unit, etable[e].unit,fRate[item.unit][etable[e].unit]);
                }  */
                var rate = fRate[item.unit][etable[e].unit];
                // element already in table
                etable[e].amount += item.amount * rate;
                etable[e].nrv += item.nrv;
            } else {
                // new element
                etable[e] = item;
            }
            //console.log("etable[e] after:%s %s",etable[e].amount,etable[e].unit);

            // detail data
            if (typeof Keyelement !== "undefined" && Keyelement !== null) {
                if (e == Keyelement) {
                    var data = new Object();
                    data["名称"] = foodname;
                    data["摄入数量"] = foodamount.toFixed(2) + foodunit;
                    data["含有" + Keyelement] = item.amount.toFixed(3) + item.unit;
                    data["累计摄入"] = etable[e].amount.toFixed(3) + etable[e].unit;
                    data["累计nrv"] = etable[e].nrv.toFixed(2) + "%";

                    Detailtable[keycnt++] = data;
                };
            };
        }
        //delete food[id];
        return true;
    } else {
        //newfood.push(item);
        //console.log("debug: call daysum() with a food doesn't exist in emap:\t"+foodname);
        return false;
    }
}


// make then R files
function makeRfile() {
    var d = "date <- c(";
    var w1 = "weight1 <- c(";
    var w2 = "weight2 <- c(";
    var energy = "energy <- c("
    var sleep = "sleep <- c(";
    var wake = "wake <- c(";
    var sleeplong = "sleeplong <- c(";
    var wmax, wmin;

    var dBPM = "date <- c(";
    var PRbpm1 = "PRbpm1 <- c(";  // PRbpm in wake up
    var PRbpm2 = "PRbpm2 <- c(";  // PRbpm after exercise
    var PRbpm3 = "PRbpm3 <- c(";  // PRbpm after walk
    var endheartrate = "endheartrate <- c(";  // heartrate after exercise

    var cnt = 0;
    var bFirst = true;
    var BPMcnt = 0;
    var bBPMFirst = true;
    var lastPRbpm2 = 90;
    var lastendheartrate = 90;

    try {
        for (var day in fmap) {
            //console.log("\nday="+day+"hmap[day]="+hmap[day]);
            sleepday = Math.floor(hmap[day].sleep.time / 1000000);
            sleephour = Math.floor(hmap[day].sleep.time % 1000000 / 10000);
            sleepminute = Math.floor(hmap[day].sleep.time % 10000 / 100);
            sleeptime = sleephour * 60 + sleepminute;

            if (sleeptime > 1440) {
                console.log("debug: sleeptime>1440\t" + sleeptime + "\tday:\t" + day);
            }

            //console.log("\n================="+day+"=================\nhmap[day].sleep.time:"+hmap[day].sleep.time+"\nsleephour:\t"+sleephour+"\nsleepminute:\t"+sleepminute);

            if (sleepday < day) { sleeptime -= 24 * 60 };

            wakeday = Math.floor(hmap[day].wake.time / 1000000);
            wakehour = Math.floor(hmap[day].wake.time % 1000000 / 10000);
            wakeminute = Math.floor(hmap[day].wake.time % 10000 / 100);
            waketime = wakehour * 60 + wakeminute;
            if (wakeday < day) { waketime -= 24 * 60 };
            if (wakeday > day) { waketime += 24 * 60 };

            if ((wakeday <= day) && (waketime > 1440)) {
                console.log("debug: waketime>1440\t" + waketime + "\tday:\t" + day);
            }

            sleeplongtime = waketime - sleeptime;


            if (sleeplongtime > 1100) {
                console.log("debug: sleeplongtime>1100\t" + sleeplongtime + "\tday:\t" + day + "\tsleeptime:" + sleeptime + "\twaketime:" + waketime);
            }
            if (sleeplongtime < 0) {
                console.log("debug: sleeplongtime<0\t" + sleeplongtime + "\tday:\t" + day + "\tsleepday:\t" + sleepday + "\tsleeptime:" + sleeptime + "\twaketime:" + waketime);
            }

            //if(waketime > 1000) {console.log(day)}

            //console.log("\n================="+day+"=================\nfood:\t"+fmap[day].comment+"\nhealth:\t"+hmap[day].comment);
            //if (day > "20150407") {
            if ((day >= startdate) && (day <= enddate)) {
                //console.log("day:"+day);
                cnt = cnt + 1;
                if (bFirst) {
                    d = d + "\"" + day + "\"";
                    w1 = w1 + hmap[day].sleep.weight;
                    w2 = w2 + hmap[day].wake.weight;
                    energy = energy + fmap[day]["热量"];

                    sleep = sleep + sleeptime;
                    wake = wake + waketime;
                    sleeplong = sleeplong + sleeplongtime;

                    wmax = hmap[day].sleep.weight + 0.5;
                    wmin = hmap[day].wake.weight - 0.5;
                    bFirst = false;
                } else {
                    d = d + ',\"' + day + "\"";
                    w1 = w1 + "," + hmap[day].sleep.weight;
                    w2 = w2 + "," + hmap[day].wake.weight;
                    energy = energy + "," + fmap[day]["热量"];

                    //if(!hmap[day].wake.weight) {console.log("can find wake weight:"+day);}

                    sleep = sleep + "," + sleeptime;
                    wake = wake + "," + waketime;
                    sleeplong = sleeplong + "," + sleeplongtime;

                    if (wmax < hmap[day].sleep.weight + 0.5) wmax = hmap[day].sleep.weight + 0.5;
                    if (wmin > hmap[day].wake.weight - 0.5) wmin = hmap[day].wake.weight - 0.5;

                }

                dBPM = d;
                if (bBPMFirst) {
                    if (hmap[day].wake.PRbpm != undefined) {
                        PRbpm1 = PRbpm1 + hmap[day].wake.PRbpm;
                    } else {
                        PRbpm1 = PRbpm1 + "NA";
                    }
                    if ((hmap[day].exercise != undefined) && (hmap[day].exercise[0].PRbpm != undefined)) {
                        PRbpm2 = PRbpm2 + hmap[day].exercise[0].PRbpm;
                    } else {
                        PRbpm2 = PRbpm2 + "NA";
                    }
                    if ((hmap[day].exercise != undefined) && (hmap[day].exercise[0].endheartrate != undefined)) {
                        endheartrate = endheartrate + hmap[day].exercise[0].endheartrate;
                    } else {
                        endheartrate = endheartrate + "NA";
                    }
                    if ((hmap[day].exercise != undefined) && (hmap[day].exercise[1] != undefined) && (hmap[day].exercise[1].PRbpm != undefined) && (hmap[day].exercise[1].item[0].type == "walk")) {
                        PRbpm3 = PRbpm3 + hmap[day].exercise[1].PRbpm;
                    } else if ((hmap[day].exercise != undefined) && (hmap[day].exercise[2] != undefined) && (hmap[day].exercise[2].PRbpm != undefined) && (hmap[day].exercise[2].item[0].type == "walk")) {
                        PRbpm3 = PRbpm3 + hmap[day].exercise[2].PRbpm;
                    } else {
                        PRbpm3 = PRbpm3 + "NA";
                    }
                    BPMcnt++;
                    bBPMFirst = false;
                } else {
                    if (hmap[day].wake.PRbpm != undefined) {
                        PRbpm1 = PRbpm1 + "," + hmap[day].wake.PRbpm;
                    } else {
                        PRbpm1 = PRbpm1 + ",NA";
                    }
                    if ((hmap[day].exercise != undefined) && (hmap[day].exercise[0].PRbpm != undefined)) {
                        PRbpm2 = PRbpm2 + "," + hmap[day].exercise[0].PRbpm;
                    } else {
                        PRbpm2 = PRbpm2 + ",NA";
                    }
                    if ((hmap[day].exercise != undefined) && (hmap[day].exercise[0].endheartrate != undefined)) {
                        endheartrate = endheartrate + "," + hmap[day].exercise[0].endheartrate;
                    } else {
                        endheartrate = endheartrate + ",NA";
                    }
                    if ((hmap[day].exercise != undefined) && (hmap[day].exercise[1] != undefined) && (hmap[day].exercise[1].PRbpm != undefined) && (hmap[day].exercise[1].item[0].type == "walk")) {
                        PRbpm3 = PRbpm3 + "," + hmap[day].exercise[1].PRbpm;
                    } else if ((hmap[day].exercise != undefined) && (hmap[day].exercise[2] != undefined) && (hmap[day].exercise[2].PRbpm != undefined) && (hmap[day].exercise[2].item[0].type == "walk")) {
                        PRbpm3 = PRbpm3 + "," + hmap[day].exercise[2].PRbpm;
                    } else {
                        PRbpm3 = PRbpm3 + ",NA";
                    }
                    BPMcnt++;
                }


                /* if (bBPMFirst) {
                    if (hmap[day].wake.PRbpm != undefined) {
                        dBPM = dBPM + "\"" + day + "\"";
                        PRbpm1 = PRbpm1 + hmap[day].wake.PRbpm;
                        if (hmap[day].exercise == undefined) {
                            PRbpm2 = PRbpm2 + lastPRbpm2;
                            endheartrate = endheartrate + lastendheartrate;
                        } else {
                            PRbpm2 = PRbpm2 + hmap[day].exercise[0].PRbpm;
                            endheartrate = endheartrate + hmap[day].exercise[0].endheartrate;
                            lastPRbpm2 = hmap[day].exercise[0].PRbpm;
                            lastendheartrate = hmap[day].exercise[0].endheartrate;
                        }
                        BPMcnt++;
                        bBPMFirst = false;
                    }

                } else {
                    dBPM = dBPM + ',\"' + day + "\"";
                    PRbpm1 = PRbpm1 + "," + hmap[day].wake.PRbpm;
                    if (hmap[day].exercise == undefined) {
                        PRbpm2 = PRbpm2 + "," + lastPRbpm2;
                        endheartrate = endheartrate + "," + lastendheartrate;
                    } else {
                        PRbpm2 = PRbpm2 + "," + hmap[day].exercise[0].PRbpm;
                        endheartrate = endheartrate + "," + hmap[day].exercise[0].endheartrate;
                        lastPRbpm2 = hmap[day].exercise[0].PRbpm;
                        lastendheartrate = hmap[day].exercise[0].endheartrate;
                    }
                    BPMcnt++;
                } */
            }
        }
    } catch (e) {
        // failure
        console.log("comment print error！" + day + fmap[day] + hmap[day] + e);
    }

    d = d + ")";
    w1 = w1 + ")";
    w2 = w2 + ")";
    energy = energy + ")";
    sleep = sleep + ")";
    wake = wake + ")";
    sleeplong = sleeplong + ")";
    dBPM = dBPM + ")";
    PRbpm1 = PRbpm1 + ")";
    PRbpm2 = PRbpm2 + ")";
    PRbpm3 = PRbpm3 + ")";
    endheartrate = endheartrate + ")";

    var wstr = d + "\r\n" + w1 + "\r\n" + w2 + "\r\n" + energy + "\r\nopar <- par(mar = c(5,4,4,5))\r\nplot(c(1:" + cnt + "),weight1,type=\"s\",col=\"red\",xaxt=\"n\",xlab = \"date\",ylab = \"weight(kg)\",ylim=range(" + wmin + ":" + wmax + "))\r\nlines(c(1:" + cnt + "),weight2,type=\"s\",col=\"blue\")\r\nlegend(\"topright\",inset=.05,title=\"体重曲线\",c(\"睡前\",\"醒后(辅助线:50.5~51.5)\",\"热量\"),lty=c(1,1,1),col=c(\"red\",\"blue\",\"green\"))\r\nabline(h = 51.5,col=\"blue\",lty = 3)\r\nabline(h = 50.5,col=\"blue\",lty = 3)\r\naxis(1, c(1:" + cnt + "),date)\r\npar(new = TRUE)\r\nplot(c(1:" + cnt + "), energy,type=\"s\", pch = \"+\", col = \"green\", axes = FALSE, xlab = \"\", ylab = \"\")\r\naxis(side = 4, at = pretty(range(energy)))\r\nmtext(\"energy(kcal)\", side = 4, line = 3)";
    fs.writeFile("health/weight.R", wstr, (err) => {
        if (err) throw err;
        console.log('health/weight.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/weight.R\",encoding = \"UTF-8\")');
    });

    var sleepstr = d + "\r\n" + sleep + "\r\n" + wake + "\r\n" + sleeplong + "\r\nplot(c(1:" + cnt + "),sleep,type=\"s\",col=\"red\",xaxt=\"n\",xlab = \"date\",ylab=\"time(minute)\",ylim=range(-1000,2200))\r\nlines(c(1:" + cnt + "),wake,type=\"s\",col=\"blue\")\r\nlines(c(1:" + cnt + "),sleeplong,type=\"s\",col=\"green\")\r\nlegend(\"topleft\",inset=.05,title=\"睡眠曲线\",c(\"睡(辅助线:凌晨)\",\"醒\",\"时长(辅助线:480)\"),lty=c(1,1,1),col=c(\"red\",\"blue\",\"green\"))\r\nabline(h = 0,col=\"red\",lty = 3)\r\nabline(h = 1440,col=\"red\",lty = 3)\r\nabline(h = 480,col=\"green\",lty = 3)\r\naxis(1, c(1:" + cnt + "),date)\r\n";
    fs.writeFile("health/sleep.R", sleepstr, (err) => {
        if (err) throw err;
        console.log('health/sleep.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/sleep.R\",encoding = \"UTF-8\")');
    });

    var PRbpmstr = dBPM + "\r\n" + PRbpm1 + "\r\n" + PRbpm2 + "\r\n" + PRbpm3 + "\r\n" + endheartrate + "\r\nplot(c(1:" + BPMcnt + "),PRbpm1,type=\"s\",col=\"red\",xaxt=\"n\",xlab = \"date\",ylab=\"heart rate\",ylim=range(50:160))\r\nlines(c(1:" + BPMcnt + "),PRbpm2,type=\"s\",col=\"blue\")\r\nlines(c(1:" + BPMcnt + "),PRbpm3,type=\"s\",col=\"gold\")\r\nlines(c(1:" + BPMcnt + "),endheartrate,type=\"s\",col=\"green\")\r\nlegend(\"topleft\",inset=.05,title=\"心率曲线\",c(\"起床血氧仪(辅助线:50~65)\",\"运动后血氧仪\",\"运动后把脉\",\"散步后血氧仪\"),lty=c(1,1,1,1),col=c(\"red\",\"blue\",\"green\",\"gold\"))\r\nabline(h = 65,col=\"red\",lty = 3)\r\nabline(h = 50,col=\"red\",lty = 3)\r\naxis(1, c(1:" + BPMcnt + "),date)\r\n";
    fs.writeFile("health/heartrate.R", PRbpmstr, (err) => {
        if (err) throw err;
        console.log('health/heartrate.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/heartrate.R\",encoding = \"UTF-8\")');
    });
}

//health/weight.R文件已被保存。在R环境运行 source("D:/huangyg/git/raw/health/weight.R",encoding = "UTF-8")
//health/sleep.R文件已被保存。在R环境运行 source("D:/huangyg/git/raw/health/sleep.R",encoding = "UTF-8")
//health/heartrate.R文件已被保存。在R环境运行 source("D:/huangyg/git/raw/health/heartrate.R",encoding = "UTF-8")

// utils
function GetNumByUnit(num, unitname, outunitname) {
    var tnum = (num * fRate[unitname][outunitname]).toFixed(4);
    return tnum;
}

function datestr(diff = 0) {
    var theDate = new Date();
    //theDate.setDate(theDate.getDate() - 1);
    theDate.setDate(theDate.getDate() + diff);

    var year = theDate.getFullYear();
    var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
    var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
    var dateStr = year + "" + month + "" + day;

    //console.log("datestr retrun:"+dateStr);
    return dateStr;
}

function E_fix() {
    for (var name in emap) {
        let fooddata = emap[name];
        let newfood = new Object();
        let newelement = new Object();
        for (var e in fooddata.element) {
            let item = new Object();
            item.amount = parseFloat(fooddata.element[e].amount);
            item.unit = fooddata.element[e].unit.toLowerCase();
            item.nrv = parseFloat(fooddata.element[e].nrv);

            if (item.unit == "mg") {
                item.unit = "g";
                item.amount = item.amount / 1000;
            }
            if ((item.unit == "μg") || (item.unit == "μg")) {
                item.unit = "g";
                item.amount = item.amount / 1000000;
            }
            if (item.unit == "kj") {
                item.unit = "kcal";
                item.amount = item.amount * 0.239;
            }

            if ((item.unit == "g") && (item.amount < 1)) {
                if (item.amount < 0.001) {
                    item.unit = "μg";
                    item.amount = item.amount * 1000000;
                } else {
                    item.unit = "mg";
                    item.amount = item.amount * 1000;
                }
            }
            newelement[e] = item;
        }
        newfood.name = fooddata.name;
        newfood.amount = fooddata.amount;
        newfood.unit = fooddata.unit.toLowerCase();
        if (newfood.unit == "mg") {
            newfood.unit = "g";
            newfood.amount = newfood.amount / 1000;
        }
        if (newfood.unit == "μg") {
            newfood.unit = "g";
            newfood.amount = newfood.amount / 1000000;
        }
        newfood.element = newelement;

        fs.writeFileSync("food/e." + name + ".yaml", yaml.safeDump(newfood).replace(/\n/g, "\r\n"));
    }
}

// merge the old file before 20190426 to new format
function E_merge() {
    for (var name in emap) {
        console.log("name=" + name);
        let newfood = new Object();
        let newelement = new Object();
        let food = emap[name];
        for (var e in food.element) {
            console.log("e=" + e);
            let eitem = new Object();
            let displayname = e;
            eitem["amount"] = food.element[e];
            if (e.indexOf("(") > 0) {
                displayname = e.substring(0, e.indexOf("("));;
                eitem["unit"] = e.substring(e.indexOf("(") + 1, e.indexOf(")"));
            } else {
                eitem["unit"] = "g";
            }
            eitem["nrv"] = food["nrv"][e];
            newelement[displayname] = eitem;
        }
        newfood.name = food.name;
        newfood.amount = food.amount;
        newfood.unit = food.unit.toLowerCase();
        newfood.element = newelement;

        //console.log(food);
        console.log(newfood);
        fs.writeFileSync("food/e." + name + ".yaml", yaml.safeDump(newfood));
    }
}

function convertToChinaNum(num) {
    var arr1 = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    var arr2 = ['', '十', '百', '千', '万', '十', '百', '千', '亿', '十', '百', '千', '万', '十', '百', '千', '亿'];//可继续追加更高位转换值
    if (!num || isNaN(num)) {
        return "零";
    }
    var english = num.toString().split("")
    var result = "";
    for (var i = 0; i < english.length; i++) {
        var des_i = english.length - 1 - i;//倒序排列设值
        result = arr2[i] + result;
        var arr1_index = english[des_i];
        result = arr1[arr1_index] + result;
    }
    //将【零千、零百】换成【零】 【十零】换成【十】
    result = result.replace(/零(千|百|十)/g, '零').replace(/十零/g, '十');
    //合并中间多个零为一个零
    result = result.replace(/零+/g, '零');
    //将【零亿】换成【亿】【零万】换成【万】
    result = result.replace(/零亿/g, '亿').replace(/零万/g, '万');
    //将【亿万】换成【亿】
    result = result.replace(/亿万/g, '亿');
    //移除末尾的零
    result = result.replace(/零+$/, '')
    //将【零一十】换成【零十】
    //result = result.replace(/零一十/g, '零十');//貌似正规读法是零一十
    //将【一十】换成【十】
    result = result.replace(/^一十/g, '十');
    return result;
}

function signformat(num) {
    return num > 0 ? '+' + num.toString() : num.toString();
}

//openbrowser("http://www.xuemen.com")
//console.log(os.type());
//console.log(os.platform());
//console.log(os.release());

//Windows_NT
//win32
//6.1.7601

//Darwin
//darwin
//14.1.0

//Linux
//linux
//3.13.0-53-generic

function openbrowser(url) {
    switch (os.platform()) {
        case "linux":
            child.exec("xdg-open " + url);
            break;
        case "win32":
        case "win64":
            //child.spawnSync("rundll32", "url.dll,FileProtocolHandler", url);
            //child.exec("start", url);
            child.exec("start " + url);
            break;
        case "darwin":
            child.exec("open " + url);
            break;
        default:
            console.log("unsupported platform");
            break;
    };
}