const config = require('./config.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    fmap: new Object(),
    emap: new Object(),
    ftable: new Object(),
    etable: new Object(),
    loadmap: function () {
        var startfilename = "d." + config.startdate + ".yaml";
        var endfilename = "d." + config.enddate + ".yaml";
        try {
            fs.readdirSync("../food").forEach(file => {
                if (file.substr(0, 2) == "d.") {
                    if ((file >= startfilename) && (file <= endfilename)) {
                        f = yaml.load(fs.readFileSync("food/" + file, 'utf8'));
                        this.fmap[f.date] = f;
                    }
                }
                if (file.substr(0, 2) == "e.") {
                    e = yaml.load(fs.readFileSync("food/" + file, 'utf8'));
                    this.emap[e.name] = e;
                }
            });
        } catch (e) {
            // failure
            console.log("yaml read error！" + e);
        }
    },
    fooddaylog: function (date) {
        if (fmap[date] === undefined)
            return; // have not record of today or yestoday yet

        fooddaysum(date);
        daycnt++;
    },
    fooddaysum: function (date) {
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
    },
    maketable: function () {
        if (typeof config.Keyelement !== "undefined" && configKeyelement !== null) {
            console.log(config.Keyelement + "明细表");
            console.table(Detailtable);
        }

        var NRV = yaml.load(fs.readFileSync(NRVfilename));
        var DRIsfilename = "food/DRIs." + NRV.DRIs + ".yaml";
        var DRIs = yaml.load(fs.readFileSync(DRIsfilename));

        // put NRV data into DRIs
        for (var element in NRV.element) {
            if (DRIs.element[element].unit == NRV.element[element].unit) {
                DRIs.element[element].RNI = NRV.element[element].amount;
            } else {
                console.log("maketalbe() > unit different between NRV and DRIs: " + element);
            }
        }

        //console.log("maketable()> DRIs:\n"+yaml.dump(DRIs));
        //console.log("maketable()> etable:\n"+yaml.dump(etable));
        //return;

        if (JSON.stringify(etable) === "{}") {
            console.log("empty data.")
            return;
        }

        var elementtable = new Object();


        if (etable["热量"] != null) {
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
                }
                item["单位"] = etable[name].unit;
                item["总量"] = etable[name].amount.toFixed(2);
                item["日均"] = parseFloat((etable[name].amount / daycnt).toFixed(2));
                item["NRV(%)"] = parseFloat((etable[name].nrv / daycnt).toFixed(2));
                //console.log("maketable()> unit: "+ etable[name].unit);

                if (DRIs.element[name] != null) {
                    var r;
                    if ((fRate[DRIs.element[name].unit] !== undefined) && (fRate[DRIs.element[name].unit][etable[name].unit] !== undefined)) {
                        r = fRate[DRIs.element[name].unit][etable[name].unit];
                    } else {
                        console.log("maketalbe() > unit different between etable and DRIs: " + name + " [" + DRIs.element[name].unit + "] [" + etable[name].unit + "] " + fRate[DRIs.element[name].unit] + " " + fRate[DRIs.element[name].unit][etable[name].unit]);
                    }

                    for (var param in DRIs.element[name]) {
                        if ((param != "unit") && (DRIs.element[name][param] != null) && (DRIs.element[name][param] != "")) {
                            item[param] = (DRIs.element[name][param] * r).toFixed(2);
                            //item[param] = parseFloat((DRIs.element[name][param] * r).toFixed(2));
                            item[param + "(%)"] = parseFloat((100 * item["日均"] / item[param]).toFixed(2));
                        }
                    }
                } else {
                    //console.log("maketable()> can't find it in DRIs: "+name);
                }
                elementtable[name] = item;
            }
            //console.table(elementtable, ["总量", "日均", "单位", "NRV(%)", "RNI", "RNI(%)", "AI", "AI(%)", "UL", "UL(%)", "PI_NCD", "SPL"]);
            console.table(elementtable, ["日均", "单位", "NRV(%)", "RNI", "RNI(%)", "AI", "AI(%)", "UL", "UL(%)", "PI_NCD", "SPL"]);
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
}