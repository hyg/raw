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

func foodinit() {
	var d FoodDayLog
	dmap = make(map[string]FoodDayLog)
	filepath.Walk("food",
		func(path string, info os.FileInfo, err error) error {
			if strings.Contains(path, "food\\log.") {
				//log.Printf("path=%s\ninfo=%v", path, info)
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

	//log.Print(dmap)
}

func foodtestdata() {
	dtest := FoodDayLog{"20150401", []FoodItem{{"20150401120000", "water", 250, "ml"}, {"20150401130000", "面条", 150, "g"}}, []FoodItem{{"20150401120000", "water", 250, "ml"}, {"20150401130000", "面条", 150, "g"}}, "comment..."}
	d, _ := yaml.Marshal(&dtest)
	log.Print(string(d))
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

func healthinit() {
	var h HealthDayLog
	hmap = make(map[string]HealthDayLog)
	d = "date <- c("
	w1 = "weight1 <- c("
	w2 = "weight2 <- c("
	bFirst := true
	filepath.Walk("health",
		func(path string, info os.FileInfo, err error) error {
			if strings.Contains(path, "health\\log.") {
				//log.Printf("path=%s\ninfo=%v", path, info)
				hbyte, _ := ioutil.ReadFile(path)
				yaml.Unmarshal(hbyte, &h)
				hmap[h.Date] = h
				log.Printf("path=%s\ndate=%s\ninfo=%v\n\n", path, h.Date, h)

				if h.Date > "20150407" {
					if bFirst {
						d = fmt.Sprintf("%s%s", d, h.Date)
						w1 = fmt.Sprintf("%s%v", w1, h.Sleep.Weight)
						w2 = fmt.Sprintf("%s%v", w2, h.Wake.Weight)

						bFirst = false
					} else {
						d = fmt.Sprintf("%s,%s", d, h.Date)
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

	log.Print(d)
	log.Print(w1)
	log.Print(w2)
}
