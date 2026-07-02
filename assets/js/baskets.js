window.addEventListener("load", function () {

  let basketPage = 1;
  let basketPageSize = 10;

  let basketSortColumn = null;
  let basketSortDirection = "asc";

  // Path to the full OWL data dictionary, published as a static JSON asset.
  // Update this if the file is hosted somewhere else on the site.
  const DATA_DICTIONARY_URL = "/OWL/docs/data_dictionary/NSHD_Data_Dictionary_Public.json";

  // Cached in memory after first fetch so repeat downloads don't re-fetch.
  let dictionaryCache = null;

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

  // ── CSV field escaping ──────────────────────────────────────────────
  function csvEscape(value) {
    const str = value === null || value === undefined ? "" : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  }

  function triggerCsvDownload(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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

  // ── Download basket as CSV, using full dictionary rows plus a ──────
  // ── "Request variable" = Y column appended at the end ──────────────
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
      const dictionary = await loadDataDictionary();

      // Build a lookup keyed by NSHD Variable Name for fast matching.
      const dictByName = {};
      dictionary.forEach(function (row) {
        dictByName[row["NSHD Variable Name"]] = row;
      });

      // Base columns come from the dictionary itself, so the export
      // always matches the current Data Dictionary structure.
      const baseColumns = dictionary.length
        ? Object.keys(dictionary[0])
        : ["NSHD Variable Name", "Variable Label"];

      const columns = baseColumns.concat(["Request variable"]);

      let csvContent = columns.map(csvEscape).join(",") + "\n";
      const missing = [];

      basket.forEach(function (item) {
        const dictRow = dictByName[item.varName];
        if (!dictRow) missing.push(item.varName);

        const rowValues = columns.map(function (col) {
          if (col === "Request variable") return "Y";
          if (dictRow && Object.prototype.hasOwnProperty.call(dictRow, col)) {
            return dictRow[col];
          }
          // Fallback if a basket variable isn't found in the dictionary
          if (col === "NSHD Variable Name") return item.varName;
          if (col === "Variable Label") return item.label || "";
          return "";
        });

        csvContent += rowValues.map(csvEscape).join(",") + "\n";
      });

      if (missing.length) {
        console.warn(
          `${missing.length} basket variable(s) were not found in the data dictionary and were exported with limited detail:`,
          missing
        );
      }

      triggerCsvDownload(csvContent, "NSHD_Variable_Basket.csv");
    } catch (err) {
      console.error("Could not build the full basket export:", err);
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