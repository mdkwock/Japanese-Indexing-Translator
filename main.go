package main

import (
	"fmt"
	"net/http"
	"io/ioutil"
	"log"
	_ "github.com/mattn/go-sqlite3"
	"github.com/user/translationapp/kanjiutil"
	"strings"
	"encoding/json"
)

var INDEX_HTML []byte
var ABOUT_HTML []byte
var mux *http.ServeMux

type LookUpInfo struct {
	Kanji string `json:"kanji"`
	Page  int    `json:"page"`
}

func main(){
	fmt.Println("starting server on http://localhost:42893/")
	mux = http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("./html")))
	mux.Handle("/about/", http.FileServer(http.Dir("../html")))
	http.HandleFunc("/", static(HomeHandler))
	http.HandleFunc("/about/", static(aboutHandler))
	http.HandleFunc("/parse", parseWordsHandler)
	http.HandleFunc("/post", lookUpWordHandler)
	http.ListenAndServe(":42893", nil)
}

func static(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("in static, url path is ", r.URL.Path)
		if strings.ContainsRune(r.URL.Path, '.') {
			mux.ServeHTTP(w, r)
			return
		}
		h.ServeHTTP(w, r)
	}
}

func aboutHandler(w http.ResponseWriter, r *http.Request){
	log.Println("Get /about page")
	w.Write(ABOUT_HTML)
}

func HomeHandler(w http.ResponseWriter, r *http.Request){
	log.Println("GET /index page")
	w.Write(INDEX_HTML)
}

func parseWordsHandler(w http.ResponseWriter, r *http.Request){
	if r.Method != "POST" {
		log.Println("in post but early return")
		http.NotFound(w, r)
		return
	}

	var textToParse []string

	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&textToParse)
	if err != nil {
		log.Println(r.Body)
		log.Println(err)
	}

	if (len(textToParse) < 1) {
		log.Println("textToParse < 1")
		log.Println(textToParse)
		w.Write([]byte("[]"))
		return
	}

	validKanjis, err := kanjiutil.ParseForKanji(textToParse);
	if err != nil {
		log.Println(err)
	}
	w.Write(validKanjis)
}

func lookUpWordHandler(w http.ResponseWriter, r *http.Request){
	if r.Method != "POST" {
		log.Println("in post but early return")
		http.NotFound(w, r)
		return
	}

	decoder := json.NewDecoder(r.Body)

	var lookUpInfo LookUpInfo
	err := decoder.Decode(&lookUpInfo)
	if err != nil {
		log.Println(r.Body)
		log.Fatal(err)
	}

	definitions, err := kanjiutil.LookUpDefinitions(lookUpInfo.Kanji, lookUpInfo.Page);
	if err != nil {
		log.Fatal(err)
	}

	w.Write(definitions)
}

func init(){
	INDEX_HTML, _ = ioutil.ReadFile("./html/index.html")
	ABOUT_HTML, _ = ioutil.ReadFile("./html/about.html")
}
