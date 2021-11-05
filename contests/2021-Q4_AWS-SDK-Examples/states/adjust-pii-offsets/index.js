exports.handler = async (state, context, callback) => {
  state.piiEntities.map(pii => {
    pii.BeginOffset += state.characterOffset;
    pii.EndOffset += state.characterOffset;
  });

  const characterOffset = state.characterOffset + state.text.length;

  return {
    entities: state.piiEntities,
    characterOffset: characterOffset
  };
};