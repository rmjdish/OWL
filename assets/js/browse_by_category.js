document.addEventListener("DOMContentLoaded", function () {

    /* ⭐ GLOBAL BASKET (shared across all tables) */
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

    /* ⭐ ADD CHECKBOX COLUMN BEFORE DATATABLE INITIALISES */
    const tableEl = document.querySelector("#myTable thead tr");
    const th = document.createElement("th");
    th.textContent = "";
    th.style.background = "white";
    th.style.width = "20px";
    tableEl.prepend(th);

    document.querySelectorAll("#myTable tbody tr").forEach(row => {
        const td = document.createElement("td");
        td.style.background = "white";
        td.style.textAlign = "center";
        row.prepend(td);
    });

    /* ⭐ INITIALISE DATATABLE */
    var table = $('#myTable').DataTable({
        pageLength: 15,
        deferRender: true,
        scrollX: true,
        autoWidth: false,
        dom: "<'top'fB>iprt",
        fixedHeader: {
            header: true,
            headerOffset: 0
        },
        columnDefs: [
            {
                targets: 2, // shifted by +1 because checkbox column was added
                render: function (data) {
                    if (!data || data.trim() === "") return "";
                    var base = "https://rmjdish.github.io/data_dict/docs/variable_metadata/";
                    return '<a href="' + base + data + '.html" target="_blank">' + data + '</a>';
                }
            },
            {
                targets: 3, // shifted by +1
                className: "dt-center field-id-center",
                render: function (data) {
                    if (!data || data.trim() === "") return "";
                    var base = "https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=";
                    return '<a href="' + base + data + '" target="_blank">' + data + '</a>';
                }
            }
        ]
    });

    /* ⭐ INSERT CHECKBOXES AFTER DATATABLE RENDERS */
    table.rows().every(function () {
        const row = this.node();
        const cells = row.querySelectorAll("td");

        const variableName = cells[2].textContent.trim();
        const variableLabel = cells[4].textContent.trim();

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.classList.add("table-checkbox");
        cb.dataset.id = variableName;

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

        cells[0].appendChild(cb);
    });

    syncAllTables();

    /* ⭐ FIX HEADER MISALIGNMENT ON RESIZE */
    $(window).on('resize', function () {
        table.columns.adjust();
        if (table.fixedHeader) table.fixedHeader.adjust();
    });

    /* YADCF */
    yadcf.init(table, [
        { column_number: 4, filter_type: "select", cumulative_filtering: true }
    ]);

    /* Initial adjust */
    table.columns.adjust().draw(false);
    if (table.fixedHeader) table.fixedHeader.adjust();

    /* ⭐ HIDE LOADING + SHOW UI */
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("dataUI").style.visibility = "visible";

});