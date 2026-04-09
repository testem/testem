function hello(name?: string): string {
  return `hello ${name ?? 'world'}`;
}

interface HelloWindow extends Window {
  hello: (name?: string) => string;
}

(window as HelloWindow).hello = hello;
