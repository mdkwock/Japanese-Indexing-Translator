function isJapanese(letter) {
        return ((letter > '\u4dff' && letter < '\u9faf') || (letter > '\u33ff' && letter < '\u4dc0'));
}

function wordStat(text) {
    return text.split('').filter(function(letter) {
        return isJapanese(letter);
    }).reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}

function appendToTable(results) {
    var odd = true;
    for (var row in results) {
	for (var kana in results[row].R_ele) {
	    var tr = document.createElement('tr'),
		kanji_td = document.createElement('td'),
		kana_td = document.createElement('td'),
		meanings_td = document.createElement('td'),
		span = document.createElement('span'),
		spanLower = document.createElement('span'),
		kanji_text = document.createTextNode(results[row].K_ele.Kanji),
		kana_text = document.createTextNode(kana),
		lowertr = document.createElement('tr'),
		lowertd = document.createElement('td'),
		lowertd2 = document.createElement('td');

	    tr.className = (odd) ? 'odd' : 'even';
	    odd = !odd;

	    // Kanji column
	    kanji_td.className = 'kanji_column';
	    span.className = 'kanji';
	    span.appendChild(kanji_text);
	    kanji_td.appendChild(span);
	    tr.appendChild(kanji_td);

	    // Kana column
	    kana_td.className = 'kana_column';
	    kana_td.appendChild(kana_text);
	    tr.appendChild(kana_td);

	    // Meanings column
	    meanings_td.className = 'meanings_column';
	    var definitionNum = 1,
		numberOfDefinitions = Object.size(results[row].Sense),
		numberTheList = (numberOfDefinitions > 1);
	    var isCommonWord = (results[row].K_ele.Ke_pri != null) ? (results[row].K_ele.Ke_pri.length > 0) : false;
	    var pos_text = [];

	    for (var meaning in results[row].Sense) {
		var meaning_text = document.createTextNode(results[row].Sense[meaning].Gloss.join('; '));
		if (results[row].Sense[meaning].Pos != null)
		    pos_text = pos_text.concat(results[row].Sense[meaning].Pos);

		if (numberTheList) {
		    var number = document.createElement('strong');
		    number.appendChild(document.createTextNode(definitionNum + '. '));
		    meanings_td.appendChild(number);
		}

		meanings_td.appendChild(meaning_text);
		if (results[row].Sense[meaning].Field != null) {
		    var numFields = results[row].Sense[meaning].Field.length,
			fields_text = "";
		    for (var i = 0; i < numFields; i++) {
			fields_text += " ("+ results[row].Sense[meaning].Field[i] + ")";
		    }
		    meanings_td.appendChild(document.createTextNode(fields_text));
		}
		meanings_td.appendChild(document.createElement('br'));

		definitionNum++;

	    }
	    //lower part of the row
	    if (isCommonWord) {
		var spanCommon = document.createElement('span');
		spanCommon.className = "common";
		spanCommon.appendChild(document.createTextNode((pos_text != null) ? 'Common word, ' : 'Common word'));
		spanLower.appendChild(spanCommon);
	    }
	    spanLower.className = 'tags';
	    var lowertd_text = document.createTextNode(pos_text.join(', '));
	    spanLower.appendChild(lowertd_text);
	    lowertr.className = tr.className + " lower";
	    lowertd.colSpan = 2;
	    lowertd.appendChild(spanLower);
	    lowertr.appendChild(lowertd);
	    lowertr.appendChild(lowertd2);

	    tr.appendChild(meanings_td);

	    definitionsDiv.appendChild(tr);
	    definitionsDiv.appendChild(lowertr);
	}
    }
}

function appendPrevPageButton(kanji, currentPage) {
    if(currentPage > 1)
	$("#pageButton").append("<a id='prev' class='pageButton'>< Prev</a>");
}

function appendNextPageButton(kanji, currentPage, totalPages) {
    if(currentPage < totalPages)
	$("#pageButton").append("<button id='next' value='"+kanji+"' class='pageButton'>Next ></button>");
}

function appendPageButton(pageNum, kanji) {
    $("#pageButton").append("<button id='"+pageNum+"' class='pageButton' value='"+kanji+"'>"+pageNum+"</button>");
}

function applyPageButtons(numDefinitions, newPage, kanji) {
    pageButtonDiv.innerHTML = "";
    if (numDefinitions < 15) {
	return;
    }
    newPage = newPage + 1;
    var numButtons = Math.ceil(numDefinitions / 15);
    var i = 1;
    appendPrevPageButton(kanji, newPage);

    if (numButtons < 6) {
	while (i < numButtons) {
	    appendPageButton(i,kanji);
	    i++;
	}
	appendPageButton(i,kanji);
    }
    else {

	var begin = newPage - 2;
	var end = newPage + 2;

	if (begin < 1) {
	    end += (1-begin);
	}
	if (end > numButtons) {
	    begin -= end - numButtons;
	    end = numButtons;
	}
	if (begin < 1) {
	    begin = 1;
	}
	while (begin < end) {
	    appendPageButton(begin,kanji);
	    begin++;
	}
	appendPageButton(end,kanji);
    }
    $('#'+newPage).attr('disabled',true);
    appendNextPageButton(kanji, newPage, numButtons);
}

function showDefinitions(kanji, page) {
    currPage = page;
    kanjiOnPage = kanji;
    var whatToLookUp = {"kanji":kanji, "page":currPage};
    var wordtolookup = JSON.stringify(whatToLookUp);
    $.post("/post", wordtolookup,
	   function(data,status) {
	       var definitions = JSON.parse(data);
	       definitionsDiv.innerHTML = "";
	       applyPageButtons(definitions.NumDefinitionsTotal, currPage, kanji);
	       appendToTable(definitions.Definitions);
	   });
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function addButtonsUsingArray(arrayWithKeys, statsMap) {
    var sortedStats = arrayWithKeys.sort(function(a,b) {
	if (statsMap[b] - statsMap[a] == 0)
	    return b.length - a.length;
	return statsMap[b] - statsMap[a];
    });

    outputareaDiv.innerHTML = "";

    var testDuplicate = {};
    for (var index in sortedStats) {
	if (!testDuplicate[sortedStats[index]]) {
	    testDuplicate[sortedStats[index]] = 1;
	} else {
	    continue;
	}

	$(".outputarea").append('<button type="button" value="'+sortedStats[index]+'" class="flat-button not-single">'+sortedStats[index]+' : '+ statsMap[sortedStats[index]]+'</button>');
    }
}

function addButtonsUsingMap(statsMap, clearOutputArea) {
    var sortedStats = Object.keys(statsMap)
	.sort(function(a,b) {
	    return statsMap[b] - statsMap[a];
	});
    for (var index in sortedStats) {
	$(".outputarea").append('<button type="button" value="'+sortedStats[index]+'" class="flat-button single-char">'+sortedStats[index]+' : '+statsMap[sortedStats[index]]+'</button>');
    }
}

function addPermutations(text) {
    var parsedtext = [];
    var arrayLength = text.length;
    for (var i = 0; i < arrayLength; i++) {
	// another for loop for each letter in the word
	var wordLength = text[i].length;
	for (var j = 0; j < wordLength; j++) {
	    //another for loop for each word length
	    for (var k = 2; (k+j) < wordLength + 1; k++) {
		parsedtext.push(text[i].substr(j,k));
	    }
	}
    }
    return parsedtext.reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}

function parseForKanji() {
    var inputText = input.value;
    var splitUpParsedText = inputText.match(/[^ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ、・。“” ']+/g);
    splitUpParsedText = addPermutations(splitUpParsedText);
    var reducedParsedText = Object.keys(splitUpParsedText);
    var textToParse = JSON.stringify(reducedParsedText);
    $.post("/parse", textToParse,
	   function(data,status) {
	       var validKanji = JSON.parse(data);
	       addButtonsUsingArray(validKanji, splitUpParsedText);
	       addButtonsUsingMap(wordStat(inputText),false);
	   });
    var url = document.createElement('a');
    url.href = window.location;
    url.hash = input.value;
    history.replaceState({}, document.title, url.href);
}

var currPage = 0;
var kanjiOnPage = "";
var pageButtonDiv = document.getElementById("pageButton");
var definitionsDiv = document.getElementById("definitions");
var outputColumnDiv = document.getElementById("output-column");
var outputareaDiv = document.getElementById("outputarea");
var charCheckBox = document.getElementById('characters');
var wordsCheckBox = document.getElementById('words');
var inputColumnDiv = document.getElementById('input-column');
var input = document.querySelector('#input');
var button = document.querySelector('#lookupkanji');
var initialLoad = false;
var helpDiv = document.getElementById('help-div');
var triangleButtonDiv = document.getElementById('triangle-button');

button.addEventListener('click', parseForKanji);

window.onload = function(){
    document.getElementById('words').onchange = function() {
	$(".not-single").toggle(15);
    };

    document.getElementById('characters').onchange = function() {
	$(".single-char").toggle(15);
    };

    triangleButtonDiv.onclick = function() {
	if (inputColumnDiv.style.display != "none") {
	    inputColumnDiv.style.display = "none";
	    outputColumnDiv.className = "output-column-expanded";
	}
	else{
	    inputColumnDiv.style.display = "inline-block";
	    outputColumnDiv.className = "output-column";
	}
    };


    $('#pageButton').on('click', function(ev) {
	if (ev.target.id === 'next')
	    showDefinitions(kanjiOnPage, currPage+1);
	else if (ev.target.id === 'prev')
	    showDefinitions(kanjiOnPage, currPage-1);
	else if (ev.target.id !== 'pageButton')
	    showDefinitions(ev.target.value, parseInt(ev.target.id)-1);
    });

    $('#outputarea').on('click', function(ev) {
	if ($(ev.target).hasClass('flat-button')) {
	    helpDiv.innerHTML = "";
	    helpDiv.style.marginTop = 0;
	}
	    showDefinitions(ev.target.value, 0);
    });

    if (window.location.hash.substring(1) !== "") {
	input.value = window.location.hash.substring(1);
	outputareaDiv.innerHTML = "";
	parseForKanji();
    }

    if (input.value == "") {
	helpDiv.innerHTML = "\
	    <h2>Try pasting this paragraph into the textbox and clicking the Look Up button! </h2>\
	    <p>\
	クラスごと異世界に召喚され、他のクラスメイトがチートなスペックと“天職”を有する中、一人平凡を地で行く主人公南雲ハジメ。彼の“天職”は“錬成師”、言い換えれば唯の鍛治職だった。最弱の彼は、クラスメイトにより奈落の底に落とされる。必死に生き足掻き、気がつけば世界最強・・・というありがちストーリー。最強物を書きたくて書きました。最強、ハーレム等テンプレを多分に含みます。最終的に不遜で鬼畜な主人公を目指します。見切り発車なので途中で改変する可能性があります。\
	</p>\
	    <img src=\"arrow100.png\" alt=\"arrow\">";
	initialLoad = true;
    }

};
