// Runs in the page's own JavaScript world (the extension's scripts can't see the page console):
// forwards console errors and uncaught errors to the QASync content script, which attaches the
// latest ones to new issues. Only installed once you open QASync on the page.
(function () {
  if (window.__qasyncPageErrors) return;
  window.__qasyncPageErrors = true;
  var send = function (text) {
    try { window.postMessage({ source: "qasync-page", type: "console", text: String(text).slice(0, 300) }, "*"); } catch (e) {}
  };
  var orig = console.error;
  console.error = function () {
    try { send(Array.prototype.map.call(arguments, function (a) { return a && a.stack ? a.stack.split("\n")[0] : String(a); }).join(" ")); } catch (e) {}
    return orig.apply(console, arguments);
  };
  window.addEventListener("error", function (e) {
    send((e && e.message) || "Error" + (e && e.filename ? " @ " + e.filename.split("/").pop() + ":" + e.lineno : ""));
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    send("Unhandled rejection: " + (r && r.message ? r.message : String(r)));
  });
})();
