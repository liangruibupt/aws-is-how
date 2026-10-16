```json
    {
      "Sid": "CDHUser",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws-cn:iam::account1:root",
          "arn:aws-cn:iam::account2:root"
        ]
      },
      "Action": "sts:AssumeRole"
    }
```