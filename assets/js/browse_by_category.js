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
        const tbody = document.querySelector("#myTable tbody");
        tbody.innerHTML = data.map(row => `
            <tr>
                <td>${row["Order"]}</td>
                <td>${row["NSHD Variable Name"]}</td>
                <td>${row["Showcase Field ID"]}</td>
                <td>${row["Variable Label"]}</td>
            </tr>
        `).join("");

        initDataTable();
    }


    /* ⭐ Initialize DataTables + checkbox injection */
    function initDataTable() {

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

            /* ⭐ Add checkbox column as FIRST column */
            columnDefs: [
                {
                    targets: 0,
                    orderable: false,
                    searchable: false,
                    width: "40px",
                    className: "dt-center",
                    render: function (data, type, row) {
                        const variableName = row[1];
                        return `
                            <input type="checkbox" class="table-checkbox" data-id="${variableName}">
                            <span style="margin-left:4px;">${data}</span>
                        `;
                    }
                },
                {
                    targets: 1,
                    render: function (data) {
                        return `<a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${data}.html" target="_blank">${data}</a>`;
                    }
                },
                {
                    targets: 2,
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
                const variableName = row[1];
                const variableLabel = row[3];

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

        /* ⭐ YADCF filter on Variable Label (column 3) */
        yadcf.init(table, [
            { column_number: 3, filter_type: "select", cumulative_filtering: true }
        ]);

        $(window).on('resize', function () {
            table.columns.adjust();
            if (table.fixedHeader) table.fixedHeader.adjust();
        });
    }

});