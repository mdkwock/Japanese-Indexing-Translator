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
	       console.log(results);
	       var odd = true;
	       for (var row in results) {
		   for (var kana in results[row]['R_ele']) {
		       var tr = document.createElement('tr'),
			   kanji_td = document.createElement('td'),
			   kana_td = document.createElement('td'),
			   meanings_td = document.createElement('td'),
			   span = document.createElement('span'),
			   kanji_text = document.createTextNode(results[row]['K_ele'].Kanji),
			   kana_text = document.createTextNode(kana);

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
		       var definitionNum = 1;
		       var numberOfDefinitions = Object.size(results[row]['Sense']);
		       var numberTheList = (numberOfDefinitions > 1);

		       for (var meaning in results[row]['Sense']) {
			   var meaning_text = document.createTextNode(results[row]['Sense'][meaning].Gloss.join('; '));
			   var br = document.createElement('br');

			   if (numberTheList) {
			       var number = document.createElement('strong');
			       number.appendChild(document.createTextNode(definitionNum + '. '));
			       meanings_td.appendChild(number);
			   }

			   meanings_td.appendChild(meaning_text);
			   meanings_td.appendChild(br);

			   definitionNum++;
		       }
		       tr.appendChild(meanings_td);

		       definitions.appendChild(tr);
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
