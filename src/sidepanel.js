// Chrome Side Panel helpers (Chrome 114+). Every function feature-detects
// chrome.sidePanel so the wallet keeps working as a plain popup in browsers
// that do not have it.

/* eslint-disable no-undef */
export const supportsSidePanel = () =>
  typeof chrome !== 'undefined' && !!chrome.sidePanel && !!chrome.windows;

// The panel page is opened as index.html?view=sidepanel (set from the
// background worker with chrome.sidePanel.setOptions).
export const isSidePanelMode = () =>
  new URLSearchParams(window.location.search).get('view') === 'sidepanel';

export const getPanelMode = () =>
  new Promise(resolve => {
    chrome.storage.local.get(['panelMode'], ({ panelMode }) =>
      resolve(panelMode === 'sidepanel' ? 'sidepanel' : 'popup'));
  });

// Persisting the choice is what the background worker reacts to: it calls
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick }) so the
// toolbar icon opens the panel instead of the popup.
export const setPanelMode = mode =>
  new Promise(resolve => {
    chrome.storage.local.set({ panelMode: mode }, resolve);
  });

// Must run inside a user-gesture handler (a click), as required by
// chrome.sidePanel.open. The popup closes itself afterwards.
export const openSidePanel = () =>
  new Promise((resolve, reject) => {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, win => {
      if (chrome.runtime.lastError || !win) {
        reject(new Error('No browser window to attach the side panel to'));
        return;
      }
      chrome.sidePanel.open({ windowId: win.id }).then(resolve, reject);
    });
  });

export const closeSidePanel = () =>
  new Promise(resolve => {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, win => {
      if (win && chrome.sidePanel.close) {
        chrome.sidePanel.close({ windowId: win.id }).then(resolve, resolve);
      } else {
        window.close();
        resolve();
      }
    });
  });
