function wordStat(text) {
    return text.split('').filter(Boolean).reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}

function showDefinitions(kanji) {
    $('#definitions').empty();
    var definitions = document.getElementById('definitions');

    wordtolookup = JSON.stringify(kanji);
    $.post("/post", wordtolookup,
	   function(data,status) {
	       results = JSON.parse(data);
	       var odd = true;
	       for (var row in results) {
		   for (var kana in results[row]['R_ele']) {
		       var tr = document.createElement('tr'),
			   kanji_td = document.createElement('td'),
			   kana_td = document.createElement('td'),
			   meanings_td = document.createElement('td'),
			   span = document.createElement('span'),
			   spanLower = document.createElement('span'),
			   kanji_text = document.createTextNode(results[row]['K_ele'].Kanji),
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
		           numberOfDefinitions = Object.size(results[row]['Sense']),
		           numberTheList = (numberOfDefinitions > 1);
		       var isCommonWord = (results[row]['K_ele'].Ke_pri != null) ? (results[row]['K_ele'].Ke_pri.length > 0) : false;
		       var pos_text = [];

		       for (var meaning in results[row]['Sense']) {
			   var meaning_text = document.createTextNode(results[row]['Sense'][meaning].Gloss.join('; '));
			   if (results[row]['Sense'][meaning].Pos != null)
			       pos_text = pos_text.concat(results[row]['Sense'][meaning].Pos);

			   if (numberTheList) {
			       var number = document.createElement('strong');
			       number.appendChild(document.createTextNode(definitionNum + '. '));
			       meanings_td.appendChild(number);
			   }

			   meanings_td.appendChild(meaning_text);
			   if (results[row]['Sense'][meaning].Field != null) {
			       var numFields = results[row]['Sense'][meaning].Field.length,
				   fields_text = "";
			       for (var i = 0; i < numFields; i++) {
				   fields_text += " ("+ results[row]['Sense'][meaning].Field[i] + ")";
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
		       lowertd_text = document.createTextNode(pos_text.join(', '));
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
	   });
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var input = document.querySelector('#input');

input.addEventListener('keyup', function () {
    statistics = wordStat(input.value);

    var numSlidesToShow = 0;
    for (var key in statistics) {
	if (statistics.hasOwnProperty(key)) numSlidesToShow++;
	if (numSlidesToShow > 4) break;
    }

    document.getElementById("outputarea").innerHTML = "";
    $(".outputarea").append('<div id="carousel" class="carousel" data-slick="{"slidesToShow": '+numSlidesToShow+', "slidesToScroll": '+numSlidesToShow+'}"></div>');

    for (var word in statistics) {
	$(".carousel").append('<div><button type="button" value="'+word+'" class="flat-button" onclick="showDefinitions(\''+word+'\');">'+word+': '+statistics[word]+'</button></div>');
    }

    $('.carousel').slick({
	slidesToShow: numSlidesToShow,
	slidesToScroll: numSlidesToShow,
	dots: true
    });
});

var button = document.querySelector('#lookupkanji');

button.addEventListener('click', function () {
    $('#definitions').empty();
    var definitions = document.getElementById('definitions');

    textToParse = JSON.stringify(input.value);
    $.post("/parse", textToParse,
	   function(data,status){
	       results = JSON.parse(data);
	       var numSlidesToShow = 0;
	       for (var key in results) {
		   if (results.hasOwnProperty(key)) numSlidesToShow++;
		   if (numSlidesToShow > 4) break;
	       }
	       console.log(numSlidesToShow);
	       console.log(results);
	       document.getElementById("outputarea").innerHTML = "";
	       $(".outputarea").append('<div id="carousel" class="carousel" data-slick="{"slidesToShow": '+numSlidesToShow+', "slidesToScroll": '+numSlidesToShow+'}"></div>');

	       for (var word in results) {
		   $(".carousel").append('<div><button type="button" value="'+word+'" class="flat-button" onclick="showDefinitions(\''+word+'\');">'+word+': '+results[word]+'</button></div>');
	       }

	       $('.carousel').slick({
		   slidesToShow: numSlidesToShow,
		   slidesToScroll: numSlidesToShow,
		   dots: true
	       });
	   });

});
