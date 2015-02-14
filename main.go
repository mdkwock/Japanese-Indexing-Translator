package main

import (
	"fmt"
	"net/http"
	"io/ioutil"
	"log"
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	"strings"
	"encoding/json"
)

var INDEX_HTML []byte
var sqlstring string
var mux *http.ServeMux

type Keleinfo struct {
	Ke_inf []string
	Ke_pri []string
}

type Releinfo struct {
	Re_restr []string
	Re_inf []string
	Re_pri []string
}

type Senseinfo struct {
	Stagk []string
	Stagr []string
	Pos []string
	Xref []string
	Ant []string
	Field []string
	Misc []string
	S_inf []string
	Gloss []string
}

type entry struct {
	MatchingKanji map[string]*dictionaryresult
}

type dictionaryresult struct {
	K_ele Keleinfo
	R_ele map[string]*Releinfo
	Sense map[string]*Senseinfo
}

func NewDictionaryResult() *dictionaryresult {
	return &dictionaryresult{R_ele:make(map[string]*Releinfo),Sense:make(map[string]*Senseinfo)}
}

func NewEntry() *entry {
	return &entry{make(map[string]*dictionaryresult)}
}

func main(){
	fmt.Println("starting server on http://localhost:8888/\n")
	mux = http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("./html")))
	http.HandleFunc("/", static(IndexHandler))
	http.HandleFunc("/post", PostHandler)
	http.ListenAndServe(":8888", nil)
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

func IndexHandler(w http.ResponseWriter, r *http.Request){
	log.Println("GET /")
	w.Write(INDEX_HTML)
}

func PostHandler(w http.ResponseWriter, r *http.Request){
	if r.Method != "POST" {
		log.Println("in post but early return")
		http.NotFound(w, r)
		return
	}

	decoder := json.NewDecoder(r.Body)
	var listofwords map[string]int
	err := decoder.Decode(&listofwords)
	if err != nil {
		log.Println("I tried")
		log.Println(r.Body)
	}

	//I have a map[string]int with characters:numbers now
	//take each character and look it up in the database
	//TODO: don't worry about adding foreign keys yet
	//figure out how to query the db for all the information related to a kanji
	db, err := sql.Open("sqlite3", "./jmdict.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	stmt, err := db.Prepare(sqlstring)
	if err != nil{
		log.Fatal(err)
	}
	defer stmt.Close()

	// var id []int
	// var k_ele_val string
	word_definitions := make(map[string]*entry)

	for wordtolookup := range listofwords {
		log.Println("wordtolookup: ", wordtolookup)
		word_definitions[wordtolookup] = NewEntry()
		parameter := wordtolookup + "%"
		rows, err := stmt.Query(parameter,parameter,parameter)//,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter)
		if err != nil {
			log.Fatal(err)
		}
		defer rows.Close()
		word_definitions[wordtolookup] = NewEntry()
		for rows.Next() {
			var kanji string
			var r_ele_val, gloss_val sql.NullString
			var k_ele_id, r_ele_id, gloss_id sql.NullInt64

			err := rows.Scan(&kanji,&k_ele_id,&r_ele_id,&r_ele_val,&gloss_id,&gloss_val)
			if err != nil {
				log.Fatal(err)
			}

			log.Println(kanji,k_ele_id, r_ele_id,r_ele_val,gloss_id,gloss_val)

			switch {
			case k_ele_id.Valid:
				log.Println("In k_ele_id: ", k_ele_id)
				word_definitions[wordtolookup].MatchingKanji[kanji] = NewDictionaryResult()
			// case ke_inf_id != 0:
			// 	log.Println("In ke_inf_id: ", ke_inf_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_inf = append(word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_inf, ke_inf_val)
			// case ke_pri_id != 0:
			// 	log.Println("In ke_pri_id: ", ke_pri_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_pri = append(word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_pri, ke_pri_val)
			// case re_restr_id != 0:
			// 	log.Println("In re_restr_id: ", re_restr_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val].Re_restr = append(word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val].Re_restr, re_restr_val)
			// case re_inf_id != 0:
			// 	log.Println("In re_inf_id: ", re_inf_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val].Re_inf = append(word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val].Re_inf, re_inf_val)
			// case re_pri_id != 0:
			// 	log.Println("In re_pri_id: ", re_pri_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val].Re_pri = append(word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val].Re_pri, re_pri_val)
			// case stagk_id != 0:
			// 	log.Println("In stagk_id: ", stagk_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Stagk = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Stagk, stagk_val)
			// case stagr_id != 0:
			// 	log.Println("In stagr_id: ", stagr_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Stagr = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Stagr, stagr_val)
			// case pos_id != 0:
			// 	log.Println("In pos_id: ", pos_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Pos = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Pos, pos_val)
			// case xref_id != 0:
			// 	log.Println("In xref_id: ", xref_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Xref = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Xref, xref_val)
			// case ant_id != 0:
			// 	log.Println("In ant_id: ", ant_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Ant = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Ant, ant_val)
			// case field_id != 0:
			// 	log.Println("In field_id: ", field_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Field = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Field, field_val)
			// case misc_id != 0:
			// 	log.Println("In misc_id: ", misc_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Misc = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Misc, misc_val)
			// case s_inf_id != 0:
			// 	log.Println("In s_inf_id: ", s_inf_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].S_inf = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].S_inf, s_inf_val)
			// case gloss_id != 0:
			// 	log.Println("In gloss_id: ", gloss_id)
			// 	word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Gloss = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[strconv.Itoa(sense_id)].Gloss, gloss_val)

			}
		}
	}

	// definitions := make(map[string]int)
	// definitions[k_ele_val] = id

	// log.Println(word_definitions)
	// log.Println(id)
	jsontext, err := json.Marshal(word_definitions)
	if err != nil {
		log.Println("Json text problem")
	}
	w.Write(jsontext)
}

func init(){
	INDEX_HTML, _ = ioutil.ReadFile("./html/index.html")

	sqlstring = "select k_ele.value as kanji, id as k_ele_id, NULL as r_ele_id, NULL as r_ele_val, NULL as gloss_id, NULL as gloss_val from k_ele where value like ? UNION ALL select k_ele.value as kanji, NULL as k_ele_id, r_ele.id as r_ele_id, r_ele.value as r_ele_val, NULL as gloss_id, NULL as gloss_val from r_ele, k_ele where k_ele.value like ? and k_ele.fk = r_ele.fk UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as r_ele_id, NULL as r_ele_val, gloss.id as gloss_id, gloss.value as gloss_val from sense, gloss, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and gloss.fk = sense.id;"
}
