document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       GLOBAL BASKET (same system as Data Dictionary)
       ============================================================ */

    const BASKET_KEY = "nshd_variable_basket";

    function loadBasket() {
        return JSON.parse(localStorage.getItem(BASKET_KEY)) || [];
    }

    function saveBasket(basket) {
        localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
        updateBasketIcon();
    }

    function updateBasketIcon() {
        const basket = loadBasket();

        const el1 = document.getElementById("basketCountIcon");      // this page
        const el2 = document.getElementById("basketCount");          // global header
        const el3 = document.getElementById("sidebarBasketCount");   // sidebar

        if (el1) el1.textContent = basket.length;
        if (el2) el2.textContent = basket.length;
        if (el3) el3.textContent = basket.length;
    }

    function isInBasket(id) {
        return loadBasket().some(item => item.id === id);
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

    console.log("Loading JSON:", jsonFile);

    /* ============================================================
       Build table rows
       ============================================================ */

    function buildTable(data) {
        const tbody = document.querySelector("#myTable2 tbody");

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
            dom: "iprt",   // no DataTables search box

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

                /* ⭐ Manual search box */
                const searchBox = document.getElementById("manualSearch");
                if (searchBox) {
                    searchBox.addEventListener("keyup", function () {
                        table.search(this.value).draw();
                    });
                }

                /* ⭐ Manual page size dropdown */
                const pageSize = document.getElementById("manualPageSize");
                if (pageSize) {
                    pageSize.addEventListener("change", function () {
                        table.page.len(parseInt(this.value)).draw();
                    });
                }

                /* ⭐ Show UI */
                loading.style.display = "none";
                ui.style.visibility = "visible";

                /* ⭐ Sync basket icon */
                updateBasketIcon();
            }
        });

        /* ============================================================
           Checkbox → Basket
           ============================================================ */

        table.on("draw", function () {
            const basket = loadBasket();

            table.rows().every(function () {
                const row = this.data();
                const variableName = row[2];
                const variableLabel = row[4];

                const cb = this.node().querySelector(".table-checkbox");
                if (!cb) return;

                cb.checked = basket.some(item => item.id === variableName);

                cb.addEventListener("change", () => {
                    let basket = loadBasket();

                    if (cb.checked) {
                        basket.push({ id: variableName, label: variableLabel });
                    } else {
                        basket = basket.filter(item => item.id !== variableName);
                    }

                    saveBasket(basket);
                });
            });
        });

        /* ⭐ Sync checkboxes on first load */
        table.on("init", syncAllTables);

        /* ⭐ YADCF filter */
        yadcf.init(table, [
            { column_number: 4, filter_type: "select", cumulative_filtering: true }
        ]);

        /* ⭐ Resize handler */
        $(window).on('resize', function () {
            table.columns.adjust();
            if (table.fixedHeader) table.fixedHeader.adjust();
        });
    }

    function syncAllTables() {
        const basket = loadBasket();
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
            updateBasketIcon();
        })
        .catch(err => {
            console.error("JSON load error:", err);
            loading.style.display = "none";
            ui.style.visibility = "visible";
        });

});