function currentTimeAsLocaleTimeString() {
  let dateTime = new Date();

  return dateTime.toLocaleTimeString();
}

const currentTime = {
  asLocaleTimeString: currentTimeAsLocaleTimeString
};

export default currentTime;
