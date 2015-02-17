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
	"strconv"
)

var INDEX_HTML []byte
var sqlstring string
var mux *http.ServeMux

type Keleinfo struct {
	Ke_inf []int64
	Ke_pri []string
}

type Releinfo struct {
	Re_restr []string
	Re_inf []int64
	Re_pri []string
}

type Senseinfo struct {
	Stagk []string
	Stagr []string
	Pos []int64
	Xref []string
	Ant []string
	Field []int64
	Misc []int64
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
		rows, err := stmt.Query(parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter,parameter)
		if err != nil {
			log.Fatal(err)
		}
		defer rows.Close()
		// count := 0
		for rows.Next() {
			var kanji, sense_id_value string
			var ke_pri_val, r_ele_val, re_restr_val, re_pri_val, stagk_val, stagr_val, xref_val, ant_val, s_inf_val, gloss_val sql.NullString
			var ke_inf_val, re_inf_val, field_val, misc_val, pos_val sql.NullInt64
			var k_ele_id, ke_inf_id,  ke_pri_id, r_ele_id, re_restr_id, re_inf_id, re_pri_id, sense_id, stagk_id, stagr_id, pos_id, xref_id, ant_id, field_id, misc_id, s_inf_id, gloss_id sql.NullInt64

			rows.Scan(&kanji,&k_ele_id,&ke_inf_id,&ke_inf_val,&ke_pri_id,&ke_pri_val,&r_ele_id,&r_ele_val,&re_restr_id,&re_restr_val,&re_inf_id,&re_inf_val,&re_pri_id,&re_pri_val,&sense_id,&stagk_id,&stagk_val,&stagr_id,&stagr_val,&pos_id,&pos_val,&xref_id,&xref_val,&ant_id,&ant_val,&field_id,&field_val,&misc_id,&misc_val,&s_inf_id,&s_inf_val,&gloss_id,&gloss_val)

			log.Println(kanji,"kanji",k_ele_id,"k_ele_id",ke_inf_id,"ke_inf_id",ke_inf_val,"ke_inf_val",ke_pri_id,"ke_pri_id",ke_pri_val,"ke_pri_val",r_ele_id,"r_ele_id",r_ele_val,"r_ele_val",re_restr_id,"re_restr_id",re_restr_val,"re_restr_val",re_inf_id,"re_inf_id",re_inf_val,"re_inf_val",re_pri_id,"re_pri_id",re_pri_val,"re_pri_val",sense_id,"sense_id",stagk_id,"stagk_id",stagk_val,"stagk_val",stagr_id,"stagr_id",stagr_val,"stagr_val",pos_id,"pos_id",pos_val,"pos_val",xref_id,"xref_id",xref_val,"xref_val",ant_id,"ant_id",ant_val,"ant_val",field_id,"field_id",field_val,"field_val",misc_id,"misc_id",misc_val,"misc_val",s_inf_id,"s_inf_id",s_inf_val,"s_inf_val",gloss_id,"gloss_id",gloss_val,"gloss_val")
			// count = count + 1
			// log.Println(count)
			if k_ele_id.Valid && word_definitions[wordtolookup].MatchingKanji[kanji] == nil {
				log.Println("initializing MatchingKanji")
				word_definitions[wordtolookup].MatchingKanji[kanji] = NewDictionaryResult()
			}

			if sense_id.Valid {
				sense_id_value = strconv.FormatInt(sense_id.Int64, 10)
				if word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value] == nil {
					log.Println("Initiazing Senseinfo for: ", sense_id)
					word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value] = &Senseinfo{}
				}
			}

			if r_ele_val.Valid && word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String] == nil {
				word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String] = &Releinfo{}
			}
			switch {
			case ke_inf_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_inf = append(word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_inf, ke_inf_val.Int64)
			case ke_pri_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_pri = append(word_definitions[wordtolookup].MatchingKanji[kanji].K_ele.Ke_pri, ke_pri_val.String)
			case re_restr_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String].Re_restr = append(word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String].Re_restr, re_restr_val.String)
			case re_inf_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String].Re_inf = append(word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String].Re_inf, re_inf_val.Int64)
			case re_pri_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String].Re_pri = append(word_definitions[wordtolookup].MatchingKanji[kanji].R_ele[r_ele_val.String].Re_pri, re_pri_val.String)
			case stagk_val.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Stagk = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Stagk, stagk_val.String)
			case stagr_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Stagr = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Stagr, stagr_val.String)
			case pos_id.Valid:
				log.Println("pos")
				// word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value] = &Senseinfo{}
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Pos = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Pos, pos_val.Int64)
			case xref_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Xref = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Xref, xref_val.String)
			case ant_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Ant = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Ant, ant_val.String)
			case field_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Field = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Field, field_val.Int64)
			case misc_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Misc = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Misc, misc_val.Int64)
			case s_inf_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].S_inf = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].S_inf, s_inf_val.String)
			case gloss_id.Valid:
				word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Gloss = append(word_definitions[wordtolookup].MatchingKanji[kanji].Sense[sense_id_value].Gloss, gloss_val.String)

			}
		}
	}

	// log.Println(word_definitions)
	jsontext, err := json.Marshal(word_definitions)
	if err != nil {
		log.Println("Json text problem")
	}
	w.Write(jsontext)
}

func init(){
	INDEX_HTML, _ = ioutil.ReadFile("./html/index.html")

	sqlstring = "select k_ele.value as kanji, id as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, NULL as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from k_ele where value like ? UNION ALL select k_ele.value as kanji, NULL as k_ele_id, ke_inf.id as ke_inf_id, ke_inf.entity as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, NULL as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from ke_inf, k_ele where k_ele.value like ? and k_ele.id = ke_inf.fk UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, ke_pri.id as ke_pri_id, ke_pri.value as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, NULL as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from ke_pri, k_ele where k_ele.value like ? and k_ele.id = ke_pri.fk UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, r_ele.id as r_ele_id, r_ele.value as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, NULL as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from r_ele, k_ele where k_ele.value like ? and k_ele.fk = r_ele.fk UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, r_ele.value as r_ele_val, re_restr.id as re_restr_id, re_restr.value as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, NULL as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from r_ele, re_restr, k_ele where k_ele.value like ? and k_ele.fk = r_ele.fk and re_restr.fk = r_ele.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, r_ele.value as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, re_inf.id as re_inf_id, re_inf.entity as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, NULL as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from r_ele, re_inf, k_ele where k_ele.value like ? and k_ele.fk = r_ele.fk and re_inf.fk = r_ele.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, r_ele.value as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, re_pri.id as re_pri_id, re_pri.value as re_pri_val, NULL as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from r_ele, re_pri, k_ele where k_ele.value like ? and k_ele.fk = r_ele.fk and re_pri.fk = r_ele.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, stagk.id as stagk_id, stagk.value as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, stagk, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and stagk.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, stagr.id as stagr_id, stagr.value as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, stagr, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and stagr.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, pos.id as pos_id, pos.entity as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, pos, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and pos.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, xref.id as xref_id, xref.value as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, xref, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and xref.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, ant.id as ant_id, ant.value as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, ant, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and ant.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, field.id as field_id, field.entity as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, field, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and field.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, misc.id as misc_id, misc.entity as misc_val, NULL as s_inf_id, NULL as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, misc, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and misc.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, s_inf.id as s_inf_id, s_inf.value as s_inf_val, NULL as gloss_id, NULL as gloss_val from sense, s_inf, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and s_inf.fk = sense.id UNION ALL select k_ele.value as kanji, NULL as k_ele_id, NULL as ke_inf_id, NULL as ke_inf_val, NULL as ke_pri_id, NULL as ke_pri_val, NULL as r_ele_id, NULL as r_ele_val, NULL as re_restr_id, NULL as re_restr_val, NULL as re_inf_id, NULL as re_inf_val, NULL as re_pri_id, NULL as re_pri_val, sense.id as sense_id, NULL as stagk_id, NULL as stagk_val, NULL as stagr_id, NULL as stagr_val, NULL as pos_id, NULL as pos_val, NULL as xref_id, NULL as xref_val, NULL as ant_id, NULL as ant_val, NULL as field_id, NULL as field_val, NULL as misc_id, NULL as misc_val, NULL as s_inf_id, NULL as s_inf_val, gloss.id as gloss_id, gloss.value as gloss_val from sense, gloss, k_ele where k_ele.value like ? and k_ele.fk = sense.fk and gloss.fk = sense.id;"
}
