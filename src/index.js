let submitted = false;
let pointsVisited = [];
let panorama;
function initPano(listener) {
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("pano"),
        {
            //lat and lng outside union building
            position: { lat: 50.794502, lng: -1.097004 },
            visible: true,
        }
    );
    panorama.addListener("position_changed", function(event) {
        if (submitted) {
            return;
        }
        console.log(event)
        const positionCell = document.getElementById("position-cell");
        let position = panorama.getPosition();
        let lat = position.lat();
        let lng = position.lng();
        let latLng = {
            lat : lat,
            lng : lng,
        };
        pointsVisited.push(latLng);
        positionCell.firstChild.nodeValue = position + "";
        console.log(pointsVisited)
    });
}

$(document).on('keypress',function(e) {
    console.log(e)
    if (e.which === 112 ) {
        console.log("stop");
        console.log(pointsVisited);
        submitted = true;
    }
});

//
// function getDirectionMoved(prevLat, prevLng, lat, lng) {
//     let startLat = toRadians(prevLat);
//     let startLng = toRadians(prevLng);
//     let destLat = toRadians(lat);
//     let destLng = toRadians(lng);
//
//     y = Math.sin(destLng - startLng) * Math.cos(destLat);
//     x = Math.cos(startLat) * Math.sin(destLat) -
//         Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
//     let brng = Math.atan2(y, x);
//     brng = toDegrees(brng);
//     console.log( getCardinal((brng + 360) % 360));
// }
//
//
// // Converts from degrees to radians.
// function toRadians(degrees) {
//     return degrees * Math.PI / 180;
// };
//
// // Converts from radians to degrees.
// function toDegrees(radians) {
//     return radians * 180 / Math.PI;
// }
//
// function getCardinal(angle) {
//     /**
//      * Customize by changing the number of directions you have
//      * We have 8
//      */
//     const degreePerDirection = 360 / 4;
//
//     /**
//      * Offset the angle by half of the degrees per direction
//      * Example: in 4 direction system North (320-45) becomes (0-90)
//      */
//     const offsetAngle = angle + degreePerDirection / 2;
//
//     let directionString = "";
//
//
//     if ((offsetAngle >= 0 && offsetAngle < degreePerDirection)) {
//         directionString = "N";
//     }else if(offsetAngle >= 2 * degreePerDirection && offsetAngle < 3 * degreePerDirection) {
//         directionString = "E";
//     } else if (offsetAngle >= 4 * degreePerDirection && offsetAngle < 5 * degreePerDirection) {
//         directionString = "S";
//     } else if (offsetAngle >= 6 * degreePerDirection && offsetAngle < 7 * degreePerDirection) {
//         directionString = "W";
//     }
//     return directionString;
// }