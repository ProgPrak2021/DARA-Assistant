import * as Con from "./connectors/.";
import * as Utils from './pageUtils';

chrome.runtime.onInstalled.addListener(async () => {
  let connectors = Object.values(Con);
  const url = "https://raw.githubusercontent.com/justgetmydata/jgmd/master/_data/sites.json"

  let response = await fetch(url).then(response => response.json())

  response.forEach((element: any) => {
    element.description = element.notes_en;
    element.requestUrl = element.url;
    element.hostnames = [(new URL(element.url ?? "")).hostname]
    element.actions = [];
  });

  chrome.storage.local.set({ connectors: response }, function () {
    console.log('Stored connectors in local storage:', connectors);
  });
});

chrome.runtime.onMessage.addListener(async (message) => {
  console.log("Message received in background!", message);

  if (message.action) {
    let tab: any = await Utils.getCurrentTab();
    const hostname = message.hostname ?? (new URL(tab.url ?? "")).hostname;
    const connector: any = await Utils.getConnector(hostname);
    if (connector && tab) {
      const { action } = message;
      if (connector.requestUrl) {
        tab = await Utils.loadUrl(tab, connector.requestUrl, message.create)
      }
      if (tab === false) {
        chrome.runtime.sendMessage({
          actionResponse:
            "Didn't reach the company's request page. Probably, you need to log in first.",
        });
      } else {
        console.log(`Send Message to content script to execute ${action}`);
        chrome.tabs.sendMessage(<number>tab.id, { action: action });
      }
    } else {
      console.log(`Could not find connector matching ${tab.url}.`);
    }

  } else if (message.getConnector) {
    const tab: any = await Utils.getCurrentTab();
    const { hostname } = new URL(tab.url ?? "");
    const connector = await Utils.getConnector(hostname);
    if (connector && tab) {
      console.log("Sending response", { connector: connector });
      chrome.runtime.sendMessage({ connector: connector });
    } else {
      console.log(`Could not find connector matching ${tab.url}.`);
      chrome.runtime.sendMessage({ notSupported: true });
    }

  } else if (message.downloadUrl) {
    chrome.downloads.download({
      url: message.downloadUrl,
      filename: message.downloadName,
    });
    chrome.runtime.sendMessage({ actionResponse: "Your Download is ready." });
  }
});