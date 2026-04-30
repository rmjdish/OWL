document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       Use GLOBAL basket helpers from basket_header.js
       ============================================================ */

    function isInBasket(id) {
        try {
            const basket = loadBasket();   // global function
            return basket.some(item => item.id === id);
        } catch (e) {
            console.warn("loadBasket() not ready yet");
            return false;
        }
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
       Build table rows
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
            dom: "iprt",

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

                /* ⭐ Manual search */
                const searchBox = document.getElementById("manualSearch");
                if (searchBox) {
                    searchBox.addEventListener("keyup", function () {
                        table.search(this.value).draw();
                    });
                }

                /* ⭐ Manual page size */
                const pageSize = document.getElementById("manualPageSize");
                if (pageSize) {
                    pageSize.addEventListener("change", function () {
                        table.page.len(parseInt(this.value)).draw();
                    });
                }

                /* ⭐ Show UI */
                if (loading) loading.style.display = "none";
                if (ui) ui.style.visibility = "visible";

                /* ⭐ Sync checkboxes with global basket */
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

                // ⭐ Sync with global basket
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

        /* ⭐ YADCF filter */
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
        document.querySelectorAll("input.table-checkbox").forEach(cb => {
            const id = cb.dataset.id;
            cb.checked = isInBasket(id);
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
        })
        .catch(err => {
            console.error("JSON load error:", err);
            if (loading) loading.style.display = "none";
            if (ui) ui.style.visibility = "visible";
        });

});