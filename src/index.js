let submitted = false;
let speedMode = false;
let pointsVisited = [];
let panorama;
let moveSpeedMode = 0;
let linksCount = 0;
let leftJunction = true;
function initPano(listener) {
    let headingsByPanoId = [];
    let prevHeadingsByPanoId = [];

    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("pano"),
        {
            //lat and lng outside union building
            position: { lat: 50.794502, lng: -1.097004 },
            visible: true,
            clickToGo: false,
            scrollwheel: false,
        }
    );

    panorama.addListener("position_changed", function() {
        if(panorama.getLinks()) {
            linksCount = panorama.getLinks().length
        }
        if (submitted) {
            return;
        }
        let previousLinksCount = Object.keys(headingsByPanoId).length;
        if (previousLinksCount > 2) {
            let turnDirection = getTurnQuadrant(headingsByPanoId[panorama.pano]);
            if (turnDirection) {
                $("#route-cell").text($("#route-cell").text() + " " + turnDirection);
                $("#routeRoad-cell").text($("#routeRoad-cell").text() + " " + panorama.location.shortDescription);
            }
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
            headingsByPanoId[links[i].pano] = links[i].heading;
            const row = document.createElement("tr");
            linksTable.appendChild(row);
            const labelCell = document.createElement("td");
            labelCell.innerHTML = "<b>Link: " + i + "</b>";
            const valueCell = document.createElement("td");
            valueCell.innerHTML = links[i].description;
            linksTable.appendChild(labelCell);
            linksTable.appendChild(valueCell);
        }


        let nextLink;
        if(speedMode ) {
            //angles will be calculated from 0 - 180 in closeness so 181 will always be overridden.
            let distanceFromTargetAngle = 181;
            for (let link in panorama.getLinks()) {
                let  phi = Math.abs(panorama.getLinks()[link].heading - prevHeadingsByPanoId[panorama.pano]) % 360;       // This is either the distance or 360 - distance
                let  distance = phi > 180 ? 360 - phi : phi;
                if (distance < distanceFromTargetAngle) {
                    distanceFromTargetAngle = distance;
                    nextLink = panorama.getLinks()[link];
                }
            }
        }

        prevHeadingsByPanoId = [];
        for (const i in panorama.getLinks()) {
            prevHeadingsByPanoId[panorama.getLinks()[i].pano] = panorama.getLinks()[i].heading;
        }
        if(speedMode && panorama.getLinks().length < 3  && moveSpeedMode <= 20 && leftJunction) {
            setTimeout(function(){
                panorama.setPano(nextLink.pano);
            }, 1000);
            moveSpeedMode += 1;
        } else if (panorama.getLinks().length > 2){
            leftJunction = false;
        } else if (panorama.getLinks().length < 3) {
            leftJunction = true;
        }
    });
}


$(document).on('keypress',function(e) {
    console.log(e)
    if (e.which === 112 ) {
        submitted = true;
    }
    if(e.which === 105) {
        moveSpeedMode = 0;
        speedMode = !speedMode;
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