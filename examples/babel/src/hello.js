function hello(name) {
  return `hello ${name ?? 'world'}`;
}

window.hello = hello;
