(function () {
  var script = document.currentScript;
  var tenantId = script.getAttribute("data-tenant-id") || "";
  var position = script.getAttribute("data-position") || "right";
  var primaryColor = script.getAttribute("data-primary-color") || "#7C3AED";
  var companyName = script.getAttribute("data-company-name") || "Suporte";
  var baseUrl = script.src.replace(/\/nps-chat-embed\.js.*$/, "");
  var supabaseUrl = "https://mfmkxpdufcbwydixbbbe.supabase.co";

  // --- Banner Logic ---
  var bannerContainer = null;

  function createBannerContainer() {
    bannerContainer = document.createElement("div");
    bannerContainer.id = "nps-banners-container";
    bannerContainer.style.cssText =
      "position:fixed;top:0;left:0;width:100%;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
    document.body.appendChild(bannerContainer);
  }

  function renderBanner(banner) {
    var div = document.createElement("div");
    div.setAttribute("data-assignment-id", banner.assignment_id);
    div.style.cssText =
      "padding:12px 20px;font-size:14px;position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;background-color:" +
      banner.bg_color +
      ";color:" +
      banner.text_color +
      ";";

    // Content
    var contentDiv = document.createElement("div");
    contentDiv.style.cssText = "flex:1;display:flex;align-items:center;gap:12px;flex-wrap:wrap;";

    var text = document.createElement("span");
    text.textContent = banner.content;
    contentDiv.appendChild(text);

    if (banner.link_url) {
      var link = document.createElement("a");
      link.href = banner.link_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = banner.link_label || "Saiba mais";
      link.style.cssText =
        "color:" +
        banner.text_color +
        ";text-decoration:underline;font-size:13px;opacity:0.9;";
      contentDiv.appendChild(link);
    }

    div.appendChild(contentDiv);

    // Actions
    var actions = document.createElement("div");
    actions.style.cssText = "display:flex;align-items:center;gap:6px;";

    if (banner.has_voting) {
      var upBtn = document.createElement("button");
      upBtn.innerHTML = "👍";
      upBtn.title = "Like";
      upBtn.style.cssText =
        "background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:4px;opacity:" +
        (banner.vote === "up" ? "1" : "0.6") +
        ";";
      upBtn.onclick = function () {
        voteBanner(banner.assignment_id, "up");
        upBtn.style.opacity = "1";
        downBtn.style.opacity = "0.6";
      };
      actions.appendChild(upBtn);

      var downBtn = document.createElement("button");
      downBtn.innerHTML = "👎";
      downBtn.title = "Dislike";
      downBtn.style.cssText =
        "background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:4px;opacity:" +
        (banner.vote === "down" ? "1" : "0.6") +
        ";";
      downBtn.onclick = function () {
        voteBanner(banner.assignment_id, "down");
        downBtn.style.opacity = "1";
        upBtn.style.opacity = "0.6";
      };
      actions.appendChild(downBtn);
    }

    // Close button
    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText =
      "background:none;border:none;cursor:pointer;color:" +
      banner.text_color +
      ";font-size:16px;padding:4px 6px;border-radius:4px;opacity:0.7;";
    closeBtn.onmouseover = function () {
      closeBtn.style.opacity = "1";
    };
    closeBtn.onmouseout = function () {
      closeBtn.style.opacity = "0.7";
    };
    closeBtn.onclick = function () {
      div.remove();
      if (
        bannerContainer &&
        bannerContainer.children.length === 0
      ) {
        bannerContainer.remove();
      }
    };
    actions.appendChild(closeBtn);

    div.appendChild(actions);
    return div;
  }

  function voteBanner(assignmentId, vote) {
    fetch(supabaseUrl + "/functions/v1/vote-banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId, vote: vote }),
    }).catch(function () {});
  }

  function loadBanners() {
    var token = localStorage.getItem("chat_visitor_token");
    if (!token) return;

    fetch(
      supabaseUrl +
        "/functions/v1/get-visitor-banners?visitor_token=" +
        encodeURIComponent(token)
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.banners && data.banners.length > 0) {
          createBannerContainer();
          data.banners.forEach(function (banner) {
            bannerContainer.appendChild(renderBanner(banner));
          });
        }
      })
      .catch(function () {});
  }

  // --- Chat Widget Iframe ---
  function createChatWidget() {
    var iframe = document.createElement("iframe");
    iframe.src =
      baseUrl +
      "/widget?embed=true&position=" +
      encodeURIComponent(position) +
      "&primaryColor=" +
      encodeURIComponent(primaryColor) +
      "&companyName=" +
      encodeURIComponent(companyName) +
      "&tenantId=" +
      encodeURIComponent(tenantId);
    iframe.style.cssText =
      "position:fixed;bottom:0;" +
      (position === "left" ? "left" : "right") +
      ":0;width:420px;height:700px;border:none;z-index:99998;background:transparent;";
    iframe.allow = "clipboard-write";
    document.body.appendChild(iframe);
  }

  // Init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      loadBanners();
      createChatWidget();
    });
  } else {
    loadBanners();
    createChatWidget();
  }
})();
