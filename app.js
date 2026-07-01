let payload = window.MAM_WORKS || { works: [] };
let works = payload.works || [];
const PAGE_SIZE = 12;
const EARLY_GROUP = "Castle 早期（第1-2 批）";
const LATE_GROUP = "Castle 后期";
let currentPage = 1;
let activeGroup = LATE_GROUP;

const $ = (id) => document.getElementById(id);
const controls = {
  search: $("searchInput"),
  artist: $("artistFilter"),
  priceMin: $("priceMin"),
  priceMax: $("priceMax"),
  yearMin: $("yearMin"),
  yearMax: $("yearMax"),
  style: $("styleFilter"),
  medium: $("mediumFilter"),
  size: $("sizeFilter"),
  sort: $("sortSelect"),
};

async function loadWorksData() {
  if (window.MAM_WORKS && Array.isArray(window.MAM_WORKS.works)) {
    payload = window.MAM_WORKS;
    works = payload.works || [];
    return true;
  }
  try {
    const response = await fetch("./data/works.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
    works = payload.works || [];
    return true;
  } catch (error) {
    payload = { works: [], updatedAt: "本地预览模式" };
    works = [];
    showLocalPreviewNotice(error);
    return false;
  }
}

function showLocalPreviewNotice(error) {
  const cards = $("cards");
  if (cards) {
    cards.innerHTML = `<div class="empty">
      <strong>本地双击预览模式</strong><br>
      页面框架已加载。浏览器可能会拦截本地 JSON 数据读取；部署到 EdgeOne Pages、Cloudflare Pages、GitHub Pages 后会正常显示完整作品数据。<br>
      错误信息：${escapeHtml(error && error.message ? error.message : "无法读取 data/works.json")}
    </div>`;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function optionize(select, values, label) {
  select.innerHTML = `<option value="">${label}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function worksByGroup(group) {
  return works.filter((work) => (work.collectionGroup || LATE_GROUP) === group);
}

function groupArtistCount(group) {
  return unique(worksByGroup(group).map((w) => w.artistDisplay || w.artistEn)).length;
}

function activeGroupWorks() {
  return worksByGroup(activeGroup);
}

function renderGroupSummary() {
  $("earlyArtistCount").textContent = groupArtistCount(EARLY_GROUP);
  $("earlyWorkCount").textContent = worksByGroup(EARLY_GROUP).length;
  $("lateArtistCount").textContent = groupArtistCount(LATE_GROUP);
  $("lateWorkCount").textContent = worksByGroup(LATE_GROUP).length;
}

function setActiveGroup(group) {
  activeGroup = group;
  currentPage = 1;
  document.querySelectorAll(".group-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.group === group);
  });
  renderListing();
}

function initFilters() {
  optionize(controls.artist, unique(works.map((w) => w.artistDisplay || w.artistEn)), "全部艺术家");
  optionize(controls.style, unique(works.flatMap((w) => w.styleTags || [])), "全部风格");
  optionize(controls.medium, unique(works.flatMap((w) => w.mediumTags && w.mediumTags.length ? w.mediumTags : [w.medium])), "全部媒介");
  Object.values(controls).forEach((control) => control && control.addEventListener("input", () => {
    currentPage = 1;
    renderListing();
  }));
  $("clearFilters").addEventListener("click", clearFilters);
  $("homeLogo").addEventListener("click", () => { location.hash = "#/"; });
  document.querySelectorAll(".group-tab").forEach((button) => {
    button.addEventListener("click", () => setActiveGroup(button.dataset.group || EARLY_GROUP));
  });
  $("dataUpdated").textContent = `资料更新时间：${payload.updatedAt || "未记录"}`;
  renderGroupSummary();
}

function clearFilters() {
  Object.values(controls).forEach((control) => {
    if (control) control.value = "";
  });
  controls.sort.value = "title";
  currentPage = 1;
  renderListing();
}

function passesFilters(work) {
  const q = controls.search.value.trim().toLowerCase();
  if (q && !(work.searchText || "").includes(q)) return false;
  if (controls.artist.value && (work.artistDisplay || work.artistEn) !== controls.artist.value) return false;
  const price = work.price && work.price.rmb ? Number(work.price.rmb) : null;
  const min = controls.priceMin.value ? Number(controls.priceMin.value) : null;
  const max = controls.priceMax.value ? Number(controls.priceMax.value) : null;
  if (min !== null && (price === null || price < min)) return false;
  if (max !== null && (price === null || price > max)) return false;
  const year = work.year ? Number(work.year) : null;
  const yMin = controls.yearMin.value ? Number(controls.yearMin.value) : null;
  const yMax = controls.yearMax.value ? Number(controls.yearMax.value) : null;
  if (yMin !== null && (year === null || year < yMin)) return false;
  if (yMax !== null && (year === null || year > yMax)) return false;
  if (controls.style.value && !(work.styleTags || []).includes(controls.style.value)) return false;
  if (controls.medium.value) {
    const mediums = work.mediumTags && work.mediumTags.length ? work.mediumTags : [work.medium];
    if (!mediums.includes(controls.medium.value)) return false;
  }
  const sizeQ = controls.size.value.trim().toLowerCase();
  if (sizeQ && !(work.size || "").toLowerCase().includes(sizeQ)) return false;
  return true;
}

function sortWorks(items) {
  const sorted = [...items];
  const mode = controls.sort.value;
  sorted.sort((a, b) => {
    if (mode === "artist") return (a.artistEn || "").localeCompare(b.artistEn || "", "zh-Hans-CN");
    if (mode === "priceAsc") return (a.price.rmb || Infinity) - (b.price.rmb || Infinity);
    if (mode === "priceDesc") return (b.price.rmb || -1) - (a.price.rmb || -1);
    if (mode === "yearDesc") return (b.year || 0) - (a.year || 0);
    return (a.zhTitle || a.enTitle || "").localeCompare(b.zhTitle || b.enTitle || "", "zh-Hans-CN");
  });
  return sorted;
}

function renderListing() {
  const cards = $("cards");
  const groupItems = activeGroupWorks();
  const filtered = sortWorks(groupItems.filter(passesFilters));
  $("activeGroupTitle").textContent = activeGroup;
  $("artistCount").textContent = unique(groupItems.map((w) => w.artistDisplay || w.artistEn)).length;
  $("skuCount").textContent = groupItems.length;
  $("workCount").textContent = `${activeGroup}：${groupItems.length} 件作品`;
  $("resultCount").textContent = `当前 ${filtered.length} 件`;
  if (!filtered.length) {
    cards.innerHTML = `<div class="empty">没有符合条件的作品。请清除筛选条件后重试。</div>`;
    $("pagination").innerHTML = "";
    return;
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  cards.innerHTML = pageItems.map((work) => cardHtml(work)).join("");
  cards.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      location.hash = `#/work/${encodeURIComponent(card.dataset.id)}`;
    });
  });
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const el = $("pagination");
  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <button data-page="first" ${currentPage === 1 ? "disabled" : ""}>首页</button>
    <button data-page="prev" ${currentPage === 1 ? "disabled" : ""}>上一页</button>
    <span class="page-state">第 ${currentPage} / ${totalPages} 页</span>
    <label class="page-jump"><span>跳至</span><input id="pageJumpInput" type="number" min="1" max="${totalPages}" value="${currentPage}"><span>页</span></label>
    <button data-page="jump">跳转</button>
    <button data-page="next" ${currentPage === totalPages ? "disabled" : ""}>下一页</button>
    <button data-page="last" ${currentPage === totalPages ? "disabled" : ""}>最后页</button>
  `;
  el.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.page;
      if (action === "first") currentPage = 1;
      if (action === "prev") currentPage = Math.max(1, currentPage - 1);
      if (action === "next") currentPage = Math.min(totalPages, currentPage + 1);
      if (action === "last") currentPage = totalPages;
      if (action === "jump") {
        const input = $("pageJumpInput");
        const requested = input ? Number(input.value) : currentPage;
        currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(requested) ? requested : currentPage));
      }
      renderListing();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  const jumpInput = $("pageJumpInput");
  if (jumpInput) {
    jumpInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const requested = Number(jumpInput.value);
      currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(requested) ? requested : currentPage));
      renderListing();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

function cardHtml(work) {
  const image = work.assets.cover || work.assets.thumbnail || "";
  const tag = work.cultureTag ? `<span class="badge">${escapeHtml(work.cultureTag)}</span>` : "";
  const artistLine = [work.artistZh, work.artistEn].filter(Boolean).join(" / ");
  return `<button class="card" data-id="${escapeHtml(work.id)}">
    <div class="image-wrap">${image ? `<img src="./${image}" alt="${escapeHtml(work.zhTitle || work.enTitle)}" loading="lazy">` : ""}</div>
    <div>
      <h3>${escapeHtml(work.zhTitle || work.enTitle || work.id)}</h3>
      <p class="en-title">${escapeHtml(work.enTitle || "")}</p>
      <p class="artist">${escapeHtml(artistLine || work.artistDisplay || "")}</p>
      <p class="size-line">画面尺寸：${escapeHtml(work.size || "待核查")}</p>
      <p class="price">版画价格：${escapeHtml(work.price.display || "未定")}</p>
      <div class="badges">${tag}</div>
    </div>
  </button>`;
}

function showRoute() {
  const hash = location.hash || "#/";
  $("listingView").classList.add("hidden");
  $("detailView").classList.add("hidden");
  $("aboutView").classList.add("hidden");
  if (hash.startsWith("#/work/")) {
    const id = decodeURIComponent(hash.replace("#/work/", ""));
    const work = works.find((item) => item.id === id);
    if (work) renderDetail(work);
    return;
  }
  if (hash === "#/about") {
    $("aboutView").classList.remove("hidden");
    return;
  }
  $("listingView").classList.remove("hidden");
  renderListing();
}

function fieldRows(work) {
  const rows = [
    ["艺术家 / Artist", [work.artistZh || "", work.artistEn || ""].filter(Boolean).join(" ")],
    ["作品名 / Title", [work.zhTitle || "", work.enTitle || ""].filter(Boolean).join(" ")],
    ["系列 / Series", work.series],
    ["出版方 / Publisher", work.publisher],
    ["发行时间 / Release", work.releaseDate],
    ["媒介 / Medium", work.medium],
    ["尺寸 / Size", work.size],
    ["版数 / Edition", work.editionSize],
    ["本件编号 / Number", work.editionNumber],
    ["签名 / Signature", work.signature],
  ];
  return rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${v ? sanitizeMultiline(v) : "待核查"}</td></tr>`).join("");
}

function textBlock(title, text, extraClass = "") {
  if (!text) text = "资料待补充 / 待人工确认。";
  return `<article class="text-section ${extraClass}">
    <h3>${escapeHtml(title)}</h3>
    <p>${sanitizeMultiline(text)}</p>
  </article>`;
}

function renderDetail(work) {
  const image = work.assets.cover || work.assets.thumbnail || "";
  const cert = work.assets.certificate || "";
  const sourceLinks = (work.sourceLinks || []).slice(0, 12).map((url) => `<li><a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a></li>`).join("");
  const secondarySegments = (work.secondaryListingSegments || []).map((item) => `<li>${sanitizeMultiline(item)}</li>`).join("");
  const certificateBlock = work.hasCertificateBool && cert
    ? `<div class="certificate-preview"><img src="./${cert}" alt="证书图"></div>`
    : `<div class="no-certificate">无证书</div>`;
  $("detailView").innerHTML = `<button class="back-button" id="backToList">返回作品列表</button>
    <div class="detail-hero">
      <div>
        <div class="detail-image">${image ? `<img src="./${image}" alt="${escapeHtml(work.zhTitle || work.enTitle)}">` : ""}</div>
        <section class="text-section image-under-info">
          <h3>艺术家简介</h3>
          <p>${sanitizeMultiline(work.blocks.artistBio || "资料待补充 / 待人工确认。")}</p>
        </section>
      </div>
      <div class="detail-main">
        <p class="eyebrow">${escapeHtml(work.id)}</p>
        <h1>${escapeHtml(work.zhTitle || work.enTitle)}</h1>
        <p class="en-title">${escapeHtml(work.enTitle || "")}</p>
        <p>${escapeHtml(work.artistDisplay || "")}</p>
        <div class="price-panel">
          <span>版画作品价格</span>
          <strong>${work.price.rmb ? escapeHtml(work.price.display) : "版画作品暂无"}</strong>
          ${secondarySegments ? `<div class="secondary-price"><h3>二级挂牌价</h3><ul>${secondarySegments}</ul></div>` : `<p>二级挂牌价：暂无明确公开挂牌价。</p>`}
        </div>
      </div>
    </div>
    <div class="section-grid">
      <div class="stack">
        ${textBlock("作品简介", work.blocks.workIntro)}
        ${textBlock("画面解读 / 图像观察", work.blocks.imageObservation)}
        ${textBlock("文化背景与市场定位", work.blocks.salesTalk || "资料待补充 / 待人工确认。")}
        ${textBlock("重点销售话术", work.blocks.salesTalk)}
        ${textBlock("适合客户", work.blocks.customerTypes)}
        ${textBlock("适合空间", work.blocks.spaces)}
      </div>
      <aside class="stack">
        <section class="info-card">
          <h3>作品证书</h3>
          <table class="info-table">${fieldRows(work)}</table>
          ${certificateBlock}
        </section>
        <section class="info-card">
          <h3>外部链接</h3>
          ${sourceLinks ? `<ul class="source-list">${sourceLinks}</ul>` : "<p>暂无外部链接。</p>"}
        </section>
      </aside>
    </div>`;
  $("listingView").classList.add("hidden");
  $("detailView").classList.remove("hidden");
  $("backToList").addEventListener("click", () => { location.hash = "#/"; });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function sanitizeMultiline(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

async function bootstrap() {
  const loaded = await loadWorksData();
  initFilters();
  if (loaded) {
    showRoute();
  } else {
    $("dataUpdated").textContent = "资料更新时间：本地双击预览";
    renderGroupSummary();
    $("artistCount").textContent = "0";
    $("skuCount").textContent = "0";
    $("workCount").textContent = "本地预览：未加载作品数据";
    $("resultCount").textContent = "当前 0 件";
  }
}

window.addEventListener("hashchange", showRoute);
bootstrap();
