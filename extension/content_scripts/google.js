function injectTextButton(title) {
  const resultCard = title.closest(".tF2Cxc") || title.closest("div.g");
  if (!resultCard) return;

  const titleRow = title.closest("div.yuRUbf") || title.parentElement;
  if (!titleRow || titleRow.querySelector(".remit-save-btn")) return;

  const titleLink = title.closest("a");
  const link = titleLink || resultCard.querySelector("a[href^='http']");
  if (!link) return;
  if (!/^https?:\/\//i.test(link.href)) return;
  if (link.href.includes("google.com/search?")) return;

  titleRow.classList.add("remit-hover-zone", "remit-google-anchor");

  const btn = document.createElement("button");
  btn.className = "remit-save-btn remit-google-btn";
  btn.innerHTML = "🧠";
  btn.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: link.href });
    btn.innerHTML = "✅";
    setTimeout(() => {
      btn.innerHTML = "🧠";
    }, 2000);
  };
  titleRow.appendChild(btn);
}

function injectImageButton() {
  const allImages = document.querySelectorAll("img");

  allImages.forEach((img) => {
    const link = img.closest("a");
    if (!link || (!link.href.includes("imgres") && !link.href.includes("google.com/imgres"))) return;

    const container = img.closest("div[role='listitem']") || img.parentElement?.parentElement;
    if (!container || container.querySelector(".remit-save-btn")) return;

    container.classList.add("remit-hover-zone", "remit-google-anchor");

    const btn = document.createElement("button");
    btn.className = "remit-save-btn remit-google-btn";
    btn.innerHTML = "🧠";

    btn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      let finalUrl = link.href;
      if (finalUrl.includes("imgrefurl=")) {
        const params = new URLSearchParams(new URL(finalUrl).search);
        finalUrl = params.get("imgrefurl");
      }

      chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: finalUrl });
      btn.innerHTML = "✅";
      setTimeout(() => {
        btn.innerHTML = "🧠";
      }, 2000);
    };

    container.appendChild(btn);
  });
}

function scanGoogle() {
  const textTitles = document.querySelectorAll(".tF2Cxc h3, .g h3");
  textTitles.forEach((title) => injectTextButton(title));
  injectImageButton();
}

setInterval(scanGoogle, 2000);
