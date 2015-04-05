package main

import (
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

var index Index
var dlog []FoodDayLog

func foodinit() {
	var d FoodDayLog
	filepath.Walk("food",
		func(path string, info os.FileInfo, err error) error {
			if strings.Contains(path, "food\\log.") {
				//log.Printf("path=%s\ninfo=%v", path, info)
			}

			if strings.Contains(path, "food\\d.") {
				log.Printf("path=%s\ninfo=%v", path, info)
				dbyte, _ := ioutil.ReadFile(path)
				yaml.Unmarshal(dbyte, &d)
				dlog = append(dlog, d)
			}

			if strings.Contains(path, "food\\m.") {
				log.Printf("path=%s\ninfo=%v", path, info)
			}
			return nil
		})

	log.Print(dlog)
}

func foodtestdata() {
	dtest := FoodDayLog{"20150401", []FoodItem{{"20150401120000", "water", 250, "ml"}, {"20150401130000", "面条", 150, "g"}}, []FoodItem{{"20150401120000", "water", 250, "ml"}, {"20150401130000", "面条", 150, "g"}}, 0, "comment..."}
	d, _ := yaml.Marshal(&dtest)
	log.Print(string(d))
}
