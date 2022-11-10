const tabHistory = [];  // List of tab IDs, last one is the current tab.
const pushToHistory = (tabId) => tabHistory.push(tabId);
const removeFromHistory = (tabId) => {  // Does nothing if it doesn't exist.
	const oldIndex = tabHistory.indexOf(tabId);
	if (oldIndex > -1) tabHistory.splice(oldIndex, 1);
};

// Initially, add the currently active tab to the history.
chrome.tabs.query({
	active: true,
	lastFocusedWindow: true,
}, (tab) => {
	pushToHistory(tab[0].id);
});

// Pop newly activated tabs to the back of the history.
chrome.tabs.onActivated.addListener((info) => {
	removeFromHistory(info.tabId);
	pushToHistory(info.tabId);
});

// Remove closed tabs from the history.
chrome.tabs.onRemoved.addListener((tabId, info) => {
	removeFromHistory(tabId);
});

// When the extension is activated, switch back to the second-to-last entry in
// the history, which is the tab that was active before the current one.
chrome.action.onClicked.addListener((tab) => {
	if (tabHistory.length > 1) {
		chrome.tabs.update(tabHistory[tabHistory.length - 2], {active: true});
	}
});
