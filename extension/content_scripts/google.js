function injectTextButton(title) {
  const container = title.closest("div.g") || title.closest(".tF2Cxc") || title.parentElement;
  if (!container || container.querySelector(".remit-save-btn")) return;

  const link = container.querySelector("a");
  if (!link) return;

  container.classList.add("remit-hover-zone");
  container.style.position = "relative";

  const btn = document.createElement("button");
  btn.className = "remit-save-btn";
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
  container.appendChild(btn);
}

function injectImageButton() {
  const allImages = document.querySelectorAll("img");

  allImages.forEach((img) => {
    const link = img.closest("a");
    if (!link || (!link.href.includes("imgres") && !link.href.includes("google.com/imgres"))) return;

    const container = img.closest("div[role='listitem']") || img.parentElement?.parentElement;
    if (!container || container.querySelector(".remit-save-btn")) return;

    container.classList.add("remit-hover-zone");
    container.style.position = "relative";
    container.style.display = "block";

    const btn = document.createElement("button");
    btn.className = "remit-save-btn";
    btn.innerHTML = "🧠";
    btn.style.zIndex = "9999";
    btn.style.top = "10px";
    btn.style.right = "10px";

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
  const textTitles = document.querySelectorAll("h3");
  textTitles.forEach((title) => injectTextButton(title));
  injectImageButton();
}

setInterval(scanGoogle, 2000);
