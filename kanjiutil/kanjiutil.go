package kanjiutil

import (
	"log"
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	"strings"
	"strconv"
	"encoding/json"
)

var limit_results_sql_string, all_kanji_info_sql_string, parseSQL, count_number_of_matches_sql_string string
var db *sql.DB

// Keleinfo stores Kanji information such as the text
// representing the word and how common the word is in everyday life
type Keleinfo struct {
	Kanji string
	Ke_inf []string
	Ke_pri []string
}

// Releinfo stores how the word is pronounced in kana (the Japanese alphabet)
type Releinfo struct {
	Re_restr []string
	Re_inf []string
	Re_pri []string
}

// Senseinfo stores information related to the definiton of a word
// such as the meaning, antonymns, synonyms, field of application (i.e. Medical term)
// dialect, and part of speech
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

// An entry stores information related to a retrieval of a word
// (generally holds 15 definitions at a time)
type entry struct {
	Definitions map[string]*dictionaryresult
	Page int
	NumDefinitionsTotal int
}

// A dictionaryresult stores information for a lookup of
// a single k_ele id from the database
type dictionaryresult struct {
	K_ele Keleinfo
	R_ele map[string]*Releinfo
	Sense map[string]*Senseinfo
}

func NewDictionaryResult() *dictionaryresult {
	return &dictionaryresult{R_ele:make(map[string]*Releinfo),Sense:make(map[string]*Senseinfo)}
}

func NewEntry() *entry {
	return &entry{make(map[string]*dictionaryresult),0,0}
}

// countNumberOfDefinitions returns the total number of definitions related to a kanji
func countNumberOfDefinitions(kanjiToLookUp string) (int, error) {
	// Query for total number of definitions to decide
	// how many page buttons should be created on the frontend
	stmt, err := db.Prepare(count_number_of_matches_sql_string)
	if err != nil {
		log.Fatal(err)
		return 0, err
	}
	defer stmt.Close()

	rows, err := stmt.Query(kanjiToLookUp)
	if err != nil {
		log.Fatal(err)
		return 0, err
	}
	defer rows.Close()

	var totalNumberOfDefinitions int
	for rows.Next() {
		err := rows.Scan(&totalNumberOfDefinitions)
		if err != nil {
			log.Fatal(err)
			return 0, err
		}
	}
	return totalNumberOfDefinitions, nil
}

// makePlaceholders is a helper function used to created num amount
// of placeholders for a prepared statement
func makePlaceholders(num int) string {
	var argHolders string
	for (num > 1) {
		argHolders += "?,"
		num--
	}
	argHolders += "?"
	return argHolders
}

// createGetInfoSQL prepares the SQL statement used to retrieve definition information from the database
func createGetInfoSQL(k_ids []string, r_ids []string, s_ids []string) string {
	k_id_holders := "(" + strings.Join(k_ids, ",") + ")"
	r_id_holders := "(" + strings.Join(r_ids, ",") + ")"
	sense_holders := "(" + strings.Join(s_ids, ",") + ")"

	// form sql query by replacing (k), (r), (s) with collapsed array values
	kr_inf_sql := strings.Replace(all_kanji_info_sql_string, "(k)", k_id_holders, -1)
	kr_inf_sql = strings.Replace(kr_inf_sql, "(r)", r_id_holders, -1)
	kr_inf_sql = strings.Replace(kr_inf_sql, "(s)", sense_holders, -1)

	return kr_inf_sql
}

// retrieveDefinitionIds returns the definition ids related to kanjiToLookUp
// this is used for lookup later to avoid JOINing all the tables in the database
// as JOINing will exponentially blow up the number of rows returned due to the number of tables
func retrieveDefinitionIds(kanjiToLookUp string, pageNumber int, definitions map[string]*dictionaryresult) (k_ele_ids, r_ele_ids, sense_ids []string, err error) {
	// Query with LIMIT using pages
	get_15_definitions_sql := strings.Replace(limit_results_sql_string, "page", strconv.Itoa(pageNumber * 15), 1)
	stmt, err := db.Prepare(get_15_definitions_sql)
	if err != nil {
		log.Fatal(err)
		return k_ele_ids, r_ele_ids, sense_ids, err
	}

	rows, err := stmt.Query(kanjiToLookUp)
	if err != nil {
		log.Fatal(err)
		return k_ele_ids, r_ele_ids, sense_ids, err
	}

	for rows.Next() {
		var k_ele_id_key, kanji, r_ele_id_key, kana, sense_id_key string
		var k_ele_id, r_ele_id, sense_id int

		err := rows.Scan(&k_ele_id, &kanji, &r_ele_id, &kana, &sense_id)
		if err != nil {
			log.Fatal(err)
			return k_ele_ids, r_ele_ids, sense_ids, err
		}

		k_ele_id_key = strconv.Itoa(k_ele_id)
		r_ele_id_key = strconv.Itoa(r_ele_id)
		sense_id_key = strconv.Itoa(sense_id)

		k_ele_ids = append(k_ele_ids, k_ele_id_key)
		r_ele_ids = append(r_ele_ids, r_ele_id_key)
		sense_ids = append(sense_ids, sense_id_key)

		if definitions[k_ele_id_key] == nil {
			definitions[k_ele_id_key] = NewDictionaryResult()
			definitions[k_ele_id_key].K_ele.Kanji = kanji
		}

		if definitions[k_ele_id_key].R_ele[kana] == nil {
			definitions[k_ele_id_key].R_ele[kana] = &Releinfo{}
		}

		if definitions[k_ele_id_key].Sense[sense_id_key] == nil {
			definitions[k_ele_id_key].Sense[sense_id_key] = &Senseinfo{}
		}
	}
	return k_ele_ids, r_ele_ids, sense_ids, err
}

// retrieveDefinitionInfo retrieves all information related to the passed in ids
// such as pronunciation, definition, antonyms, synonyms, and etc
// from the entire database
func retrieveDefinitionInfo(k_ele_ids, r_ele_ids, sense_ids []string, definitions map[string]*dictionaryresult) error {
	kr_inf_sql := createGetInfoSQL(k_ele_ids, r_ele_ids, sense_ids)
	// get all information related to the kanji results from the initial sql
	rows, err := db.Query(kr_inf_sql)
	if err != nil{
		log.Fatal(err)
		return err
	}

	for rows.Next() {
		var k_ele_id_key, sense_id_value string
		var k_ele_id int
		var ke_pri_val, r_ele_val, re_restr_val, re_pri_val, stagk_val, stagr_val, xref_val, ant_val, s_inf_val, gloss_val sql.NullString
		// These values are entity values
		var ke_inf_val, re_inf_val, field_val, misc_val, pos_val sql.NullString
		// id values
		var sense_id sql.NullInt64

		err := rows.Scan(&k_ele_id,&ke_inf_val,&ke_pri_val,&r_ele_val,&re_restr_val,&re_inf_val,&re_pri_val,&sense_id,&stagk_val,&stagr_val,&pos_val,&xref_val,&ant_val,&field_val,&misc_val,&s_inf_val,&gloss_val)
		if err != nil {
			log.Fatal(err)
			return err
		}

		k_ele_id_key = strconv.Itoa(k_ele_id)

		sense_id_value = strconv.FormatInt(sense_id.Int64, 10)

		switch {
		case ke_inf_val.Valid:
			definitions[k_ele_id_key].K_ele.Ke_inf = append(definitions[k_ele_id_key].K_ele.Ke_inf, ke_inf_val.String)
		case ke_pri_val.Valid:
			definitions[k_ele_id_key].K_ele.Ke_pri = append(definitions[k_ele_id_key].K_ele.Ke_pri, ke_pri_val.String)
		case re_restr_val.Valid:
			if definitions[k_ele_id_key].R_ele[r_ele_val.String] != nil {
				definitions[k_ele_id_key].R_ele[r_ele_val.String].Re_restr = append(definitions[k_ele_id_key].R_ele[r_ele_val.String].Re_restr, re_restr_val.String)
			}
		case re_inf_val.Valid:
			if definitions[k_ele_id_key].R_ele[r_ele_val.String] != nil {
				definitions[k_ele_id_key].R_ele[r_ele_val.String].Re_inf = append(definitions[k_ele_id_key].R_ele[r_ele_val.String].Re_inf, re_inf_val.String)
			}
		case re_pri_val.Valid:
			if definitions[k_ele_id_key].R_ele[r_ele_val.String] != nil {
				definitions[k_ele_id_key].R_ele[r_ele_val.String].Re_pri = append(definitions[k_ele_id_key].R_ele[r_ele_val.String].Re_pri, re_pri_val.String)
			}
		case definitions[k_ele_id_key].Sense[sense_id_value] == nil:
			// continue;
		case stagk_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Stagk = append(definitions[k_ele_id_key].Sense[sense_id_value].Stagk, stagk_val.String)
		case stagr_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Stagr = append(definitions[k_ele_id_key].Sense[sense_id_value].Stagr, stagr_val.String)
		case pos_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Pos = append(definitions[k_ele_id_key].Sense[sense_id_value].Pos, pos_val.String)
		case xref_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Xref = append(definitions[k_ele_id_key].Sense[sense_id_value].Xref, xref_val.String)
		case ant_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Ant = append(definitions[k_ele_id_key].Sense[sense_id_value].Ant, ant_val.String)
		case field_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Field = append(definitions[k_ele_id_key].Sense[sense_id_value].Field, field_val.String)
		case misc_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Misc = append(definitions[k_ele_id_key].Sense[sense_id_value].Misc, misc_val.String)
		case s_inf_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].S_inf = append(definitions[k_ele_id_key].Sense[sense_id_value].S_inf, s_inf_val.String)
		case gloss_val.Valid:
			definitions[k_ele_id_key].Sense[sense_id_value].Gloss = append(definitions[k_ele_id_key].Sense[sense_id_value].Gloss, gloss_val.String)
		}
	}
	return nil
}

// retrieve15Definitions populates the definitions parameters
// with database data for 15 definitions
func retrieve15Definitions(kanjiToLookUp string, pageNumber int, definitions map[string]*dictionaryresult) error {
	k_ele_ids, r_ele_ids, sense_ids, err := retrieveDefinitionIds(kanjiToLookUp, pageNumber, definitions)
	if err != nil{
		log.Fatal(err)
		return err
	}

	err = retrieveDefinitionInfo(k_ele_ids, r_ele_ids, sense_ids, definitions)
	if err != nil{
		log.Fatal(err)
		return err
	}

	return nil
}

// ParseForKanji returns the valid kanji words that are available for lookup in the database
func ParseForKanji(textToParse []string) ([]byte, error) {
	var validKanjis []string
	var kanji string
	// Query database with the dynamic prepared statement
	convertedArgs := make([]interface{}, len(textToParse))
	for i, v := range textToParse {
		convertedArgs[i] = interface{}(v)
	}

	for i, words := 0, len(textToParse); words > 0; words, i = words-999, i+999 {
		var numberOfWords int
		if words > 999 {
			numberOfWords = 999
		} else {
			numberOfWords = words;
		}

		// create the prepared statement used later to determine which words are valid for lookup
		parseSQLStmt := parseSQL + makePlaceholders(numberOfWords) + ");"
		stmt, err := db.Prepare(parseSQLStmt)
		if err != nil{
			log.Fatal(err)
			return nil, err
		}
		defer stmt.Close()

		rows, err := stmt.Query(convertedArgs[i:i+numberOfWords]...)
		if err != nil {
			log.Fatal(err)
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			err := rows.Scan(&kanji)
			if err != nil {
				log.Fatal(err)
				return nil, err
			}
			validKanjis = append(validKanjis, kanji)
		}
	}
	validKanjis_json, err := json.Marshal(validKanjis)
	if err != nil {
		log.Println("Json text problem")
		return nil, err
	}
	return validKanjis_json, nil
}

// LookupDefinitions returns 15 definitions for kanji offset by the pageNumber
func LookUpDefinitions(kanji string, pageNumber int) ([]byte, error) {
	kanjiToLookUp := "%"+ kanji +"%"

	results := NewEntry()
	results.Page = pageNumber

	var err error
	results.NumDefinitionsTotal, err = countNumberOfDefinitions(kanjiToLookUp)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}

	err = retrieve15Definitions(kanjiToLookUp, pageNumber, results.Definitions)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}


	definitions, err := json.Marshal(results)
	if err != nil {
		log.Println("Json text problem")
		return nil, err
	}
	return definitions, nil
}

// The init prepares the sql statements used for database access and opens a database connection
func init(){
	parseSQL = "select value from k_ele where value IN ("
	count_number_of_matches_sql_string = "select count(*) from k_ele k LEFT OUTER JOIN r_ele r ON k.fk = r.fk LEFT OUTER JOIN sense s ON s.fk = k.fk where k.value like ?;"
	limit_results_sql_string = "select k.id, k.value, r.id, r.value, s.id from k_ele k LEFT OUTER JOIN r_ele r ON k.fk = r.fk LEFT OUTER JOIN sense s ON s.fk = k.fk where k.value like ? LIMIT page, 15;"
	all_kanji_info_sql_string =
		`
                select k_ele.id as k_ele_id,
                 entity.expansion as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 NULL as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from ke_inf, entity, k_ele
                where k_ele.id in (k) and k_ele.id = ke_inf.fk and ke_inf.entity = entity.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 ke_pri.value as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 NULL as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from ke_pri, k_ele
                where k_ele.id in (k) and k_ele.id = ke_pri.fk
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 r_ele.value as r_ele_val,
                 re_restr.value as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 NULL as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from r_ele, re_restr, k_ele
                where k_ele.id in (k) and r_ele.id in (r) and k_ele.fk = r_ele.fk and re_restr.fk = r_ele.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 r_ele.value as r_ele_val,
                 NULL as re_restr_val,
                 entity.expansion as re_inf_val,
                 NULL as re_pri_val,
                 NULL as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from r_ele, re_inf, entity, k_ele
                where k_ele.id in (k) and r_ele.id in (r) and k_ele.fk = r_ele.fk and re_inf.fk = r_ele.id and re_inf.entity = entity.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 r_ele.value as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 re_pri.value as re_pri_val,
                 NULL as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from r_ele, re_pri, k_ele
                where k_ele.id in (k) and r_ele.id in (r) and k_ele.fk = r_ele.fk and re_pri.fk = r_ele.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 stagk.value as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from sense, stagk, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and stagk.fk = sense.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 stagr.value as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from sense, stagr, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and stagr.fk = sense.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 entity.expansion as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from sense, pos, entity, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and pos.fk = sense.id and pos.entity = entity.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 xref.value as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from sense, xref, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and xref.fk = sense.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 ant.value as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from sense, ant, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and ant.fk = sense.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 entity.expansion as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from sense, field, entity, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and field.fk = sense.id and field.entity = entity.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 entity.expansion as misc_val,
                 NULL as s_inf_val,
                 NULL as gloss_val
                from sense, misc, entity, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and misc.fk = sense.id and misc.entity = entity.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 s_inf.value as s_inf_val,
                 NULL as gloss_val
                from sense, s_inf, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and s_inf.fk = sense.id
                UNION ALL
                select k_ele.id as k_ele_id,
                 NULL as ke_inf_val,
                 NULL as ke_pri_val,
                 NULL as r_ele_val,
                 NULL as re_restr_val,
                 NULL as re_inf_val,
                 NULL as re_pri_val,
                 sense.id as sense_id,
                 NULL as stagk_val,
                 NULL as stagr_val,
                 NULL as pos_val,
                 NULL as xref_val,
                 NULL as ant_val,
                 NULL as field_val,
                 NULL as misc_val,
                 NULL as s_inf_val,
                 gloss.value as gloss_val
                from sense, gloss, k_ele
                where k_ele.id in (k) and sense.id in (s) and k_ele.fk = sense.fk and gloss.fk = sense.id;
`
	var err error
	db, err = sql.Open("sqlite3", "jmdict.db")
	if err != nil {
		log.Fatal(err)
	}
}
