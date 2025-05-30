// Debug logging
console.log('Background script loaded');

// Track if copilot is active
let isActive = false;

// Add a badge to show status
chrome.action.setBadgeText({ text: 'OFF' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  
  if (!isActive) {
    // Activate copilot
    console.log('Attempting to inject content script...');
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    }).then(() => {
      console.log('Content script injected successfully');
      isActive = true;
      chrome.action.setTitle({ title: 'Deactivate Copilot' });
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });
    }).catch(err => {
      console.error('Failed to inject content script:', err);
      chrome.action.setBadgeText({ text: 'ERR' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    });
  } else {
    // Deactivate copilot
    console.log('Attempting to deactivate copilot...');
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        console.log('Removing copilot elements...');
        const overlay = document.getElementById('copilot-overlay');
        if (overlay) overlay.remove();
        const indicator = document.getElementById('copilot-script-loaded');
        if (indicator) indicator.remove();
      }
    }).then(() => {
      console.log('Copilot deactivated successfully');
      isActive = false;
      chrome.action.setTitle({ title: 'Activate Copilot' });
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    }).catch(err => {
      console.error('Failed to deactivate copilot:', err);
      chrome.action.setBadgeText({ text: 'ERR' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    });
  }
});
