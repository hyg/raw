package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
)

type winfo struct {
	DMAP map[string]FoodDayLog
	HMAP map[string]HealthDayLog
	D    string
	W1   string
	W2   string
}

func welcome(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	foodinit()
	healthinit()

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

	//var cbarray [10]CaseBrief
	//c := cbarray[0:0]

	t, _ := template.ParseFiles("web/page/welcome.html")
	//t.Execute(w, dslice)
	t.Execute(w, winfo{dmap, hmap, d, w1, w2})
	//log.Print(winfo{dmap, hmap})
}

func main() {
	//foodelementinit()
	foodinit()
	healthinit()
	//foodtestdata()
	//return

	openbrowser("http://127.0.0.1:9253")
	http.HandleFunc("/", welcome)
	http.HandleFunc("/food/daylog", fooddaylog)

	// static files
	http.HandleFunc("/web/", func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, req.URL.Path[1:])
	})

	err := http.ListenAndServe(":9253", nil) //设置监听的端口,wake
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}

}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func openbrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		log.Fatal(err)
	}

}

func serveFile(pattern string, filename string) {
	log.Printf("pattern:%s\tfilename:%s", pattern, filename)
	http.HandleFunc(pattern, func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, filename)
	})
}
