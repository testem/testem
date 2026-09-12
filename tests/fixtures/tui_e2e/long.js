const total = 40;
console.log('1..' + total);
console.log('not ok 1 TUI_E2E_PAGE_TOP');
for (let i = 2; i < total; i++) {
  console.log('not ok ' + i + ' mid-fail-' + i);
}
console.log('not ok ' + total + ' TUI_E2E_PAGE_BOTTOM');
