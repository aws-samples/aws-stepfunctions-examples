exports.handler = async (state, context, callback) => {
  console.log(JSON.stringify(state))
  let positive = 0, negative = 0, neutral = 0, mixed = 0;
  state.sentimentResults.map(sr => {
    positive += sr.score.Positive;
    negative += sr.score.Negative;
    neutral += sr.score.Neutral;
    mixed += sr.score.Mixed;
  });

  positive = positive / state.sentimentResults.length;
  negative = negative / state.sentimentResults.length;
  neutral = neutral / state.sentimentResults.length;
  mixed = mixed / state.sentimentResults.length;

  const sentiment = exports.getSentimentFromAverages(positive, negative, neutral, mixed);
  return {
    sentiment,
    score: {
      positive,
      negative,
      neutral,
      mixed
    }
  };

};

exports.getSentimentFromAverages = (positive, negative, neutral, mixed) => {
  const sentiment = [
    { key: 'POSITIVE', value: positive },
    { key: 'NEGATIVE', value: negative },
    { key: 'NEUTRAL', value: neutral },
    { key: 'MIXED', value: mixed }
  ];
  sentiment.sort(function (obj1, obj2) {
    return obj2.value - obj1.value;
  });

  return sentiment[0].key;
};
