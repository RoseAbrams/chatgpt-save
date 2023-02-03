function json_url(object) {
  return URL.createObjectURL(
    new Blob([JSON.stringify(object)], { type: "application/json" })
  );
}

chrome.storage.onChanged.addListener((event) => {
  chrome.storage.local.get(null, (storage) => {
    chrome.downloads.download({
      url: json_url(storage.thread),
      filename: "chatgpt_save/" + storage.thread.url_hex + ".json",
      conflictAction: "overwrite",
      saveAs: false,
    });
  });
  chrome.storage.local.clear();
});

chrome.runtime.onMessage.addListener((message) => {
  console.log("message = " + message);
  if (message === "init") {
    chrome.tabs.executeScript({
      file: "/scraper.js",
    });
  }
  if (message === "batch") {
    chrome.tabs.executeScript({
      code: `batch()`,
    });
  }
  if (message === "single") {
    chrome.tabs.executeScript({
      code: `singleThread(null)`,
    });
  }
});
