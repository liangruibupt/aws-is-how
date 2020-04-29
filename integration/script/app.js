//app.js
var http = require("http");
var url = require("url");
var async = require("async");
var AWS = require("aws-sdk");

const AWS_REGION = "cn-northwest-1";
// Set region
AWS.config.update({ region: AWS_REGION });
var sns = new AWS.SNS({ apiVersion: "2010-03-31" });

var httpServer = http.createServer(handler);

//async process
async.series(
  [
    //Start HTTP Server
    function (callback) {
      httpServer.listen(3000);
      callback(null, 1);
    },
    //initSubscriber
    function (callback) {
      initSubscriber(callback);
      callback(null, 2);
    },
  ],
  function (err, results) {
    if (err) {
      throw err;
    }
  }
);

function handler(req, res) {
  var path = url.parse(req.url).pathname;

  if (path === "/httpsns") {
    var body = "";
    req.on("data", function (data) {
      body += data;
    });
    req.on("end", function () {
      res.writeHead(200, {
        "Content-Type": "text/html",
      });

      var obj = JSON.parse(body);
      if (obj.Type === "SubscriptionConfirmation") {
        sns.confirmSubscription(
          { TopicArn: obj.TopicArn, Token: obj.Token },
          function (err, data) {
            console.log("confirmSubscription");
          }
        );
      } else if (obj.Type === "Notification" && obj.Message !== undefined) {
        console.log(obj.Subject + ":" + obj.Message);
      }
      res.end("OK");
    });
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("server connected");
  }
}

function initSubscriber(callback) {
  var params = {
    Protocol: "http" /* required */,
    TopicArn: "arn:aws-cn:sns:cn-northwest-1:{your-account-id}:sns-http-demo",
    Endpoint:
      "http://{your-ec2-public}.cn-northwest-1.compute.amazonaws.com.cn:3000/httpsns",
  };

  console.log("subscribe start.");

  // Create promise and SNS service object
  var subscribePromise = sns.subscribe(params).promise();

  // Handle promise's fulfilled/rejected states
  subscribePromise
    .then(function (data) {
      console.log("Subscription ARN is " + data.SubscriptionArn);
    })
    .catch(function (err) {
      console.error(err, err.stack);
    });
}
