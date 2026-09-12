import { createElement, useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return createElement(
    'button',
    { type: 'button', onClick: () => setCount((n) => n + 1) },
    'Count: ',
    count
  );
}
