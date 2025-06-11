console.log('Pixiv Content Script Loaded');

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'download_pixiv_images') {
    const originalImageLinks = document.querySelectorAll(
      'a[href*="/img-original/"]',
    );

    if (originalImageLinks.length === 0) {
      alert(
        '未找到原图链接\n\n可能原因：\n1. 当前页面不是作品详情页\n2. 图片未加载完成\n3. 需点击"查看原图"按钮',
      );
      return;
    }

    const urls = Array.from(originalImageLinks)
      .map((a) => {
        let url = a.href.split('?')[0];
        if (!url.startsWith('http')) url = 'https:' + url;
        return url;
      })
      .filter((v, i, a) => a.indexOf(v) === i); // 去重

    downloadInBatches(urls, 5, 1000 * 10);
  }
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadInBatches(urls, batchSize, delayMs) {
  // 第一步：统计每个 artworkId 出现次数
  const idCount = {};
  for (const url of urls) {
    const rawFilename = url.split('/').pop();
    const match = rawFilename.match(/^(\d+)_p(\d+)(\.\w+)$/);
    if (match) {
      const artworkId = match[1];
      idCount[artworkId] = (idCount[artworkId] || 0) + 1;
    }
  }

  // 第二步：按批次下载
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (url) => {
        const rawFilename = url.split('/').pop(); // e.g. 125898401_p0.jpg
        const match = rawFilename.match(/^(\d+)_p(\d+)(\.\w+)$/);

        if (!match) return;

        const artworkId = match[1];
        const page = match[2].padStart(3, '0');
        const ext = match[3];
        const onlyOne = idCount[artworkId] === 1;

        // 第三步：根据数量判断是否加文件夹
        const filename = onlyOne
          ? `pixiv/${artworkId}_p${page}${ext}`
          : `pixiv/${artworkId}/${artworkId}_p${page}${ext}`;

        try {
          await browser.runtime.sendMessage({
            url,
            filename,
            referer: 'https://www.pixiv.net/',
          });
          console.log('Download dispatched:', filename);
        } catch (err) {
          console.error('Failed to dispatch download:', url, err);
        }
      }),
    );

    await delay(delayMs);
  }
}
