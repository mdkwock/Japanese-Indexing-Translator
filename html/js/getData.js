function wordStat(text) {
    return text.split('').filter(Boolean).reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}

var input = document.querySelector('#input');
var button = document.querySelector('#lookupbutton');

button.addEventListener('click', function () {
    statistics = wordStat(input.value);
    for (var word in statistics) {
	$("#outputarea").append('<input type="submit" value="'+word+'" class="flat-button">');
    }
});
