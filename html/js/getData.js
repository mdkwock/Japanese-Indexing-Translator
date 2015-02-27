function wordStat(text) {
    return text.split('').filter(Boolean).reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}

function showDefinitions(kanji) {
    console.log("debugging");
    var table = document.querySelector('#word_result');
    var definitions = document.createElement('tbody');
    console.log("debugging");
    wordtolookup = JSON.stringify(kanji);
    $.post("/post", wordtolookup,
	   function(data,status){
	       $("#keleinfo").append(data);
	   });
}

var input = document.querySelector('#input');

input.addEventListener('keyup', function () {
    document.getElementById("outputarea").innerHTML = "";
    $(".outputarea").append('<div id="carousel" class="carousel" data-slick="{"slidesToShow": 4, "slidesToScroll": 4}"></div>');
    statistics = wordStat(input.value);
    for (var word in statistics) {
	$(".carousel").append('<div><button type="button" value="'+word+'" class="flat-button" onclick="showDefinitions(\''+word+'\');">'+word+': '+statistics[word]+'</button></div>');
    }

    $('.carousel').slick({
	slidesToShow: 3,
	slidesToScroll: 3,
	dots: true
    });
});
