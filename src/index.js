let submitted = false;
let pointsVisited = [];
let panorama;
function initPano(listener) {
    let headingsByPanoId = [];
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("pano"),
        {
            //lat and lng outside union building
            position: { lat: 50.794502, lng: -1.097004 },
            visible: true,
        }
    );

    panorama.addListener("position_changed", function() {
        if (submitted) {
            return;
        }
        let turnDirection = getTurnQuadrant(headingsByPanoId[panorama.pano]);
        if (turnDirection) {
            $("#route-cell").text($("#route-cell").text() + " " + turnDirection);
            $("#routeRoad-cell").text($("#routeRoad-cell").text() + " " + panorama.location.shortDescription);
        }

        const positionCell = document.getElementById("position-cell");
        let position = panorama.getPosition();
        let latLng = {
            lat : position.lat(),
            lng : position.lng(),
        };
        pointsVisited.push(latLng);
        positionCell.firstChild.nodeValue = position + "";
    });

    panorama.addListener("links_changed", () => {
        const linksTable = document.getElementById("links_table");
        while (linksTable.hasChildNodes()) {
            linksTable.removeChild(linksTable.lastChild);
        }
        const links = panorama.getLinks();

        headingsByPanoId = [];
        for (const i in links) {
            if (links.length > 2) {
                headingsByPanoId[links[i].pano] = links[i].heading;
            }
            const row = document.createElement("tr");
            linksTable.appendChild(row);
            const labelCell = document.createElement("td");
            labelCell.innerHTML = "<b>Link: " + i + "</b>";
            const valueCell = document.createElement("td");
            valueCell.innerHTML = links[i].description;
            linksTable.appendChild(labelCell);
            linksTable.appendChild(valueCell);

        }
    });
}


$(document).on('keypress',function(e) {
    if (e.which === 112 ) {
        submitted = true;
    }
});

function getTurnQuadrant(angle) {
    let quandrant = Math.floor(angle/90);

    switch (quandrant) {
        case(0) :
            return "F";
        case(1) :
            return "R";
        case(2) :
            return "B";
        case(3) :
            return "L";
        default:
            return null;
    }
}