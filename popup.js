document.getElementById("init").addEventListener("click", function () {
  chrome.runtime.sendMessage("init");
});

document.getElementById("single").addEventListener("click", function () {
  chrome.runtime.sendMessage("single");
});

document.getElementById("batch").addEventListener("click", function () {
  chrome.runtime.sendMessage("batch");
});

document.getElementById("wait").addEventListener("click", async function () {
  console.log("start");
  await sleep(3000);
  console.log("stop");
});

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
