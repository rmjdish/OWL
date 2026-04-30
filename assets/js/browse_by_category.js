console.log("JS loaded");

document.addEventListener("DOMContentLoaded", function () {

    console.log("browse_by_category.js running…");

    const loading = document.getElementById("loadingScreen");
    const ui = document.getElementById("browseUI");

    ui.style.display = "none";
    loading.style.display = "flex";

    const htmlFile = window.location.pathname.split("/").pop();
    const baseName = htmlFile.replace(/\.html$/, "");
    const jsonFile = `${baseName}.json`;

    fetch(jsonFile)
        .then(r => r.json())
        .then(data => {
            buildTable(data);
            initDataTable();
        });

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

    function initDataTable() {
        var table = $('#myTable2').DataTable({
            pageLength: 15,
            scrollX: true,
            deferRender: true,
            autoWidth: false,
            dom: "<'top'fB>iprt",
            fixedHeader: { header: true, headerOffset: 0 }
        });

        table.on('init', function () {
            loading.style.display = "none";
            ui.style.display = "block";
        });
    }

});