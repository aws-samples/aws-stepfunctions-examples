

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
    
//    json = {"message": [{"prompt": "Human:You will create a title and description for the provided video transcript. Transcript:\nBeing misinformed or let's just say incompletely informed, you'd better start working on changing your business model. Absolutely. Um, so 70 31 1 thing that I, uh, within the aws we've always seen is that we flipped the 7030.  \n\n Your response should be formatted as a JSONObject as follows. {\"title\":\"title\", \"description\":\"description of the video\"} Do not add \"here is a generated ..\" Assistant:", "Bedrock": {"model": "anthropic.claude-v2", "model_response": " Here is a generated title and description for the video transcript:\n\n{\"title\":\"Changing Business Models in Response to Market Changes\", \"description\":\"A speaker advises that businesses should adapt their models in response to market changes, giving the example of AWS flipping the traditional 70/30 revenue split to 31/70 in some cases.\"}"}}, {"input": {"message": "where is america", "topic": "model-reponse"}, "TranscriptionJob": {"TranscriptionJobName": "ServerlessVideoGenerativeAI_8a8cf7ee-6658-444b-8e39-3b733ede6e27", "Transcript": {"TranscriptFileUri": "https://s3.us-east-1.amazonaws.com/all-misc-bucket/output/bezos_vogels.mp4.json"}, "TranscriptionJobStatus": "COMPLETED"}, "Payload": {"transcript": "Being misinformed or let's just say incompletely informed, you'd better start working on changing your business model. Absolutely. Um, so 70 31 1 thing that I, uh, within the aws we've always seen is that we flipped the 7030."}, "publicmodel": {"model_response": "{\n    \"title\": \"Transforming Your Business Model with AWS\",\n    \"description\": \"Discover how being misinformed or incompletely informed can drive you to change your business model. Explore the concept of flipping the 70-30 ratio within AWS to achieve better outcomes.\"\n}", "model": "gpt-3.5-turbo-0613"}}], "token": "AQCgAAAAKgAAAAMAAAAAAAAAAWUVChTR7Dkj8a4iLPJUQ2K3Id07LJLE0FZO6/MaoKgIvTPB8PbM0PKSj+R6pOjBks3kNaUWqF06mbS6vZdLhjXOgZtaaY7ZmF1Qiyu3OfZwCpiFsNXZEQePNSKdbF/LGFdxJpCNysowr8VpMP8P8H2JFolVKxKTQqqICSkkzzdgbQ03x8sPA4O1tJxuuAkfGu3hyp5mTYlHDp8gXR1w5sBQ7dZhWH8HYFlAum1G0dNhHYVGcnhSZUCBroyFIq8cbCfMfEqdp+SjM5GHpNz1aVw1QqvnPTjG/9k6WAtNu25lCi5ArOjHlv493EepPSXeK8GwlNRWPs4dnPsEZ7jN3AJoQrsOCxew/cgVLzeBhvYzpsVq7MAqKmPt+mKvoDL64nC9MPCG2LrgI2NV1t5xb2QAwIQlNXwbiftt3G8uCBfK7uCvML4fv/13TSqlgOuuFzeM8PLBzl2BGfLodYxeaXeDpWV7cP88pnz9qA9PsFc3sNijTuKDM4r/nv4SwJ5SOm8wah5dnCxZI15oGDUaxxt4Vh2N6T99Se+WADNklT6A4gj77z3UWgUl1z8ybFV/DK+iV22RVbBV0ax7svBfrL0YameEnrch0QYH7de2QN5oj2KZfo3xKlcbvVFhkp1UtBzJ7QXVeLGDTwRrKNGyZoGfPCmV3W0n"}
//    onMessage(TOPIC_DATA, JSON.stringify(json))

    $("#connectButton").click();
}

function connectButtonClicked() {
    console.log('connectButtonClicked');
    // const wssServerUrl = $("#wssServerUrl").val();
    // const wssClientId = $("#wssClientId").val();
    // const wssAuthorizerName = $("#wssAuthorizerName").val();

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


