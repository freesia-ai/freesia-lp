const copyButton = document.querySelector('[data-copy]');
if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const field = document.querySelector('#consultation');
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(field.value);
      status.textContent = 'コピーしました。Xなどの相談先に貼り付けてください。';
    } catch {
      field.focus();
      field.select();
      status.textContent = '文章を選択しました。コピー操作で保存してください。';
    }
  });
}
