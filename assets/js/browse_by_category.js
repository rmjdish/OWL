document.addEventListener("DOMContentLoaded", function () {

    /* ⭐ Spinner visible, UI hidden until DataTables finishes */
    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("browseUI");

    ui.style.visibility = "hidden";     // hide UI
    loading.style.display = "flex";     // show spinner


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

            buildTable(data);   // insert rows
            initDataTable();    // ⭐ initialise AFTER rows exist
        })
        .catch(err => console.error("JSON load error:", err));


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
                <td></td> <!-- ⭐ placeholder for checkbox column -->
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
            autoWidth: true,   // ⭐ required for header alignment
            dom: "<'top'f>iprt",

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


        /* ⭐ THE IMPORTANT PART — WAIT FOR FULL RENDER */
        table.on("init", function () {
            console.log("DataTables fully initialised — showing UI");

            loading.style.display = "none";   // hide spinner
            ui.style.visibility = "visible";  // show UI
        });
    }

});