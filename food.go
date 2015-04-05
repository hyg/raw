package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"
)

type elementlist struct {
	Item []element
}

type element struct {
	Name   string
	Amount int
	Unit   string
}

func fooddaylog(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

	if r.Method == "GET" {
		var el elementlist

		if len(r.Form["date"][0]) > 0 {
			d := dmap[r.Form["date"][0]]
			log.Print(d.Water)

			water := element{"water", 0, "ml"}
			for _, v := range d.Water {
				if v.Unit == "ml" {
					water.Amount = water.Amount + v.Amount
				}
				if v.Unit == "l" {
					water.Amount = water.Amount + 1000*v.Amount
				}
			}
			el.Item = append(el.Item, water)
		}
		log.Print(el)

		t, _ := template.ParseFiles("web/page/fooddaylog.html")
		t.Execute(w, el)
	}

}
