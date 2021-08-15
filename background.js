let shortcuts = {};
let tabURL = "";
let tabTitle = "";

//------------------------Omnibox
// Provide help text to the user.
chrome.omnibox.setDefaultSuggestion({
  description: `Type to get Suggestions and Autocomplete`
});


// Open the page based on how the user clicks on a suggestion.
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  url = shortcuts[text];
  if (!url)
    return;
  try {
    switch (disposition) {
      case "currentTab":
        chrome.tabs.update({ url })
        break;
      case "newForegroundTab":
        chrome.tabs.create({ url });
        break;
      case "newBackgroundTab":
        chrome.tabs.create({ url, active: false });
        break;
    }
  }
  catch (e) {
    console.error(e);
  }
});

function createSuggestionsFromResponse(response) {
  ret = [];
  for (const [key, value] of Object.entries(shortcuts)) {
    if (key.startsWith(response) || key == response) {
      ret.push({ content: key, description: value });
    }
  }
  return ret;
}

// Update the suggestions whenever the input is changed.
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  try {
    suggest(createSuggestionsFromResponse(text));
  }
  catch (e) {
    console.error(e);
  }
});

//-------------------------------Popup
async function refresh() {
  // let data = await chrome.storage.sync.get('shortcuts');
  // if (data.shortcuts)
  //   shortcuts = data.shortcuts;

  chrome.storage.sync.get("shortcuts", function (data) {
    try {
      if (data.shortcuts)
        shortcuts = data.shortcuts;

    }
    catch (e) {
      console.error(e);
    }
  });
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.command) {
      case "load":
        shortcuts = message.data;
        break;
      case "get_url":
        sendResponse({ url: tabURL, title: tabTitle });
        return true;
    }
  }
  catch (e) {
    console.log(e);
  }
});

async function openPage() {
  chrome.tabs.query({ currentWindow: true, active: true }, (currentTabs) => {
    tabURL = currentTabs[0].url;
    tabTitle = currentTabs[0].title;
    chrome.tabs.query({
      url: chrome.runtime.getURL('logic.html'),
    }, (extTabs) => {
      try {
        //Creating new tab if not already present
        if (extTabs.length == 0) {
          chrome.tabs.create({
            url: "logic.html",
          });
        }
        //Focus on existing extension tab
        else {
          for (var i = 1; i < extTabs.length; i++)
            chrome.tabs.remove(extTabs[i].id);

          chrome.tabs.update(extTabs[0].id, { active: true });
          chrome.windows.update(extTabs[0].windowId, { focused: true });

          //Sending New URL to the extension
          chrome.tabs.sendMessage(extTabs[0].id, { command: 'reload_URL' });
        }
      }
      catch (e) {
        console.error(e);
      }
    });
  });
}

//-----------------------Default Calls
chrome.browserAction.onClicked.addListener(openPage);
refresh();

chrome.commands.onCommand.addListener(function (message) {
  try {
    switch (message) {
      case "Open-Shortcuts-Page":
        openPage();
        break;
    }
  }
  catch (e) {
    console.error(e);
  }
});

