var fs = require('fs');
var yaml = require('js-yaml');
var os = require('os');
var child  =  require('child_process');

var fmap = new Object();
var hmap = new Object();

var list = fs.readdirSync("food");
for (var i = 0;i<list.length;i++){
  if(list[i].substr(0,2) == "d."){
	f = yaml.safeLoad(fs.readFileSync("food/"+list[i], 'utf8'));
	fmap[f.date] = f;
  }
}

list = fs.readdirSync("health");
for (var i = 0;i<list.length;i++){
  if(list[i].substr(0,2) == "d."){
	h = yaml.safeLoad(fs.readFileSync("health/"+list[i], 'utf8'));
	hmap[h.date] = h;
  }
}

var d = "date <- c(";
var w1 = "weight1 <- c(";
var w2 = "weight2 <- c(";

var cnt = 0;
var bFirst = true ;

for (var day in fmap) {
	console.log("\n================="+day+"=================\nfood:\t"+fmap[day].comment+"\nhealth:\t"+hmap[day].comment);
	if (day > "20150407") {
		cnt = cnt + 1;
		if (bFirst) {
			d = d+ "\"" + day + "\"";
			w1 = w1+hmap[day].sleep.weight;
			w2 = w2+hmap[day].wake.weight;
			bFirst = false;
		} else {
			d = d+',\"'+day+ "\"";
			w1 = w1+","+ hmap[day].sleep.weight;
			w2 = w2+","+ hmap[day].wake.weight;
		}
	}
}

d = d + ")";
w1 = w1 + ")";
w2 = w2 + ")";

var wstr = d+"\r\n"+w1+"\r\n"+w2+"\r\nplot(c(1:"+cnt+"),weight1,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\")\r\nlines(c(1:"+cnt+"),weight2,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlegend(\"topleft\",inset=.05,title=\"体重曲线\",c(\"睡前\",\"醒后\"),lty=c(1,2),pch=c(15,17),col=c(\"red\",\"blue\"))\r\naxis(1, c(1:"+cnt+"),date)\r\n";
fs.writeFile("health/weight.R",wstr);
console.log("\n\n体重曲线在health/weight.R");

console.log(os.type());
console.log(os.platform());
console.log(os.release());

//Windows_NT
//win32
//6.1.7601

//Darwin
//darwin
//14.1.0

openbrowser("http://www.xuemen.com")

function openbrowser(url) {
	switch (os.platform()) {
	case "linux":
		child.exec("xdg-open "+ url);
		break;
	case "win32":
	case "win64":
		console.log("win32");
		//child.spawnSync("rundll32", "url.dll,FileProtocolHandler", url);
		//child.exec("start", url);
		child.exec("start "+url);
		break;
	case "darwin":
		child.execSync("open", url);
		break;
	default:
		console.log("unsupported platform");
		break;
	};
}
