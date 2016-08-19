var fs = require('fs');
var yaml = require('js-yaml');
var os = require('os');
var child  =  require('child_process');

var fmap = new Object();
var hmap = new Object();

try{
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
}catch(e) {
	// failure
	console.log("yaml read error！"+ list[i] +e);
}



var d = "date <- c(";
var w1 = "weight1 <- c(";
var w2 = "weight2 <- c(";
var sleep = "sleep <- c(";
var wake = "wake <- c(";

var cnt = 0;
var bFirst = true ;

try{
	for (var day in fmap) {
		sleepday = Math.floor(hmap[day].sleep.time/1000000);
		sleephour = Math.floor(hmap[day].sleep.time%1000000/10000);
		sleepminute = Math.floor(hmap[day].sleep.time%10000/100);
		sleeptime = sleephour*60+sleepminute;
		
		//console.log("\n================="+day+"=================\nhmap[day].sleep.time:"+hmap[day].sleep.time+"\nsleephour:\t"+sleephour+"\nsleepminute:\t"+sleepminute);
		
		if (sleepday < day){sleeptime -= 24*60};
		
		wakeday = Math.floor(hmap[day].wake.time/1000000);
		wakehour = Math.floor(hmap[day].wake.time%1000000/10000);
		wakeminute = Math.floor(hmap[day].wake.time%10000/100);
		waketime = wakehour*60+wakeminute;
		
		//if(waketime > 1000) {console.log(day)}
		
		//console.log("\n================="+day+"=================\nfood:\t"+fmap[day].comment+"\nhealth:\t"+hmap[day].comment);
		if (day > "20150407") {
			cnt = cnt + 1;
			if (bFirst) {
				d = d+ "\"" + day + "\"";
				w1 = w1+hmap[day].sleep.weight;
				w2 = w2+hmap[day].wake.weight;
				
				sleep = sleep + sleeptime;
				wake  = wake + waketime;
				bFirst = false;
			} else {
				d = d+',\"'+day+ "\"";
				w1 = w1+","+ hmap[day].sleep.weight;
				w2 = w2+","+ hmap[day].wake.weight;
				
				sleep = sleep +","+ sleeptime;
				wake  = wake +","+ waketime;
			}
		}
	}
}catch(e) {
	// failure
	console.log("comment print error！"+ day +fmap[day]+hmap[day] +e);
}



d = d + ")";
w1 = w1 + ")";
w2 = w2 + ")";
sleep = sleep + ")";
wake = wake + ")";

var wstr = d+"\r\n"+w1+"\r\n"+w2+"\r\nplot(c(1:"+cnt+"),weight1,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\")\r\nlines(c(1:"+cnt+"),weight2,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlegend(\"topleft\",inset=.05,title=\"体重曲线\",c(\"睡前\",\"醒后\"),lty=c(1,2),pch=c(15,17),col=c(\"red\",\"blue\"))\r\naxis(1, c(1:"+cnt+"),date)\r\n";
fs.writeFile("health/weight.R",wstr);
console.log("\n\n体重曲线在health/weight.R");

var sleepstr = d+"\r\n"+sleep+"\r\n"+wake+"\r\nplot(c(1:"+cnt+"),sleep,type=\"b\",pch=15,lty=1,col=\"red\",xaxt=\"n\",xlab = \"date\")\r\nlines(c(1:"+cnt+"),wake,type=\"b\",pch=17,lty=2,col=\"blue\")\r\nlegend(\"topleft\",inset=.05,title=\"睡眠曲线\",c(\"睡\",\"醒\"),lty=c(1,2),pch=c(15,17),col=c(\"red\",\"blue\"))\r\naxis(1, c(1:"+cnt+"),date)\r\n";
fs.writeFile("health/sleep.R",sleepstr);
console.log("\n\n睡眠曲线在health/sleep.R");

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

//openbrowser("http://www.xuemen.com")

function openbrowser(url) {
	switch (os.platform()) {
	case "linux":
		child.exec("xdg-open "+ url);
		break;
	case "win32":
	case "win64":
		//child.spawnSync("rundll32", "url.dll,FileProtocolHandler", url);
		//child.exec("start", url);
		child.exec("start "+url);
		break;
	case "darwin":
		child.exec("open "+ url);
		break;
	default:
		console.log("unsupported platform");
		break;
	};
}
