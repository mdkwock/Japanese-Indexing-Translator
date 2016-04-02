function isJapanese(letter) {
    return letter.match('[一-龠々〆ヵヶ]');
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
function empty(divNode) {
    for (var i = divNode.childNodes.length - 1; i >= 0; i--) {
	divNode.removeChild(divNode.childNodes[i]);
    }
}

function appendToTable(results) {
    var odd = true,
	definitionsTableFragment = document.importNode(definitionsDiv, true),
	definitionsTable = definitionsTableFragment.querySelector('tbody');
    empty(wordTableDiv);
    for (var row in results) {
	var definitionRowFragment = document.importNode(rowTemplateDiv, true),
	    definitionRow = definitionRowFragment.querySelector('tr'),
	    tds = definitionRow.querySelectorAll('td'),
	    lowerRowFragment = document.importNode(lowerRowTemplateDiv, true),
	    lowerRow = lowerRowFragment.querySelector('tr'),
	    lowertd = lowerRow.querySelector('td'),
	    kanji_td = tds[0],
	    kana_td = tds[1].childNodes[1],
	    meanings_td = tds[2],
	    span = kanji_td.getElementsByClassName('kanji')[0],
	    spanLower = lowertd.getElementsByClassName('tags')[0];

	definitionRow.className = (odd) ? 'odd' : 'even';
	odd = !odd;

	// Kanji column
	span.textContent = results[row].K_ele.Kanji;

	// Kana column
	var moreThanOneKana = false;
	for (var kana in results[row].R_ele) {
	    if (moreThanOneKana) kana_td.appendChild(document.createElement('br'));
	    var kana_span_copy = document.importNode(kanaSpans,true);
	    var kana_span = kana_span_copy.querySelector('.kana');
	    var romaji_span = kana_span_copy.querySelector('.english');
	    if (results[row].R_ele[kana].Re_pri) {
		kana_span.className += ' common';
		romaji_span.title += 'commonly used pronunciation';
		romaji_span.className += ' common';
	    }
	    if (results[row].R_ele[kana].Re_inf && results[row].R_ele[kana].Re_inf[0].match('^(ok|ik)')) {
		kana_span.className += ' out-dated';
		romaji_span.className += ' out-dated';
		romaji_span.title += 'out-dated';
		kana_span.textContent = '「'+kana+ '」';
		romaji_span.textContent =  '「' + wanakana.toRomaji(kana) + '」';
	    }
	    else {
		kana_span.textContent = kana;
		romaji_span.textContent =  wanakana.toRomaji(kana);
	    }
	    kana_td.appendChild(kana_span_copy);
	    moreThanOneKana = true;
	}

	// Meanings column
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
	var lowertd_text = document.createTextNode(pos_text.join(', '));
	spanLower.appendChild(lowertd_text);
	lowerRow.className = lowerRow.className + ' ' + definitionRow.className;

	definitionsTable.appendChild(definitionRow);
	definitionsTable.appendChild(lowerRow);
    }
    wordTableDiv.appendChild(definitionsTable);
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
    empty(pageButtonDiv);
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
    $.post("/lookUpWord", wordtolookup,
	   function(data,status) {
	       var definitions = JSON.parse(data);
	       //console.log(definitions);
	       empty(wordTableDiv);
	       applyPageButtons(definitions.NumDefinitionsTotal, currPage, kanji);
	       appendToTable(definitions.Definitions);
	   });
    var url = document.createElement('a');
    url.href = window.location;
    url.pathname = '/search/'+kanji;
    history.replaceState({}, document.title, url.href);
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function appendToNode(node, text, statsMap, i) {
    if (text[i].length > 1) {
	$(node).append('<button type="button" value="'+ text[i] +'" class="flat-button not-single">'+ text[i] +' : '+ statsMap[text[i]]+'</button>');
    }
    else {
	$(node).append('<button type="button" value="'+text[i]+'" class="flat-button single-char">'+text[i]+' : '+statsMap[text[i]]+'</button>');
    }
}

function addButtons(validKanji, kanjiStats, originalText) {
    empty(outputColumnDiv);
    var outputAreaFragment = document.importNode(outputAreaDivFragment,true),
	outputAreaDiv = outputAreaFragment.getElementById('outputarea');
    addWordButtons(validKanji, kanjiStats, outputAreaDiv);
    addCharacterButtons(originalText, outputAreaDiv);
    outputColumnDiv.appendChild(outputAreaDiv);
    $('#wordCharacterToggle').toggle();
}

function addWordButtons(validKanji, kanjiStats, outputAreaDiv) {
    var sortedStats = validKanji.sort(function(a,b) {
	if (kanjiStats[b] - kanjiStats[a] == 0)
	    return b.length - a.length;
	return kanjiStats[b] - kanjiStats[a];
    });

    var testDuplicate = {};
    for (var index in sortedStats) {
	if (sortedStats[index].length < 2) continue;
	if (!testDuplicate[sortedStats[index]]) {
	    testDuplicate[sortedStats[index]] = 1;
	} else {
	    continue;
	}

	appendToNode(outputAreaDiv, sortedStats, kanjiStats, index);
    }
}

function addCharacterButtons(originalText, outputAreaDiv) {
    var statsMap = wordStat(originalText);
    var sortedKeys = Object.keys(statsMap)
	.sort(function(a,b) {
	    return statsMap[b] - statsMap[a];
	});
    for (var index in sortedKeys) {
	appendToNode(outputAreaDiv, sortedKeys, statsMap, index);
    }
}

function addPermutations(text) {
    var arrayLength = text.length;
    for (var i = 0; i < arrayLength; i++) {
	// another for loop for each letter in the word
	if (text.length < 2) continue;
	var wordLength = text[i].length;
	for (var j = 0; j < wordLength; j++) {
	    //another for loop for each word length
	    for (var k = 2; (k+j) < wordLength + 1; k++) {
		if (text[i] != text[i].substr(j,k)) {
		    text.push(text[i].substr(j,k));
		}
	    }
	}
    }
    // returns a map[word] -> wordCount
    return text.reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}

function parseForKanji() {
    var inputText = input.value;
    var segmenter = new TinySegmenter();
    var segs = segmenter.segment(inputText);
    var splitUpParsedText = addPermutations(segs);
    var reducedParsedText = Object.keys(splitUpParsedText);
    var textToParse = JSON.stringify(reducedParsedText);
    $.post("/parse", textToParse,
	   function(data,status) {
	       var validKanji = JSON.parse(data);
	       addButtons(validKanji, splitUpParsedText, inputText);
	   });
    var url = document.createElement('a');
    url.href = window.location;
    url.hash = input.value;
    history.replaceState({}, document.title, url.href);
}

var currPage = 0,
kanjiOnPage = "",
pageButtonDiv = document.getElementById("pageButton"),
wordTableDiv = document.getElementById("word_result"),
outputColumnDiv = document.getElementById("output-column"),
outputAreaDivFragment = document.getElementById("outputAreaTemplate").content,
charCheckBox = document.getElementById('wordCharacterToggle'),
inputColumnDiv = document.getElementById('input-column'),
input = document.getElementById('input'),
button = document.getElementById('lookupkanji'),
initialLoad = false,
helpDiv = document.getElementById('help-div'),
triangleButtonDiv = document.getElementById('hide-textbox'),
rowTemplateDiv = document.getElementById('rowTemplate').content,
lowerRowTemplateDiv = document.getElementById('lowerRowTemplate').content,
kanaSpans = document.getElementById('kanaSpanTemplate').content,
definitionsDiv = document.getElementById('definitionsTemplate').content;

button.addEventListener('click', parseForKanji);

window.onload = function(){
    $('#pageButton').on('click', function(ev) {
	if (ev.target.id === 'next')
	    showDefinitions(kanjiOnPage, currPage+1);
	else if (ev.target.id === 'prev')
	    showDefinitions(kanjiOnPage, currPage-1);
	else if (ev.target.id !== 'pageButton')
	    showDefinitions(ev.target.value, parseInt(ev.target.id)-1);
    });

    $('#output-column').on('click', function(ev) {
	if ($(ev.target).hasClass('flat-button')) {
	    showDefinitions(ev.target.value, 0);
	}
    });

    $('#wordCharacterToggle').on('click', function(ev) {
	$('#wordCharacterToggle').toggleClass('not-active');
	$('.not-single').toggle();
    });
    if (window.location.hash.substring(1) !== "") {
	input.value = decodeURIComponent(window.location.hash.substring(1));
	empty(outputColumnDiv);
	parseForKanji();
    }
    if (window.location.pathname.match("^/search/")) {
	var kanji = decodeURIComponent(window.location.pathname.match("/search/(.*)")[1]);
	showDefinitions(kanji, 0);
    }
};
