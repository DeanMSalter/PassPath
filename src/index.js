let continueTracking = false;
let speedMode = false;
let pointsVisited = [];
let panorama;
let moveSpeedMode = 0;
let leftJunction = true;
let lastCheckpoint;
let passPathString = "";
let passPathQuadrant = "";
let passPathNum = "";
let enableArrows = true;
let startPoint;
let endPoint;
const testStartPoint = { lat: 50.79453657114883, lng: -1.097003957709272 };
const testEndPoint = { lat: 50.79209004265288, lng: -1.100222452185947 };
let started = false;
let finished = false;
let startTime;
let finishTime;
let userName = "";
$(document).on("DOMNodeInserted", "path", function() {
    if (!speedMode) {
        hideArrows();
    } else if (!enableArrows && speedMode) {
        hideArrows();
    }
    if (!speedMode && !finished) {
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
            fullscreenControl: false,
            keyboardShortcuts: false
        }
    );

    async function positionChanged() {
        let latLng = {
            lat : panorama.getPosition().lat(),
            lng : panorama.getPosition().lng(),
        };
        if (finished || !started) {
            if (!endPoint) {
                endPoint = latLng;
            }
            return;
        }
        if (!startPoint) {
            startPoint = latLng;
        }
        pointsVisited.push(latLng);
        if (!lastCheckpoint) {
            lastCheckpoint = latLng;
            return;
        }
        let movementHeading = getHeading(lastCheckpoint, latLng);
        let movementCompassQuad = getTurnQuadrant(movementHeading);
        let movementQuadrant =  Math.floor(movementHeading/45);
        passPathString += movementCompassQuad + ", ";
        passPathQuadrant += movementQuadrant + ", ";
        passPathNum += movementHeading.toString() + " ";

        $("#route-cell").text($("#route-cell").text() + movementHeading.toFixed(1) + "(" + movementCompassQuad + ")" + " , ");
        $("#passPathStr-cell").text(passPathString);
        $("#passPathNum-cell").text(passPathNum);


        lastCheckpoint = latLng;
    }

    panorama.addListener("position_changed", positionChanged);

    panorama.addListener("links_changed", async function() {
        if (finished) {
            return;
        }

        const links = panorama.getLinks();
        let nextLink;
        if(speedMode ) {
            //angles will be calculated from 0 - 180 in closeness so 181 will always be overridden.
            let distanceFromTargetAngle = 181;
            for (let i = 0; i < links.length; i++) {
                let  phi = Math.abs(links[i].heading - prevHeadingsByPanoId[panorama.pano]) % 360;
                let  distance = phi > 180 ? 360 - phi : phi;
                if (distance < distanceFromTargetAngle) {
                    distanceFromTargetAngle = distance;
                    nextLink = links[i];
                }
            }
        }

        prevHeadingsByPanoId = [];
        for (const i in panorama.getLinks()) {
            prevHeadingsByPanoId[panorama.getLinks()[i].pano] = panorama.getLinks()[i].heading;
        }

        //If going down a road (only two arrows) continue down road. When get to junction stop to allow user input
        // and allow user input once more when moving away from junction.
        if(speedMode && panorama.getLinks().length < 3  && moveSpeedMode < 20 && leftJunction) {
            // await positionChanged();
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
            enableArrows = true;
        } else if (moveSpeedMode >= 20) {
            enableArrows = true;
        }
    });

    $("#startFinishBtn").click(function() {
        toggleButtonPressed();
    });

    $("#userNameSubmit").on("click" , function(){
        let userNameLocal = $("#userName").val();
        if (!userNameLocal) {
            alert("Please enter a username");
        } else {
            userName = userNameLocal;
            toggleElement("#userNameSubmit", false);
            toggleElement("#startFinishBtn", true);
            toggleElement("#userName", false);
            $("#userNameDisplay").text("userName: " + userName);
            toggleElement("#userNameDisplay", true);
            enableInteraction()
        }
    });
}

$(document).on('keypress',function(e) {
    switch (e.key) {
        case ("i"):
            speedMode = !speedMode;
            sleep(1000).then(showArrows)
            $("#speedMode-cell").text(speedMode);
            return;
        case ("`") :
            toggleElement("#floating-panel");
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
        case ("Enter"):
            toggleButtonPressed();
            return;
    }
});

function toggleButtonPressed() {
    if (!started) {
        $("#floating-panel").css("background-color", "green");
        showNotification("Started Recording PassPath");
        $("#startFinishBtn").css("background-color", "red");
        $("#startFinishBtn").val("Finish");
        started = true;
        startTime = new Date();
    } else if(!finished) {
        $("#floating-panel").css("background-color", "red");
        $("#startFinishBtn").css("background-color", "gold");
        showNotification("PassPath Submitted");
        $("#startFinishBtn").val("Finished");
        sleep(1000).then(hideArrows);
        disableInteraction();
        console.log(passPathString)
        finished = true;
        finishTime = new Date();
        finish();

    }
}
function finish() {
    let testStartPointGoogleFormat = new google.maps.LatLng(testStartPoint.lat, testStartPoint.lng);
    let startPointGoogleFormat = new google.maps.LatLng(startPoint.lat, startPoint.lng);
    let distanceBetweenStartPoints = google.maps.geometry.spherical.computeDistanceBetween(testStartPointGoogleFormat, startPointGoogleFormat);
    console.log(testStartPointGoogleFormat);
    console.log(testStartPoint);
    console.log(startPoint);
    console.log(distanceBetweenStartPoints);
    console.log((finishTime - startTime) / 1000);
    let data = {
        userName: userName,
        passPath: passPathString,
        passPathQuadrant: passPathQuadrant,
        startLat: startPoint.lat,
        startLng: startPoint.lng,
        endLat: endPoint.lat,
        endLng: endPoint.lng,
        timeTaken : (finishTime - startTime) / 1000,
        functionName : "insertUser",
    };

    ajaxRequest("user.php", "POST", data)
        .then(function(response){
            console.log(response)
            data.functionName = "logAttempt";
            ajaxRequest("user.php", "POST", data).then(function(response) {
                console.log(response)
            }).catch(function(response) {console.log(response)})
        })
        .catch(function(response){
            response = JSON.parse(response);
            if(response){
                alert("error in checker if user exists");
            }
        });
}

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

function disableInteraction() {
    document.activeElement.blur();
    toggleElement("#overlay", true)
}
function enableInteraction() {
    toggleElement("#overlay", false)
}
function showArrows() {
    toggleElement("path", true);
}

function showNotification(message, delay = 2000) {
    $("#notifications").text(message);
    toggleElement("#notifications", true);
    sleep(delay).then(function() {
        toggleElement("#notifications", false)
    });
}


function ajaxRequest(url , method, data){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            method: method,
            data: data,
            success: function (response) {
                // console.log(response);
                // console.log(url);
                // console.log(data);
                resolve(response);
            },
            error: function (response) {
                // console.log(response);
                // console.log(url);
                // console.log(data);

                reject(response);
            }
        });
    });
}