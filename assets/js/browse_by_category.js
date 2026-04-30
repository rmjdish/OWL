/* ⭐ Initialise DataTables AFTER rows exist */
function initDataTable() {

    var table = $('#myTable2').DataTable({
        pageLength: 15,
        deferRender: true,
        scrollX: true,
        autoWidth: true,   // ⭐ IMPORTANT for header alignment
        dom: "<'top'fB>iprt",

        fixedHeader: {
            header: true,
            headerOffset: 0
        },

        columnDefs: [
            { targets: "_all", width: "auto" },  // ⭐ ensures consistent widths

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
        ]
    });

    /* ⭐ Sync checkboxes */
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
            });
        });
    });

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