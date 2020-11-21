let submitted = false;
let speedMode = false;
let pointsVisited = [];
let panorama;
let moveSpeedMode = 0;
let leftJunction = true;
let lastCheckpoint;
let passPathString = "";
let passPathNum = "";
let enableArrows = true;

$(document).on("DOMNodeInserted", "path", function() {
    if (!speedMode) {
        hideArrows();
    } else if (!enableArrows && speedMode) {
        hideArrows();
    }
    if (!speedMode) {
        sleep(1000).then(showArrows);
    }
});

function initPano(listener) {
    let prevHeadingsByPanoId = [];
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("pano"),
        {
            //lat and lng outside union building
            position: { lat: 50.794502, lng: -1.097004 },
            visible: true,
            clickToGo: false,
            scrollwheel: false,
            fullscreenControl: false
        }
    );

    async function positionChanged() {
        if (submitted) {
            return;
        }

        let latLng = {
            lat : panorama.getPosition().lat(),
            lng : panorama.getPosition().lng(),
        };
        pointsVisited.push(latLng);

        if (!lastCheckpoint) {
            lastCheckpoint = latLng;
            return;
        }

        let movementHeading = getHeading(lastCheckpoint, latLng);
        let movementCompassQuad = getTurnQuadrant(movementHeading);
        passPathString += movementCompassQuad + ", ";
        passPathNum += movementHeading.toString() + " ";

        $("#route-cell").text($("#route-cell").text() + movementHeading.toFixed(1) + "(" + movementCompassQuad + ")" + " , ");
        $("#passPathStr-cell").text(passPathString);
        $("#passPathNum-cell").text(passPathNum);


        lastCheckpoint = latLng;
    }

    panorama.addListener("position_changed", positionChanged);

    panorama.addListener("links_changed", async function() {
        const links = panorama.getLinks();
        let nextLink;
        if(speedMode ) {
            //angles will be calculated from 0 - 180 in closeness so 181 will always be overridden.
            let distanceFromTargetAngle = 181;
            links.every(function(link) {
                let  phi = Math.abs(link.heading - prevHeadingsByPanoId[panorama.pano]) % 360;
                let  distance = phi > 180 ? 360 - phi : phi;
                if (distance < distanceFromTargetAngle) {
                    distanceFromTargetAngle = distance;
                    nextLink = link;
                }
            })
        }

        prevHeadingsByPanoId = [];
        for (const i in panorama.getLinks()) {
            prevHeadingsByPanoId[panorama.getLinks()[i].pano] = panorama.getLinks()[i].heading;
        }

        //If going down a road (only two arrows) continue down road. When get to junction stop to allow user input
        // and allow user input once more when moving away from junction.
        if(speedMode && panorama.getLinks().length < 3  && moveSpeedMode <= 20 && leftJunction) {
            await positionChanged();
            setTimeout(function(){
                panorama.setPano(nextLink.pano);
            }, 1000);
            moveSpeedMode += 1;
            $("#speedModeCount-cell").text(moveSpeedMode);
            enableArrows = false;
        } else if (panorama.getLinks().length > 2){
            leftJunction = false;
            enableArrows = true;
        } else if (panorama.getLinks().length < 3) {
            leftJunction = true;
        }
    });
}


$(document).on('keypress',function(e) {
    switch (e.key) {
        case ("p"):
            submitted = true;
            return;
        case ("i"):
            speedMode = !speedMode;
            $("#speedMode-cell").text(speedMode);
            return;
        case ("r"):
            moveSpeedMode = 0;
            $("#speedModeCount-cell").text(moveSpeedMode);
            return;
        case ("1"):
            toggleElement("#passPathNum-row");
            return;
        case ("2"):
            toggleElement("#passPathRoute-row");
            return;
        case ("k"):
            toggleElement("path");
            return;
    }
});

function getHeading(prevPoint, currPoint) {
    let point1 = new google.maps.LatLng(prevPoint.lat, prevPoint.lng);
    let point2 = new google.maps.LatLng(currPoint.lat, currPoint.lng);
    let heading = google.maps.geometry.spherical.computeHeading(point1,point2);
    return heading < 0 ? heading + 360 : heading;
}

function getTurnQuadrant(angle) {
    let quadrant = Math.floor(angle/45);

    switch (quadrant) {
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

function toggleElement(element, state) {
    if (typeof state !== "undefined") {
        $(element).toggleClass("hidden", !state);
    } else {
        $(element).toggleClass("hidden");
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hideArrows() {
    toggleElement("path", false);
}

function showArrows() {
    toggleElement("path", true);
}