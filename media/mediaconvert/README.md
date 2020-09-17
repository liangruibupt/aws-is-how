# Video on Demand on AWS

Video on Demand on AWS（视频点播解决方案） automatically provisions the AWS services necessary to build a scalable, distributed video-on-demand workflow. The video-on-demand solution ingests metadata files and source videos, processes the videos for playback on a wide range of devices, stores the transcoded media files, and delivers the videos to end users through Amazon CloudFront.

1. This solution can encode your source videos into H.264 and H.265; SD, HD, and 4K MP4; and SD and HD HTTP Live Streaming (HLS), and Dynamic Adaptive Streaming over HTTP (DASH). The workflow can be configured to encode all videos in the same or to use metadata files to apply encoding settings on a video-by-video basis.
2. This solution also supports AWS Elemental MediaConvert Quality-Defined Variable Bitrate (QVBR) encoding mode which ensures consistent, high-quality video transcoding with the smallest file size for any type of source video content. 
3. This solution outputs 4K, 1080p, and 720p MP4, and any combination of 1080p, 720p, 540p, 360p, and 270p HLS and DASH.

## Architecture Overview

![Architect](media/mediaconvert/media/vod-architect.png)

This solution uses AWS Lambda to trigger AWS Step Functions for ingest, processing, and publishing workflows.

A Step Functions workflow ingests a source video, or a source video and metadata file, validates the source files, and generates metadata on the source video. A second Step Functions workflow generates an encoding profile based on the metadata and submits encoding jobs to AWS Elemental MediaConvert. After the video is encoded, a third Step Functions workflow validates the output.

AWS Elemental MediaConvert uses two-pass encoding to generate multiple high-quality versions of the original file. Source and destination media files are stored in Amazon Simple Storage Service (Amazon S3) and file metadata is stored in Amazon DynamoDB. If enabled, source files are tagged to allow the files to be moved to Amazon Glacier using an Amazon S3 lifecycle policy.

## Deployment guide
[China region](https://github.com/nwcd-samples/video-on-demand-on-aws)

[Global region](https://docs.aws.amazon.com/solutions/latest/video-on-demand/architecture.html)

# Hands on Lab

If you just want to familar with AWS Video On Demand with MediaConvert, you can hands on the [MediaConvert workshop](https://github.com/aws-samples/aws-media-services-simple-vod-workflow)

Each MediaConvert job from this lab produces outputs with the following characteristics:

1. ABR stack
  - 3 outputs: 1280x720, 960x540, 680x360

2. MP4
  - 1 output: 1280x720

3. Thumbnails

 - 1 output: 1280x720

4. All ouputs:

  - MPEG-2 Codec
  - 30 - 60 FPS
  - 1.5 - 2 minutes long depending on which job in the lab you are running.

## Workshop Modules

### Prerequisite

1. Create the IAM Role `vod-MediaConvertRole` for AWS MediaConvert Service with default permissions policies: `AmazonAPIGatewayInvokeFullAccess` and `AmazonS3FullAccess`

2. Create S3 bucket `vod-mediaconvert-workshop` to store and host MediaConvert outputs

- Static website hosting

- Bucket policy 
```json
{
"Version": "2012-10-17",
"Statement": [
    {
        "Sid": "AddPerm",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws-cn:s3:::vod-mediaconvert-workshop/*"
    }
]
}
```

- CORS configuration 
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
    <AllowedHeader>*</AllowedHeader>
</CORSRule>
</CORSConfiguration>

```


### AWS Elemental MediaConvert Jobs

This sample to use MediaConvert converting an HLS input into HLS, MP4 and Thumbnail outputs.

![mediaconvert-job](media/mediaconvert-job.png)

1. Create a MediaConvert job for MP4 File Output
 - Input: s3://vod-mediaconvert-workshop/vod/inputs/VANLIFE/VANLIFE.m2ts
 - MP4 File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/VANLIFE/MP4/
 - Output1 for MP4: 
    - Encoding settings panel and enter 1280 and 720 in the Resolution (w x h) box
    - Change the Rate control mode from CBR to QVBR.
    - Enter 3000000 for the Max birate (bit/s).
 - Setting: Select `vod-MediaConvertRole` as IAM Role and the `Acceleration` as `Preferred`

2. Accept other default setting and Create the Job

3. Monitor the status of the job to COMPLETE

    Access the output from your browser http://YOUR_WebSite_Domain/vod/outputs/VANLIFE/MP4/VANLIFE.mp4

4. Create job for MP4, Apple HLS and Thumbnails Outputs
 - On MP4 job, click Duplicate
 - Input: s3://vod-mediaconvert-workshop/vod/inputs/VANLIFE/VANLIFE.m2ts
 - MP4 File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/VANLIFE/MP4/
    - Output1 for MP4: 
        - Encoding settings panel and enter 1280 and 720 in the Resolution (w x h) box
        - Change the Rate control mode from CBR to QVBR.
        - Enter 3000000 for the Max birate (bit/s).
 - Apple HLS File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/VANLIFE/HLS/
    - Output1 _360 for HLS: 
        - `$dt$` in the Segment modifier box
        - Encoding settings panel and enter 640 and 360 in the Resolution (w x h) box
        - Change the Rate control mode from CBR to QVBR.
        - Enter 1000000 for the Max birate (bit/s).
    - Output2 _540 for HLS: 
        - `$dt$` in the Segment modifier box
        - Encoding settings panel and enter 960 and 540 in the Resolution (w x h) box
        - Change the Rate control mode from CBR to QVBR.
        - Enter 2000000 for the Max birate (bit/s).
    - Output3 _720 for HLS: 
        - `$dt$` in the Segment modifier box
        - Encoding settings panel and enter 1280 and 540 in the Resolution (w x h) box
        - Change the Rate control mode from CBR to QVBR.
        - Enter 3000000 for the Max birate (bit/s).
 - Add a Thumbnail Output Group: s3://vod-mediaconvert-workshop/vod/outputs/VANLIFE/Thumbnails/
    - Output1 for Thumbnail: 
        - Under Output settings, select No container from the Container dropdown.
        - Encoding settings panel, Select `Frame Capture to JPEG` from the Video codec dropdown.
        - Encoding settings panel and enter `1280` and `720` in the Resolution (w x h) box
        - Quality `80`
        - Max captures `500`
        - `Remove audio` from `Audio 1` from the `Encoding settings`
 - Setting: Select `vod-MediaConvertRole` as IAM Role and the `Acceleration` as `Preferred`

5. Accept other default setting and Create the Job

6. Monitor the status of the job to COMPLETE and access the output from your browser

    You can play the HLS using Safari browser http://YOUR_WebSite_Domain//vod/outputs/VANLIFE/HLS/VANLIFE.m3u8

### Modifying AWS Elemental MediaConvert Inputs

This sample is used to show how to clip and stitch inputs to AWS MediaConvert.

![mediaconvert-job-clip-stitch](media/mediaconvert/media/mediaconvert-job-clip-stitch.png)

1. Clip the first 30 seconds of the Input 1 VANLIFE video

 - Input 1: s3://vod-mediaconvert-workshop/vod/inputs/VANLIFE/VANLIFE.m2ts
    - `Video selector` panel -> `Video correction` -> select `Start at 0` from the `Timecode source` dropdown.
    - `Input clips` panel -> select `Add input clip` -> `00:00:00:00` in the `Start timecode` box for Input clipping 1 and `00:00:30:00` in the `End timecode` box for Input clipping 1

2. Stitch the TRAILER video to the end of the VANLIFE video.

- Input 2: s3://vod-mediaconvert-workshop/vod/inputs/TRAILER/TRAILER.mp4

3. Re-use the output configuration of `AWS Elemental MediaConvert Jobs` session Step 4. But here, modify the output folder to 
- MP4: s3://vod-mediaconvert-workshop/vod/outputs/TRAILER/MP4/
- HLS: s3://vod-mediaconvert-workshop/vod/outputs/TRAILER/HLS
- Thumbnails: s3://vod-mediaconvert-workshop/vod/outputs/TRAILER/Thumbnails/

4. Accept other default setting and Create the Job

5. Monitor the status of the job to COMPLETE and access the output from your browser

    You can play the HLS using Safari browser http://YOUR_WebSite_Domain//vod/outputs/TRAILER/HLS/VANLIFE.m3u8

    You can play the MP4 using Chrome browser http://YOUR_WebSite_Domain/vod/outputs/TRAILER/MP4/VANLIFE.mp4


### Modifying AWS Elemental MediaConvert Outputs

This sample is used to show how to "burn-in" different kinds of information into a video ouput.

For example: create a video with timecodes and watermarks burned in to the elemental video stream of one of the outputs of MediaConvert job.

![mediaconvert-job-burnin](media/mediaconvert/media/mediaconvert-job-burnin.png)

1. Modify the HLS output to include a timecode

 - Duplicate the job of `Modifying AWS Elemental MediaConvert Inputs`

- Apple HLS File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/TRAILER-timecode/HLS/
    - Output1 _360 for HLS: 
        - `Encoding settings` panel -> `Preprocessors` -> change the `Timecode burn-in` switch to the `On`.
        - Select `Small (16)` from the `Font size`
        - Enter `640x360_@('_')@_mediaconvert_` in the `Prefix` box
    - Output2 _540 for HLS: 
        - `Encoding settings` panel -> `Preprocessors` -> change the `Timecode burn-in` switch to the `On`.
        - Select `Small (16)` from the `Font size`
        - Enter `960x540_@('_')@_mediaconvert_` in the `Prefix` box
    - Output3 _720 for HLS: 
        - `Encoding settings` panel -> `Preprocessors` -> change the `Timecode burn-in` switch to the `On`.
        - Select `Small (16)` from the `Font size`
        - Enter `1280x720_@('_')@_mediaconvert_` in the `Prefix` box

2. Add a watermark to the MP4 output

- MP4 File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/TRAILER-timecode/MP4/
    - Output1 for MP4: 
        - `Encoding settings` panel -> `Preprocessors` -> change the `Image inserter` switch to the `On`.
        - Add image： `s3://vod-mediaconvert-workshop/vod/inputs/TRAILER-timecode/WATERMARK_wave.png` in the `Image location` box.
        - `0` in the `Layer`; `0` in the `Left`; `518` in the `Top`; `60` in the `Opacity`; `837` in the Width; `164` in the Height.
        - Leave the rest of the settings empty.


3. Modify the Thumbnail Output Group
- Thumbnail Output Group: s3://vod-mediaconvert-workshop/vod/outputs/TRAILER-timecode/Thumbnails/

4. Accept other default setting and Create the Job

5. Monitor the status of the job to COMPLETE and access the output from your browser

    You can play the HLS using Safari browser http://YOUR_WebSite_Domain//vod/outputs/TRAILER-timecode/HLS/VANLIFE.m3u8

    You can play the MP4 using Chrome browser http://YOUR_WebSite_Domain/vod/outputs/TRAILER-timecode/MP4/VANLIFE.mp4

### Working with Captions

This sample is used to show how to create media assets with burned in caption generated from a side-car captions file.

We will modify the MP4 output by adding captions from a side-car SRT file.

![mediaconvert-job-captions](media/mediaconvert/media/mediaconvert-job-captions.png)

1. Burn in captions to the MP4 output

 - Duplicate the job of `Modifying AWS Elemental MediaConvert Outputs`

 - Input 1: s3://vod-mediaconvert-workshop/vod/inputs/VANLIFE/VANLIFE.m2ts
    - `Captions selectors` panel -> `Add caption selector`
    - `Source` select `SRT` and `Source file` enter s3://vod-mediaconvert-workshop/vod/inputs/CAPTIONS/CAPTIONS_en.srt
 - MP4 File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/CAPTIONS/MP4/
    - Select the Output 1 of the `MP4 File Group`
    - `Encoding settings` -> `Add captions`. The `Captions 1` will be created
    - Select `Captions selector 1` as the `Captions source`.
    - Select `Burn In` as the `Destination type`.
    - Leave the rest of the settings as the default.

2. Modify the Output location
- Apple HLS File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/CAPTIONS/HLS/
- Thumbnail Output Group: s3://vod-mediaconvert-workshop/vod/outputs/CAPTIONS/Thumbnails/

4. Accept other default setting and Create the Job

5. Monitor the status of the job to COMPLETE and access the output from your browser

    You can play the HLS using Safari browser http://YOUR_WebSite_Domain//vod/outputs/CAPTIONS/HLS/VANLIFE.m3u8

    You can play the MP4 using Chrome browser http://YOUR_WebSite_Domain/vod/outputs/CAPTIONS/MP4/VANLIFE.mp4

### Working with embedded input metadata

Videos can have embedded metadata that is stored in the video package itself. In this module, we will look at some common examples of embedded metadata including Ad markers, embedded captions, and multi-language audio tracks. 

![mediaconvert-job-admarker](media/mediaconvert/media/mediaconvert-job-admarker.png)

1. Detect SCTE35 markers in the input and blank out embedded Ads

 - Duplicate the job of `Working with Captions`
 - `Settings` from the Job -> Global processors -> turn `Ad avail blanking` switch to the `On`.
 - Enter s3://vod-mediaconvert-workshop/vod/inputs/Metadata/SLATE.png

2. Modify the Output location
- MP4 File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/Metadata/MP4/
- Apple HLS File Output Group: s3://vod-mediaconvert-workshop/vod/outputs/Metadata/HLS/
- Thumbnail Output Group: s3://vod-mediaconvert-workshop/vod/outputs/Metadata/Thumbnails/

3. Accept other default setting and Create the Job

4. Monitor the status of the job to COMPLETE and access the output from your browser

    You can play the HLS using Safari browser http://YOUR_WebSite_Domain//vod/outputs/Metadata/HLS/VANLIFE.m3u8

    You can play the MP4 using Chrome browser http://YOUR_WebSite_Domain/vod/outputs/Metadata/MP4/VANLIFE.mp4

### Automating Jobs with Lambda and S3 Event Triggers

Video files added to an S3 bucket automatically trigger a MediaConvert job by creating an automated "watchfolder" workflow. 

1. Create an IAM Role `VODLambdaRole` for Lambda function
 - AWSLambdaBasicExecutionRole
 - Inline policy
 ```json
 {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*",
            "Effect": "Allow",
            "Sid": "Logging"
        },
        {
            "Action": [
                "iam:PassRole"
            ],
            "Resource": [
                "<ARN for vod-MediaConvertRole>"
            ],
            "Effect": "Allow",
            "Sid": "PassRole"
        },
        {
            "Action": [
                "mediaconvert:*"
            ],
            "Resource": [
                "*"
            ],
            "Effect": "Allow",
            "Sid": "MediaConvertService"
        }
    ]
}
```

2. Create Lambda function `VODLambdaConvert`
    - Runtime Python 3.7
    - Permission: `VODLambdaRole`
    - `aws s3 cp lambda.zip s3://vod-mediaconvert-workshop/vod/scripts/s3-trigger/`
    - Source Code: s3://vod-mediaconvert-workshop/vod/scripts/s3-trigger/lambda.zip
    - Enter convert.handler for the Handler field.
    - Timeout 15s
    - Environment Variables
        - DestinationBucket = vod-mediaconvert-workshop
        - MediaConvertRole = arn:aws-cn:iam::account-id:role/vod-MediaConvertRole
        - Application = VOD
        - MediaConvertRegion = cn-northwest-1

3. Test the function

ConvertTest event:

```json
{
  "Records": [
      {
          "eventVersion": "2.0",
          "eventTime": "2017-08-08T00:19:56.995Z",
          "requestParameters": {
              "sourceIPAddress": "54.240.197.233"
          },
          "s3": {
              "configurationId": "90bf2f16-1bdf-4de8-bc24-b4bb5cffd5b2",
              "object": {
                  "eTag": "2fb17542d1a80a7cf3f7643da90cc6f4-18",
                  "key": "vod/inputs/WatchFolder/SampleVideo_1280x720_5mb.mp4",
                  "sequencer": "005989030743D59111",
                  "size": 143005084
              },
              "bucket": {
                  "ownerIdentity": {
                      "principalId": ""
                  },
                  "name": "vod-mediaconvert-workshop",
                  "arn": "arn:aws-cn:s3:::vod-mediaconvert-workshop"
              },
              "s3SchemaVersion": "1.0"
          },
          "responseElements": {
              "x-amz-id-2": "K5eJLBzGn/9NDdPu6u3c9NcwGKNklZyY5ArO9QmGa/t6VH2HfUHHhPuwz2zH1Lz4",
              "x-amz-request-id": "E68D073BC46031E2"
          },
          "awsRegion": "cn-north-1",
          "eventName": "ObjectCreated:CompleteMultipartUpload",
          "userIdentity": {
              "principalId": ""
          },
          "eventSource": "aws:s3"
      }
  ]
}
```

Output:

```json
Response:
{
  "statusCode": 200,
  "body": "{}",
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  }
}
```

The MediaConvert Job can be created and execution successfully

4. Create a S3 PutItem Event Trigger for the Convert lambda function
    - `Add trigger` for lambda
    - Select `S3` from the Trigger Source and Enter the bucket name as `vod-mediaconvert-workshop`
    - Select `All object create events` for the Event type.
    - Prefix: `vod/inputs/WatchFolder/`