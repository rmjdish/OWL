document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       Use GLOBAL basket helpers from basket_header.js
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
       Build table rows
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
                loading.style.display = "none";
                ui.style.visibility = "visible";

                /* ⭐ Sync checkboxes */
                syncAllCheckboxes();
            }
        });

        /* ============================================================
           ⭐ Delegated checkbox handler (popular_variables style)
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
           Sync checkboxes on every redraw
           ============================================================ */

        table.on("draw", syncAllCheckboxes);

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
        const basket = loadBasket();

        document.querySelectorAll(".table-checkbox").forEach(cb => {
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
            buildTable(data);
            initDataTable();
        })
        .catch(err => {
            console.error("JSON load error:", err);
            loading.style.display = "none";
            ui.style.visibility = "visible";
        });

});