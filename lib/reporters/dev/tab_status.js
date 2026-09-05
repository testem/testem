function tabColor(results, failOnZeroTests) {
  let equal = true;
  let hasTests = false;
  let pending = false;
  if (results) {
    const passed = results.get('passed');
    pending = results.get('pending');
    const total = results.get('total');
    equal = passed + pending === total;
    hasTests = total > 0;
  }
  const failCuzNoTests = !hasTests && failOnZeroTests;
  const success = !failCuzNoTests && equal;
  return success ? (pending ? 'yellow' : 'green') : 'red';
}

module.exports = {
  tabColor
};
