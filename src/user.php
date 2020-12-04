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
    $passPath = (string) $_POST['passPath'];
    $passPathQuadrant = (string) $_POST['passPathQuadrant'];
    $startLat = (string) $_POST['startLat'];
    $startLng = (String) $_POST['startLng'];
    $endLat = (string) $_POST['endLat'];
    $endLng = (String) $_POST['endLng'];
    $createdStamp = date("Y-m-d H:i:s");
    try {
        if (!userExists($userName)) {
            $mysqli = mysqliConnect();
            $insertUserStmt = $mysqli->prepare("INSERT INTO user (username, passPath, passPathQuadrant, startLat, startLng, endLat, endLng, createdStamp) VALUES (?,?,?,?,?,?,?)");
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
    $passPath = (string) $_POST['passPath'];
    $passPathQuadrant = (string) $_POST['passPathQuadrant'];
    $startLat = (string) $_POST['startLat'];
    $startLng = (String) $_POST['startLng'];
    $endLat = (string) $_POST['endLat'];
    $endLng = (String) $_POST['endLng'];
    $similarity = "0";
    $createdStamp = date("Y-m-d H:i:s");
    $timeTaken = (String) $_POST['timeTaken'];

    try {
        if (userExists($userName)) {
            $mysqli = mysqliConnect();
            $insertUserStmt = $mysqli->prepare("INSERT INTO attempt (username, passPath, passPathQuadrant, startLat, startLng, endLat, endLng, similarity, timeTaken, createdStamp) VALUES (?,?,?,?,?,?,?,?,?)");
            $insertUserStmt->bind_param('ssssssssss', $userName, $passPath, $passPathQuadrant, $startLat, $startLng, $endLat, $endLng, $similarity, $timeTaken, $createdStamp);
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
