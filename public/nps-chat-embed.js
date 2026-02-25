(function () {
  var script = document.currentScript;
  var apiKey = script.getAttribute("data-api-key") || "";
  var externalId = script.getAttribute("data-external-id") || "";
  var position = script.getAttribute("data-position") || "right";
  var primaryColor = script.getAttribute("data-primary-color") || "#7C3AED";
  var buttonShape = script.getAttribute("data-button-shape") || "circle";
  var companyName = script.getAttribute("data-company-name") || "Suporte";
  var baseUrl = script.src.replace(/\/nps-chat-embed\.js.*$/, "");
  var supabaseUrl = "https://mfmkxpdufcbwydixbbbe.supabase.co";

  // Resolved visitor data
  var resolvedToken = null;
  var resolvedName = null;
  var resolvedEmail = null;
  var resolvedOwnerUserId = null;
  var resolvedCompanyContactId = null;
  var resolvedContactId = null;
  var resolvedAutoStart = false;
  var resolvedNeedsForm = false;
  var resolvedHasHistory = false;

  // Dynamic field definitions from backend
  var fieldDefinitions = [];
  var widgetSettings = {};

  // Accumulated visitor props
  var visitorProps = {};
  var chatIframe = null;

  // Reserved keys that map to specific params (not custom_data)
  var RESERVED_KEYS = ["name", "email", "phone", "company_id", "company_name", "user_id"];

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
      banner.bg_color + ";color:" + banner.text_color + ";";

    var contentDiv = document.createElement("div");
    contentDiv.style.cssText = "flex:1;display:flex;align-items:center;gap:12px;flex-wrap:wrap;";

    var text = document.createElement("span");
    text.style.cssText = "max-height:3em;overflow:hidden;display:block;line-height:1.4;flex:1;word-break:break-word;";
    if (banner.content_html) {
      text.innerHTML = banner.content_html;
    } else {
      text.textContent = banner.content;
    }
    contentDiv.appendChild(text);
    if (banner.text_align) contentDiv.style.textAlign = banner.text_align;

    if (banner.link_url) {
      var link = document.createElement("a");
      link.href = banner.link_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = banner.link_label || "Saiba mais";
      link.style.cssText = "color:" + banner.text_color + ";text-decoration:underline;font-size:13px;opacity:0.9;";
      contentDiv.appendChild(link);
    }

    div.appendChild(contentDiv);

    var actions = document.createElement("div");
    actions.style.cssText = "display:flex;align-items:center;gap:6px;";

    if (banner.has_voting) {
      var upBtn = document.createElement("button");
      upBtn.innerHTML = "👍";
      upBtn.title = "Like";
      upBtn.style.cssText =
        "background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:4px;opacity:" +
        (banner.vote === "up" ? "1" : "0.6") + ";";
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
        (banner.vote === "down" ? "1" : "0.6") + ";";
      downBtn.onclick = function () {
        voteBanner(banner.assignment_id, "down");
        downBtn.style.opacity = "1";
        upBtn.style.opacity = "0.6";
      };
      actions.appendChild(downBtn);
    }

    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText =
      "background:none;border:none;cursor:pointer;color:" + banner.text_color +
      ";font-size:16px;padding:4px 6px;border-radius:4px;opacity:0.7;";
    closeBtn.onmouseover = function () { closeBtn.style.opacity = "1"; };
    closeBtn.onmouseout = function () { closeBtn.style.opacity = "0.7"; };
    closeBtn.onclick = function () {
      div.remove();
      if (bannerContainer && bannerContainer.children.length === 0) bannerContainer.remove();
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
    var bannerUrl;
    if (apiKey && externalId) {
      bannerUrl = supabaseUrl + "/functions/v1/get-visitor-banners?api_key=" +
        encodeURIComponent(apiKey) + "&external_id=" + encodeURIComponent(externalId);
    } else {
      var token = resolvedToken || localStorage.getItem("chat_visitor_token");
      if (!token) return;
      bannerUrl = supabaseUrl + "/functions/v1/get-visitor-banners?visitor_token=" + encodeURIComponent(token);
    }

    fetch(bannerUrl)
      .then(function (r) { return r.json(); })
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

  // --- Fetch dynamic widget config ---
  function fetchWidgetConfig(callback) {
    if (!apiKey) { callback(); return; }

    fetch(supabaseUrl + "/functions/v1/get-widget-config?api_key=" + encodeURIComponent(apiKey))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.fields) fieldDefinitions = data.fields;
        if (data.settings) {
          widgetSettings = data.settings;
          if (data.settings.company_name && !script.getAttribute("data-company-name")) {
            companyName = data.settings.company_name;
          }
          if (data.settings.primary_color && !script.getAttribute("data-primary-color")) {
            primaryColor = data.settings.primary_color;
          }
        }
        if (data.owner_user_id) resolvedOwnerUserId = data.owner_user_id;
        callback();
      })
      .catch(function () { callback(); });
  }

  // --- Separate reserved vs custom data ---
  function buildResolverPayload(props) {
    var payload = { api_key: apiKey, external_id: externalId };
    var customData = {};

    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      if (RESERVED_KEYS.indexOf(key) !== -1) {
        payload[key] = props[key];
      } else {
        customData[key] = props[key];
      }
    }

    if (Object.keys(customData).length > 0) {
      payload.custom_data = customData;
    }

    return payload;
  }

  // --- Resolve visitor via api_key + external_id ---
  function resolveVisitor(callback) {
    if (!apiKey) { callback(); return; }

    var payload = buildResolverPayload(visitorProps);

    // Only call if we have at least api_key
    fetch(supabaseUrl + "/functions/v1/resolve-chat-visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.visitor_token) {
          resolvedToken = data.visitor_token;
          resolvedName = data.visitor_name || "";
          resolvedEmail = data.visitor_email || "";
          resolvedOwnerUserId = data.user_id || resolvedOwnerUserId;
          resolvedCompanyContactId = data.company_contact_id || "";
          resolvedContactId = data.contact_id || "";
          resolvedAutoStart = !!data.auto_start;
          resolvedHasHistory = !!data.has_history;
          resolvedNeedsForm = false;
          localStorage.setItem("chat_visitor_token", data.visitor_token);
        } else {
          if (data.user_id) resolvedOwnerUserId = data.user_id;
          resolvedNeedsForm = !!data.needs_form;
          resolvedAutoStart = !!data.auto_start;
        }
        callback();
      })
      .catch(function () { callback(); });
  }

  // --- Chat Widget Iframe ---
  function createChatWidget() {
    var iframe = document.createElement("iframe");
    var iframeSrc = baseUrl + "/widget?embed=true" +
      "&position=" + encodeURIComponent(position) +
      "&primaryColor=" + encodeURIComponent(primaryColor) +
      "&companyName=" + encodeURIComponent(companyName) +
      "&buttonShape=" + encodeURIComponent(buttonShape);

    if (resolvedToken) {
      iframeSrc += "&visitorToken=" + encodeURIComponent(resolvedToken) +
        "&visitorName=" + encodeURIComponent(resolvedName || "") +
        "&ownerUserId=" + encodeURIComponent(resolvedOwnerUserId || "") +
        "&companyContactId=" + encodeURIComponent(resolvedCompanyContactId || "") +
        "&contactId=" + encodeURIComponent(resolvedContactId || "");
    }

    if (!resolvedToken && resolvedOwnerUserId) {
      iframeSrc += "&ownerUserId=" + encodeURIComponent(resolvedOwnerUserId);
    }

    if (apiKey) iframeSrc += "&apiKey=" + encodeURIComponent(apiKey);

    // Pass resolver flags
    if (resolvedAutoStart) iframeSrc += "&autoStart=true";
    if (resolvedNeedsForm) iframeSrc += "&needsForm=true";
    if (resolvedHasHistory) iframeSrc += "&hasHistory=true";

    iframe.src = iframeSrc;
    iframe.style.cssText =
      "position:fixed;bottom:20px;" +
      (position === "left" ? "left:20px" : "right:20px") +
      ";width:80px;height:80px;border:none;z-index:99998;background:transparent;";
    iframe.allow = "clipboard-write";
    document.body.appendChild(iframe);
    chatIframe = iframe;

    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "chat-toggle") {
        if (event.data.isOpen) {
          iframe.style.width = "420px";
          iframe.style.height = "700px";
          iframe.style.bottom = "0";
          iframe.style[position === "left" ? "left" : "right"] = "0";
        } else {
          iframe.style.width = "80px";
          iframe.style.height = "80px";
          iframe.style.bottom = "20px";
          iframe.style[position === "left" ? "left" : "right"] = "20px";
        }
      }
    });
  }

  // --- Public API: window.NPSChat ---
  window.NPSChat = {
    update: function (props) {
      if (!props || typeof props !== "object") return;
      for (var key in props) {
        if (props.hasOwnProperty(key)) {
          visitorProps[key] = props[key];
        }
      }

      // Forward to iframe
      if (chatIframe && chatIframe.contentWindow) {
        chatIframe.contentWindow.postMessage(
          { type: "nps-chat-update", props: visitorProps },
          "*"
        );
      }

      // If visitor already resolved, send updated data to backend in background
      if (resolvedToken && apiKey) {
        var payload = buildResolverPayload(visitorProps);
        fetch(supabaseUrl + "/functions/v1/resolve-chat-visitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(function () {});
      }
    },
  };

  // Init: fetch config -> resolve visitor -> load banners + chat
  function init() {
    fetchWidgetConfig(function () {
      resolveVisitor(function () {
        loadBanners();
        createChatWidget();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
