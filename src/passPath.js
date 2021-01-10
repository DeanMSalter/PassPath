let speedMode = false;
let pointsVisited = [];
let panorama;
let leftJunction = true;
let lastCheckpoint;
let passPathString = [];
let passPathQuadrant = [];
let enableArrows = true;
let startPoint;
let endPoint;
let started = false;
let finished = false;
let startTime;
let finishTime;
let userName = "";
let latLng = {};
let userNameSubmitted = false;
let totalDistanceTravelled = 0;
let resetAttempt = false;
const minPassPathDistance = 200;
const minPointsVisited = 20;
//Everytime new arrows are loaded hide them, if not speed mode show them after a second.
//This is to prevent a problem with double clicking firing multiple pos change events.
$(document).on("DOMNodeInserted", "path", function() {
    if (!speedMode) {
        hideArrows();
    } else if (!enableArrows && speedMode) {
        hideArrows();
    }
    if (!speedMode && !finished && userNameSubmitted) {
        sleep(1000).then(showArrows);
    }
});

let map;
function initMap() {
    showNotification("Please enter your full name", -1);
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 20, lng: 0 },
        zoom: 3,
    });
    $("#userNameSubmit").on("click" , function(){
        let userNameLocal = $("#userName").val()?.toUpperCase();
        if (!userNameLocal) {
            alert("Please enter a username");
        } else {
            userName = userNameLocal.replace(/ /g , '');
            toggleElement("#userNameSubmit", false);
            toggleElement("#userName", false);
            $("#userNameDisplay").text("Name: " + userName);
            toggleElement("#userNameDisplay", true);
            enableInteraction();
            showNotification("Go to your desired location and enter street view (drag the orange person)", -1);

            userNameSubmitted = true;
        }
    });

    panorama = map.getStreetView();
    panorama.set("clickToGo", false);
    panorama.set("scrollwheel", false);
    panorama.set("fullscreenControl", false);
    panorama.set("keyboardShortcuts", false);
    panorama.set("enableCloseButton", false);

    new google.maps.event.addListener(panorama, 'visible_changed', function(){
        if (panorama.getVisible()) {
            console.log("in street view")
            initPano(panorama);
            // Display your street view visible UI

        } else {
            console.log("not")
            // Display your original UI

        }
    });
    // map.addListener(thePanorama, 'visible_changed', function() {
    //
    //     if (thePanorama.getVisible()) {
    //         console.log("in street view")
    //         // Display your street view visible UI
    //
    //     } else {
    //         console.log("not")
    //         // Display your original UI
    //
    //     }
    //
    // });
}

function initPano(panorama) {
    showNotification("Press start when at the start of your desired PassPath", -1);
    toggleElement("#startFinishBtn", true);
    toggleElement("#retryBtn", true);

    let prevHeadingsByPanoId = [];

    async function positionChanged() {
        latLng = {
            lat : panorama.getPosition().lat(),
            lng : panorama.getPosition().lng(),
        };

        //Everytime the user moves store the new pos as startpoint so that when they "start" the startpoint is the current Pos.
        if (finished || !started) {
            startPoint = latLng;
            lastCheckpoint = latLng;
            return;
        }

        //Get distance between points so we know how long the pass path is.
        //Cannot compare end and start point as that would compare "as the crow flies" not the actual length
        let currentPointGoogle = new google.maps.LatLng(latLng.lat, latLng.lng);
        let lastCheckpointGoogle = new google.maps.LatLng(lastCheckpoint.lat, lastCheckpoint.lng);
        let distanceFromLastPoint = google.maps.geometry.spherical.computeDistanceBetween (currentPointGoogle, lastCheckpointGoogle);
        totalDistanceTravelled += distanceFromLastPoint;

        //Store all points visited aswell as the textual heading and numerical quadrant for future analysis
        pointsVisited.push(latLng);
        toggleElement("#resetBtn", true);
        toggleElement("#speedModeBtnToggle", true);
        let movementHeading = getHeading(lastCheckpoint, latLng);
        let movementCompassQuad = getTurnQuadrant(movementHeading);
        let movementQuadrant =  Math.floor(movementHeading/45);
        passPathString.push(movementCompassQuad);
        passPathQuadrant.push( movementQuadrant);

        //Display distance travelled to user so they understand if told passPath is too short.
        $("#distanceTravelled-cell").text(totalDistanceTravelled.toFixed(2));
        lastCheckpoint = latLng;
    }

    panorama.addListener("position_changed", positionChanged);

    panorama.addListener("links_changed", async function() {
        if (finished) {
            return;
        }

        const links = panorama.getLinks();
        let nextLink;

        //Speedmode essentially takes the user down a straight path by calculating which arrow has the closest heading compared to the previous one.
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
        if(speedMode && panorama.getLinks().length < 3 && leftJunction) {
            // await positionChanged();
            setTimeout(function(){
                panorama?.setPano(nextLink.pano);
            }, 1000);
            enableArrows = false;
        } else if (panorama.getLinks().length > 2){
            leftJunction = false;
            enableArrows = true;
            toggleSpeedMode(false);
        } else if (panorama.getLinks().length < 3) {
            leftJunction = true;
            enableArrows = true;
        }
    });

    $("#startFinishBtn").click(function() {
        toggleButtonPressed();
    });

    $("#retryBtn").on("click", function() {
        location.reload();
        return false;
    });
    $("#resetBtn").on("click", function() {
        reset();
    })
    $("#speedModeBtnToggle").on("click", function() {
        toggleSpeedMode();
    })
    $(document).on('keypress',function(e) {
        switch (e.key) {
            case ("`") :
                toggleElement("#floating-panel");
                return;
            case (" "):
                if(started) {
                    toggleSpeedMode();
                }
                return;
            case ("2"):
                toggleElement("#passPathRoute-row");
                return;
            case ("k"):
                toggleElement("path");
                return;
            case ("Enter"):
                if (userNameSubmitted) {
                    toggleButtonPressed();
                }
                return;
        }
    });
}

function toggleButtonPressed() {
    if (!started) {
        showNotification("Started Recording PassPath");
        $("#startFinishBtn").css("background-color", "red");
        $("#startFinishBtn").val("Finish");
        started = true;
        startTime = new Date();
    } else if(!finished) {
        if (pointsVisited.length < minPointsVisited || totalDistanceTravelled < minPassPathDistance) {
            alert("passPath not long enough! Please travel at least " + minPassPathDistance + " metres");
            return;
        }
        $("#startFinishBtn").css("background-color", "gold");
        showNotification("PassPath Submitted");
        $("#startFinishBtn").val("Finished");
        sleep(1000).then(hideArrows);
        disableInteraction();
        finished = true;
        finish();
    }
}

function finish() {
    toggleElement("#resetBtn", false);
    toggleElement("#speedModeBtnToggle", false);
    logAttempt();
    alert("PassPath Complete , thank you! You may close this tab now.")
}

function logAttempt() {
    finishTime = new Date();
    if (!endPoint) {
        endPoint = latLng;
    }
    let data = {
        userName: userName,
        passPath: passPathString,
        passPathQuadrant: passPathQuadrant,
        pointsVisited : JSON.stringify(pointsVisited),
        startLat: startPoint.lat,
        startLng: startPoint.lng,
        endLat: endPoint.lat,
        endLng: endPoint.lng,
        totalDistanceTravelled: totalDistanceTravelled,
        timeTaken : (finishTime - startTime) / 1000,
        resetAttempt: resetAttempt,
        functionName : "insertUser",
    };
    console.log(data);
    ajaxRequest("user.php", "POST", data)
        .then(function(response){
            console.log(response)
            response = JSON.parse(response);
            if (response.userAlreadyExists) {
                data.functionName = "logAttempt";
                ajaxRequest("user.php", "POST", data).then(function(response) {
                    console.log(response)
                    response = JSON.parse(response);
                    return response.successfulAttempt;
                }).catch(function(response) {console.log(response)})
            }
        })
        .catch(function(response){
            console.log(response)
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
    showArrows();
    toggleElement("#overlay", false)
}

function showArrows() {
    toggleElement("path", true);
}

function showNotification(message, delay = 2000) {
    $("#notifications").text(message);
    toggleElement("#notifications", true);
    if (delay > -1) {
        sleep(delay).then(function() {
            toggleElement("#notifications", false)
        });
    }
}

function ajaxRequest(url , method, data){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            method: method,
            data: data,
            success: function (response) {
                resolve(response);
            },
            error: function (response) {
                reject(response);
            }
        });
    });
}

function toggleSpeedMode(status = null) {
    console.log(status)
    console.log("toggling")
    if (status !== null) {
        speedMode = status;
    } else {
        speedMode = !speedMode;
    }
    if (speedMode) {
        $("#speedModeBtnToggle").val("Speed Mode - Enabled");
        $("#speedModeBtnToggle").css("background-color", "green")
        sleep(1000).then(showArrows);
    } else {
        $("#speedModeBtnToggle").val("Speed Mode - Disabled");
        $("#speedModeBtnToggle").css("background-color", "red")
        hideArrows();
    }
}

function reset() {
    resetAttempt = true;
    logAttempt();
    let startPointGoogle = new google.maps.LatLng(startPoint.lat, startPoint.lng);
    panorama.setPosition(startPointGoogle)

    speedMode = false;
    pointsVisited = [];
    leftJunction = true;
    lastCheckpoint = null;
    passPathString = [];
    passPathQuadrant = [];
    enableArrows = true;
    startPoint = null;
    endPoint = null;
    started = false;
    finished = false;
    startTime = null;
    finishTime = null;
    latLng = {};
    userNameSubmitted = true;
    totalDistanceTravelled = 0;
    resetAttempt = false;

    $("#speedMode-cell").text("Disabled");
    $("#distanceTravelled-cell").text("0");
    $("#startFinishBtn").css("background-color", "green");
    $("#startFinishBtn").val("Start");
    toggleElement("#resetBtn", false);
    enableInteraction();
    showNotification("Press start when at the start of your desired PassPath", -1);
}