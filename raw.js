var fs = require('fs');
var yaml = require('js-yaml');
var os = require('os');
var child = require('child_process');

var fmap = new Object();
var emap = new Object();
var hmap = new Object();

try {
    var list = fs.readdirSync("food");
    for (var i = 0; i < list.length; i++) {
        if (list[i].substr(0, 2) == "d.") {
            f = yaml.load(fs.readFileSync("food/" + list[i], 'utf8'));
            fmap[f.date] = f;
        }
        if (list[i].substr(0, 2) == "e.") {
            e = yaml.load(fs.readFileSync("food/" + list[i], 'utf8'));
            emap[e.name] = e;
            //if(e.name == "胶原蛋白肽粉") console.log(e.name+"\tamount:"+e.element["锌"].amount+"\tunit:"+e.element["锌"].unit+"\tnrv:"+e.element["锌"].nrv);
        }
    }

    list = fs.readdirSync("health");
    for (var i = 0; i < list.length; i++) {
        if (list[i].substr(0, 2) == "d.") {
            h = yaml.load(fs.readFileSync("health/" + list[i], 'utf8'));
            //if(!h.wake.weight) {console.log("can find wake data"+h.date);}
            hmap[h.date] = h;
        }
    }
} catch (e) {
    // failure
    console.log("yaml read error！" + list[i] + e);
}

var arguments = process.argv.splice(2);
var startdate,enddate ;
if (arguments.length > 0) {
    if (arguments[0].length == 4) {
        foodyearlog(arguments[0]);
        startdate = arguments[0]+"0101";
        enddate = arguments[0]+"1231";
    } else {
        startdate = arguments[0];
        enddate = arguments[1];
        foodperiodlog(startdate,enddate);
    }
} else {
    fooddaylog(datestr());
    startdate = datestr();
    enddate = datestr();
}
console.log("startdate=",startdate);
console.log("enddate=",enddate);
makeRfile();


function foodyearlog(year) {
    let etable = new Object();
    let ftable = new Object();
    let daycnt = 0;

    for(var date in fmap){
        if(date.slice(0,4) == year){
            fooddaysum(date,etable,ftable);
            daycnt++;
        }
    }

    console.log("day counter = ",daycnt);

    console.log("成份表\n名称\t\t总数量\t\t日均\t单位\tNRV(%)");
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

    console.log("\n未算入成份表的食物\n名称\t\t\t总数量\t\t日均\t单位");
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
                //if(fooddata.name == "胶原蛋白肽粉") console.log(fooddata.name+"\tamount:"+fooddata.element["锌"].amount+"\tunit:"+fooddata.element["锌"].unit+"\tnrv:"+fooddata.element["锌"].nrv);
                if(e=="钠") console.log(food[id].amount+food[id].unit+"的"+food[id].name+"\t含有"+item.amount.toFixed(10)+item.unit+"。\t累计摄入："+etable[e].amount.toFixed(10)+"\t累计nrv:"+etable[e].nrv.toFixed(2));
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

// 
function foodperiodlog(startdate,enddate) {
    let etable = new Object();
    let ftable = new Object();
    let daycnt = 0;

    for(var date in fmap){
        if((date >= startdate) && (date <= enddate)){
            fooddaysum(date,etable,ftable);
            daycnt++;
        }
    }

    console.log("day counter = ",daycnt);

    console.log("成份表\n名称\t\t总数量\t\t日均\t单位\tNRV(%)");
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

    console.log("\n未算入成份表的食物\n名称\t\t\t总数量\t\t日均\t单位");
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

// 
function fooddaylog(date) {
    //console.log(fmap[datestr()]);
    //console.log(date);
    //console.log(fmap[date]);
    if (fmap[date] === undefined)
        return; // have not record of today or yestoday yet

    d = fmap[date];
    let etable = new Object();
    let ftable = new Object();

    fooddaysum(date,etable,ftable);

    console.log("成份表\n名称\t\t总数量\t\t单位\tNRV(%)");
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
        var dayamount = etable[name].amount ;
        var daynrv = etable[name].nrv ;
        var amounttab = "\t\t";
        if(etable[name].amount > 10000){
            amounttab = "\t";
        }

        if (name.replace(/[^\x00-\xff]/g, '**').length < 8) {
            console.log(name + "\t\t" + etable[name].amount.toFixed(2) + amounttab + etable[name].unit + "\t" + daynrv.toFixed(2));
        } else {
            console.log(name + "\t" + etable[name].amount.toFixed(2) + amounttab + etable[name].unit + "\t" + daynrv.toFixed(2));
        }
    }

    console.log("\n未算入成份表的食物\n名称\t\t\t总数量\t\t单位");
    
    let foodSorted = Object.keys(ftable).sort(function (a, b) { return ftable[a].amount - ftable[b].amount })
    //console.log(foodSorted);
    for (var i in foodSorted) {
        var name = foodSorted[i];
        var dayamount = ftable[name].amount ;

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

        console.log(name + nametab + ftable[name].amount.toFixed(2) + amounttab + ftable[name].unit);
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

    var cnt = 0;
    var bFirst = true;

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

    var wstr = d + "\r\n" + w1 + "\r\n" + w2 + "\r\nplot(c(1:" + cnt + "),weight1,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\",ylim=range(" + wmin + ":" + wmax + "))\r\nlines(c(1:" + cnt + "),weight2,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlegend(\"topleft\",inset=.05,title=\"体重曲线\",c(\"睡前\",\"醒后\"),lty=c(1,2),pch=c(15,17),col=c(\"red\",\"blue\"))\r\naxis(1, c(1:" + cnt + "),date)\r\n";
    fs.writeFile("health/weight.R", wstr, (err) => {
        if (err) throw err;
        console.log('health/weight.R文件已被保存');
        console.log('在R环境运行 source(\"D:/huangyg/git/raw/health/weight.R\",encoding = \"UTF-8\")');
      });
    
    var sleepstr = d + "\r\n" + sleep + "\r\n" + wake + "\r\n" + sleeplong + "\r\nplot(c(1:" + cnt + "),sleep,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\")\r\nlines(c(1:" + cnt + "),wake,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlines(c(1:" + cnt + "),sleeplong,type=\"b\",pch=21,lty=2,col=\"green\")\r\nlegend(\"topleft\",inset=.05,title=\"睡眠曲线\",c(\"睡\",\"醒\",\"时长\"),lty=c(1,2,2),pch=c(15,17,21),col=c(\"red\",\"blue\",\"green\"))\r\nabline(h = 480)\r\naxis(1, c(1:" + cnt + "),date)\r\n";
    fs.writeFile("health/sleep.R", sleepstr, (err) => {
        if (err) throw err;
        console.log('health/sleep.R文件已被保存');
        console.log('在R环境运行 source(\"D:/huangyg/git/raw/health/sleep.R\",encoding = \"UTF-8\")');
      });
}


// utils
function datestr() {
    var theDate = new Date();
    theDate.setDate(theDate.getDate() - 1);

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
