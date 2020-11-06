let submitted = false;
let speedMode = false;
let pointsVisited = [];
let panorama;
let moveSpeedMode = 0;
let linksCount = 0;
function initPano(listener) {
    let headingsByPanoId = [];
    let prevHeadingsByPanoId = [];

    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("pano"),
        {
            //lat and lng outside union building
            position: { lat: 50.794502, lng: -1.097004 },
            visible: true,
        }
    );

    panorama.addListener("position_changed", function() {
        if(panorama.getLinks()) {
            linksCount = panorama.getLinks().length
        }
        // if (submitted) {
        //     return;
        // }
        // prevHeadingsByPanoId = [];
        // for (const i in panorama.getLinks()) {
        //     prevHeadingsByPanoId[panorama.getLinks()[i].pano] = panorama.getLinks()[i].heading;
        // }
        // if(speedMode ) {
        //     let listOfLinks = [];
        //     for (let i in panorama.getLinks()){
        //         listOfLinks.push(panorama.getLinks()[i].heading)
        //     }
        //     let closest = listOfLinks.reduce(function(prev, curr) {
        //         return (Math.abs(curr - prevHeadingsByPanoId[panorama.pano]) < Math.abs(prev - prevHeadingsByPanoId[panorama.pano]) ? curr : prev);
        //     });
        //     let nextLink = panorama.getLinks().filter(link => link.heading === closest)[0];
        // }
        // let previousLinksCount = Object.keys(headingsByPanoId).length;
        // if (previousLinksCount > 2) {
        //     let turnDirection = getTurnQuadrant(headingsByPanoId[panorama.pano]);
        //     if (turnDirection) {
        //         $("#route-cell").text($("#route-cell").text() + " " + turnDirection);
        //         $("#routeRoad-cell").text($("#routeRoad-cell").text() + " " + panorama.location.shortDescription);
        //     }
        // }
        //
        // const positionCell = document.getElementById("position-cell");
        // let position = panorama.getPosition();
        // let latLng = {
        //     lat : position.lat(),
        //     lng : position.lng(),
        // };
        // pointsVisited.push(latLng);
        // positionCell.firstChild.nodeValue = position + "";


    });

    panorama.addListener("links_changed", () => {
        // const linksTable = document.getElementById("links_table");
        // while (linksTable.hasChildNodes()) {
        //     linksTable.removeChild(linksTable.lastChild);
        // }
        // const links = panorama.getLinks();
        //
        // // headingsByPanoId = [];
        // for (const i in links) {
        //     // headingsByPanoId[links[i].pano] = links[i].heading;
        //     const row = document.createElement("tr");
        //     linksTable.appendChild(row);
        //     const labelCell = document.createElement("td");
        //     labelCell.innerHTML = "<b>Link: " + i + "</b>";
        //     const valueCell = document.createElement("td");
        //     valueCell.innerHTML = links[i].description;
        //     linksTable.appendChild(labelCell);
        //     linksTable.appendChild(valueCell);
        // }


        let nextLink;
        if(speedMode ) {
            let listOfLinks = [];
            for (let i in panorama.getLinks()){
                listOfLinks.push(panorama.getLinks()[i].heading)
            }
            let closest = listOfLinks.reduce(function(prev, curr) {
                return (Math.abs(curr - prevHeadingsByPanoId[panorama.pano]) < Math.abs(prev - prevHeadingsByPanoId[panorama.pano]) ? curr : prev);
            });
            nextLink = panorama.getLinks().filter(link => link.heading === closest)[0];
        }
        prevHeadingsByPanoId = [];
        for (const i in panorama.getLinks()) {
            prevHeadingsByPanoId[panorama.getLinks()[i].pano] = panorama.getLinks()[i].heading;
        }
        console.log("-------------");
        if(speedMode && panorama.getLinks().length < 3  && moveSpeedMode <= 20) {
            setTimeout(function(){
                panorama.setPano(nextLink.pano);
            }, 1000);
            moveSpeedMode += 1;
        } else {
            console.log("STOPPED")
            console.log(linksCount)
            console.log(panorama.getLinks())
            console.log(moveSpeedMode)
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