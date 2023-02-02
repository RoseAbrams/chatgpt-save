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
const qMessages = () => document.querySelectorAll("div.items-center > div.w-full.border-b");
// .item(n).textContent
const qMessageCore = (message) => message.querySelectorAll(".markdown.prose");
const qVariationsNav = (message) => message.querySelector("div.text-base > div.flex > div.text-xs");
const qVariationsCurrent = (message) => parseInt(qVariationsNav(message).textContent.at(0));
const qVariationsTotal = (message) => parseInt(qVariationsNav(message).textContent.at(-1));
const qHasVariations = (message) => qVariationsNav(message) === null;
const qVariationsButtons = (message) => qVariationsNav(message).querySelector("button");
// .item(0)     back
// .item(1)     forward
const qShowMore = () => document.querySelector("nav div div button");

/* testdata:
    https://chat.openai.com/chat/e7e8dccd-621d-4a15-8b76-f1dc67c88a35
    https://chat.openai.com/chat/7d9a0e30-1313-458b-b31e-72f740880ca7
*/

function batch() {
    let batchInfo = {};
    batchInfo.n = 0;
    batchInfo.start_time = Date.now();
    for (; true; batchInfo.n++) {
        const threadTabs = qThreadsList(); //TODO exclude already scraped threads - from amount in batchI?
        for (const threadTab of threadTabs) {
            threadTab.click();
            //TODO wait here for load - detect any change in qMessages()?
            threadJson = singleThread(batchInfo);
        }
        qShowMore().click();
        //TODO wait here for load - detect qThreadsList() gets bigger?
    }
}

function singleThread(batchInfo) {
    let threadJson = {};
    threadJson.url_hex = qURL().split('/')[4];
    threadJson.title = qThreadSelected().textContent;
    threadJson.desc = prompt('desc:', '');
    threadJson.custom_notes = null;
    threadJson.batch_info = batchInfo;

    let messagesJsonArray = [];
    stepMessages(messagesJsonArray, 0);
    threadJson.messages = messagesJsonArray;

    console.log(threadJson);
    chrome.storage.local.set({ "thread": threadJson });
    return threadJson;
}

function stepMessages(messagesJsonArray, startAt) {
    const messagesList = qMessages();
    for (let messageN = startAt; messageN < messagesList.length; messageN++) {
        const message = messagesList.item(messageN);
        if (qHasVariations(message)) {
            let variationsJsonArray = [];
            for (let variationN = qVariationsTotal(message); variationN > 0; variationN--) {
                let messagesJsonArray2 = [];
                messagesJsonArray2.push(message.textContent);
                qVariationsButtons(message).item(0).click();
                stepMessages(messagesJsonArray2, messageN);
                variationsJsonArray.unshift({ "messages": messagesJsonArray2 });
            }
            messagesJsonArray.push({ "variations": variationsJsonArray });
        } else {
            let messageOwner;
            if (messageN % 2 == 0) {
                messageOwner = "human";
            } else {
                messageOwner = "bot";
            }
            const messageCore = qMessageCore(message);
            const hasNonTextSections = messageCore.querySelectorAll("pre, table").length !== 0;
            let messageContent = hasNonTextSections ? [] : "";
            for (const messageSection of messageCore.childNodes) {
                switch (messageSection.nodeName) {
                    case "pre":
                        messageContent.push({ "code-block": messageSection.querySelector("code").textContent });
                        break;
                    case "p":
                    case "ol":
                    case "ul":
                        if (hasNonTextSections) {
                            messageContent.push({ "plaintext": messageSection.innerHTML });
                        } else {
                            messageContent += messageSection.innerHTML + "\n";
                        }
                        break;
                    case "table":
                        messageContent.push({ "table": messageSection.innerHTML });
                    default:
                        console.error("Unrecognized message section encountered: ");
                        console.log(messageSection);
                        alert("Unrecognized message section encountered!");
                        break;
                }
            }
            messagesJsonArray.push({ [messageOwner]: messageContent });
        }
    }
}