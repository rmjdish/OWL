window.addEventListener("load", function () {

  let basketPage = 1;
  let basketPageSize = 10;

  let basketSortColumn = null;
  let basketSortDirection = "asc";

  // Path to the full OWL data dictionary, published as a static JSON asset.
  // Update this if the file is hosted somewhere else on the site.
  const DATA_DICTIONARY_URL = "/OWL/docs/data_dictionary/NSHD_Data_Dictionary_Public.json";

  // CDN build of ExcelJS, used to produce a real, styled .xlsx client-side.
  const EXCELJS_CDN_URL = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";

  // Cached in memory after first fetch/load so repeat downloads are instant.
  let dictionaryCache = null;
  let exceljsLoadPromise = null;

  // Column widths taken from the original Data Dictionary workbook
  // (character-width units, same scale openpyxl/Excel use).
  const COLUMN_WIDTHS = {
    "NSHD Library File": 15,
    "Topic": 19.5,
    "Subtopic 1": 19.5,
    "Subtopic 2": 19.5,
    "Subtopic 3": 19.5,
    "Subtopic 4": 19.5,
    "NSHD Variable Name": 15.43,
    "Showcase Field ID": 15.43,
    "UKLLC Dataset Name(s)": 18.14,
    "Variable Label": 55,
    "Value labels": 34,
    "Units": 13.57,
    "Form": 20,
    "Question Number": 13.57,
    "Year of collection": 12.57,
    "Is variable derived?": 12.57,
    "Is variable sensitive?": 12.57,
    "Reason variable is sensitive": 15.14,
    "Notes": 34.7,
    "Request variable": 16
  };

  // Header fill colours taken from the original workbook, grouped by
  // column meaning. New "Request variable" column gets its own colour
  // so it stands out as the added field.
  const HEADER_FILLS = {
    "NSHD Library File": "FFF7C6D0",
    "Topic": "FFC0C0C0",
    "Subtopic 1": "FFC0C0C0",
    "Subtopic 2": "FFC0C0C0",
    "Subtopic 3": "FFC0C0C0",
    "Subtopic 4": "FFC0C0C0",
    "NSHD Variable Name": "FFC1E1C1",
    "Showcase Field ID": "FFC1E1C1",
    "UKLLC Dataset Name(s)": "FFC1E1C1",
    "Variable Label": "FFADD8E6",
    "Value labels": "FFADD8E6",
    "Units": "FFADD8E6",
    "Form": "FFADD8E6",
    "Question Number": "FFADD8E6",
    "Year of collection": "FFADD8E6",
    "Is variable derived?": "FFADD8E6",
    "Is variable sensitive?": "FFADD8E6",
    "Reason variable is sensitive": "FFADD8E6",
    "Notes": "FFADD8E6",
    "Request variable": "FFFFD966"
  };

  function sortBasketData(data) {
    if (!basketSortColumn) return data;

    return data.slice().sort((a, b) => {
      let valA = a[basketSortColumn] || "";
      let valB = b[basketSortColumn] || "";

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();

      if (valA < valB) return basketSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return basketSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const pageSizeSelect = document.getElementById("basketPageSize");
  if (pageSizeSelect) {
    pageSizeSelect.value = basketPageSize;
    pageSizeSelect.addEventListener("change", function (e) {
      basketPageSize = Number(e.target.value);
      basketPage = 1;
      renderBasket();
      renderBasketPagination();
      updateBasketResultsCount();
    });
  }

  function updateBasketResultsCount() {
    const basket = loadBasket();
    const total = basket.length;

    const start = (basketPage - 1) * basketPageSize;
    const end = Math.min(start + basketPageSize, total);

    document.getElementById("basketResultsCount").textContent =
      `Showing ${total === 0 ? 0 : start + 1}-${end} of ${total} results`;
  }

  function renderBasketPagination() {
    const basket = loadBasket();
    const totalPages = Math.ceil(basket.length / basketPageSize) || 1;

    const html = `
      <button ${basketPage === 1 ? "disabled" : ""} onclick="changeBasketPage(-1)">Prev</button>
      <span>Page ${basketPage} of ${totalPages}</span>
      <button ${basketPage === totalPages ? "disabled" : ""} onclick="changeBasketPage(1)">Next</button>
    `;

    document.getElementById("basketPaginationTop").innerHTML = html;
    document.getElementById("basketPaginationBottom").innerHTML = html;
  }

  window.changeBasketPage = function (delta) {
    basketPage += delta;
    renderBasket();
    renderBasketPagination();
    updateBasketResultsCount();
  };

  function renderBasket() {
    let basket = loadBasket();
    basket = sortBasketData(basket);

    const tbody = document.querySelector("#basketTable tbody");
    const countEl = document.getElementById("basketCountPage");

    tbody.innerHTML = "";
    countEl.textContent = basket.length;

    const start = (basketPage - 1) * basketPageSize;
    const end = start + basketPageSize;

    basket.slice(start, end).forEach(function (item) {
      const tr = document.createElement("tr");

      // ============================================================
      // ⭐ REMOVE BUTTON — now uses global removeFromBasket()
      // ============================================================
      const tdRemove = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "Remove";

      btn.addEventListener("click", function () {

        // ⭐ Use global remove function (this triggers shake animation)
        removeFromBasket(item.varName);

        // Recalculate pagination if needed
        const b = loadBasket();
        const maxPage = Math.ceil(b.length / basketPageSize) || 1;
        if (basketPage > maxPage) basketPage = maxPage;

        // Refresh UI
        renderBasket();
        renderBasketPagination();
        updateBasketResultsCount();

        // ⭐ Ensure glow + shake + count update runs
        updateBasketCountUI();
      });

      tdRemove.appendChild(btn);
      tr.appendChild(tdRemove);

	// ⭐ Variable name as link to metadata page
	const tdName = document.createElement("td");
	const link = document.createElement("a");

	link.textContent = item.varName;
	link.href = `https://rmjdish.github.io/OWL/assets/variable_metadata/${item.varName}.html`;
	link.target = "_blank";  // optional: open in new tab

	tdName.appendChild(link);
	tr.appendChild(tdName);

      // Label
      const tdLabel = document.createElement("td");
      tdLabel.textContent = item.label || "";
      tr.appendChild(tdLabel);

      tbody.appendChild(tr);
    });

    renderBasketPagination();
    updateBasketResultsCount();
  }

  function clearBasket() {
    const confirmed = confirm("Are you sure you want to clear your basket?");
    if (!confirmed) return;

    saveBasket([]);
    basketPage = 1;
    renderBasket();
    renderBasketPagination();
    updateBasketResultsCount();
    updateBasketCountUI();
  }

  // ── Lazy-load ExcelJS from CDN, only when a download is requested ──
  function loadExcelJS() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (exceljsLoadPromise) return exceljsLoadPromise;

    exceljsLoadPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = EXCELJS_CDN_URL;
      script.onload = function () {
        if (window.ExcelJS) resolve(window.ExcelJS);
        else reject(new Error("ExcelJS failed to initialise after loading."));
      };
      script.onerror = function () {
        reject(new Error("Failed to load ExcelJS from CDN."));
      };
      document.head.appendChild(script);
    });

    return exceljsLoadPromise;
  }

  // ── Load the full data dictionary (cached after first fetch) ───────
  async function loadDataDictionary() {
    if (dictionaryCache) return dictionaryCache;
    const resp = await fetch(DATA_DICTIONARY_URL);
    if (!resp.ok) {
      throw new Error(`Failed to fetch data dictionary: ${resp.status}`);
    }
    dictionaryCache = await resp.json();
    return dictionaryCache;
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Save a blob to disk, letting the user choose the location/name ─
  // ── where the browser supports it (File System Access API — ──────
  // ── Chrome/Edge). Falls back to a normal browser download,     ─────
  // ── which still honours "Ask where to save each file" if the   ─────
  // ── user has that browser setting turned on.                    ─────
  async function saveBlobToFile(blob, suggestedName) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [
            {
              description: "Excel Workbook",
              accept: {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
              }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err && err.name === "AbortError") {
          // User closed/cancelled the save dialog — respect that, no fallback download.
          throw err;
        }
        console.warn("showSaveFilePicker failed, falling back to standard download:", err);
        // fall through to the standard download below
      }
    }
    triggerBlobDownload(blob, suggestedName);
  }

  // ── Build and download the full Data Dictionary as .xlsx, with a ──
  // ── "Request variable" column: Y for basket variables, blank for ──
  // ── every other row. Formatting mirrors the original workbook.   ──
  async function downloadBasketCSV() {
    const basket = loadBasket();
    if (!basket.length) {
      alert("Basket is empty");
      return;
    }

    const downloadBtn = document.getElementById("downloadBasketCsvBtn");
    const originalBtnText = downloadBtn ? downloadBtn.textContent : null;
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.textContent = "Preparing download…";
    }

    try {
      const [ExcelJS, dictionary] = await Promise.all([
        loadExcelJS(),
        loadDataDictionary()
      ]);

      const requestedNames = new Set(basket.map(item => item.varName));

      const baseColumns = dictionary.length
        ? Object.keys(dictionary[0])
        : ["NSHD Variable Name", "Variable Label"];
      const columns = baseColumns.concat(["Request variable"]);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Data_dictionary", {
        views: [{ state: "frozen", ySplit: 1 }]
      });

      sheet.columns = columns.map(function (colName) {
        return { header: colName, key: colName, width: COLUMN_WIDTHS[colName] || 18 };
      });

      // ── Header row styling, matching the original workbook ──────────
      const headerRow = sheet.getRow(1);
      headerRow.height = 42;
      columns.forEach(function (colName, idx) {
        const cell = headerRow.getCell(idx + 1);
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "bottom", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: HEADER_FILLS[colName] || "FFD9D9D9" }
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });

      // ── Data rows: every dictionary row, Request variable = Y only ──
      // ── for basket matches, blank for everything else.             ──
      dictionary.forEach(function (dictRow) {
        const rowValues = {};
        baseColumns.forEach(function (col) {
          rowValues[col] = dictRow[col];
        });
        rowValues["Request variable"] = requestedNames.has(dictRow["NSHD Variable Name"]) ? "Y" : "";
        sheet.addRow(rowValues);
      });

      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: dictionary.length + 1, column: columns.length }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      try {
        await saveBlobToFile(blob, "NSHD_Data_Dictionary_Saved.xlsx");
      } catch (saveErr) {
        if (!(saveErr && saveErr.name === "AbortError")) {
          throw saveErr;
        }
        // User cancelled the save dialog — nothing more to do.
      }
    } catch (err) {
      console.error("Could not build the full data dictionary export:", err);
      alert("Something went wrong preparing your download. Please try again.");
    } finally {
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalBtnText;
      }
    }
  }

  document.getElementById("clearBasketBtn").addEventListener("click", clearBasket);
  document.getElementById("downloadBasketCsvBtn").addEventListener("click", downloadBasketCSV);

  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-sort");

      if (basketSortColumn === col) {
        basketSortDirection = basketSortDirection === "asc" ? "desc" : "asc";
      } else {
        basketSortColumn = col;
        basketSortDirection = "asc";
      }

      document.querySelectorAll("th[data-sort]").forEach(h => {
        h.classList.remove("asc", "desc");
      });
      th.classList.add(basketSortDirection);

      renderBasket();
      renderBasketPagination();
      updateBasketResultsCount();
    });
  });

  renderBasket();

});