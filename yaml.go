package main

import (
	"fmt"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type Index struct {
	FoodMonth   []string
	FoodDay     []string
	HealthMonth []string
	HealthDay   []string
}

type FoodItem struct {
	Time   string
	Name   string
	Amount int
	Unit   string
}

type FoodDayLog struct {
	Date    string
	Food    []FoodItem
	Water   []FoodItem
	Comment string
}

//var index Index
var dmap map[string]FoodDayLog

type Food struct {
	Name    string
	Amount  int
	Unit    string
	Element map[string]float64
	NRV     map[string]float64
}

var fmap map[string]Food

func foodinit() {
	var d FoodDayLog
	dmap = make(map[string]FoodDayLog)
	fmap = make(map[string]Food)

	filepath.Walk("food",
		func(path string, info os.FileInfo, err error) error {
			if strings.Contains(path, "food\\e.") {
				var f Food
				log.Printf("path=%s\ninfo=%v", path, info)
				fbyte, _ := ioutil.ReadFile(path)
				yaml.Unmarshal(fbyte, &f)
				log.Printf("fmap1=%v\n", fmap)
				log.Printf("f=%v\n", f)
				fmap[f.Name] = f
				log.Printf("fmap2=%v\n", fmap)
				//log.Printf("fbyte=%s\nf=%v\nf.Element=%v\n", fbyte, f, f.Element)
			}

			if strings.Contains(path, "food\\d.") {
				//log.Printf("path=%s\ninfo=%v", path, info)
				dbyte, _ := ioutil.ReadFile(path)
				yaml.Unmarshal(dbyte, &d)
				dmap[d.Date] = d
			}

			if strings.Contains(path, "food\\m.") {
				log.Printf("path=%s\ninfo=%v", path, info)
			}
			return nil
		})

	log.Print(fmap)
}

func foodtestdata() {
	dtest := FoodDayLog{"20150401", []FoodItem{{"20150401120000", "water", 250, "ml"}, {"20150401130000", "面条", 150, "g"}}, []FoodItem{{"20150401120000", "water", 250, "ml"}, {"20150401130000", "面条", 150, "g"}}, "comment..."}
	d, _ := yaml.Marshal(&dtest)
	log.Print(string(d))
}

func foodelementinit() {
	//f := Food{"奶粉", 100, "g", map[string]float64{"蛋白质": 23.2, "钙": 15.4, "脂肪": 5.6}, map[string]float64{"蛋白质": 17.6, "钙": 3.4, "脂肪": 15.9}}
	//d, _ := yaml.Marshal(&f)
	//log.Printf("--- Food Element:\n%s\n\n", string(d))

}

type SleepPoint struct {
	Time   string
	Weight float64
}

/*
stool:
- time: 20150414110000
  amount: 3 	# 				1:多;		2:适中;		3:少;
  type: 1 		# 	0:水样;		1:软;		2:适中;		3:硬;
  diffcault: 1 	# 				1:不困难;	2:困难;
*/
type StoolInfo struct {
	Time     string
	Amount   int
	Type     int
	Diffcult int
}

type ExerciseTurn struct {
	Time         string
	Item         []ExerciseItem
	Endheartrate int
}

type ExerciseItem struct {
	Type   string
	Amount int
	Unit   string
}

type HealthDayLog struct {
	Date     string
	Sleep    SleepPoint
	Wake     SleepPoint
	Stool    []StoolInfo
	Exercise []ExerciseTurn
	Comment  string
}

var hmap map[string]HealthDayLog
var weightR string
var d, w1, w2 string
var cnt int

func healthinit() {
	var h HealthDayLog
	hmap = make(map[string]HealthDayLog)
	d = "date <- c("
	w1 = "weight1 <- c("
	w2 = "weight2 <- c("
	cnt = 0
	bFirst := true
	filepath.Walk("health",
		func(path string, info os.FileInfo, err error) error {
			if strings.Contains(path, "health\\d.") {
				//log.Printf("path=%s\ninfo=%v", path, info)
				hbyte, _ := ioutil.ReadFile(path)
				yaml.Unmarshal(hbyte, &h)
				hmap[h.Date] = h
				//log.Printf("path=%s\ndate=%s\ninfo=%v\n\n", path, h.Date, h)

				if h.Date > "20150407" {
					cnt = cnt + 1
					if bFirst {
						d = fmt.Sprintf("%s\"%s\"", d, h.Date)
						w1 = fmt.Sprintf("%s%v", w1, h.Sleep.Weight)
						w2 = fmt.Sprintf("%s%v", w2, h.Wake.Weight)

						bFirst = false
					} else {
						d = fmt.Sprintf("%s,\"%s\"", d, h.Date)
						w1 = fmt.Sprintf("%s,%v", w1, h.Sleep.Weight)
						w2 = fmt.Sprintf("%s,%v", w2, h.Wake.Weight)
					}
				}

			}

			if strings.Contains(path, "health\\m.") {
				log.Printf("path=%s\ninfo=%v", path, info)
			}
			return nil
		})

	d = fmt.Sprintf("%s)", d)
	w1 = fmt.Sprintf("%s)", w1)
	w2 = fmt.Sprintf("%s)", w2)

	//log.Print(d)
	//log.Print(w1)
	//log.Print(w2)
}
