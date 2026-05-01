document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       GLOBAL basket helpers (from basket_header.js)
       ============================================================ */

    function isInBasket(id) {
        try {
            return loadBasket().some(item => String(item.id) === String(id));
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
       Initialise DataTables with JSON data
       ============================================================ */

    function initDataTable(data) {

        const table = $('#myTable2').DataTable({
            data: data,
            pageLength: 15,
            lengthMenu: [15, 30, 50, 100],
            deferRender: true,
            autoWidth: false,
            dom: "iprt",

            fixedHeader: {
                header: true,
                headerOffset: 0
            },

            columns: [
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: function (row) {
                        const id = row["NSHD Variable Name"]; // ⭐ same ID as popular page
                        const label = (row["Variable Label"] || "").replace(/"/g, "&quot;");
                        const checked = isInBasket(id) ? "checked" : "";
                        return `
                            <input type="checkbox"
                                   class="table-checkbox"
                                   data-id="${id}"
                                   data-label="${label}"
                                   ${checked}>
                        `;
                    }
                },
                { data: "Order" },
                {
                    data: "NSHD Variable Name",
                    render: function (data) {
                        return `<a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${data}.html" target="_blank">${data}</a>`;
                    }
                },
                {
                    data: "Showcase Field ID",
                    className: "dt-center",
                    render: function (data) {
                        return `<a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${data}" target="_blank">${data}</a>`;
                    }
                },
                { data: "Variable Label" }
            ],

            drawCallback: function () {
                // If basket changed elsewhere, keep in sync
                const basket = loadBasket();
                $('#myTable2 .table-checkbox').each(function () {
                    const id = this.dataset.id;
                    this.checked = basket.some(item => String(item.id) === String(id));
                });
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
            }
        });

        /* ============================================================
           Delegated checkbox handler (same semantics as popular page)
           ============================================================ */

        $('#myTable2 tbody').on('change', '.table-checkbox', function () {
            const id = this.dataset.id;      // NSHD Variable Name
            const label = this.dataset.label || "";

            if (!id) return;

            if (this.checked) {
                addToBasket(id, label);
            } else {
                removeFromBasket(id);
            }

            // Optional: if you have the same basket pulse UI here
            if (typeof updateBasketCountUI === "function") {
                updateBasketCountUI();
            }
            const icon = document.getElementById("basket-icon");
            if (icon) {
                icon.classList.add("basket-pulse");
                setTimeout(() => icon.classList.remove("basket-pulse"), 300);
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
            initDataTable(data);
        })
        .catch(err => {
            console.error("JSON load error:", err);
            loading.style.display = "none";
            ui.style.visibility = "visible";
        });

});