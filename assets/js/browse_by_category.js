document.addEventListener("DOMContentLoaded", function () {

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

    /* ⭐ DATATABLE WITH CHECKBOX COLUMN DEFINED PROPERLY */
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

        columns: [
            {   // checkbox column
                data: null,
                orderable: false,
                searchable: false,
                width: "20px",
                className: "dt-center",
                render: function (data, type, row) {
                    return `<input type="checkbox" class="table-checkbox" data-id="${row[1]}">`;
                }
            },
            { data: 0 }, // Order
            {   // NSHD Variable Name
                data: 1,
                render: function (data) {
                    if (!data) return "";
                    return `<a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${data}.html" target="_blank">${data}</a>`;
                }
            },
            {   // Showcase Field ID
                data: 2,
                className: "dt-center field-id-center",
                render: function (data) {
                    if (!data) return "";
                    return `<a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${data}" target="_blank">${data}</a>`;
                }
            },
            { data: 3 } // Variable Label
        ],

        rowCallback: function (row, data) {
            const variableName = data[1];
            const variableLabel = data[3];

            const cb = row.querySelector(".table-checkbox");
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
        }
    });

    /* ⭐ YADCF — correct index (Variable Label = column 4) */
    yadcf.init(table, [
        { column_number: 4, filter_type: "select", cumulative_filtering: true }
    ]);

    syncAllTables();

    /* ⭐ FIX HEADER ALIGNMENT */
    $(window).on('resize', function () {
        table.columns.adjust();
        if (table.fixedHeader) table.fixedHeader.adjust();
    });

    /* ⭐ SHOW UI */
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("dataUI").style.visibility = "visible";

});