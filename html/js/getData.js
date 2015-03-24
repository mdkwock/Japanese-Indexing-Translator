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
    var definitions = document.getElementById('definitions');
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

	    definitions.appendChild(tr);
	    definitions.appendChild(lowertr);
	}
    }
}

function appendDashButton() {
    $("#pageButton").append("&#32;&#32;&#32;&mdash;&#32;&#32;&#32;");
}

function appendPageButton(pageNum, kanji) {
    $("#pageButton").append("<button type='button' id='page"+pageNum+"' value=\"\" onclick=\"showDefinitions('"+ kanji +"',"+ (pageNum-1) +")\">"+pageNum+"</button>");
}

function appendPageButtons(numDefinitions, currentPage, kanji) {
    var numButtons = Math.ceil(numDefinitions / 15);
    // TODO add previous page button
    var i = 1;
    // normally add buttons if there aren't that many ( < 8)
    if (numButtons < 8) {
	while (numButtons > 0) {
	    appendPageButton(i,kanji);
	    i++;
	    numButtons--;
	}
    }
    // buttons need some special formatting so we don't print out too many buttons
    else {
	// currentPage is near the 1st page
	if (currentPage < 7) {
	    while (i < 7) {
		appendPageButton(i,kanji);
		i++;
	    }
	    // TODO add a next button here or something
	    appendDashButton();
	    appendPageButton(numButtons, kanji);
	}
	// currentPage is near the last page
	else if (currentPage > (numButtons - 7)) {
	    appendPageButton(i, kanji);
	    appendDashButton();
	    i = numButtons - 7;
	    while (i <= numButtons) {
		appendPageButton(i,kanji);
		i++;
	    }
	    // TODO add next page button
	}
	// current page is not near 1st or last page but near the middle
	else {
	    appendPageButton(i, kanji);
	    appendDashButton();
	    // TODO append scroller button
	    i = currentPage - 2;
	    while (i < currentPage+3) {
		appendPageButton(i, kanji);
		i++;
	    }
	    appendDashButton();
	    // TODO append scroller button
	    appendPageButton(numButtons, kanji);
	    // TODO append next page button
	}
    }
}

function showDefinitions(kanji, page) {
    document.getElementById("definitions").innerHTML = "";
    var whatToLookUp = {"kanji":kanji, "page":page};
    // pageOf[kanji] = page;
    var wordtolookup = JSON.stringify(whatToLookUp);
    $.post("/post", wordtolookup,
	   function(data,status) {
	       var results = JSON.parse(data);

	       var pageButtonDiv = document.getElementById("pageButton");
	       // if there is more than 1 page add page buttons
	       if (results.NumDefinitionsTotal > 15) {
		   // different kanji, load all the page buttons for the first time
		   if (kanjiOnPage != kanji) {
		       pageButtonDiv.innerHTML = "";
		       currPage = page + 1;
		       kanjiOnPage = kanji;
		       appendPageButtons(results.NumDefinitionsTotal, currPage, kanji);
		   }
		   // Same kanji but load different page
		   // (change the way the page buttons look but same buttons)
		   else {
		       currPage = page+1;
		       reformatPageButtons(currPage,kanji);
		   }
	       } // erase previously loaded buttons
	       else {
		   pageButtonDiv.innerHTML = "";
	       }
	       appendToTable(results.Definitions);
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

    document.getElementById("outputarea").innerHTML = "";

    var testDuplicate = {};
    for (var index in sortedStats) {
	if (!testDuplicate[sortedStats[index]]) {
	    testDuplicate[sortedStats[index]] = 1;
	} else {
	    continue;
	}

	$(".outputarea").append('<button type="button" value="'+sortedStats[index]+'" class="flat-button" onclick="showDefinitions(\''+sortedStats[index]+'\',0);">'+sortedStats[index]+' : '+ statsMap[sortedStats[index]]+'</button>');
    }
}

function addButtonsUsingMap(statsMap) {
    var sortedStats = Object.keys(statsMap)
	.sort(function(a,b) {
	    return statsMap[b] - statsMap[a];
	});

    document.getElementById("outputarea").innerHTML = "";
    for (var index in sortedStats) {
	$(".outputarea").append('<button type="button" value="'+sortedStats[index]+'" class="flat-button" onclick="showDefinitions(\''+sortedStats[index]+'\',0);">'+sortedStats[index]+' : '+statsMap[sortedStats[index]]+'</button>');
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

var input = document.querySelector('#input');
var currPage = 0;
var kanjiOnPage = "";

input.addEventListener('keyup', function () {
    var statistics = wordStat(input.value);
    addButtonsUsingMap(statistics);
});

var button = document.querySelector('#lookupkanji');

button.addEventListener('click', function () {
    var inputText = input.value;
    var splitUpParsedText = inputText.match(/[^ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ、・。“” ']+/g);
    splitUpParsedText = addPermutations(splitUpParsedText);
    var reducedParsedText = Object.keys(splitUpParsedText);
    var textToParse = JSON.stringify(reducedParsedText);
    // console.log(textToParse);
    $.post("/parse", textToParse,
	   function(data,status) {
	       // document.getElementById("definitions").innerHTML = "";
	       var definitions = document.getElementById('definitions');
	       var validKanji = JSON.parse(data);
	       // console.log(validKanji);
	       addButtonsUsingArray(validKanji, splitUpParsedText);
	   });
});
