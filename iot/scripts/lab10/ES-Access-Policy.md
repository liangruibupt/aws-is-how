```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::account-id:role/awsiotworkshop-IotWorkshopIoTRole-19GLNWMTYPU69"
      },
      "Action": "es:ESHttpPut",
      "Resource": "arn:aws:es:us-west-2:account-id:domain/iot-lab/*"
    },
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:us-west-2:account-id:domain/iot-lab/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "34.219.221.233/32",
            "207.241.225.139/32",
            "52.39.38.243/32"
          ]
        }
      }
    }
  ]
}
```