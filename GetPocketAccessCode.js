process.env['PATH'] = process.env['PATH'] + ': ' + process.env['LAMBDA_TASK_ROOT'];
'use strict';

console.log('Loading function');

let XMLHttpRequest1 = require("xmlhttprequest").XMLHttpRequest;

/**
 * A simple backend that converts a Pocket request token into a
 * Pocket access code for authenticating API calls.
 *
 * Author: Evan Simkowitz (esimkowitz@wustl.edu)
 */
exports.handler = (event, context, callback) => {
    function done(err, res) {
        let response = {
            "isBase64Encoded": false,
            "statusCode": err ? Number(err.message) : 200,
            "headers": err ? {
                "Content-Type": "text/plain"

            } : {
                    'Content-Type': "application/json"
                },
            "body": res
        };
        console.log("function response: " + JSON.stringify(response));
        callback(null, response);
    }

    switch (event.httpMethod) {
        case 'POST':
            let url = 'https://getpocket.com/v3/oauth/authorize';
            console.log("queryString: " + event.queryStringParameters);
            console.log("body: " + event.body);
            makeRequest(url, {
                "queryString": event.queryStringParameters,
                "body": event.body
            }, done);
            break;
        default:
            callback(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

function makeRequest(url, data, callback) {
    let XHR = new XMLHttpRequest1();

    // Format our data into our form data string
    let dataJSON = {};
    for (let name in data["queryString"]) {
        dataJSON[name] = data["queryString"][name];
    }
    const bodyArr = (data["body"].search("&") !== -1) ? data["body"].split("&") : Array(data["body"]);
    bodyArr.forEach(function (element) {
        const key = element.substr(0, element.indexOf("="));
        const value = element.substr(element.indexOf("=") + 1, element.length);
        dataJSON[key] = value;
    }, this);
    const dataStr = JSON.stringify(dataJSON);
    console.log("request body: " + dataStr);

    // Define what happens on successful data submission
    XHR.addEventListener('load', function (e) {
        console.log('response: ' + XHR.responseText);
        const regex = /[1-5][0-9][0-9]\ /g;
        try {
            const statusCode = regex.exec(XHR.responseText);
            console.log("statusCode: " + statusCode);
            if (statusCode !== null) {
                callback(new Error(statusCode), XHR.responseText);
            } else {
                callback(e, JSON.stringify(JSON.parse(XHR.responseText)));
            }
        } catch (Error) {
            callback(new Error("500"), "Internal server error");
        }
    });

    // Define what happens in case of error
    XHR.addEventListener('error', function (e) {
        callback(e, XHR.response);
    });

    // Set up our request
    XHR.open('POST', url);
    XHR.setRequestHeader('Content-Type', 'application/json; charset=UTF8');
    XHR.setRequestHeader('X-Accept', 'application/json');

    XHR.send(dataStr);
}