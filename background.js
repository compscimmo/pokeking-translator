const DICTIONARY_URL = "https://your-dictionary-host.com/dictionary.json"; // Replace with your actual URL
const DICTIONARY_STORAGE_KEY = "myDictionary";
const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // Update every hour (adjust as needed)

async function fetchAndUpdateDictionary() {
  try {
    const response = await fetch(DICTIONARY_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const dictionary = await response.json();

    // Store the dictionary in local storage
    await chrome.storage.local.set({ [DICTIONARY_STORAGE_KEY]: dictionary });
    console.log("Dictionary updated from remote source.");

    // Optionally, store the last updated timestamp
    await chrome.storage.local.set({ lastDictionaryUpdate: Date.now() });

  } catch (error) {
    console.error("Failed to fetch or update dictionary:", error);
  }
}

// Run on extension installation/update
chrome.runtime.onInstalled.addListener(() => {
  fetchAndUpdateDictionary();
});

// Periodically run the update function
// For Manifest V3, you'd use alarms or a more sophisticated background process
// This is a simplified example for demonstration; proper periodic tasks in MV3
// might involve chrome.alarms or more complex service worker lifecycle management.
chrome.alarms.create('updateDictionary', { periodInMinutes: 60 }); // Runs every 60 minutes

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateDictionary') {
    fetchAndUpdateDictionary();
  }
});

// Example of how other parts of your extension would access the dictionary
async function getDictionary() {
  const result = await chrome.storage.local.get(DICTIONARY_STORAGE_KEY);
  return result[DICTIONARY_STORAGE_KEY] || [];
}

// You can expose this function to other parts of your extension if needed
// For example, if a popup needs to display dictionary size, or a content script
// needs to check words.
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "getDictionary") {
//     getDictionary().then(dict => sendResponse({ dictionary: dict }));
//     return true; // Indicates async response
//   }
// });