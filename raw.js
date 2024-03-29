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
//const Keyelement = "蛋白质";
//const Keyelement = "脂肪";
//const Keyelement = "碳水化合物";
//const Keyelement = "钠";
//const Keyelement = "膳食纤维";
//const Keyelement = "钙";
//const Keyelement = "VC(抗坏血酸)";
//const Keyelement = "VA(视黄醇等)";

var keycnt = 1 ;
var Detailtable = new Object();
//var caloriesTable = new Object(); 
//var ProteinTable = new Object(); 
//var FatTable = new Object(); 
//var CarbohydrateTable = new Object(); 
//var SodiumTable  = new Object(); 
//var DietaryFiberTable = new Object();
//var CalciumTable = new Object();


var fRate = {//换算率
    ng: { ng:1, μg: 0.001, mg: 0.001 * 0.001, g: 0.001 * 0.001 * 0.001, kg: 0.001 * 0.001 * 0.001 * 0.001, t: 0.001 * 0.001 * 0.001 * 0.001 * 0.001, ul: 0.001 * 0.001, ml: 0.001 * 0.001 * 0.001, L: 0.001 * 0.001 * 0.001 * 0.001 },
    μg: { ng: 1000, μg:1, mg: 0.001, g: 0.001 * 0.001, kg: 0.001 * 0.001 * 0.001, t: 0.001 * 0.001 * 0.001 * 0.001, ul:0.001, ml:0.001 * 0.001, L:0.001 * 0.001 * 0.001 },
    mg: { ng: 1000 * 1000, μg: 1000, mg:1, g: 0.001, kg: 0.001 * 0.001, t:0.001 * 0.001 * 0.001, ul:1, ml: 0.001, L: 0.001 * 0.001 },
    g: { ng: 1000 * 1000*1000, μg: 1000*1000, mg:1000, g:1, kg: 0.001, t: 0.001 * 0.001, ul: 1000 , ml: 1, L: 0.001 },
    kg: { ng: 1000 * 1000 * 1000 * 1000, μg: 1000 * 1000, mg: 1000, g: 1000, kg:1, t: 0.001 , ul: 1000 * 1000 , ml: 1000, L: 1 },
    t: { ng: 1000 * 1000 * 1000 * 1000 * 1000, μg: 1000 * 1000 * 1000, mg: 1000 * 1000, g: 1000 * 1000, kg: 1000, t:1, ul: 1000 * 1000 * 1000, ml: 1000 * 1000, L: 1000 },
    ml: { ng: 1000 * 1000 * 1000, μg: 1000 * 1000, mg: 1000, g: 1, kg: 0.001, t: 0.001 * 0.001, ul: 1000 , ml:1, L: 0.001 },
    ul: { ng: 1000 * 1000, μg: 1000, ml: 1, g: 0.001, kg: 0.001 * 0.001, t: 0.001 * 0.001 * 0.001, ul:1, ml: 0.001, L: 0.001 * 0.001 },
    L: { ng: 1000 * 1000 * 1000 * 1000, μg: 1000 * 1000, mg: 1000, g: 1000,kg:1, t: 0.001, ul: 1000 * 1000, ml: 1000,L:1 },
    };

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
    }else if ((arguments.length == 1)&(arguments[0].length != 8)&(!isNaN(arguments[0]))) {
        // diff day mode:"node raw -1"
        var diff = parseInt(arguments[0]);
        //console.log("diff day mode. diff="+diff);

        startdate = datestr(diff);
        enddate = datestr(diff);
        loadmap();
        fooddaylog(datestr(diff));
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
        console.log("unkonw mode...\n\nyear mode:\t\"node raw 2023\"\nday mode:\t\"node raw 20230410\"\ndiff day mode:\t\"node raw -1\"\nperiod mode:\t\"node raw 20230101 20230331\"\ntoday mode:\t\"node raw\"");
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

    // d.file is daily log.
    // e.file is food data.
            // food -> element
            // food -> food
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

    if(JSON.stringify(etable) === "{}"){
        console.log("empty data.")
        return;
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
    var name, amount, unit, nrv, oldenergy;

    amount = 0;
    nrv = 0;
    if("热量" in etable){
        oldenergy = etable["热量"].amount ;
    }else{
        oldenergy = 0 ;
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
            if(food[id].unit == undefined){
                console.log("undefined unit. date:"+date+"\tfoodname:"+food[id].name)
            }
            if(foodsum(food[id].name,food[id].amount,food[id].unit,etable,ftable)){
                delete food[id];
            }else{
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
                        data["摄入数量"] = med[id].amount.toFixed(2)+med[id].unit ;
                        data["含有"+Keyelement] = item.amount.toFixed(3)+item.unit ;
                        data["累计摄入"] = etable[e].amount.toFixed(3)+item.unit ;
                        data["累计nrv"] = etable[e].nrv.toFixed(2)+"%" ;

                        Detailtable[keycnt++] = data ;
                    };
                };
                //if(e=="VC(抗坏血酸)") console.log(med[id].amount+med[id].unit+"的"+med[id].name+"\t含有"+item.amount.toFixed(10)+item.unit+"。\t累计摄入："+etable[e].amount.toFixed(10)+"\t累计nrv:"+etable[e].nrv.toFixed(2));
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

    fmap[date]["热量"] = (etable["热量"].amount - oldenergy).toFixed(3);
}

function foodsum(foodname,foodamount,foodunit,etable,ftable){
    //console.log("foodunit's type:"+typeof(foodunit));
    //console.log("foodsum:\t"+foodname+"\t"+foodamount+"\t"+foodunit);
    if (foodname in emap) {
        let fooddata = emap[foodname];

        // todo:check the unit (g,mg,kg,...) and change amount
        //console.log("fooddata.unit's type:"+typeof(fooddata.unit));
        let r = 1;
        if(foodunit == fooddata.unit){
            r = foodamount / fooddata.amount;
        }else if((fRate[foodunit] !== undefined) && (fRate[foodunit][fooddata.unit] !== undefined)){
            r = foodamount * fRate[foodunit][fooddata.unit] / fooddata.amount;
        }else{
            console.log("unknow unit:\t"+foodunit+"\t"+fooddata.unit+"\tfoodname:"+foodname+"\tfoodamount:"+foodamount);
        }
        

        for (var id in fooddata.food) {
            foodsum(fooddata.food[id].name,fooddata.food[id].amount*r,fooddata.food[id].unit,etable,ftable);
        }

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
                    data["名称"] = foodname ;
                    data["摄入数量"] = foodamount.toFixed(2)+foodunit ;
                    data["含有"+Keyelement] = item.amount.toFixed(3)+item.unit ;
                    data["累计摄入"] = etable[e].amount.toFixed(3)+item.unit ;
                    data["累计nrv"] = etable[e].nrv.toFixed(2)+"%" ;

                    Detailtable[keycnt++] = data ;
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
    var PRbpm1= "PRbpm1 <- c(";  // PRbpm in wake up
    var PRbpm2= "PRbpm2 <- c(";  // PRbpm after exercise
    var endheartrate= "endheartrate <- c(";  // heartrate after exercise

    var cnt = 0;
    var bFirst = true;
    var BPMcnt = 0;
    var bBPMFirst = true;
    var lastPRbpm2 = 90;
    var lastastendheartrate =90;

    try {
        for (var day in fmap) {
            //console.log("\nday="+day+"hmap[day]="+hmap[day]);
            sleepday = Math.floor(hmap[day].sleep.time / 1000000);
            sleephour = Math.floor(hmap[day].sleep.time % 1000000 / 10000);
            sleepminute = Math.floor(hmap[day].sleep.time % 10000 / 100);
            sleeptime = sleephour * 60 + sleepminute;

            if(sleeptime>1440){
                console.log("debug: sleeptime>1440\t"+ sleeptime + "\tday:\t"+ day);
            }

            //console.log("\n================="+day+"=================\nhmap[day].sleep.time:"+hmap[day].sleep.time+"\nsleephour:\t"+sleephour+"\nsleepminute:\t"+sleepminute);

            if (sleepday < day) { sleeptime -= 24 * 60 };

            wakeday = Math.floor(hmap[day].wake.time / 1000000);
            wakehour = Math.floor(hmap[day].wake.time % 1000000 / 10000);
            wakeminute = Math.floor(hmap[day].wake.time % 10000 / 100);
            waketime = wakehour * 60 + wakeminute;
            if (wakeday < day) { waketime -= 24 * 60 };
            if (wakeday > day) { waketime += 24 * 60 };

            if((wakeday <= day) && (waketime>1440)){
                console.log("debug: waketime>1440\t"+ waketime + "\tday:\t"+ day);
            }

            sleeplongtime = waketime - sleeptime;

            
            if(sleeplongtime>1100){
                console.log("debug: sleeplongtime>1100\t"+ sleeplongtime + "\tday:\t"+ day +"\tsleeptime:"+ sleeptime + "\twaketime:"+ waketime );
            }
            if(sleeplongtime<0){
                console.log("debug: sleeplongtime<0\t"+ sleeplongtime + "\tday:\t"+ day +"\tsleeptime:"+ sleeptime + "\twaketime:"+ waketime );
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

                if(bBPMFirst){
                    if(hmap[day].wake.PRbpm != undefined){
                        dBPM = dBPM + "\"" + day + "\"";
                        PRbpm1 = PRbpm1 + hmap[day].wake.PRbpm;
                        if(hmap[day].exercise == undefined){
                            PRbpm2 = PRbpm2 + lastPRbpm2;
                            endheartrate = endheartrate + lastendheartrate;
                        }else{
                            PRbpm2 = PRbpm2 + hmap[day].exercise[0].PRbpm;
                            endheartrate = endheartrate + hmap[day].exercise[0].endheartrate;
                            lastPRbpm2 = hmap[day].exercise[0].PRbpm;
                            lastendheartrate = hmap[day].exercise[0].endheartrate;
                        }
                        BPMcnt++;
                        bBPMFirst = false;
                    }
                    
                }else{
                    dBPM = dBPM + ',\"' + day + "\"";
                    PRbpm1 = PRbpm1 + "," + hmap[day].wake.PRbpm;
                    if(hmap[day].exercise == undefined){
                        PRbpm2 = PRbpm2 + "," + lastendheartrate;
                        endheartrate = endheartrate + "," + lastendheartrate;
                    }else{
                        PRbpm2 = PRbpm2 +  "," + hmap[day].exercise[0].PRbpm;
                        endheartrate = endheartrate +  "," + hmap[day].exercise[0].endheartrate;
                        lastPRbpm2 = hmap[day].exercise[0].PRbpm;
                        lastendheartrate = hmap[day].exercise[0].endheartrate;
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
    energy = energy + ")";
    sleep = sleep + ")";
    wake = wake + ")";
    sleeplong = sleeplong + ")";
    dBPM = dBPM + ")";
    PRbpm1 = PRbpm1 + ")";
    PRbpm2 = PRbpm2 + ")";
    endheartrate = endheartrate + ")";

    var wstr = d + "\r\n" + w1 + "\r\n" + w2 + "\r\n"+ energy + "\r\nopar <- par(mar = c(5,4,4,5))\r\nplot(c(1:" + cnt + "),weight1,type=\"s\",col=\"red\",xaxt=\"n\",xlab = \"date\",ylab = \"weight(kg)\",ylim=range(" + wmin + ":" + wmax + "))\r\nlines(c(1:" + cnt + "),weight2,type=\"s\",col=\"blue\")\r\nlegend(\"topright\",inset=.05,title=\"体重曲线\",c(\"睡前\",\"醒后(辅助线:50.5~51.5)\",\"热量\"),lty=c(1,1,1),col=c(\"red\",\"blue\",\"green\"))\r\nabline(h = 51.5,col=\"blue\",lty = 3)\r\nabline(h = 50.5,col=\"blue\",lty = 3)\r\naxis(1, c(1:" + cnt + "),date)\r\npar(new = TRUE)\r\nplot(c(1:" + cnt + "), energy,type=\"s\", pch = \"+\", col = \"green\", axes = FALSE, xlab = \"\", ylab = \"\")\r\naxis(side = 4, at = pretty(range(energy)))\r\nmtext(\"energy(kcal)\", side = 4, line = 3)";
    fs.writeFile("health/weight.R", wstr, (err) => {
        if (err) throw err;
        console.log('health/weight.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/weight.R\",encoding = \"UTF-8\")');
      });
    
    var sleepstr = d + "\r\n" + sleep + "\r\n" + wake + "\r\n" + sleeplong + "\r\nplot(c(1:" + cnt + "),sleep,type=\"s\",col=\"red\",xaxt=\"n\",xlab = \"date\",ylab=\"time(minute)\",ylim=range(-1000,2200))\r\nlines(c(1:" + cnt + "),wake,type=\"s\",col=\"blue\")\r\nlines(c(1:" + cnt + "),sleeplong,type=\"s\",col=\"green\")\r\nlegend(\"topleft\",inset=.05,title=\"睡眠曲线\",c(\"睡(辅助线:凌晨)\",\"醒\",\"时长(辅助线:480)\"),lty=c(1,1,1),col=c(\"red\",\"blue\",\"green\"))\r\nabline(h = 0,col=\"red\",lty = 3)\r\nabline(h = 1440,col=\"red\",lty = 3)\r\nabline(h = 480,col=\"green\",lty = 3)\r\naxis(1, c(1:" + cnt + "),date)\r\n";
    fs.writeFile("health/sleep.R", sleepstr, (err) => {
        if (err) throw err;
        console.log('health/sleep.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/sleep.R\",encoding = \"UTF-8\")');
      });

    var PRbpmstr = dBPM + "\r\n" + PRbpm1 + "\r\n" + PRbpm2 + "\r\n" + endheartrate + "\r\nplot(c(1:" + BPMcnt + "),PRbpm1,type=\"s\",col=\"red\",xaxt=\"n\",xlab = \"date\",ylab=\"heart rate\",ylim=range(50:160))\r\nlines(c(1:" + BPMcnt + "),PRbpm2,type=\"s\",col=\"blue\")\r\nlines(c(1:" + BPMcnt + "),endheartrate,type=\"s\",col=\"green\")\r\nlegend(\"topleft\",inset=.05,title=\"心率曲线\",c(\"起床血氧仪(辅助线:50~65)\",\"运动后血氧仪\",\"运动后把脉\"),lty=c(1,1,1),col=c(\"red\",\"blue\",\"green\"))\r\nabline(h = 65,col=\"red\",lty = 3)\r\nabline(h = 50,col=\"red\",lty = 3)\r\naxis(1, c(1:" + BPMcnt + "),date)\r\n";
    fs.writeFile("health/heartrate.R", PRbpmstr, (err) => {
        if (err) throw err;
        console.log('health/heartrate.R文件已被保存。在R环境运行 source(\"D:/huangyg/git/raw/health/heartrate.R\",encoding = \"UTF-8\")');
      });
}

//health/weight.R文件已被保存。在R环境运行 source("D:/huangyg/git/raw/health/weight.R",encoding = "UTF-8")
//health/sleep.R文件已被保存。在R环境运行 source("D:/huangyg/git/raw/health/sleep.R",encoding = "UTF-8")
//health/heartrate.R文件已被保存。在R环境运行 source("D:/huangyg/git/raw/health/heartrate.R",encoding = "UTF-8")

// utils
function GetNumByUnit(num, unitname,outunitname) {
    var tnum = (num * fRate[unitname][outunitname]).toFixed(4);
    return tnum;
}

function datestr(diff=0) {
    var theDate = new Date();
    //theDate.setDate(theDate.getDate() - 1);
    theDate.setDate(theDate.getDate()+diff);

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