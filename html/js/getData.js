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
function empty(divNode) {
    for (var i = divNode.childNodes.length - 1; i >= 0; i--) {
	divNode.removeChild(divNode.childNodes[i]);
    }
}

function appendToTable(results) {
    var odd = true,
	definitionsTableFragment = document.importNode(definitionsDiv.content, true),
	definitionsTable = definitionsTableFragment.querySelector('tbody');
    empty(wordTableDiv);
    for (var row in results) {
	for (var kana in results[row].R_ele) {
	    var definitionRowFragment = document.importNode(rowTemplateDiv.content, true),
		definitionRow = definitionRowFragment.querySelector('tr'),
		tds = definitionRow.querySelectorAll('td'),
		lowerRowFragment = document.importNode(lowerRowTemplateDiv.content, true),
		lowerRow = lowerRowFragment.querySelector('tr'),
		lowertd = lowerRow.querySelector('td'),
		kanji_td = tds[0],
		kana_td = tds[1],
		meanings_td = tds[2],
		span = kanji_td.getElementsByClassName('kanji')[0],
		spanLower = lowertd.getElementsByClassName('tags')[0],
		kanji_text = document.createTextNode(results[row].K_ele.Kanji);

	    definitionRow.className = (odd) ? 'odd' : 'even';
	    odd = !odd;

	    // Kanji column
	    span.textContent = results[row].K_ele.Kanji;

	    // Kana column
	    kana_td.textContent = kana;

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
    $.post("/post", wordtolookup,
	   function(data,status) {
	       var definitions = JSON.parse(data);
	       console.log(definitions);
	       empty(definitionsDiv);
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

function addWordButtons(arrayWithKeys, statsMap) {
    var sortedStats = arrayWithKeys.sort(function(a,b) {
	if (statsMap[b] - statsMap[a] == 0)
	    return b.length - a.length;
	return statsMap[b] - statsMap[a];
    });

    empty(outputareaDiv);

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

function addCharacterButtons(statsMap, clearOutputArea) {
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
    var segmenter = new TinySegmenter();
    var segs = segmenter.segment(inputText);
    var splitUpParsedText = addPermutations(segs);
    var reducedParsedText = Object.keys(splitUpParsedText);
    var textToParse = JSON.stringify(reducedParsedText);
    $.post("/parse", textToParse,
	   function(data,status) {
	       var validKanji = JSON.parse(data);
	       addWordButtons(validKanji, splitUpParsedText);
	       addCharacterButtons(wordStat(inputText),false);
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
outputareaDiv = document.getElementById("outputarea"),
charCheckBox = document.getElementById('wordCharacterToggle'),
inputColumnDiv = document.getElementById('input-column'),
input = document.querySelector('#input'),
button = document.querySelector('#lookupkanji'),
initialLoad = false,
helpDiv = document.getElementById('help-div'),
triangleButtonDiv = document.getElementById('hide-textbox'),
rowTemplateDiv = document.querySelector('#rowTemplate'),
lowerRowTemplateDiv = document.querySelector('#lowerRowTemplate'),
definitionsDiv = document.querySelector('#definitionsTemplate');

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

    $('#outputarea').on('click', function(ev) {
	if ($(ev.target).hasClass('flat-button')) {
	    showDefinitions(ev.target.value, 0);
	}
    });

    $('#wordCharacterToggle').on('click', function(ev) {
	$('#wordCharacterToggle').toggleClass('not-active');
	$('.not-single').toggle();
    });
    if (window.location.hash.substring(1) !== "") {
	// console.log(window.location.hash.substring(1));
	input.value = window.location.hash.substring(1);
	empty(outputareaDiv);
	parseForKanji();
    }

};
