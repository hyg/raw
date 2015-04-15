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
	Food []FoodItem
}

type element struct {
	Name   string
	Amount float64
	Unit   string
	NRV    float64
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

			water := element{"水", 0, "ml", 0}
			for _, v := range d.Water {
				if v.Unit == "ml" {
					water.Amount = water.Amount + float64(v.Amount)
				}
				if v.Unit == "l" {
					water.Amount = water.Amount + float64(1000*v.Amount)
				}
			}
			water.NRV = water.Amount / 2000
			el.Item = append(el.Item, water)

			emap := make(map[string]float64) //摄入量
			vmap := make(map[string]string)  //单位
			nmap := make(map[string]float64) //NRV

			for _, item := range d.Food {
				log.Printf("FOOD:摄入%s\t %d %s", item.Name, item.Amount, item.Unit)
				f, ok := fmap[item.Name]
				a := item.Amount

				if !ok {
					el.Food = append(el.Food, item)
				}

				for k, v := range f.Element {

					_, ok := emap[k]
					if ok {
						emap[k] = float64(a) / float64(f.Amount) * v
						nmap[k] = float64(a) / float64(f.Amount) * f.NRV[k]
					} else {
						emap[k] = emap[k] + float64(a)/float64(f.Amount)*v
						nmap[k] = nmap[k] + float64(a)/float64(f.Amount)*f.NRV[k]
					}
					vmap[k] = f.Unit

					log.Printf("ELEMNT:%s\t %f %s NRV:%f", k, emap[k], vmap[k], nmap[k])
				}
			}

			for k, v := range emap {
				el.Item = append(el.Item, element{k, v, vmap[k], nmap[k]})
			}

		}
		log.Print(el)

		t, _ := template.ParseFiles("web/page/fooddaylog.html")
		t.Execute(w, el)
	}

}
