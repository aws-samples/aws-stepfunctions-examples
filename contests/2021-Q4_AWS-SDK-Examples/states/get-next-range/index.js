exports.handler = async (state, context) => {
  const part = ++state.part;
  const objectKey = exports.getObjectKeyForPart(state.prefix, state.fileName, part);
  state.parts.push(objectKey);

  const nextByteRange = exports.getNextByteRange(state.fileSize, state.rangeSize, state.startValue);
  return {
    next: {
      end: nextByteRange,
      start: (nextByteRange + 1),
      part: part
    },
    parts: state.parts
  };
};

exports.getNextByteRange = (fileSize, rangeSize, startValue) => {
  let nextByteRange = startValue + rangeSize;
  if (nextByteRange > fileSize) {
    nextByteRange = fileSize;
  }

  return nextByteRange;
};

exports.getObjectKeyForPart = (prefix, fileName, partNumber) => {
  return `${prefix}/${fileName}/${partNumber}`;
};