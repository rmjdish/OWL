document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       GLOBAL basket helpers (from basket_header.js)
       ============================================================ */

    function isInBasket(id) {
        try {
            return loadBasket().some(item => item.id === id);
        } catch {
            return false;
        }
    }

    /* ============================================================
       LOADING + UI
       ============================================================ */

    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("browseUI");

    ui.style.visibility = "hidden";
    loading.style.display = "flex";

    /* ============================================================
       Determine JSON file
       ============================================================ */

    const htmlFile = window.location.pathname.split("/").pop();
    const baseName = htmlFile.replace(/\.html$/, "");
    const jsonFile = `${baseName}.json`;

    /* ============================================================
       Build table rows (static HTML source for DataTables)
       ============================================================ */

    function buildTable(data) {
        const tbody = document.querySelector("#myTable2 tbody");

        tbody.innerHTML = data.map(row => `
            <tr>
                <td>
                    <input type="checkbox" class="table-checkbox"
                        data-id="${row["NSHD Variable Name"]}"
                        data-label="${(row["Variable Label"] || "").replace(/"/g, "&quot;")}">
                </td>
                <td>${row["Order"]}</td>
                <td>${row["NSHD Variable Name"]}</td>
                <td>${row["Showcase Field ID"]}</td>
                <td>${row["Variable Label"]}</td>
            </tr>
        `).join("");
    }

    /* ============================================================
       Sync checkboxes with basket
       ============================================================ */

    function syncAllCheckboxes() {
        const basket = loadBasket();

        document.querySelectorAll(".table-checkbox").forEach(cb => {
            const id = cb.dataset.id;
            cb.checked = basket.some(item => item.id === id);
        });
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

            /* Ensure checkbox state is applied as rows are created */
            createdRow: function (row, data) {
                // data is an array because we used HTML source
                const id = data[2]; // NSHD Variable Name column
                const cb = row.querySelector(".table-checkbox");
                if (cb && isInBasket(id)) {
                    cb.checked = true;
                }
            },

            /* Extra safety: re-sync after every draw */
            drawCallback: function () {
                syncAllCheckboxes();
            },

            initComplete: function () {

                /* Manual search */
                const searchBox = document.getElementById("manualSearch");
                if (searchBox) {
                    searchBox.addEventListener("keyup", function () {
                        table.search(this.value).draw();
                    });
                }

                /* Manual page size */
                const pageSize = document.getElementById("manualPageSize");
                if (pageSize) {
                    pageSize.addEventListener("change", function () {
                        table.page.len(parseInt(this.value)).draw();
                    });
                }

                /* Show UI */
                loading.style.display = "none";
                ui.style.visibility = "visible";

                // Initial sync once everything is fully ready
                syncAllCheckboxes();
            }
        });

        /* ============================================================
           Delegated checkbox handler
           ============================================================ */

        $('#myTable2 tbody').on('change', '.table-checkbox', function () {
            const id = this.dataset.id;
            const label = this.dataset.label || "";

            if (this.checked) {
                addToBasket(id, label);
            } else {
                removeFromBasket(id);
            }
        });

        /* ============================================================
           YADCF filter
           ============================================================ */

        if (typeof yadcf !== "undefined") {
            yadcf.init(table, [
                { column_number: 4, filter_type: "select", cumulative_filtering: true }
            ]);
        }

        /* Resize handler */
        $(window).on('resize', function () {
            table.columns.adjust();
            if (table.fixedHeader) table.fixedHeader.adjust();
        });
    }

    /* ============================================================
       Load JSON + start
       ============================================================ */

    fetch(jsonFile)
        .then(r => r.json())
        .then(data => {
            buildTable(data);
            initDataTable();
        })
        .catch(err => {
            console.error("JSON load error:", err);
            loading.style.display = "none";
            ui.style.visibility = "visible";
        });

});