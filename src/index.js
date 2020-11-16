let submitted = false;
let speedMode = false;
let pointsVisited = [];
let panorama;
let moveSpeedMode = 0;
let linksCount = 0;
let leftJunction = true;
let movementCount = 0;
let lastCheckpoint;
let passPathString = "";
let passPathNum = "";
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
    let position = panorama.getPosition();
    let latLng = {
        lat : position.lat(),
        lng : position.lng(),
    };
    lastCheckpoint = latLng;


    async function positionChanged() {
        if(panorama.getLinks()) {
            linksCount = panorama.getLinks().length
        }
        if (submitted) {
            return;
        }

        // const positionCell = document.getElementById("position-cell");
        let position = panorama.getPosition();
        let latLng = {
            lat : position.lat(),
            lng : position.lng(),
        };
        pointsVisited.push(latLng);
        // positionCell.firstChild.nodeValue = position + "";

        movementCount++;
        if (movementCount >= 5) {
            console.log(getHeading(lastCheckpoint, latLng));
            console.log(getTurnQuadrant(getHeading(lastCheckpoint, latLng)));

            let movementHeading = getHeading(lastCheckpoint, latLng);
            let movementCompassQuad = getTurnQuadrant(movementHeading);
            passPathString += movementCompassQuad;
            passPathNum += movementHeading.toString() + " ";

            console.log(movementHeading)
            $("#route-cell").text($("#route-cell").text() + movementHeading.toFixed(1) + "(" + movementCompassQuad + ")" + " , ");
            $("#passPathStr-cell").text(passPathString);
            $("#passPathNum-cell").text(passPathNum);

            // $("#routeRoad-cell").text($("#routeRoad-cell").text() + " " + panorama.location.shortDescription);
            lastCheckpoint = latLng;
            movementCount = 0;
        }
    }
    panorama.addListener("position_changed", positionChanged);

    panorama.addListener("links_changed", async function() {
        // const linksTable = document.getElementById("links_table");
        // while (linksTable.hasChildNodes()) {
        //     linksTable.removeChild(linksTable.lastChild);
        // }
        const links = panorama.getLinks();

        headingsByPanoId = [];
        for (const i in links) {
            headingsByPanoId[links[i].pano] = links[i].heading;
            // const row = document.createElement("tr");
            // linksTable.appendChild(row);
            // const labelCell = document.createElement("td");
            // labelCell.innerHTML = "<b>Link: " + i + "</b>";
            // const valueCell = document.createElement("td");
            // valueCell.innerHTML = links[i].description;
            // linksTable.appendChild(labelCell);
            // linksTable.appendChild(valueCell);
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
            await positionChanged();
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

function getHeading(prevPoint, currPoint) {
    let point1 = new google.maps.LatLng(prevPoint.lat, prevPoint.lng);
    let point2 = new google.maps.LatLng(currPoint.lat, currPoint.lng);
    let heading = google.maps.geometry.spherical.computeHeading(point1,point2);
    return heading < 0 ? heading + 360 : heading;
}

function getTurnQuadrant(angle) {
    let quandrant = Math.floor(angle/45);

    switch (quandrant) {
        case(0) :
            return "NNE";
        case(1) :
            return "NEE";
        case(2) :
            return "SEE";
        case(3) :
            return "SSE";
        case(4) :
            return "SSW";
        case(5) :
            return "SWW";
        case(6) :
            return "NWW";
        case(7) :
            return "NNW";
        default:
            return null;
    }
}