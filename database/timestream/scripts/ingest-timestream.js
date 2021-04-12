/* eslint-disable no-console */
const path = require("path");
const awsIot = require("aws-iot-device-sdk");

const device = awsIot.device({
  keyPath: path.join(__dirname, "certs/private.pem.key"),
  certPath: path.join(__dirname, "certs/certificate.pem.crt"),
  caPath: path.join(__dirname, "certs/AmazonRootCA1.pem"),
  clientId: "[to-be-replaced]",
  host: "[to-be-replaced]]",
});

const devices = [1234, 5678];

const randomBetween = (min, max) => {
  return Math.random() * (max - min + 1) + min;
};
const buildMessage = (inc) => {
  return {
    speed: parseFloat((1.5 * Math.log10(inc * 1.001)).toFixed(11)),
    temperature: randomBetween(100, 102),
  };
};

const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t));

const produceData = async (dev) => {
  process.stdout.write("Generating data");
  let events = 150;
  let inc = 1;

  do {
    process.stdout.write(".");

    dev.publish(`prefix/${devices[0]}/data`, JSON.stringify(buildMessage(inc)));
    dev.publish(`prefix/${devices[1]}/data`, JSON.stringify(buildMessage(inc)));

    inc += 1;

    // eslint-disable-next-line no-await-in-loop
    await sleep(2000);
    // eslint-disable-next-line no-plusplus
  } while (events--);

  console.log(" done");
};

//
// Device is an instance returned by mqtt.Client(), see mqtt.js for full
// documentation.
//
device.on("connect", async () => {
  console.log("connected");

  await produceData(device);
  device.end();
});
