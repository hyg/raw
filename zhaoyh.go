package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"
)

type balance struct {
	Year   int
	Month  int
	Weiyu  int
	Wasset map[string]int
	HW     int
	Zhaoyh int
	Zasset map[string]int
	HZ     int
	Remark string
}

type change struct {
	Weiyu  int
	HW     int
	Z1     int
	Z2     int
	Z3     int
	Z4     int
	Z5     int
	HZ     int
	Remark string
}

var Step map[int]balance
var MonthStep map[int]change
var YearStep map[int]change

func moneyinit() {
	init := balance{2014, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "init"}
	Step[0] = init

	MonthStep[0] = change{10500, 0, 0, 0, 0, 0, 0, 0, 0, 0, "pku pay salary to Weiyu."}
	MonthStep[1] = change{-750, 0, 0, 750, 0, 0, 0, 0, 0, 0, "Weiyu pay the kindergarten fee."}
	MonthStep[2] = change{-1300, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Weiyu rent the dorm."}
	MonthStep[3] = change{-8000, 8000, 0, 0, 0, 0, 0, 0, 0, 0, "Weiyu rent the dorm."}
}
