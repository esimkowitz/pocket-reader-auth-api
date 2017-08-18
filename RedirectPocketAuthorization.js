process.env['PATH'] = process.env['PATH'] + ': ' + process.env['LAMBDA_TASK_ROOT'];
'use strict';

console.log('Loading function');

let XMLHttpRequest1 = require("xmlhttprequest").XMLHttpRequest;

/**
 * A simple backend that obtains a request token from Pocket and uses
 * it to generate an authorization URL and redirect to it.
 *
 * Author: Evan Simkowitz (esimkowitz@wustl.edu)
 */
exports.handler = (event, context, callback) => {

    function done(err, res) {
        let response = {
            "isBase64Encoded": false,
            "statusCode": err ? 400 : 302,
            "headers": err ? {
                "Content-Type": "text/plain"

            } : {
                    'Location': 'https://getpocket.com/auth/authorize' + "?" + res
                },
            "body": err ? res : null
        };
        callback(null, response);
    }

    switch (event.httpMethod) {
        case 'GET':
            let url = 'https://getpocket.com/v3/oauth/request';
            makeRequest(url, event.queryStringParameters, function (err, res) {
                if (!err) {
                    let resStr = "";
                    for (let name in res) {
                        resStr += name + '=' + res[name] + '&';
                    }
                    resStr = resStr.substr(0, resStr.length - 1);
                    done(err, resStr);
                } else {
                    callback(new Error("Internal server error"));
                }
            });
            break;
        default:
            callback(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

function makeRequest(url, data, callback) {
    let XHR = new XMLHttpRequest1();

    // Format our data into our form data string
    var dataStr = '';
    for (let name in data) {
        dataStr += name + '=' + data[name] + '&';
    }
    dataStr = dataStr.substr(0, dataStr.length - 1);
    console.log("data: " + dataStr);

    // Define what happens on successful data submission
    XHR.addEventListener('load', function (e) {
        console.log('response ' + XHR.responseText);
        let res = {};
        try {
            let response = XHR.responseText;
            res['request_token'] = response.slice("code=".length, response.indexOf("&"));
            res['state'] = response.slice(response.indexOf("state=") + "state=".length, response.length);
            for (let key in data) {
                if (key === 'redirect_uri') {
                    res[key] = encodeURIComponent(data[key] + '?code=' + res['request_token'] + '&state=' + res['state']);
                }
            }
        } catch (SyntaxError) {
            e = true;
        }
        callback(e, res);
    });

    // Define what happens in case of error
    XHR.addEventListener('error', function (e) {
        callback(e, XHR.response);
    });

    // Set up our request
    XHR.open('POST', url);
    XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF8');
    XHR.setRequestHeader('X-Accept', 'application/x-www-form-urlencoded; charset=UTF8');

    XHR.send(dataStr);
}