

module.exports = str => {
  if (typeof str !== 'string') { return; }

  return str.replace(/\w+/g, word => word.replace(/^[a-z]/, firstCharacter => firstCharacter.toUpperCase()));
};
