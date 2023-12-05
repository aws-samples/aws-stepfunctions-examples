

let wssClient;

//************************UPDATE  ****************************************/
const WSS_SERVER_URL = 'wss://xxxxx-ats.iot.region.amazonaws.com';
const WSS_AUTHORIZER_NAME = 'genai-hitl-workflow-iot';
const REQ_API = "https://xxxxx.execute-api.region.amazonaws.com/prod/"
//************************UPDATE  ****************************************/
const WSS_CLIENT_ID = 'reinvent_client';
const TOPIC_DATA = 'genai-workflow';
const TOPIC_CONTROL = 'prompt';
const VIDEO_FILE_S3KEY = "bezos-vogels.mp4"

$(document).ready(onReady);
PUBMODEL_RESPONSE = {}
BEDROCK_RESPONSE = {}
TOKEN = ""

function onReady() {
    console.log('onReady');

    $("#wssServerUrl").val(WSS_SERVER_URL);
    $("#wssClientId").val(WSS_CLIENT_ID);
    $("#wssAuthorizerName").val(WSS_AUTHORIZER_NAME);
    $("#prompt").val("prompt");

    $("#connectButton").click(connectButtonClicked);
    $("#GenerateButton").click(generateButtonClicked);
    $("#BedrockButton").click(BedrockButtonClicked);
    $("#PublicButton").click(PublicButtonClicked);
    $("#NoButton").click(noButtonClicked);
    
    $("#connectButton").click();
}

function connectButtonClicked() {
    console.log('connectButtonClicked');

    const wssServerUrl = WSS_SERVER_URL;
    const wssClientId = WSS_CLIENT_ID;
    const wssAuthorizerName = WSS_AUTHORIZER_NAME;

    const connectionUrl = `${wssServerUrl}/mqtt?x-amz-customauthorizer-name=${wssAuthorizerName}`;
    console.log(`connectButtonClicked connectionUrl=${connectionUrl}`);
    connect(connectionUrl, wssClientId);
}


function connect(connectionUrl, wssClientId) {
    console.log('connect')
    toggleConfigPane(false, "Connecting...");

    wssClient = mqtt.connect(connectionUrl, {
        clientId: wssClientId,
        reconnectPeriod: 0
    });

    wssClient.on('connect', onConnect);
    wssClient.on('message', onMessage);
    wssClient.on('error', onError);
    wssClient.on('close', onClose);
    wssClient.on('offline', onClose);
}

function onConnect() {
    console.log('onConnect subscribing...')
    toggleConfigPane(false, "Subscribing...");
    wssClient.subscribe(TOPIC_DATA, onSubscribe);
}

function onSubscribe(err, granted) {
    console.log('onSubscribe')
    if (err) {
        console.error('onSubscribe error', err);
        toggleConfigPane(true, "Connect");
    } else {
        console.log(`onSubscribe granted=${JSON.stringify(granted)}`);
        toggleConfigPane(false, "Subscribed");
        toggleControlsMessagePane("true");
    }
}

function toggleConfigPane(enabled, buttonText) {
    console.log(`toggleConfigPane enabled=${enabled}`);
    if (enabled) {
        $("#connectButton").text(buttonText).removeClass("disabled");
        $("#configPane input").prop("readonly", false);
    } else {
        $("#connectButton").text(buttonText).addClass("disabled");;
        $("#configPane input").prop("readonly", true);
    }
}

function toggleControlsMessagePane(status) {
    if (status == "wait") {
        $("#waitPane").fadeIn();
        $("#controlsPane").fadeOut();
    } else if(status == "message") {
        console.log(`toggleControlsMessagePane fadein message=${status}`);

        $("#waitPane").fadeOut();
        $("#controlsPane").fadeOut();
        $("#messagesPane").fadeIn();
    } else {
        console.log(`toggleControlsMessagePane else=${status}`);

        $("#controlsPane").fadeIn();
        $("#messagesPane").fadeOut();
        $("#waitPane").fadeOut();
    }
}

function generateButtonClicked() {

    const prompt = $("#prompt").val();

    console.log(`generateButtonClicked publishing test action with prompt=${prompt} `);
    const request = {
        message : prompt,
        topic: TOPIC_DATA,
        key:VIDEO_FILE_S3KEY

    }
    callAPI("invokeModel",request)
    
    toggleControlsMessagePane("wait");


}
function BedrockButtonClicked() {
    console.log('BedrockButtonClicked');
    const request = {
        output: JSON.stringify({
        message : BEDROCK_RESPONSE,
        topic: TOPIC_DATA,
        approved: "yes",
        }),
        taskToken:TOKEN,

    }
    disableButtons()
    callAPI("feedback",request)

}
function PublicButtonClicked() {
    console.log('PublicButtonClicked');

    const request = {
        output: JSON.stringify({
            message : PUBMODEL_RESPONSE,
            topic: TOPIC_DATA,
            approved: "yes",
            }),
        taskToken:TOKEN,
    
    }
    disableButtons()
    callAPI("feedback",request)
   

}

function noButtonClicked() {
    console.log('noButtonClicked');

    const request = {
        output: JSON.stringify({
            message : "regenerate",
            topic: TOPIC_DATA,
            approved: "no",
            }),
        taskToken:TOKEN

    }
    disableButtons()

    callAPI("feedback",request)

}
function disableButtons() {
    console.log("disable buttons")
    $("#BedrockButton").class = "disabled"
    $("#PublicButton").class = "disabled"
    $("#NoButton").class = "disabled"

}

function callAPI(api, request){
    fetch(REQ_API+api, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',

        },
        body: JSON.stringify(request)
    })
   .then(response => console.log("response,", JSON.stringify(response)))


}

// function download(url) {       
//     fetch(url,
//         { 
//             method: 'GET',
//             headers: {
//                 "x-amz-acl": "bucket-owner-full-control"
//             },
//         }
//     ).then(function(response) {
//         console.log("Response:", response);
//     })
//     .then(function(data) { 
//         console.log("data:", data);
//     })
//     .then(function(result) { console.log("Success:", result); })
//     .catch(function(error) { console.log("Error:", error) });
// };

function onMessage(topic, message) {
    console.log(`onMessage topic=${topic} message=${message}`);
    const messageJson = JSON.parse(message);

    if (messageJson["downloadURL"]) {
        document.getElementById("avatar").src = messageJson["downloadURL"]
    } else {
        TOKEN =  messageJson["token"]
        bedrock = jsonPath(messageJson, "$.message[*].Bedrock")[0]
        pubmodel = jsonPath(messageJson, "$.message[*].publicmodel")[0]
        console.log(bedrock)
        toggleControlsMessagePane("message");
        formatted_bedrock = bedrock["model_response"].substring(bedrock["model_response"].indexOf("{"))
        console.log(formatted_bedrock)
        BEDROCK_RESPONSE = JSON.parse(formatted_bedrock)
        PUBMODEL_RESPONSE = JSON.parse(pubmodel["model_response"])

        document.getElementById("bedrock_title").innerText = BEDROCK_RESPONSE["title"]
        document.getElementById("public_title").innerText = PUBMODEL_RESPONSE["title"]
        document.getElementById("bedrock_desc").innerText = BEDROCK_RESPONSE["description"]
        document.getElementById("public_desc").innerText = PUBMODEL_RESPONSE["description"]

        document.getElementById("bedrock_model").innerText = bedrock["model"]
        document.getElementById("public_model").innerText =  pubmodel["model"]
    }

}
function showHideElement(id, display)
{
    element = document.getElementById(id)
    element.style.display = display

}


function onError(err) {
    console.error('onError', err);
    toggleConfigPane(true, "Connect");
}
function onClose(err) {
    console.error('onClose', err);
    toggleConfigPane(true, "Connect");
}
function onOffline() {
    console.error('onOffline');
    toggleConfigPane(true, "Connect");
}


