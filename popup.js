document.getElementById("single").addEventListener("click", function () {
    chrome.runtime.sendMessage("single");
});

document.getElementById("batch").addEventListener("click", function () {
    chrome.runtime.sendMessage("batch");
});