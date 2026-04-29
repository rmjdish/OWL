document.addEventListener("DOMContentLoaded", function () {

    /* ⭐ ALWAYS hide loading screen when page is ready */
    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("dataUI");

    if (loading) loading.style.display = "none";
    if (ui) ui.style.visibility = "visible";

    /* ⭐ Only run on pages that contain a selectable table */
    const validPages = [
        "page-baskets",
        "page-search-data-dictionary",
        "page-popular-variables",
        "page-browse-by-category"
    ];

    const isValidPage = validPages.some(cls =>
        document.body.classList.contains(cls)
    );

    if (!isValidPage) {
        return;
    }

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

    /* ⭐ DATATABLE — inject checkbox column into 4‑column HTML */
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
                /* ⭐ Inject checkbox column */
                targets: 0,
                orderable: false,
                searchable: false,
                width: "20px",
                className: "dt-center",
                render: function (data, type, row) {
                    const variableName = row[2]; // NSHD Variable Name
                    return `<input type="checkbox" class="table-checkbox" data-id="${variableName}">`;
                }
            },
            {
                /* ⭐ NSHD Variable Name (now column 2) */
                targets: 2,
                render: function (data) {
                    if (!data) return "";
                    return `<a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${data}.html" target="_blank">${data}</a>`;
                }
            },
            {
                /* ⭐ Showcase Field ID (now column 3) */
                targets: 3,
                className: "dt-center field-id-center",
                render: function (data) {
                    if (!data) return "";
                    return `<a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${data}" target="_blank">${data}</a>`;
                }
            }
        ]
    });

    /* ⭐ Attach checkbox events */
    table.on("draw", function () {
        table.rows().every(function () {
            const row = this.data();

            const variableName = row[2]; // NSHD Variable Name
            const variableLabel = row[4]; // Variable Label

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

    /* ⭐ YADCF — correct index (Variable Label = column 4) */
    yadcf.init(table, [
        { column_number: 4, filter_type: "select", cumulative_filtering: true }
    ]);

    /* ⭐ FIX HEADER ALIGNMENT */
    $(window).on('resize', function () {
        table.columns.adjust();
        if (table.fixedHeader) table.fixedHeader.adjust();
    });

});