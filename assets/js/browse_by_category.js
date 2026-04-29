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
                targets: 1,
                render: function (data) {
                    if (!data || data.trim() === "") return "";
                    var base = "https://rmjdish.github.io/data_dict/docs/variable_metadata/";
                    return '<a href="' + base + data + '.html" target="_blank">' + data + '</a>';
                }
            },
            {
                targets: 2,
                className: "dt-center field-id-center",
                render: function (data) {
                    if (!data || data.trim() === "") return "";
                    var base = "https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=";
                    return '<a href="' + base + data + '" target="_blank">' + data + '</a>';
                }
            }
        ]
    });

    /* ⭐ ADD CHECKBOX COLUMN (NO HTML CHANGES) */
    function injectCheckboxColumn() {

        /* 1. Add header cell */
        const headerRow = document.querySelector("#myTable thead tr");
        const th = document.createElement("th");
        th.style.width = "20px";
        th.style.background = "white";
        th.textContent = "";
        headerRow.prepend(th);

        /* 2. Add checkbox to each row */
        const rows = document.querySelectorAll("#myTable tbody tr");

        rows.forEach(row => {
            const variableName = row.children[2].textContent.trim(); // NSHD Variable Name
            const variableLabel = row.children[4].textContent.trim(); // Variable Label

            const td = document.createElement("td");
            td.style.textAlign = "center";
            td.style.background = "white";

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

            td.appendChild(cb);
            row.prepend(td);
        });
    }

    injectCheckboxColumn();
    syncAllTables();

    /* ⭐ FIX HEADER MISALIGNMENT ON RESIZE */
    $(window).on('resize', function () {
        table.columns.adjust();
        if (table.fixedHeader) table.fixedHeader.adjust();
    });

    /* YADCF */
    yadcf.init(table, [
        { column_number: 3, filter_type: "select", cumulative_filtering: true }
    ]);

    /* Initial adjust */
    table.columns.adjust().draw(false);
    if (table.fixedHeader) table.fixedHeader.adjust();

    /* ⭐ HIDE LOADING + SHOW UI */
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("dataUI").style.visibility = "visible";

});