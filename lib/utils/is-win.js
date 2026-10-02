function test(platform) {
  return /^win/.test(platform);
}

const currentPlatform = test(process.platform);

export default function isWin(platform) {
  if (platform) {
    return test(platform);
  }

  return currentPlatform;
}