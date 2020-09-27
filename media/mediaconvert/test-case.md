## MP4 and HLS Input: 

s3://ray-website-cloudfront-20190409/vod/inputs/VANLIFE/VANLIFE.m2ts

http://ruicftest.awesomehao.wang/vod/outputs/VANLIFE/MP4/VANLIFE.mp4

http://ruicftest.awesomehao.wang/vod/outputs/VANLIFE/Thumbnails/VANLIFE.0000000.jpg

http://ruicftest.awesomehao.wang/vod/outputs/VANLIFE/HLS/VANLIFE.m3u8

http://ruicftest.awesomehao.wang/vod/outputs/VANLIFE/HLS/VANLIFE_360.m3u8

## Burnin Input:

s3://ray-website-cloudfront-20190409/vod/inputs/TRAILER/TRAILER.mp4

http://ruicftest.awesomehao.wang/vod/outputs/TRAILER/MP4/VANLIFE.mp4

http://ruicftest.awesomehao.wang/vod/outputs/TRAILER/Thumbnails/VANLIFE.0000000.jpg

http://ruicftest.awesomehao.wang/vod/outputs/TRAILER/HLS/VANLIFE.m3u8


## Clip and Stitch Input:

s3://ray-website-cloudfront-20190409/vod/inputs/TRAILER-timecode/WATERMARK_wave.png

http://ruicftest.awesomehao.wang/vod/outputs/TRAILER-timecode/MP4/VANLIFE.mp4

http://ruicftest.awesomehao.wang/vod/outputs/TRAILER-timecode/Thumbnails/VANLIFE.0000000.jpg

http://ruicftest.awesomehao.wang/vod/outputs/TRAILER-timecode/HLS/VANLIFE.m3u8


## CAPTIONS Inputs:

s3://ray-website-cloudfront-20190409/vod/inputs/CAPTIONS/CAPTIONS_en.srt

http://ruicftest.awesomehao.wang/vod/outputs/CAPTIONS/HLS/VANLIFE.m3u8

http://ruicftest.awesomehao.wang/vod/outputs/CAPTIONS/MP4/VANLIFE.mp4

http://ruicftest.awesomehao.wang/vod/outputs/CAPTIONS/Thumbnails/VANLIFE.0000000.jpg

## Embeded Metadata

s3://ray-website-cloudfront-20190409/vod/inputs/Metadata/SLATE.png

http://ruicftest.awesomehao.wang/vod/outputs/Metadata/HLS/VANLIFE.m3u8

http://ruicftest.awesomehao.wang/vod/outputs/Metadata/MP4/VANLIFE.mp4

http://ruicftest.awesomehao.wang/vod/outputs/Metadata/Thumbnails/VANLIFE.0000000.jpg

## S3 trigger lambda

aws s3 cp SampleVideo_1280x720_5mb.mp4 s3://ray-website-cloudfront-20190409/vod/inputs/WatchFolder/

http://ruicftest.awesomehao.wang/assets/46deafdf-ea21-42f0-9bda-4985ff4cf6fa/MP4/SampleVideo_1280x720_5mb.mp4

http://ruicftest.awesomehao.wang/assets/79af6e43-81c8-4623-88d1-999f744f1bd7/HLS/SampleVideo_1280x720_5mb_540.m3u8