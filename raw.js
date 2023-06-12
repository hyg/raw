var fs = require('fs');
var yaml = require('js-yaml');
var os = require('os');
var child = require('child_process');
//const { markAsUntransferable } = require('worker_threads');

// log and basic data
var fmap = new Object();    // food log
var emap = new Object();    // element data
var hmap = new Object();    // health log

// Statistics period
var daycnt = 0;
var startdate,enddate ;
// Statistics report
var etable = new Object();  // element data
var ftable = new Object();  // food data
// element detail tables
//const Keyelement = "热量";
//const Keyelement = "脂肪";
const Keyelement = "蛋白质";
//const Keyelement = "碳水化合物";
//const Keyelement = "钠";
//const Keyelement = "膳食纤维";
//const Keyelement = "钙";
var Detailtable = new Object();
//var caloriesTable = new Object(); 
//var ProteinTable = new Object(); 
//var FatTable = new Object(); 
//var CarbohydrateTable = new Object(); 
//var SodiumTable  = new Object(); 
//var DietaryFiberTable = new Object();
//var CalciumTable = new Object();


// read the arguments
var arguments = process.argv.splice(2);
if (arguments.length > 0) {
    if ((arguments.length == 1)&(arguments[0].length == 4)) {
        // year mode: "node raw 2023"
        startdate = arguments[0]+"0101";
        enddate = arguments[0]+"1231";
        loadmap();
        foodyearlog(arguments[0]);
        showtables();
        makeRfile();
    } else if ((arguments.length == 1)&(arguments[0].length == 8)) {
        // day mode:"node raw 20230410"
        startdate = arguments[0];
        enddate = arguments[0];
        loadmap();
        fooddaylog(arguments[0]);
        showtables();
        //makeRfile();
    }else if (arguments.length == 2){
        // period mode:"node raw 20230101 20230331"
        startdate = arguments[0];
        enddate = arguments[1];
        loadmap();
        foodperiodlog(startdate,enddate);
        showtables();
        makeRfile();
    }else{
        console.log("unkonw mode...\n\nyear mode:\t\"node raw 2023\"\nday mode:\t\"node raw 20230410\"\nperiod mode:\t\"node raw 20230101 20230331\"\ntoday mode:\t\"node raw\"");
        process.exit();
    }
} else {
    // today mode:"node raw"
    startdate = datestr();
    enddate = datestr();
    loadmap();
    fooddaylog(datestr());
    showtables();
    //makeRfile();
}


// loaf element data
// load log between given period
function loadmap(){
    var startfilename = "d."+startdate+".yaml";
    var endfilename = "d."+enddate+".yaml";

    try {
        fs.readdirSync("food").forEach(file => {
            if (file.substr(0, 2) == "d.") {
                if((file >= startfilename) & (file <= endfilename)){
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
                if((file >= startfilename) & (file <= endfilename)){
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

// day mode and today mode
function fooddaylog(date) {
    if (fmap[date] === undefined)
        return; // have not record of today or yestoday yet

    fooddaysum(date,etable,ftable);
    daycnt++;
}

// period mode
function foodperiodlog(startdate,enddate) {
    for(var date in fmap){
        if((date >= startdate) && (date <= enddate)){
            fooddaysum(date,etable,ftable);
            daycnt++;
        }
    }
}

// year mode
function foodyearlog(year) {
    for(var date in fmap){
        if(date.slice(0,4) == year){
            fooddaysum(date,etable,ftable);
            daycnt++;
        }
    }
}

// display the tables
function showtables(){
    if(typeof Keyelement !== "undefined" && Keyelement !== null)
    {
        console.log(Keyelement+"明细表");
        console.table(Detailtable);
    }
    

    console.log(">> 脂肪供能%d%%  碳水供能%d%%  蛋白质供能%d%% <<",(etable["脂肪"].amount*9.0*100/etable["热量"].amount).toFixed(2),(etable["碳水化合物"].amount*4*100/etable["热量"].amount).toFixed(2),(etable["蛋白质"].amount*4*100/etable["热量"].amount).toFixed(2));
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
        var dayamount = etable[name].amount/daycnt ;
        var daynrv = etable[name].nrv/daycnt ;
        var amounttab = "\t\t";
        if(etable[name].amount > 10000){
            amounttab = "\t";
        }

        if (name.replace(/[^\x00-\xff]/g, '**').length < 8) {
            console.log(name + "\t\t" + etable[name].amount.toFixed(2) + amounttab + dayamount.toFixed(2) + "\t" + etable[name].unit + "\t" + daynrv.toFixed(2));
        } else {
            console.log(name + "\t" + etable[name].amount.toFixed(2) + amounttab + dayamount.toFixed(2) + "\t" + etable[name].unit + "\t" + daynrv.toFixed(2));
        }
    }

    //console.log("typeof ftable"+typeof(ftable));
    if(Object.keys(ftable).length>0){
        console.log("\n\t\t未算入成份表的食物\n名称\t\t\t总数量\t\t日均\t单位");
        let foodSorted = Object.keys(ftable).sort(function (a, b) { return ftable[a].amount - ftable[b].amount })
    
        for (var i in foodSorted) {
            var name = foodSorted[i];
            var dayamount = ftable[name].amount/daycnt ;
    
            var nametab = "\t\t\t"
            if(name.replace(/[^\x00-\xff]/g, '**').length >= 8){
                nametab = "\t\t";
            }
            if(name.replace(/[^\x00-\xff]/g, '**').length >= 16){
                nametab = "\t";
            }
    
            var amounttab = "\t\t";
            if(ftable[name].amount > 10000){
                amounttab = "\t";
            }
            console.log(name + nametab + ftable[name].amount.toFixed(2) + amounttab + dayamount.toFixed(2) + "\t" + ftable[name].unit);
        }
    }
    if(daycnt > 1){
        console.log("\n%s ~ %s : %d days.",startdate,enddate,daycnt);
    }
}

// Statistics of the food,water,med and their element in the given day
function fooddaysum(date,etable,ftable){
    d = fmap[date];
    var name, amount, unit, nrv;

    amount = 0;
    nrv = 0;

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

    var food = d.food;
    var keycnt = 1 ;

    for (var id in food) {
        if (food[id].name in emap) {
            let fooddata = emap[food[id].name];
            let r = food[id].amount / fooddata.amount;
            for (var e in fooddata.element) {
                let item = new Object();
                item.amount = parseFloat(fooddata.element[e].amount) * r;
                //console.log(fooddata.element[e].unit);
                item.unit = fooddata.element[e].unit.toLowerCase();
                item.nrv = parseFloat(fooddata.element[e].nrv) * r;

                if (item.unit == "mg") {
                    item.unit = "g";
                    item.amount = item.amount / 1000;
                }
                if ((item.unit == "µg") || (item.unit == "μg")) {
                    item.unit = "g";
                    item.amount = item.amount / 1000000;
                }
                if (item.unit == "kj") {
                    item.unit = "kcal";
                    item.amount = item.amount * 0.239;
                }

                if (e in etable) {
                    // element already in table
                    etable[e].amount += item.amount;
                    etable[e].nrv += item.nrv;
                } else {
                    // new element
                    etable[e] = item;
                }
                
                // detail data
                if(typeof Keyelement !== "undefined" && Keyelement !== null)
                {
                    if(e==Keyelement){
                        var data = new Object();
                        data["名称"] = food[id].name ;
                        data["摄入数量"] = food[id].amount+food[id].unit ;
                        data["含有"+Keyelement] = item.amount.toFixed(3)+item.unit ;
                        data["累计摄入"] = etable[e].amount.toFixed(3)+item.unit ;
                        data["累计nrv"] = etable[e].nrv.toFixed(2)+"%" ;
    
                        Detailtable[keycnt++] = data ;
                    };
                };

                // testlog: element detail
                /*var nametab = "\t\t\t"
                if (food[id].name.replace(/[^\x00-\xff]/g, '**').length >= 8) {
                    nametab = "\t\t";
                }
                if (food[id].name.replace(/[^\x00-\xff]/g, '**').length >= 16) {
                    nametab = "\t";
                } */
                //if(e=="膳食纤维") console.log(food[id].amount+food[id].unit+"\t"+food[id].name+nametab+"含有"+item.amount.toFixed(2)+item.unit+"\t累计摄入："+etable[e].amount.toFixed(2)+item.unit+"\t累计nrv:"+etable[e].nrv.toFixed(2)+"%");
            }
            delete food[id];
        } else {
            //newfood.push(item);
        }
    }

    for (var id in food) {
        if(food[id].name in ftable){
            ftable[food[id].name].amount += food[id].amount;
        }else{
            ftable[food[id].name] = food[id];
        }
    }

    var med = d.med;

    for(var id in med){
        if (med[id].name in emap) {//known med
            let meddata = emap[med[id].name];
            let r = med[id].amount / meddata.amount;  // 此处单位不能换算，无比人工写成相同。
            for (var e in meddata.element) {
                let item = new Object();
                item.amount = parseFloat(meddata.element[e].amount) * r;
                //console.log(meddata.element[e].unit);
                item.unit = meddata.element[e].unit.toLowerCase();
                item.nrv = parseFloat(meddata.element[e].nrv) * r;

                if (item.unit == "mg") {
                    item.unit = "g";
                    item.amount = item.amount / 1000;
                }
                if ((item.unit == "µg") || (item.unit == "μg")) {
                    item.unit = "g";
                    item.amount = item.amount / 1000000;
                }
                if (item.unit == "kj") {
                    item.unit = "kcal";
                    item.amount = item.amount * 0.239;
                }

                if (e in etable) {
                    // element already in table
                    etable[e].amount += item.amount;
                    etable[e].nrv += item.nrv;
                } else {
                    // new element
                    etable[e] = item;
                }
                // detail data
                if(typeof Keyelement !== "undefined" && Keyelement !== null)
                {
                    if(e==Keyelement){
                        var data = new Object();
                        data["名称"] = med[id].name ;
                        data["摄入数量"] = med[id].amount+med[id].unit ;
                        data["含有"+Keyelement] = item.amount.toFixed(3)+item.unit ;
                        data["累计摄入"] = etable[e].amount.toFixed(3)+item.unit ;
                        data["累计nrv"] = etable[e].nrv.toFixed(2)+"%" ;

                        Detailtable[keycnt++] = data ;
                    };
                };
                //if(e=="维生素C") console.log(med[id].amount+med[id].unit+"的"+med[id].name+"\t含有"+item.amount.toFixed(10)+item.unit+"。\t累计摄入："+etable[e].amount.toFixed(10)+"\t累计nrv:"+etable[e].nrv.toFixed(2));
            }
            
            delete med[id];
        }else{//unknown med
            //console.log("unknown med:"+med[id].name+"\t"+med[id].amount+"\t"+med[id].unit);
            if(med[id].name in ftable){
                ftable[med[id].name].amount += med[id].amount;
            }else{
                ftable[med[id].name] = med[id];
            }
            //console.log("ftable:"+ftable[med[id].name].name+"\t"+ftable[med[id].name].amount+"\t"+ftable[med[id].name].unit);
        }
    }

}

// make then R files
function makeRfile() {
    var d = "date <- c(";
    var w1 = "weight1 <- c(";
    var w2 = "weight2 <- c(";
    var sleep = "sleep <- c(";
    var wake = "wake <- c(";
    var sleeplong = "sleeplong <- c(";
    var wmax, wmin;

    var dBPM = "date <- c(";
    var PRbpm1= "PRbpm1 <- c(";  // PRbpm in wake up
    var PRbpm2= "PRbpm2 <- c(";  // PRbpm after exercise
    var endheartrate= "endheartrate <- c(";  // heartrate after exercise

    var cnt = 0;
    var bFirst = true;
    var BPMcnt = 0;
    var bBPMFirst = true;

    try {
        for (var day in fmap) {
            //console.log("\nday="+day+"hmap[day]="+hmap[day]);
            sleepday = Math.floor(hmap[day].sleep.time / 1000000);
            sleephour = Math.floor(hmap[day].sleep.time % 1000000 / 10000);
            sleepminute = Math.floor(hmap[day].sleep.time % 10000 / 100);
            sleeptime = sleephour * 60 + sleepminute;

            //console.log("\n================="+day+"=================\nhmap[day].sleep.time:"+hmap[day].sleep.time+"\nsleephour:\t"+sleephour+"\nsleepminute:\t"+sleepminute);

            if (sleepday < day) { sleeptime -= 24 * 60 };

            wakeday = Math.floor(hmap[day].wake.time / 1000000);
            wakehour = Math.floor(hmap[day].wake.time % 1000000 / 10000);
            wakeminute = Math.floor(hmap[day].wake.time % 10000 / 100);
            waketime = wakehour * 60 + wakeminute;

            sleeplongtime = waketime - sleeptime;

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

                    //if(!hmap[day].wake.weight) {console.log("can find wake weight:"+day);}

                    sleep = sleep + "," + sleeptime;
                    wake = wake + "," + waketime;
                    sleeplong = sleeplong + "," + sleeplongtime;

                    if (wmax < hmap[day].sleep.weight + 0.5) wmax = hmap[day].sleep.weight + 0.5;
                    if (wmin > hmap[day].wake.weight - 0.5) wmin = hmap[day].wake.weight - 0.5;

                }

                if(bBPMFirst){
                    if(hmap[day].wake.PRbpm != undefined){
                        dBPM = dBPM + "\"" + day + "\"";
                        PRbpm1 = PRbpm1 + hmap[day].wake.PRbpm;
                        if(hmap[day].exercise == undefined){
                            PRbpm2 = PRbpm2 + "0";
                            endheartrate = endheartrate + "0";
                        }else{
                            PRbpm2 = PRbpm2 + hmap[day].exercise[0].PRbpm;
                            endheartrate = endheartrate + hmap[day].exercise[0].endheartrate;
                        }
                        BPMcnt++;
                        bBPMFirst = false;
                    }
                    
                }else{
                    dBPM = dBPM + ',\"' + day + "\"";
                    PRbpm1 = PRbpm1 + "," + hmap[day].wake.PRbpm;
                    if(hmap[day].exercise == undefined){
                        PRbpm2 = PRbpm2 + ",0";
                        endheartrate = endheartrate + ",0";
                    }else{
                        PRbpm2 = PRbpm2 +  "," + hmap[day].exercise[0].PRbpm;
                        endheartrate = endheartrate +  "," + hmap[day].exercise[0].endheartrate;
                    }
                    BPMcnt++;
                }
            }
        }
    } catch (e) {
        // failure
        console.log("comment print error！" + day + fmap[day] + hmap[day] + e);
    }

    d = d + ")";
    w1 = w1 + ")";
    w2 = w2 + ")";
    sleep = sleep + ")";
    wake = wake + ")";
    sleeplong = sleeplong + ")";
    dBPM = dBPM + ")";
    PRbpm1 = PRbpm1 + ")";
    PRbpm2 = PRbpm2 + ")";
    endheartrate = endheartrate + ")";

    var wstr = d + "\r\n" + w1 + "\r\n" + w2 + "\r\nplot(c(1:" + cnt + "),weight1,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\",ylim=range(" + wmin + ":" + wmax + "))\r\nlines(c(1:" + cnt + "),weight2,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlegend(\"topleft\",inset=.05,title=\"体重曲线\",c(\"睡前\",\"醒后\"),lty=c(1,2),pch=c(15,17),col=c(\"red\",\"blue\"))\r\naxis(1, c(1:" + cnt + "),date)\r\n";
    fs.writeFile("health/weight.R", wstr, (err) => {
        if (err) throw err;
        console.log('health/weight.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/weight.R\",encoding = \"UTF-8\")');
      });
    
    var sleepstr = d + "\r\n" + sleep + "\r\n" + wake + "\r\n" + sleeplong + "\r\nplot(c(1:" + cnt + "),sleep,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\")\r\nlines(c(1:" + cnt + "),wake,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlines(c(1:" + cnt + "),sleeplong,type=\"b\",pch=21,lty=2,col=\"green\")\r\nlegend(\"topleft\",inset=.05,title=\"睡眠曲线\",c(\"睡\",\"醒\",\"时长\"),lty=c(1,2,2),pch=c(15,17,21),col=c(\"red\",\"blue\",\"green\"))\r\nabline(h = 480)\r\naxis(1, c(1:" + cnt + "),date)\r\n";
    fs.writeFile("health/sleep.R", sleepstr, (err) => {
        if (err) throw err;
        console.log('health/sleep.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/sleep.R\",encoding = \"UTF-8\")');
      });

    var PRbpmstr = dBPM + "\r\n" + PRbpm1 + "\r\n" + PRbpm2 + "\r\n" + endheartrate + "\r\nplot(c(1:" + BPMcnt + "),PRbpm1,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\",ylim=range(50:160))\r\nlines(c(1:" + BPMcnt + "),PRbpm2,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlines(c(1:" + BPMcnt + "),endheartrate,type=\"b\",pch=21,lty=2,col=\"green\")\r\nlegend(\"topleft\",inset=.05,title=\"心率曲线\",c(\"起床血氧仪\",\"运动后血氧仪\",\"运动后把脉\"),lty=c(1,2,2),pch=c(15,17,21),col=c(\"red\",\"blue\",\"green\"))\r\naxis(1, c(1:" + BPMcnt + "),date)\r\n";
    fs.writeFile("health/heartrate.R", PRbpmstr, (err) => {
        if (err) throw err;
        console.log('health/heartrate.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/heartrate.R\",encoding = \"UTF-8\")');
      });
}


// utils
function datestr() {
    var theDate = new Date();
    //theDate.setDate(theDate.getDate() - 1);
    theDate.setDate(theDate.getDate());

    var year = theDate.getFullYear();
    var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
    var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
    var dateStr = year + "" + month + "" + day;

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
            if ((item.unit == "µg") || (item.unit == "μg")) {
                item.unit = "g";
                item.amount = item.amount / 1000000;
            }
            if (item.unit == "kj") {
                item.unit = "kcal";
                item.amount = item.amount * 0.239;
            }

            if ((item.unit == "g") && (item.amount < 1)) {
                if (item.amount < 0.001) {
                    item.unit = "µg";
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