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

function appendPrevPageButton(kanji, currentPage) {
    prevPage = currentPage - 1;
    if(prevPage > 1)
	$("#pageButton").append("<a id='prev' class='pageButton' onclick=\"showDefinitions('"+ kanji +"',"+ (prevPage-1) +")\"><<</a>");
}

function appendNextPageButton(kanji, currentPage, totalPages) {
    nextPage = currentPage + 1;
    if(nextPage < totalPages)
	$("#pageButton").append("<a id='next' class='pageButton' onclick=\"showDefinitions('"+ kanji +"',"+ (nextPage-1) +")\">>></a>");
}

function appendPageButton(pageNum, kanji) {
    $("#pageButton").append("<a id='"+pageNum+"' class='pageButton' onclick=\"showDefinitions('"+ kanji +"',"+ (pageNum-1) +")\">"+pageNum+"</a>");
}

function applyPageButtons(numDefinitions, newPage, kanji) {
    var pageButtonDiv = document.getElementById("pageButton");

    if (numDefinitions < 15) {
	pageButtonDiv.innerHTML = "";
	return;
    }
    newPage = newPage + 1;
    var numButtons = Math.ceil(numDefinitions / 15);
    var i = 1;
    if (kanjiOnPage != kanji) {
	pageButtonDiv.innerHTML = "";
	kanjiOnPage = kanji;

	// TODO add previous page button
	if (numButtons < 8) {	// normally add buttons if there aren't that many ( < 8)
	    while (numButtons > 0) {
		appendPageButton(i,kanji);
		i++;
		numButtons--;
	    }
	    $('#1').attr('disabled',true);
	    appendNextPageButton(kanji, 1, numButtons);
	}    // buttons need some special formatting so we don't print out too many buttons
	else {
	    if (newPage < 7) {
		while (i < 7) {
		    appendPageButton(i,kanji);
		    i++;
		}
		$('#1').attr('disabled',true);
		// TODO add a next button here or something
		appendDashButton();
		appendPageButton(numButtons, kanji);
		appendNextPageButton(kanji, 1, numButtons);
	    }
	}
    }    // current page is not near 1st page but near the middle or last
    else {
	currentPage = parseInt($('button:disabled').prop('id'));
	// page buttons don't need to be reloaded, just change the highlighted button
	if ((currentPage < 5 && newPage < 5) || (currentPage > (numButtons - 4) && newPage > (numButtons - 4))) {
	    $('button:disabled').attr('disabled',false);
	    $('#'+newPage).attr('disabled',true);
	    $('#next').onclick = function() {
		if(newPage < numButtons)
		    showDefinitions(kanji,newPage+1);
		else
		    $('#next').attr('disabled',true);
	    };
	    $('#prev').onclick = function() {
		if(newPage > 1)
		    showDefinitions(kanji,newPage-1);
		else
		    $('#prev').attr('disabled',true);
	    };
	} // reformat the buttons
	else {
	    if (newPage < 5) {
		pageButtonDiv.innerHTML = "";
		while(i < 7) {
		    appendPageButton(i, kanji);
		    i++;
		}
		$('#'+newPage).attr('disabled',true);
		appendDashButton();
		appendPageButton(numButtons, kanji);
		appendNextPageButton(kanji, newPage, numButtons);
	    }
	    else if (newPage < numButtons-3) {
		pageButtonDiv.innerHTML = "";
		appendPrevPageButton(kanji, newPage);
		appendPageButton(i, kanji);
		appendDashButton();
		i = newPage - 2;
		while (i < newPage+3) {
		    appendPageButton(i, kanji);
		    i++;
		}
		appendDashButton();
		appendPageButton(numButtons, kanji);
		appendNextPageButton(kanji, newPage, numButtons);
		// TODO append next page button
		$('button:disabled').attr('disabled',false);
		$('#'+newPage).attr('disabled',true);
	    }
	    // newPage is near the last page
	    else if (newPage > (numButtons - 4)) {
		pageButtonDiv.innerHTML = "";
		appendPrevPageButton(kanji, newPage);
		appendPageButton(i, kanji);
		appendDashButton();
		i = numButtons - 5;
		while (i <= numButtons) {
		    appendPageButton(i,kanji);
		    i++;
		}
		$('#'+newPage).attr('disabled',true);
		appendNextPageButton(kanji, newPage, numButtons);
		// TODO add next page button
	    }
	}
    }
}

function showDefinitions(kanji, page) {
    var whatToLookUp = {"kanji":kanji, "page":page};
    var wordtolookup = JSON.stringify(whatToLookUp);
    $.post("/post", wordtolookup,
	   function(data,status) {
	       var definitions = JSON.parse(data);
	       document.getElementById("definitions").innerHTML = "";
	       applyPageButtons(definitions.NumDefinitionsTotal, page, kanji);
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

function addButtonsUsingMap(statsMap, clearOutputArea) {
    var sortedStats = Object.keys(statsMap)
	.sort(function(a,b) {
	    return statsMap[b] - statsMap[a];
	});
    if(clearOutputArea)
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

function parseForKanji() {
    var input = document.querySelector('#input');
    var inputText = input.value;
    var splitUpParsedText = inputText.match(/[^ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ、・。“” ']+/g);
    splitUpParsedText = addPermutations(splitUpParsedText);
    var reducedParsedText = Object.keys(splitUpParsedText);
    var textToParse = JSON.stringify(reducedParsedText);
    $.post("/parse", textToParse,
	   function(data,status) {
	       var definitions = document.getElementById('definitions');
	       var validKanji = JSON.parse(data);
	       addButtonsUsingArray(validKanji, splitUpParsedText);
	   });
    var url = document.createElement('a');
    url.href = window.location;
    url.hash = input.value;
    history.replaceState({}, document.title, url.href);
}

var currPage = 0;
var kanjiOnPage = "";
var input = document.querySelector('#input');
input.addEventListener('keyup', function () {
    var statistics = wordStat(input.value);
    addButtonsUsingMap(statistics,true);
});

var button = document.querySelector('#lookupkanji');
button.addEventListener('click', parseForKanji);

window.onload = function(){
    var input = document.querySelector('#input');
    if (input.value == "") {
	input.value = window.location.hash.substring(1);
	parseForKanji();
	var statistics = wordStat(input.value);
	addButtonsUsingMap(statistics,false);
    }
    document.getElementById('checkbox').onchange = function {
	if (document.getElementById('checkbox').checked === false ) {

	}
    };
};
