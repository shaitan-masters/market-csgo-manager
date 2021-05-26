module.exports = function (message: string) {
  try {
    return JSON.parse(message);
  } catch (error){
    this.processParsingError(error)
  }
};
