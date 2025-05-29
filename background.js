const DICTIONARY_URL = "https://compscimmo.github.io/pokeking-translator/dictionary.json"; // Your GitHub Pages URL
const DICTIONARY_STORAGE_KEY = "myDictionary";
const UPDATE_INTERVAL_MINUTES = 60; // Update every hour

async function fetchAndUpdateDictionary() {
    console.log("Background: Attempting to fetch and update dictionary...");
    try {
        const response = await fetch(DICTIONARY_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dictionary = await response.json();

        // Store the dictionary in local storage
        await chrome.storage.local.set({ [DICTIONARY_STORAGE_KEY]: dictionary });
        console.log("Background: Dictionary updated from remote source and stored in local storage.");

        // Optionally, store the last updated timestamp
        await chrome.storage.local.set({ lastDictionaryUpdate: Date.now() });

    } catch (error) {
        console.error("Background: Failed to fetch or update dictionary:", error);
    }
}

async function getDictionary() {
    console.log("Background: Retrieving dictionary from storage...");
    const result = await chrome.storage.local.get(DICTIONARY_STORAGE_KEY);
    const dictionary = result[DICTIONARY_STORAGE_KEY] || {};
    if (Object.keys(dictionary).length === 0) {
        console.warn("Background: Dictionary not found in local storage or is empty. This might be normal on first run, fetching now.");
        // Attempt to fetch if not found, but don't block `getDictionary`'s return
        fetchAndUpdateDictionary();
    }
    return dictionary; // Return an empty object if not found
}

// Run on extension installation/update
chrome.runtime.onInstalled.addListener(() => {
    console.log("Background: Extension installed or updated. Fetching dictionary now.");
    fetchAndUpdateDictionary();
});

// Periodically run the update function using chrome.alarms
chrome.alarms.create('updateDictionary', { periodInMinutes: UPDATE_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateDictionary') {
        console.log("Background: Alarm triggered. Fetching dictionary.");
        fetchAndUpdateDictionary();
    }
});

// Listen for messages from content scripts to provide the dictionary
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDictionary") {
        console.log("Background: Received 'getDictionary' request from content script. Sending dictionary.");
        // We use getDictionary() here which also handles potential initial fetch if storage is empty
        getDictionary().then(dict => {
            sendResponse({ dictionary: dict });
        });
        return true; // Indicates async response
    }
});