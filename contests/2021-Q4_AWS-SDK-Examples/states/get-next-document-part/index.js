exports.handler = async (state, context, callback) => {
  let hasNext = false;
  let part;
  if (state.parts.length > state.index) {
    hasNext = true,
      part = state.parts[state.index];
  }

  let piiEntities = state.results.piiEntities;
  if (state.piiEntities.length) {
    piiEntities = piiEntities.concat(state.piiEntities);
  }

  const sentiment = state.results.sentiment;
  if (state.sentiment.overall) {
    sentiment.push(state.sentiment);
  }

  return {
    next: {
      hasNext,
      key: part,
      ...hasNext && { nextIndex: ++state.index },
    },
    results: {
      piiEntities,
      sentiment
    }
  }
};
