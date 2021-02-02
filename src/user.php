<?php
ini_set('display_errors', 1);
error_reporting(-1);

$aResult = array();
$userName = (string) hash('sha256', $_POST['userName']);
$password = (string) hash('sha256', $_POST['password']);
$routeNumber = (String) $_POST['routeNumber'];
$passPath = (String) implode($_POST['passPath'], ",");
$passPathQuadrant = (String) implode($_POST['passPathQuadrant'], ",");
$pointsVisited = (String) $_POST['pointsVisited'];
$startLat = (String) $_POST['startLat'];
$startLng = (String) $_POST['startLng'];
$endLat = (String) $_POST['endLat'];
$endLng = (String) $_POST['endLng'];
$totalDistanceTravelled = (String) $_POST['totalDistanceTravelled'];
$createdStamp = date("Y-m-d H:i:s");
$timeTaken = (String) $_POST['timeTaken'];
$resetAttempt = (String) $_POST['resetAttempt'];

if( !isset($_POST['functionName']) ) { $aResult['error'] = 'No function name!'; }

if( !isset($aResult['error']) ) {
    switch($_POST['functionName']) {
        case 'insertUser':
            insertUser($userName, $password, $routeNumber, $passPath, $passPathQuadrant, $pointsVisited, $startLat, $startLng, $endLat, $endLng, $totalDistanceTravelled, $timeTaken, $createdStamp);
            break;
        case 'logAttempt':
            logAttempt($userName, $password, $routeNumber, $passPath, $passPathQuadrant, $pointsVisited, $startLat, $startLng, $endLat, $endLng, $totalDistanceTravelled, $timeTaken, $resetAttempt, $createdStamp);
            break;
        default:
            $aResult['error'] = 'Not found function '.$_POST['functionname'].'!';
            break;
    }

}

function insertUser($userName, $password, $routeNumber, $passPath, $passPathQuadrant, $pointsVisited, $startLat, $startLng, $endLat, $endLng, $totalDistanceTravelled, $timeTaken, $createdStamp) {
    try {
        if (!userExists($userName, $routeNumber)) {
            $mysqli = mysqliConnect();
            $insertUserStmt = $mysqli->prepare("INSERT INTO user (username, password, routeNumber, passPath, passPathQuadrant, pointsVisited, startLat,
                                                startLng, endLat, endLng, totalDistanceTravelled, timeTaken, createdStamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $bp = $insertUserStmt->bind_param('sssssssssssss', $userName, $password, $routeNumber, $passPath, $passPathQuadrant, $pointsVisited, $startLat, $startLng, $endLat, $endLng, $totalDistanceTravelled, $timeTaken, $createdStamp);
            if (false===$bp ) {
                // again execute() is useless if you can't bind the parameters. Bail out somehow.
                die('bind_param() failed: ' . htmlspecialchars($insertUserStmt->error));
            }
            if (!$insertUserStmt->execute()) {
                echo($insertUserStmt->error);
            }
            $insertUserStmt->execute();
            $insertUserStmt->close();
            $mysqli->close();
            echo json_encode(array(
                'userCreated' => true,
            ));
        } else {
            echo json_encode(array(
                'userAlreadyExists' => true,
            ));
        }
    } catch (Exception $e) {
        echo json_encode(array(
            'error' => array(
                'msg' => $e->getMessage(),
                'code' => $e->getCode(),
            ),
        ));
    }
}

function logAttempt($userName, $password, $routeNumber, $passPath, $passPathQuadrant, $pointsVisited, $startLat, $startLng, $endLat, $endLng, $totalDistanceTravelled, $timeTaken, $resetAttempt, $createdStamp) {
    try {
        if (userExists($userName, $routeNumber)) {
            $similarityArray = array();
            $successfulAttempt = false;

            // --- Get intended user values ---
            $mysqli = mysqliConnect();
            $checkUserStmt = $mysqli->prepare("SELECT * FROM user WHERE username = ? AND routeNumber = ?");
            $checkUserStmt->bind_param('ss', $userName, $routeNumber);
            $checkUserStmt->execute();
            $result = $checkUserStmt->get_result();
            $user = $result->fetch_array(MYSQLI_ASSOC);

            // --- password ---
            $correctPassword = $user["password"];
            if (hash_equals($correctPassword, $password)) {
                $passwordStatus = "true";
            } else {
                $passwordStatus = "false";
            }

            // --- Distance from start/end points ---
            $correctStartLat = $user["startLat"];
            $correctStartLng = $user["startLng"];
            $correctEndLat = $user["endLat"];
            $correctEndLng = $user["endLng"];
            $distanceFromStart = latLngDistance($startLat, $startLng, $correctStartLat, $correctStartLng);
            $distanceFromEnd = latLngDistance($endLat, $endLng, $correctEndLat, $correctEndLng);

            // --- passPath similarity calculations ---
            $correctQuadrantArray = explode(",", $user["passPathQuadrant"]);
            $submittedQuadrantArray = explode(",", $passPathQuadrant);

            $sizeOfSubmittedQuadrantArray = count($submittedQuadrantArray);
            $sizeOfCorrectQuadrantArray = count($correctQuadrantArray);

            $differenceInArraySizes = abs($sizeOfSubmittedQuadrantArray - $sizeOfCorrectQuadrantArray);

            $ignoreExtraPaths = $distanceFromStart < 25 && $distanceFromEnd < 25;
            //Work out the shortest route around the compass from the submitted passPath decision to the correct one then adds it to the similarity array
            //Maximum difference value is 4 as each increment represents 45 degrees (45*4 = 180) as once it gets to 180 it loops round.
            for ($i = 0; $i < $sizeOfSubmittedQuadrantArray; $i++) {
                if ($ignoreExtraPaths && (!isset($correctQuadrantArray[$i]) || !isset($submittedQuadrantArray[$i]))){
                    continue;
                }
                if ($submittedQuadrantArray[$i] == $correctQuadrantArray[$i]) {
                    array_push($similarityArray, 0);
                    continue;
                }
                $CWValue = $submittedQuadrantArray[$i];
                $CWCounter = 0;
                $CCWValue= $submittedQuadrantArray[$i];
                $CCWCounter = 0;
                while ($CWValue != $correctQuadrantArray[$i]){
                    $CWCounter ++;
                    if ($CWValue == 7) {
                        $CWValue = 0;
                    } else {
                        $CWValue ++;
                    }
                };
                while ($CCWValue != $correctQuadrantArray[$i]){
                    $CCWCounter ++;
                    if ($CCWValue == 0) {
                        $CCWValue = 7;
                    } else {
                        $CCWValue --;
                    }
                };
                if ($CCWCounter < $CWCounter || ($CCWCounter == $CWCounter)) {
                    array_push($similarityArray, $CCWCounter);
                } else {
                    array_push($similarityArray, $CWCounter);
                }
            };

            //If the submitted PassPath is too long or too short , whatever the difference is add a 4 for each extra/fewer decisions as 4 is the max difference
            if (!$ignoreExtraPaths) {
             for ($o = 0; $o < $differenceInArraySizes ; $o++) {
                            array_push($similarityArray, 4);
             };
            }

            //Get sum of similarity Array then convert it to a percentage.
            $similarity = 100 - ((((array_sum($similarityArray) / count($similarityArray)) / 4) * 100));
            $similarityArray = implode(",", $similarityArray);

            // --- log attempt values ---
            $insertUserStmt = $mysqli->prepare("INSERT INTO attempt (username, passwordCorrect, routeNumber, passPath, passPathQuadrant, pointsVisited, startLat, startLng, endLat,
                                                            endLng, totalDistanceTravelled, similarityArray, similarity, distanceFromStart, distanceFromEnd,
                                                             timeTaken, resetAttempt, createdStamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $insertUserStmt->bind_param('ssssssssssssssssss', $userName, $passwordStatus, $routeNumber, $passPath, $passPathQuadrant, $pointsVisited, $startLat, $startLng, $endLat, $endLng, $totalDistanceTravelled, $similarityArray, $similarity, $distanceFromStart, $distanceFromEnd, $timeTaken, $resetAttempt, $createdStamp);
            if (!$insertUserStmt->execute()) {
                echo($insertUserStmt->error);
            };
            $insertUserStmt->close();
            $mysqli->close();

            // --- successful attempt calc ---
            if ($distanceFromStart < 50 && $distanceFromEnd < 50 && $similarity >= 95) {
                $successfulAttempt = true;
            }
            echo json_encode(array(
                'attemptLogged' => true,
                'successfulAttempt' => $successfulAttempt
            ));
        } else {
            echo json_encode(array(
                'userDidntExist' => true,
            ));
        }
    } catch (Exception $e) {
        echo json_encode(array(
            'error' => array(
                'msg' => $e->getMessage(),
                'code' => $e->getCode(),
            ),
        ));
    }
}

function userExists($userName, $routeNumber) {
    try {
        $mysqli = mysqliConnect();
        $checkUserStmt = $mysqli->prepare("SELECT * FROM user WHERE username = ? AND routeNumber = ?");
        $checkUserStmt->bind_param('ss', $userName, $routeNumber);
        $checkUserStmt->execute();
        $result = $checkUserStmt->get_result();
        $user = $result->fetch_array(MYSQLI_ASSOC);
        $result->close();
        $checkUserStmt->close();
        $mysqli->close();
        if (empty($user)) {
            return false;
        } else {
            return true;
        }
    } catch (Exception $e) {
        echo json_encode(array(
            'error' => array(
                'msg' => $e->getMessage(),
                'code' => $e->getCode(),
            ),
        ));
    }
}

//Uses the haversine formula , not my formula
function latLngDistance($latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo, $earthRadius = 6371000){
    $latFrom = deg2rad($latitudeFrom);
    $lonFrom = deg2rad($longitudeFrom);
    $latTo = deg2rad($latitudeTo);
    $lonTo = deg2rad($longitudeTo);

    $lonDelta = $lonTo - $lonFrom;
    $a = pow(cos($latTo) * sin($lonDelta), 2) +
        pow(cos($latFrom) * sin($latTo) - sin($latFrom) * cos($latTo) * cos($lonDelta), 2);
    $b = sin($latFrom) * sin($latTo) + cos($latFrom) * cos($latTo) * cos($lonDelta);

    $angle = atan2(sqrt($a), $b);
    return $angle * $earthRadius;
}

//Replace this function with details for your own DB if you are not on my site. Table creation files can be found in the repo.
function mysqliConnect(){
    $mysqli = mysqli_connect("localhost","root","root","passpath");
    if ($mysqli->connect_error) {
        die("Connection failed: " . $mysqli->connect_error);
    }
    return $mysqli;
}
?>
