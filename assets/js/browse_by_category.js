document.addEventListener("DOMContentLoaded", function () {

    /* ⭐ Hide loader, show UI */
    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("dataUI");
    if (loading) loading.style.display = "none";
    if (ui) ui.style.visibility = "visible";

    /* ⭐ Determine JSON filename from HTML filename */
    const htmlFile = window.location.pathname.split("/").pop();
    const baseName = htmlFile.replace(/\.html$/, "");
    const jsonFile = `${baseName}.json`;

    console.log("Loading JSON:", jsonFile);

    /* ⭐ Load JSON */
    fetch(jsonFile)
        .then(r => r.json())
        .then(data => {
            console.log("Loaded JSON:", data);

            buildTable(data);
            initDataTable();
        })
        .catch(err => console.error("JSON load error:", err));

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
            deferRender: true,
            scrollX: true,
            autoWidth: false,
            dom: "<'top'fB>iprt",

            fixedHeader: {
                header: true,
                headerOffset: 0
            },

            /* ⭐ Inject checkbox into column 0 */
            columnDefs: [
                {
                    targets: 0,
                    orderable: false,
                    searchable: false,
                    width: "80px",
                    className: "dt-center",
                    render: function (data, type, row) {
                        const variableName = row[2];
                        const checked = isInBasket(variableName);
                        return `<input type="checkbox" class="table-checkbox" data-id="${variableName}" ${checked ? "checked" : ""}>`;
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

        /* ⭐ Checkbox events */
        table.on("draw", function () {
            table.rows().every(function () {
                const row = this.data();
                const variableName = row[2];
                const variableLabel = row[4];

                const cb = this.node().querySelector(".table-checkbox");
                cb.checked = isInBasket(variableName);

                cb.addEventListener("change", () => {
                    if (cb.checked) {
                        addToBasket(variableName, variableLabel);
                    } else {
                        removeFromBasket(variableName);
                    }
                    updateBasketCountUI();
                });
            });
        });

        /* ⭐ Initial sync */
        updateBasketCountUI();

        /* ⭐ YADCF filter */
        yadcf.init(table, [
            { column_number: 4, filter_type: "select", cumulative_filtering: true }
        ]);

        $(window).on('resize', function () {
            table.columns.adjust();
            if (table.fixedHeader) table.fixedHeader.adjust();
        });
    }

});