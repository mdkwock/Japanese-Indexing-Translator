function wordStat(text) {
    return text.split('').filter(Boolean).reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}

function showDefinitions(kanji) {
    var table = document.querySelector('#word_result');
    var definitions = document.createElement('tbody');
    wordtolookup = JSON.stringify(kanji);
    $.post("/post", wordtolookup,
	   function(data,status){
	       kanjis = data[kanji].MatchingKanji;
	       for (var definition in kanjis) {
		   keleinfo = kanjis[definition].Keleinfo
		   releinfo = kanjis[definition].Releinfo
		   senseinfo = kanjis[definition].Senseinfo
	       }
	   });
}

var input = document.querySelector('#input');
var button = document.querySelector('#lookupbutton');

button.addEventListener('click', function () {
    statistics = wordStat(input.value);
    for (var word in statistics) {
	$("#outputarea").append('<input type="submit" value="'+word+'" class="flat-button">');
    }
});

input.addEventListener('keyup', function () {
    statistics = wordStat(input.value);
    for (var word in statistics) {
	$("#carousel").append('<div><button type="button" value="'+word+'" class="flat-button" onclick="showDefinitions('+word+')">'+word+': '+statistics[word]+'</button></div>');
    }
});
