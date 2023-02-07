const qThreadsList = () => document.querySelectorAll("nav div div a");
const qThreadSelected = () => {
  for (const threadTab of qThreadsList()) {
    if (threadTab.childElementCount == 3) {
      return threadTab;
    }
  }
  return null;
};
// .textContent
const qURL = () => window.location.href;
const qMessages = () =>
  document.querySelectorAll("div.items-center > div.w-full.border-b");
// .item(n).textContent
const qMessageCore = (message) =>
  message.querySelector(".items-start.gap-4.whitespace-pre-wrap");
const qVariationsNav = (message) =>
  message.querySelector("div.text-base > div.flex > div.text-xs");
const qVariationsCurrent = (message) =>
  parseInt(qVariationsNav(message).textContent.at(0));
const qVariationsTotal = (message) =>
  parseInt(qVariationsNav(message).textContent.at(-1));
const qHasVariations = (message) => qVariationsNav(message);
const qVariationsButtons = (message) =>
  qVariationsNav(message).querySelectorAll("button");
// .item(0)     back
// .item(1)     forward
const qShowMore = () => document.querySelector("nav div div button");

function waitForChanges() {
  console.log("waiting...");
  return new Promise((resolve) => {
    new MutationObserver((mutations, observer) => {
      observer.disconnect();
      console.log("done");
      resolve(mutations);
    }).observe(document.documentElement, {
      subtree: true,
      characterData: true,
    });
  });
}

/* testdata:
    https://chat.openai.com/chat/e7e8dccd-621d-4a15-8b76-f1dc67c88a35
    https://chat.openai.com/chat/7d9a0e30-1313-458b-b31e-72f740880ca7
*/

async function batch() {
  console.log("batch start");
  const batchInfo = {};
  batchInfo.start_time = Date.now();
  const batchCache = [];
  for (batchInfo.n = 0; true; batchInfo.n++) {
    const threadTabs = qThreadsList();
    //TODO exclude already scraped threads - from amount in batchI?
    for (const threadTab of threadTabs) {
      threadTab.click();
      await waitForChanges();
      var currentThreadHex = qURL().split("/")[4];
      if (!batchCache.some((thread) => thread.url_hex === currentThreadHex)) {
        var threadJson = singleThread(batchInfo);
        batchCache.push(threadJson);
      } else {
        console.log("thread already scraped: " + currentThreadHex);
      }
    }
    qShowMore().click();
    await waitForChanges();
  }
}

function singleThread(batchInfo) {
  console.log("singleThread start");
  let threadJson = {};
  threadJson.url_hex = qURL().split("/")[4];
  threadJson.title = document.title; //qThreadSelected().textContent;
  threadJson.desc = prompt("desc:", "");
  threadJson.custom_notes = null;
  threadJson.batch_info = batchInfo;

  let messagesJsonArray = [];
  stepMessages(messagesJsonArray, 0);
  threadJson.messages = messagesJsonArray;

  console.log(threadJson);
  chrome.storage.local.set({ thread: threadJson });
  return threadJson;
}

async function stepMessages(messagesJsonArray, startAt) {
  const messagesList = qMessages();
  for (let messageN = startAt; messageN < messagesList.length; messageN++) {
    const message = messagesList.item(messageN);
    if (qHasVariations(message)) {
      let variationsJsonArray = [];
      while (qVariationsCurrent(message) != qVariationsTotal(message)) {
        console.log("going to end, " + qVariationsNav(message).textContent);
        console.log(qVariationsButtons(message).item(1));
        qVariationsButtons(message).item(1).click();
        waitFor(10000);
      }
      for (
        let variationN = qVariationsTotal(message);
        variationN > 0;
        variationN--
      ) {
        let messagesJsonArray2 = [];
        messagesJsonArray2.push(message.textContent);
        qVariationsButtons(message).item(0).click();
        console.log(
          "going to beginning, " +
            qVariationsCurrent(message) +
            " / " +
            qVariationsTotal(message)
        );
        stepMessages(messagesJsonArray2, messageN);
        variationsJsonArray.unshift({ messages: messagesJsonArray2 });
      }
      messagesJsonArray.push({ variations: variationsJsonArray });
    } else {
      let messageOwner;
      if (messageN % 2 == 0) {
        messageOwner = "human";
      } else {
        messageOwner = "bot";
      }
      let messageCore = message.querySelector(
        ".items-start.gap-4.whitespace-pre-wrap"
      ); //qMessageCore(message);
      if (
        messageCore.childNodes.length === 1 &&
        messageCore.childNodes.item(0).nodeName === "DIV"
      )
        messageCore = messageCore.childNodes.item(0);
      console.log(messageCore);
      const hasNonTextSections =
        messageCore.querySelectorAll("pre, table").length !== 0;
      let messageContent = hasNonTextSections ? [] : "";
      for (const messageSection of messageCore.childNodes) {
        switch (messageSection.nodeName) {
          case "PRE":
            messageContent.push({
              "code-block": messageSection.querySelector("code").textContent,
            });
            break;
          case "#text":
            if (hasNonTextSections) {
              messageContent.push({ plaintext: messageSection.textContent });
            } else {
              messageContent += messageSection.textContent + "\n";
            }
            break;
          case "P":
          case "OL":
          case "UL":
            if (hasNonTextSections) {
              messageContent.push({ plaintext: messageSection.innerHTML });
            } else {
              messageContent += messageSection.innerHTML + "\n";
            }
            break;
          case "table":
            messageContent.push({ table: messageSection.innerHTML });
          default:
            console.error("Unrecognized message section encountered: ");
            console.log(messageSection);
            console.log(messageSection.nodeName);
            alert("Unrecognized message section encountered!");
            break;
        }
      }
      messagesJsonArray.push({ [messageOwner]: messageContent });
    }
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
