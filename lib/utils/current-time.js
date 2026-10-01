function currentTimeAsLocaleTimeString() {
  let dateTime = new Date();

  return dateTime.toLocaleTimeString();
}

export { currentTimeAsLocaleTimeString as asLocaleTimeString };