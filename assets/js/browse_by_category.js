document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       ⭐ 1. INITIAL PAGE SETUP — show spinner, hide UI
       ============================================================ */
    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("browseUI");   // ⭐ FIXED

    if (ui) ui.style.display = "none";                 // hide UI
    if (loading) loading.style.display = "flex";       // show spinner



    /* ============================================================
       ⭐ 2. DETERMINE JSON FILE BASED ON PAGE NAME
       ============================================================ */
    const htmlFile = window.location.pathname.split("/").pop();
    const baseName = htmlFile.replace(/\.html$/, "");
    const jsonFile = `${baseName}.json`;

    console.log("Loading JSON:", jsonFile);


    /* ============================================================
       ⭐ 3. LOAD JSON → BUILD TABLE → INITIALISE DATATABLES
       ============================================================ */
    fetch(jsonFile)
        .then(r => r.json())
        .then(data => {
            console.log("Loaded JSON:", data);

            buildTable(data);
            initDataTable();
        })
        .catch(err => console.error("JSON load error:", err));



    /* ============================================================
       ⭐ 4. BUILD TABLE BODY FROM JSON
       ============================================================ */
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



    /* ============================================================
       ⭐ 5. INITIALISE DATATABLES (AFTER ROWS EXIST)
       ============================================================ */
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

            columnDefs: [
                {
                    targets: 0,
                    orderable: false,
                    searchable: false,
                    width: "80px",
                    className: "dt-center",
					render: function (data, type, row) {
						const variableName = row[2];

						let checked = false;
						try { checked = isInBasket(variableName); } catch(e) {}

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



        /* ============================================================
           ⭐ 6. CHECKBOX EVENTS
           ============================================================ */
        $('#myTable2 tbody').on('change', '.table-checkbox', function () {
            const id = this.dataset.id;
            const row = $(this).closest('tr');
            const label = row.find('td').eq(4).text();

            if (this.checked) {
                addToBasket(id, label);
            } else {
                removeFromBasket(id);
            }

            updateBasketCountUI();
        });



        /* ============================================================
           ⭐ 7. YADCF FILTERS
           ============================================================ */
        yadcf.init(table, [
            { column_number: 4, filter_type: "select", cumulative_filtering: true }
        ]);



        /* ============================================================
           ⭐ 8. HANDLE RESIZE EVENTS
           ============================================================ */
        $(window).on('resize', function () {
            table.columns.adjust();
            if (table.fixedHeader) table.fixedHeader.adjust();
        });



        /* ============================================================
           ⭐ 9. WHEN DATATABLES IS READY → SHOW UI, HIDE SPINNER
           ============================================================ */
        table.on('init', function () {
            console.log("DataTables fully initialised — showing UI");

            if (loading) loading.style.display = "none";   // hide spinner
            if (ui) ui.style.display = "block";            // show UI

            updateBasketCountUI();
        });
    }

});