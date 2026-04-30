document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       Use GLOBAL basket helpers from basket_header.js
       ============================================================ */
    // Assumes these exist globally, same as Data Dictionary page:
    // - BASKET_KEY
    // - loadBasket()
    // - addToBasket(id, label)
    // - removeFromBasket(id)

    function isInBasket(id) {
        const basket = (typeof loadBasket === "function") ? loadBasket() : [];
        return basket.some(item => item.id === id);
    }

    /* ============================================================
       LOADING + UI
       ============================================================ */

    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("browseUI");

    if (ui) ui.style.visibility = "hidden";
    if (loading) loading.style.display = "flex";

    /* ============================================================
       Determine JSON file
       ============================================================ */

    const htmlFile = window.location.pathname.split("/").pop();
    const baseName = htmlFile.replace(/\.html$/, "");
    const jsonFile = `${baseName}.json`;

    console.log("Loading JSON:", jsonFile);

    /* ============================================================
       Build table rows from JSON
       ============================================================ */

    function buildTable(data) {
        const tbody = document.querySelector("#myTable2 tbody");
        if (!tbody) return;

        tbody.innerHTML = data.map(row => `
            <tr>
                <td></td>
                <td>${row["Order"]}</td>
                <td>${row["NSHD Variable Name"]}</td>
                <td>${row["Showcase Field ID"]}</td>
                <td>${row["Variable Label"]}</td>
            </tr>
        `).join("");
    }

    /* ============================================================
       Initialise DataTables
       ============================================================ */

    function initDataTable() {

        const table = $('#myTable2').DataTable({
            pageLength: 15,
            lengthMenu: [15, 30, 50, 100],
            deferRender: true,
            autoWidth: false,
            dom: "iprt",   // no built‑in search box

            fixedHeader: {
                header: true,
                headerOffset: 0
            },

            columnDefs: [
                {
                    targets: 0,
                    orderable: false,
                    searchable: false,
                    className: "dt-center",
                    render: function (data, type, row) {
                        const variableName = row[2];
                        return `<input type="checkbox" class="table-checkbox" data-id="${variableName}">`;
                    }
                },
                {
                    targets: 2,
                    render: function (data) {
                        return `<a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${data}.html" target="_blank">${data}</a>`;
                    }
                },
                {
                    targets: 3,
                    className: "dt-center",
                    render: function (data) {
                        return `<a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${data}" target="_blank">${data}</a>`;
                    }
                }
            ],

            initComplete: function () {

                // ⭐ Manual search box (like Data Dictionary)
                const searchBox = document.getElementById("manualSearch");
                if (searchBox) {
                    searchBox.addEventListener("keyup", function () {
                        table.search(this.value).draw();
                    });
                }

                // ⭐ Manual page size dropdown
                const pageSize = document.getElementById("manualPageSize");
                if (pageSize) {
                    pageSize.addEventListener("change", function () {
                        table.page.len(parseInt(this.value)).draw();
                    });
                }

                // ⭐ Show UI (spinner off)
                if (loading) loading.style.display = "none";
                if (ui) ui.style.visibility = "visible";

                // ⭐ Sync checkboxes with existing basket
                syncAllCheckboxes();
            }
        });

	/* ============================================================
	   Checkbox → global basket
	   ============================================================ */

	table.on("draw", function () {

		table.rows().every(function () {
			const row = this.data();
			const variableName = row[2];
			const variableLabel = row[4];

			const cb = this.node().querySelector(".table-checkbox");
			if (!cb) return;

			// ⭐ Sync checkbox with global basket
			cb.checked = isInBasket(variableName);

			// ⭐ Add/remove using global basket functions
			cb.addEventListener("change", () => {
				if (!variableName) return;

				if (cb.checked) {
					addToBasket(variableName, variableLabel || "");
				} else {
					removeFromBasket(variableName);
				}
			});
		});
	});

        // ⭐ Initial sync after first draw
        table.on("init", syncAllCheckboxes);

        /* ⭐ YADCF filter on Variable Label (column 4) */
        if (typeof yadcf !== "undefined") {
            yadcf.init(table, [
                { column_number: 4, filter_type: "select", cumulative_filtering: true }
            ]);
        }

        /* ⭐ Resize handler */
        $(window).on('resize', function () {
            table.columns.adjust();
            if (table.fixedHeader) table.fixedHeader.adjust();
        });
    }

    function syncAllCheckboxes() {
        const basket = (typeof loadBasket === "function") ? loadBasket() : [];
        document.querySelectorAll("input.table-checkbox").forEach(cb => {
            const id = cb.dataset.id;
            cb.checked = basket.some(item => item.id === id);
        });
    }

    /* ============================================================
       Load JSON + start
       ============================================================ */

    fetch(jsonFile)
        .then(r => r.json())
        .then(data => {
            console.log("Loaded JSON:", data);
            buildTable(data);
            initDataTable();
            // ⭐ Do NOT touch basket icon here — global header script already did
        })
        .catch(err => {
            console.error("JSON load error:", err);
            if (loading) loading.style.display = "none";
            if (ui) ui.style.visibility = "visible";
        });

});