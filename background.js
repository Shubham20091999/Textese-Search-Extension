let shortcuts = {};
let jump_to_tab = true;
let tabURL = "";
let tabTitle = "";

//------------------------Utils
function focusOn(tab) {
	chrome.tabs.update(tab.id, { active: true });
	chrome.windows.update(tab.windowId, { focused: true });
}

//------------------------Omnibox
// Provide help text to the user.
chrome.omnibox.setDefaultSuggestion({
	description: `Type to get Suggestions and Autocomplete`
});

//TODO... improve ui colors

// Open the page based on how the user clicks on a suggestion.
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
	url = shortcuts[text.trim()];
	if (!url)
		return;
	try {
		chrome.tabs.query({}, (currentTabs) => {
			if (jump_to_tab) {
				for (const tab of currentTabs) {
					const taburl = tab.url.replaceAll("/", "");
					const jumpToUrl = url.replaceAll("/", "");

					if (taburl === jumpToUrl) {
						focusOn(tab);
						return;
					}
				}
			}
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
		});
	}
	catch (e) {
		console.error(e);
	}
});

function createSuggestionsFromResponse(response) {
	ret = [];
	for (const [key, value] of Object.entries(shortcuts)) {
		if ((key.startsWith(response) || key == response) && value) {
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
	chrome.storage.sync.get(['shortcuts', 'jump_to_tab'], function (data) {
		try {
			if (data.shortcuts)
				shortcuts = data.shortcuts;
			if (data.jump_to_tab !== null)
				jump_to_tab = data.jump_to_tab;

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
			case "load_jump_to_tab":
				jump_to_tab = message.data;
				break;
			case "get_page_info":
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

					focusOn(extTabs[0]);

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
chrome.action.onClicked.addListener(openPage);
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

