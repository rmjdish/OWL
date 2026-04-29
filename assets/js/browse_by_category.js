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

    /* ⭐ INITIALISE DATATABLE WITH CHECKBOX COLUMN */
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

        /* ⭐ Add checkbox header */
        headerCallback: function (thead) {
            const first = thead.querySelector("th:first-child");
            first.style.background = "white";
            first.style.width = "20px";
            first.textContent = "";
        },

        /* ⭐ Add checkbox to each row */
        createdRow: function (row, data) {

            const variableName = data[1]; // NSHD Variable Name
            const variableLabel = data[3]; // Variable Label

            const td = row.insertCell(0);
            td.style.background = "white";
            td.style.textAlign = "center";

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
        },

        /* ⭐ Fix column indexes after adding checkbox column */
        columnDefs: [
            {
                targets: 2, // shifted by +1
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

    /* ⭐ Sync checkboxes after table loads */
    syncAllTables();

    /* ⭐ FIX HEADER MISALIGNMENT ON RESIZE */
    $(window).on('resize', function () {
        table.columns.adjust();
        if (table.fixedHeader) table.fixedHeader.adjust();
    });

    /* ⭐ YADCF — FIXED COLUMN INDEX */
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