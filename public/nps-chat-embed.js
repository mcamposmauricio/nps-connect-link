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

  var resolvedToken = null;
  var resolvedName = null;
  var resolvedEmail = null;
  var resolvedOwnerUserId = null;
  var resolvedCompanyContactId = null;
  var resolvedContactId = null;
  var resolvedAutoStart = false;
  var resolvedNeedsForm = false;
  var resolvedHasHistory = false;

  var fieldDefinitions = [];
  var widgetSettings = {};
  var visitorProps = {};
  var chatIframe = null;

  var RESERVED_KEYS = ["name", "email", "phone", "company_id", "company_name", "user_id"];

  // --- Banner Type SVG Icons ---
  var BANNER_ICONS = {
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
    promo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    update: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>'
  };

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
    contentDiv.style.cssText = "flex:1;display:flex;align-items:center;gap:10px;flex-wrap:wrap;";

    // Type icon
    var iconHtml = BANNER_ICONS[banner.banner_type || "info"] || BANNER_ICONS.info;
    var iconSpan = document.createElement("span");
    iconSpan.innerHTML = iconHtml;
    iconSpan.style.cssText = "flex-shrink:0;opacity:0.9;display:flex;align-items:center;";
    contentDiv.appendChild(iconSpan);

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
      // Permanent dismiss
      dismissBanner(banner.assignment_id);
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

  function dismissBanner(assignmentId) {
    fetch(supabaseUrl + "/functions/v1/dismiss-banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId }),
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
          // Banners already sorted by priority from backend
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

    var unreadBadge = null;

    function updateUnreadBadge(count) {
      if (count > 0 && iframe.style.width === "80px") {
        if (!unreadBadge) {
          unreadBadge = document.createElement("div");
          unreadBadge.style.cssText =
            "position:fixed;z-index:99999;min-width:22px;height:22px;border-radius:11px;" +
            "background:#EF4444;color:#fff;font-size:12px;font-weight:700;display:flex;" +
            "align-items:center;justify-content:center;padding:0 5px;box-shadow:0 2px 6px rgba(0,0,0,0.25);" +
            "pointer-events:none;";
          document.body.appendChild(unreadBadge);
        }
        unreadBadge.textContent = count > 9 ? "9+" : String(count);
        // Position badge at top-right of FAB
        unreadBadge.style.bottom = (20 + 60 - 8) + "px";
        unreadBadge.style[position === "left" ? "left" : "right"] = (20 + 60 - 12) + "px";
        unreadBadge.style.display = "flex";
      } else if (unreadBadge) {
        unreadBadge.style.display = "none";
      }
    }

    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "chat-toggle") {
        if (event.data.isOpen) {
          iframe.style.width = "420px";
          iframe.style.height = "700px";
          iframe.style.bottom = "0";
          iframe.style[position === "left" ? "left" : "right"] = "0";
          if (unreadBadge) unreadBadge.style.display = "none";
        } else {
          iframe.style.width = "80px";
          iframe.style.height = "80px";
          iframe.style.bottom = "20px";
          iframe.style[position === "left" ? "left" : "right"] = "20px";
        }
      }
      if (event.data && event.data.type === "chat-unread-count") {
        updateUnreadBadge(event.data.count);
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

      if (chatIframe && chatIframe.contentWindow) {
        chatIframe.contentWindow.postMessage(
          { type: "nps-chat-update", props: visitorProps },
          "*"
        );
      }

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

  // Init
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
