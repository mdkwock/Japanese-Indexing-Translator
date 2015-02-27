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
    console.log("debugging");
    wordtolookup = JSON.stringify(kanji);
    $.post("/post", wordtolookup,
	   function(data,status){
	       $("#keleinfo").append(data);
	       $("#releinfo").append("<h3>Test</h3>");
	   });
}

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
