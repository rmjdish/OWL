document.addEventListener("DOMContentLoaded", function () {

    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("browseUI");

    ui.style.visibility = "hidden";
    loading.style.display = "flex";

    const htmlFile = window.location.pathname.split("/").pop();
    const baseName = htmlFile.replace(/\.html$/, "");
    const jsonFile = `${baseName}.json`;

    console.log("Loading JSON:", jsonFile);

    /* ⭐ GLOBAL BASKET */
    let basket = JSON.parse(localStorage.getItem("basket")) || [];

    function saveBasket() {
        localStorage.setItem("basket", JSON.stringify(basket));
        updateBasketIcon();
    }

    function updateBasketIcon() {
        const icon = document.getElementById("basketCountIcon");
        if (icon) icon.textContent = basket.length;
    }

    function syncAllTables() {
        document.querySelectorAll("input.table-checkbox").forEach(cb => {
            const id = cb.dataset.id;
            cb.checked = basket.some(item => item.id === id);
        });
    }

    /* ⭐ Build table rows from JSON */
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

    /* ⭐ Initialise DataTables AFTER rows exist */
    function initDataTable() {

        var table = $('#myTable2').DataTable({
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
                console.log("DataTables fully initialised — showing UI");

                // ⭐ Wire up manual search box
                document.getElementById("manualSearch").addEventListener("keyup", function () {
                    table.search(this.value).draw();
                });

                // ⭐ Wire up manual page size dropdown
                document.getElementById("manualPageSize").addEventListener("change", function () {
                    table.page.len(parseInt(this.value)).draw();
                });

                loading.style.display = "none";
                ui.style.visibility = "visible";
            }
        });

        /* ⭐ Checkbox events */
        table.on("draw", function () {
            table.rows().every(function () {
                const row = this.data();
                const variableName = row[2];
                const variableLabel = row[4];

                const cb = this.node().querySelector(".table-checkbox");
                cb.checked = basket.some(item => item.id === variableName);

                cb.addEventListener("change", () => {
                    if (cb.checked) {
                        basket.push({ id: variableName, label: variableLabel });
                    } else {
                        basket = basket.filter(item => item.id !== variableName);
                    }
                    saveBasket();
                    syncAllTables();
                });
            });
        });

        syncAllTables();

        /* ⭐ YADCF filter on Variable Label (column 4) */
        yadcf.init(table, [
            { column_number: 4, filter_type: "select", cumulative_filtering: true }
        ]);

        /* ⭐ Resize handler */
        $(window).on('resize', function () {
            table.columns.adjust();
            if (table.fixedHeader) table.fixedHeader.adjust();
        });
    }

    /* ⭐ Load JSON */
    fetch(jsonFile)
        .then(r => r.json())
        .then(data => {
            console.log("Loaded JSON:", data);
            buildTable(data);
            initDataTable();
        })
        .catch(err => {
            console.error("JSON load error:", err);
            /* ⭐ Always unhide UI even on failure so spinner doesn't get stuck */
            loading.style.display = "none";
            ui.style.visibility = "visible";
        });

});