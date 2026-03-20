window.TRACE_MAP_CONFIG = {
  provider: "tianditu",
  tk: "7c1a92d2e428fe6262cb4a42aeff03f0",
  defaultCenter: [104.114129, 35.550339],
  defaultZoom: 5,
  detailZoom: 11,
  searchZoom: 15
};

(function bootstrapTraceMapSdk() {
  if (!window.TRACE_MAP_CONFIG || !window.TRACE_MAP_CONFIG.tk) {
    return;
  }
  if (document.getElementById("trace-map-sdk")) {
    return;
  }
  const script = document.createElement("script");
  script.id = "trace-map-sdk";
  script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${encodeURIComponent(window.TRACE_MAP_CONFIG.tk)}`;
  script.async = true;
  document.head.appendChild(script);
})();
