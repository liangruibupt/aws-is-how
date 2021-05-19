
# Greengrass Connect to IoT through a network proxy

```json
{
    "coreThing" : {
        "caPath" : "root.ca.pem",
        "certPath" : "12345abcde.cert.pem",
        "keyPath" : "12345abcde.private.key",
        "thingArn" : "arn:aws:iot:us-west-2:123456789012:thing/core-thing-name",
        "iotHost" : "abcd123456wxyz-ats.iot.us-west-2.amazonaws.com",
        "ggHost" : "greengrass-ats.iot.us-west-2.amazonaws.com",
        "keepAlive" : 600,
        "networkProxy": {
            "noProxyAddresses" : "http://128.12.34.56,www.mywebsite.com",
            "proxy" : {
                "url" : "https://my-proxy-server:1100",
                "username" : "Mary_Major",
                "password" : "pass@word1357"
            }
        }
    },
    ...
}
```

# Reference
[greengrass-discovery-behind-a-proxy](https://iot-greengrass-1dotx.workshop.aws/advanced-module/greengrass-discovery-behind-a-proxy.html)

[greengrass using network proxy](https://docs.aws.amazon.com/greengrass/v1/developerguide/gg-core.html#alpn-network-proxy)