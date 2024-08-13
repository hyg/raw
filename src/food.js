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
                    if ((file >= startfilename) & (file <= endfilename)) {
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
    fooddaysum: function(date){
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

    }
}