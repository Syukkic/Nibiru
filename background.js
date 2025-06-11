browser.runtime.onMessage.addListener((message) => {
  if (message.url && message.filename) {
    const headers = [{ name: 'Referer', value: 'https://www.pixiv.net/' }];
    browser.downloads
      .download({
        url: message.url,
        filename: message.filename,
        saveAs: false,
        conflictAction: 'overwrite',
        headers: headers,
      })
      .then((downloadId) => {
        console.log(`Download started with ID: ${downloadId}`);
      })
      .catch((error) => {
        console.error('Download failed:', error);
      });
  }
});
