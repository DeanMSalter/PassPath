<?php
ini_set('display_errors', 1);
error_reporting(-1);


$aResult = array();
if( !isset($_POST['functionName']) ) { $aResult['error'] = 'No function name!'; }

if( !isset($aResult['error']) ) {
    $userName = (string) $_POST['userName'];

    switch($_POST['functionName']) {
        case 'insertUser':
            insertUser();
            break;
        case 'logAttempt':
            logAttempt();
            break;
        default:
            $aResult['error'] = 'Not found function '.$_POST['functionname'].'!';
            break;
    }

}

function insertUser() {
    $userName = (string) $_POST['userName'];
    $passPath = (string) implode($_POST['passPath'], ",");
    $passPathQuadrant = (string) implode($_POST['passPathQuadrant'], ",");
    $startLat = (string) $_POST['startLat'];
    $startLng = (String) $_POST['startLng'];
    $endLat = (string) $_POST['endLat'];
    $endLng = (String) $_POST['endLng'];
    $createdStamp = date("Y-m-d H:i:s");
    try {
        if (!userExists($userName)) {
            $mysqli = mysqliConnect();
            $insertUserStmt = $mysqli->prepare("INSERT INTO user (username, passPath, passPathQuadrant, startLat, startLng, endLat, endLng, createdStamp) VALUES (?,?,?,?,?,?,?,?)");
            $insertUserStmt->bind_param('ssssssss', $userName, $passPath, $passPathQuadrant, $startLat, $startLng, $endLat, $endLng, $createdStamp);
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

function logAttempt() {
    $userName = (string) $_POST['userName'];
    $passPath = (string) implode($_POST['passPath'], ",");
    $passPathQuadrant = (string) implode($_POST['passPathQuadrant'], ",");
    $startLat = (string) $_POST['startLat'];
    $startLng = (String) $_POST['startLng'];
    $endLat = (string) $_POST['endLat'];
    $endLng = (String) $_POST['endLng'];
    $similarity = 0;
    $createdStamp = date("Y-m-d H:i:s");
    $timeTaken = (String) $_POST['timeTaken'];
    $similarityArray = array();
    try {
        if (userExists($userName)) {
            $mysqli = mysqliConnect();
            $checkUserStmt = $mysqli->prepare("SELECT * FROM user WHERE username = ?");
            $checkUserStmt->bind_param('s', $userName);
            $checkUserStmt->execute();
            $result = $checkUserStmt->get_result();
            $user = $result->fetch_array(MYSQLI_ASSOC);
            $correctQuadrantArray = explode(",", $user["passPathQuadrant"]);
            $submittedQuadrantArray = explode(",", $passPathQuadrant);
            $sizeOfSubmittedQuadrantArray = count($submittedQuadrantArray);
            $sizeOfCorrectQuadrantArray = count($correctQuadrantArray);
            $differenceInArraySizes = abs($sizeOfSubmittedQuadrantArray - $sizeOfCorrectQuadrantArray);

            for ($i = 0; $i < $sizeOfSubmittedQuadrantArray; $i++) {
                if ($submittedQuadrantArray[$i] == $correctQuadrantArray[$i]) {
                    array_push($similarityArray, 0);
                    continue;
                }
                $CWValue = $submittedQuadrantArray[$i];
                $CWCounter = 0;
                $CCWValue= $submittedQuadrantArray[$i];
                $CCWCounter = 0;
                if (!isset($correctQuadrantArray[$i])){
                    continue;
                }
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
            }

            for ($o = 0; $o < $differenceInArraySizes ; $o++) {
                array_push($similarityArray, 4);
            }

            $similarity = 100 - ((((array_sum($similarityArray) / count($similarityArray)) / 4) * 100));
            echo "\n-----------";
            echo json_encode($similarityArray);
            echo "\n-----------";
            echo json_encode($submittedQuadrantArray);
            echo "\n-----------";
            echo json_encode($correctQuadrantArray);
            echo "\n-----------";
            echo json_encode($similarity);
            $similarityArray = implode(",", $similarityArray);
            $insertUserStmt = $mysqli->prepare("INSERT INTO attempt (username, passPath, passPathQuadrant, startLat, startLng, endLat, endLng, similarityArray, similarity, timeTaken, createdStamp) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            $insertUserStmt->bind_param('sssssssssss', $userName, $passPath, $passPathQuadrant, $startLat, $startLng, $endLat, $endLng, $similarityArray, $similarity, $timeTaken, $createdStamp);
            if (!$insertUserStmt->execute()) {
                echo($insertUserStmt->error);
            }
            $insertUserStmt->close();
            $mysqli->close();
            echo json_encode(array(
                'attemptLogged' => true,
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

function userExists($userName) {
    try {
        $mysqli = mysqliConnect();
        $checkUserStmt = $mysqli->prepare("SELECT * FROM user WHERE username = ?");
        $checkUserStmt->bind_param('s', $userName);
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

function mysqliConnect(){
    $mysqli = mysqli_connect("localhost","root","root","passpath");
    if ($mysqli->connect_error) {
        die("Connection failed: " . $mysqli->connect_error);
    }
    return $mysqli;
}
?>
