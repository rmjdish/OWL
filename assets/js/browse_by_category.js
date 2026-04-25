document.addEventListener("DOMContentLoaded", function () {

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