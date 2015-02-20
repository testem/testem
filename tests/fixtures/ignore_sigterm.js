process.on('SIGTERM', function() {
  // Ignore
  console.log('SIGTERM ignored')
});

process.stdin.resume()
