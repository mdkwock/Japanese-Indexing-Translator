function wordStat(text) {
    return text.split('').filter(Boolean).reduce(function (stat, word) {
        if (!stat[word]) stat[word] = 0;
        stat[word]++;
        return stat;
    }, {});
}
