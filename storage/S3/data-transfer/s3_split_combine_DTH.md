# S3 Large Files Split and Combination
- [S3 Large Files Split and Combination](#s3-large-files-split-and-combination)
  - [Prepare environment](#prepare-environment)
  - [Split Files in Source](#split-files-in-source)
    - [Set the basic environment info](#set-the-basic-environment-info)
    - [Get the partition info](#get-the-partition-info)
    - [Set the split file size and run split](#set-the-split-file-size-and-run-split)
  - [Combine the Files in Destination](#combine-the-files-in-destination)
    - [Prepare environment](#prepare-environment-1)
    - [Run combine](#run-combine)
    - [Check the md5sum and eTag](#check-the-md5sum-and-etag)
  - [Work with Data Transfer Hub](#work-with-data-transfer-hub)
    - [PART\_SIZE consideration](#part_size-consideration)
    - [Testing 50GB](#testing-50gb)
    - [Testing 100GB files](#testing-100gb-files)
    - [Testing 40MB files](#testing-40mb-files)
    - [Failed cases:](#failed-cases)

## Prepare environment
1. Copy the s3-largefile-tool to EC2 or Cloud9
The EC2 or Cloud9 should be the same region of your Data Transfer Hub deployed

-	Unzip the tool
```bash
unzip s3-largefile-tool_linux.zip
cd s3-largefile-tool/
ls
bin  kervin-test-combine.sh  kervin-test-split.sh
```

2. Create the dummy 50 GB file
```bash
dd if=/dev/zero of=50G.img bs=1 count=0 seek=50G
dd if=/dev/zero of=100G.img bs=1 count=0 seek=100G

aws configure set default.s3.max_concurrent_requests 100
aws configure set default.s3.max_queue_size 10000
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB

aws s3 cp 50G.img s3://ray-cross-region-sync-eu-west-1/file_split_test/ --region eu-west-1
aws s3 cp 100G.img s3://ray-cross-region-sync-eu-west-1/file_split_test/ --region eu-west-1
```

3. Create the temporary bucket to store splitted temporary files.
- Create the temporary bucket to store splitted temporary files
```bash
aws s3 mb s3://ray-cross-region-sync-eu-west-1-temp --region eu-west-1
make_bucket: ray-cross-region-sync-eu-west-1-temp

aws s3 mb s3://ray-cross-region-sync-bjs-temp --region cn-north-1 --profile china_ruiliang
make_bucket: ray-cross-region-sync-bjs-temp
```

## Split Files in Source
### Set the basic environment info
```bash
# Source File
export FILE_NAME=file_split_test_50/50G.img
# Source Region
export REGION=eu-west-1
# Source Bucket and Temp bucket
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp
# Set the currency
export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
```

### Get the partition info
```bash
./s3_amd64 partinfo -region ${REGION} -bucketName ${SOURCE_BUCKET} -fileName ${FILE_NAME}

I0703 08:05:10.164152   18805 main.go:48] "starting..."
I0703 08:05:10.303539   18805 partInfoOperator.go:77] "partInfo" fileSizeInByte=53687091200 fileSizeInGB=50 ETag="18b01a16ff1490d41ac9cac4a23c3126-3200" TotalPartsCount=3200
I0703 08:05:10.303569   18805 partInfoOperator.go:99] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
I0703 08:05:10.399187   18805 partInfoOperator.go:115] "partInfo" partNumber=1 partSize=16777216 ChangedOrNot="NotChanged"
I0703 08:05:10.428551   18805 partInfoOperator.go:115] "partInfo" partNumber=2 partSize=16777216 ChangedOrNot="NotChanged"
I0703 08:05:10.428572   18805 partInfoOperator.go:121] "partInfo partSize not changed"
I0703 08:05:10.428581   18805 main.go:54] "result: succeeded"
```

### Set the split file size and run split
1. Option 1: Only specify the BucketName and FileName

    This will use the original part size, by default keepOriginalPartSize = true
    ```bash
    # Run Split
    ./s3_amd64 split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} > split.log 2>&1 &

    # Query Split logs
    tail -f split.log
    ```

2. Option2: Set the PART_COUNT_IN_ONE_SPLITTED_FILE and use default keepOriginalPartSize = true. 

    This can keep the partition size as original files and keep etag of files no change. 
    Due to File is multiple part upload, one part size is 16MB for test file, we set 4 part for one split file as 64MB

    ```bash
    export PART_COUNT_IN_ONE_SPLITTED_FILE=4

    # Run Split
    ./s3_amd64 split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} -partCountInOneSplittedFile ${PART_COUNT_IN_ONE_SPLITTED_FILE} -threadCount ${THREAD_COUNT} -concurrentBufferSize ${CONCURRENT_BUFFER_SIZE} > split.log 2>&1 &

    # Query Split logs
    tail -f split.log
    ```

3. Option 3: Set the PART_SIZE_IN_MB and SPLITTED_FILE_SIZE_IN_MB. And set keepOriginalPartSize = false. 

    This allows you change the partition size different from original files. But the etag of files will be changed. This will cause using other methods to check the files consistence.

    ```bash
    export PART_SIZE_IN_Bytes=16MB
    export SPLITTED_FILE_SIZE_IN_Bytes=80MB

    # Run Split
    ./s3_amd64 split --region ${REGION} --sourceBucketName ${SOURCE_BUCKET} --sourceFileName ${FILE_NAME} --targetBucketName ${SPLIT_TARGET_BUCKET} --targetFileName ${FILE_NAME} --threadCount ${THREAD_COUNT} --concurrentBufferSize ${CONCURRENT_BUFFER_SIZE} --partSizeInMB ${PART_SIZE_IN_MB} --splittedFileSizeInMB ${SPLITTED_FILE_SIZE_IN_MB} --keepOriginalPartSize=false > split.log 2>&1 &

    # Query Split logs
    tail -f split.log

    ```

## Combine the Files in Destination
### Prepare environment
1. In the desitnation region create the EC2 or Cloud9
- Unzip the tool
    ```bash
    unzip s3-largefile-tool_linux.zip
    cd s3-largefile-tool/
    ls
    bin  kervin-test-combine.sh  kervin-test-split.sh
    ```

2. Check partition information
    - Split file command (I use the option1 to split files, will not change the part_size of files)
        ```bash
        ./s3_amd64 split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} > split.log 2>&1 &
       
        tail -f split.log
        #I0703 08:11:25.221285   18858 main.go:48] "starting..."
        #I0703 08:11:25.301165   18858 splitOperator.go:95] "Run" fileSize=53687091200 fileSizeInGB=50
        #I0703 08:11:25.323479   18858 splitOperator.go:103] "Run" original partSizeInByte=16777216
        #I0703 08:11:25.323503   18858 splitOperator.go:107] "Run" splittedFileSizeInByte=16777216
        #I0703 08:12:28.299017   18858 main.go:54] "result: succeeded"
        ```
    - Check the partition
    ```bash
    export FILE_NAME=file_split_test_50/50G.img-00001
    export REGION=eu-west-1
    export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
    export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp

    ./s3_amd64 partinfo -region ${REGION} -bucketName ${SPLIT_TARGET_BUCKET} -fileName ${FILE_NAME}
    ```

### Run combine
    ```bash
    export COMBINE_FILE_NAME=test_combine/50G.img
    export SPLIT_FILE_NAME=file_split_test_50/50G.img
    export REGION=eu-west-1
    export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp
    export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-eu-west-1
    export THREAD_COUNT=200
    export CONCURRENT_BUFFER_SIZE=400

    ./s3_amd64 combine --region=${REGION} --sourceBucketName=${SPLIT_TARGET_BUCKET} --sourceFileName=${SPLIT_FILE_NAME} --targetBucketName=${COMBINE_TARGET_BUCKET_NAME} --targetFileName=${COMBINE_FILE_NAME} --threadCount=${THREAD_COUNT} > combine.log 2>&1 &

    tail -f combine.log

    # I0703 08:20:57.359702   18953 main.go:48] "starting..."
    # I0703 08:20:57.401911   18953 combineOperator.go:80] "Run" original partSizeInByte=16777216
    # E0703 08:21:39.553979   18953 multipart.go:30] "HeadObject" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: 4A14FKH72F6VM65S, HostID: XEcxZDim6pXGqylIdJfr/T4hXsu+7FmzMw62sc4Fu+1UNS+wZF/2YnKAH2b0j1hlw0DvMmrTMFk=, api error NotFound: Not Found" sourceBucket="ray-cross-region-sync-eu-west-1-temp" sourceKey="file_split_test_50/50G.img-03201"
    # E0703 08:21:39.554022   18953 combineOperator.go:160] "GetSizeOfOneFileInBucket" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: 4A14FKH72F6VM65S, HostID: XEcxZDim6pXGqylIdJfr/T4hXsu+7FmzMw62sc4Fu+1UNS+wZF/2YnKAH2b0j1hlw0DvMmrTMFk=, api error NotFound: Not Found"
    # I0703 08:21:39.554036   18953 combineOperator.go:162] "Assuming no more splitted files"
    # I0703 08:21:40.621585   18953 main.go:54] "result: succeeded"
    ```

### Check the md5sum and eTag
Keep the md5 (eTag) of combined object and original object as same

    - Check the eTag of combined object and original object
  
    ```bash
    export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
    export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-eu-west-1
    export COMBINE_FILE_NAME=test_combine/50G.img
    export SPLIT_FILE_NAME=file_split_test_50/50G.img
    export REGION=eu-west-1
    aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${COMBINE_FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
    "\"044303f55fdd0be9978de8342da8769c-3200\""

    aws s3api head-object --bucket ${COMBINE_TARGET_BUCKET_NAME} --key ${COMBINE_FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
    "\"044303f55fdd0be9978de8342da8769c-3200\""
    ```

## Work with Data Transfer Hub

You can transfer files by using Data Transfer Hub
https://www.amazonaws.cn/en/solutions/data-transfer-hub/?nc2=h_ql_sol_drh

Using the tools above to split the single large files like 50GB or 100GB to couple of small files to improve the transfer efficiency.

### PART_SIZE consideration

*** NOTE: You should keep the eTag of combined object and original object as same. ***

The Data Transfer Hub will use S3 multiple part to transfer files as below logic
- Single file size < 10MB, no partition
- Single file size > 10MB but < 50000MB, the part size as 5MB
- Single file size > 50000MB, the part size as file_size / 10000 (The S3 part number must be an integer between 1 and 10000)

So you must keep PART_SIZE the same or integer multiple cross below files
- Original file, if you use the multiple part to upload the big file to S3 bucket
- Splitted files
- Data Transfer Hub transfer files
- Combined file

You need also consider max S3 part number of single file is 100000

If your splitted file size > 10MB but < 50000MB,  Data Transfer Hub will use the 5MB as PART_SIZE of transfer files, in this case, you should make sure the PART_SIZE of Original file and Splitted files as 5MB or integer multiple of 5MB.
For example: 100GB original file you can use the 20MB as PART_SIZE (5120 parts)

If your splitted file size < 10MB.  Data Transfer Hub will not partition. The PART_SIZE of Original file and Splitted files will be used.
For example: 50GB original file you can use the 8MB as PART_SIZE (6400 parts)

### Testing 50GB
1. Creat Original Files: 50GB (8MB part_size)
```bash
dd if=/dev/zero of=50G.img bs=1 count=0 seek=50G
aws configure set default.s3.max_concurrent_requests 100
aws configure set default.s3.max_queue_size 10000
aws configure set default.s3.multipart_threshold 8MB
aws configure set default.s3.multipart_chunksize 8MB
aws s3 cp 50G.img s3://ray-cross-region-sync-eu-west-1/file_split_test_50/ --region eu-west-1
```

1. Split file
```bash
# Check the partition info
export FILE_NAME=file_split_test_50/50G.img
export REGION=eu-west-1
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp

./s3_linux partinfo -region ${REGION} -bucketName ${SOURCE_BUCKET} -fileName ${FILE_NAME}

# 0703 14:28:58.620071   20998 partInfoOperator.go:77] "partInfo" fileSizeInByte=53687091200 fileSizeInGB=50 ETag="633ca2fb71ff0e0942ca84cdd37be5a4-6400" TotalPartsCount=6400
# I0703 14:28:58.620095   20998 partInfoOperator.go:99] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0703 14:28:58.701343   20998 partInfoOperator.go:115] "partInfo" partNumber=1 partSize=8388608 ChangedOrNot="NotChanged"
# I0703 14:28:58.711378   20998 partInfoOperator.go:115] "partInfo" partNumber=2 partSize=8388608 ChangedOrNot="NotChanged"
# I0703 14:28:58.711399   20998 partInfoOperator.go:121] "partInfo partSize not changed"

# Split
export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=8
./s3_linux split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} --threadCount ${THREAD_COUNT} > split.log 2>&1 &

tail -f split.log
# I0703 14:30:38.009330   21013 splitOperator.go:95] "Run" fileSize=53687091200 fileSizeInGB=50
# I0703 14:30:38.055153   21013 splitOperator.go:103] "Run" original partSizeInByte=8388608
# I0703 14:30:38.055175   21013 splitOperator.go:107] "Run" splittedFileSizeInByte=8388608
# I0703 14:32:33.748714   21013 main.go:54] "result: succeeded"

# Check the partition info
./s3_linux partinfo --region ${REGION} --bucketName ${SPLIT_TARGET_BUCKET} --fileName file_split_test_50/50G.img-00001
# I0704 03:14:40.174324   24572 partInfoOperator.go:77] "partInfo" fileSizeInByte=8388608 fileSizeInGB=0.0078125 ETag="9ed977000dc166f25a9b9ef26fb3c3fc-1" TotalPartsCount=1
# I0704 03:14:40.174354   24572 partInfoOperator.go:99] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 03:14:40.190385   24572 partInfoOperator.go:115] "partInfo" partNumber=1 partSize=8388608 ChangedOrNot="NotChanged"
# E0704 03:14:40.198210   24572 multipart.go:50] "HeadObject" err="operation error S3: HeadObject, https response error StatusCode: 416, RequestID: EMYV8BRX7N5V247J, HostID: UxJ7WvH5weh2FABMNrkcuPmdwdOpA69RhHsOCArP7Kzag9gDtlPwHcywArKoM9SN90hw+uH88ZM=, api error RequestedRangeNotSatisfiable: Requested Range Not Satisfiable" sourceBucket="ray-cross-region-sync-eu-west-1-temp" sourceKey="file_split_test_50/50G.img-00001" partNumber=2
```

3. Transfer file by DTH
Source: SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp
Source region: eu-west-1
Destination: COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
Destination region: cn-north-1

4. Combine
```bash
# Check the partition info
export FILE_NAME=from-irland/file_split_test_50/50G.img
export REGION=cn-north-1
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
export DESTINATION_BUCKET=ray-cross-region-sync-bjs

./s3_linux partinfo --region ${REGION} --bucketName ${COMBINE_TARGET_BUCKET_NAME} --fileName from-irland/file_split_test_50/50G.img-00001
# panic: runtime error: invalid memory address or nil pointer dereference
# [signal SIGSEGV: segmentation violation code=0x1 addr=0x30 pc=0x82bbe7]

# goroutine 1 [running]:
# gitlab.aws.dev/gcr-prototyping/s3-big-file-transfer/pkg/partinfo.(*partInfoOperator).partInfo(0xc000345d40)
#   /Users/maopei/workspace/src/gitlab.aws.dev/gcr-prototyping/s3-big-file-transfer/pkg/partinfo/partInfoOperator.go:77 +0x3a7

export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=8
./s3_linux combine --region=${REGION} --sourceBucketName=${COMBINE_TARGET_BUCKET_NAME} --sourceFileName=${FILE_NAME} --targetBucketName=${DESTINATION_BUCKET} --targetFileName=${FILE_NAME} --threadCount=${THREAD_COUNT} > combine.log 2>&1 &

tail -f combine.log
# I0704 07:59:17.787258    3599 main.go:48] "starting..."
# I0704 07:59:17.846900    3599 combineOperator.go:80] "Run" original partSizeInByte=8388608
# E0704 08:00:51.656499    3599 multipart.go:30] "HeadObject" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: 7YYQ1MP97EC7R3H7, HostID: zrrC6rfOtklOKinZwTB8/RWxqyZ8x28HOvMS+IjdJ7sIAjru8hFwFJDXYUfmr6uWuBfoGK0dpnM=, api error NotFound: Not Found" sourceBucket="ray-cross-region-sync-bjs-temp" sourceKey="from-irland/file_split_test_50/50G.img-06401"
# E0704 08:00:51.656545    3599 combineOperator.go:160] "GetSizeOfOneFileInBucket" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: 7YYQ1MP97EC7R3H7, HostID: zrrC6rfOtklOKinZwTB8/RWxqyZ8x28HOvMS+IjdJ7sIAjru8hFwFJDXYUfmr6uWuBfoGK0dpnM=, api error NotFound: Not Found"
# I0704 08:00:51.656556    3599 combineOperator.go:162] "Assuming no more splitted files"
# I0704 08:00:53.374681    3599 main.go:54] "result: succeeded"
```

5. Check the md5sum and eTag 50GB (8MB part_size)
Keep the md5 (eTag) of combined object and original object as same
- Final combine object
```bash
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SOURCE_FILE_NAME=file_split_test_50/50G.img
export REGION=eu-west-1
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${SOURCE_FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"633ca2fb71ff0e0942ca84cdd37be5a4-6400\""

export FILE_NAME=from-irland/file_split_test_50/50G.img
export REGION=cn-north-1
export DESTINATION_BUCKET=ray-cross-region-sync-bjs

aws s3api head-object --bucket ${DESTINATION_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"d02a2f5852d5e8b041b682d89edeb480-6400\""

# Due to S3 bucket enabled SSE-KMS, so the ETag will be different, we should download the file and compare the md5 value
md5sum beijing/50G.img
e7f4706922e1edfdb43cd89eb1af606d  50G.img
md5sum irland/50G.img
e7f4706922e1edfdb43cd89eb1af606d  50G.img
```

- Split object
```bash
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1-temp
export SOURCE_FILE_NAME=file_split_test_50/50G.img-00100
export REGION=eu-west-1
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${SOURCE_FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"9ed977000dc166f25a9b9ef26fb3c3fc-1\""

export FILE_NAME=from-irland/file_split_test_50/50G.img-00100
export REGION=cn-north-1
export DESTINATION_BUCKET=ray-cross-region-sync-bjs-temp

aws s3api head-object --bucket ${DESTINATION_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"96995b58d4cbf6aaa9041b4f00c7f6ae\""

```

### Testing 100GB files

1. Creat Original Files: 100GB (20MB part_size)
```bash
dd if=/dev/zero of=100G.img bs=1 count=0 seek=100G
aws configure set default.s3.multipart_threshold 20MB
aws configure set default.s3.multipart_chunksize 20MB
aws s3 cp 100G.img s3://ray-cross-region-sync-eu-west-1/file_split_test/ --region eu-west-1
```

2. Split file 100GB (20MB part_size)
```bash
# Check the partition info
export FILE_NAME=file_split_test/100G.img
export REGION=eu-west-1
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp

./s3_linux partinfo -region ${REGION} -bucketName ${SOURCE_BUCKET} -fileName ${FILE_NAME}

# I0704 08:38:18.464871   26341 partInfoOperator.go:77] "partInfo" fileSizeInByte=107374182400 fileSizeInGB=100
# I0704 08:38:18.464894   26341 partInfoOperator.go:79] "partInfo" ETag="9e421a93d2c373f8b457389728917721-5120"
# I0704 08:38:18.464905   26341 partInfoOperator.go:83] "partInfo" TotalPartsCount=5120
# I0704 08:38:18.464917   26341 partInfoOperator.go:108] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 08:38:18.547512   26341 partInfoOperator.go:124] "partInfo" partNumber=1 partSize=20971520 ChangedOrNot="NotChanged"
# I0704 08:38:18.558787   26341 partInfoOperator.go:124] "partInfo" partNumber=2 partSize=20971520 ChangedOrNot="NotChanged"
# I0704 08:38:18.558808   26341 partInfoOperator.go:130] "partInfo partSize not changed"
# I0704 08:38:18.558818   26341 main.go:54] "result: succeeded"

# Split
export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=5
export PART_COUNT_IN_ONE_SPLITTED_FILE=4
./s3_linux split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} --threadCount ${THREAD_COUNT} --partSizeInMB ${PART_SIZE_IN_MB} --partCountInOneSplittedFile ${PART_COUNT_IN_ONE_SPLITTED_FILE} --keepOriginalPartSize=false > split.log 2>&1 &

tail -f split.log
# I0704 08:42:28.375066   26359 main.go:48] "starting..."
# I0704 08:42:28.443742   26359 splitOperator.go:95] "Run" fileSize=107374182400 fileSizeInGB=100
# I0704 08:44:04.587337   26359 main.go:54] "result: succeeded"

# Check the partition info
./s3_linux partinfo --region ${REGION} --bucketName ${SPLIT_TARGET_BUCKET} --fileName file_split_test/100G.img-00001
# I0704 08:44:45.993161   26372 partInfoOperator.go:77] "partInfo" fileSizeInByte=20971520 fileSizeInGB=0.01953125
# I0704 08:44:45.993186   26372 partInfoOperator.go:79] "partInfo" ETag="0cdaffc8e69cab00470bf84bc31f305b-4"
# I0704 08:44:45.993195   26372 partInfoOperator.go:83] "partInfo" TotalPartsCount=4
# I0704 08:44:45.993211   26372 partInfoOperator.go:108] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 08:44:46.012954   26372 partInfoOperator.go:124] "partInfo" partNumber=1 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 08:44:46.023914   26372 partInfoOperator.go:124] "partInfo" partNumber=2 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 08:44:46.023943   26372 partInfoOperator.go:130] "partInfo partSize not changed"

aws s3 ls --region ${REGION} s3://${SPLIT_TARGET_BUCKET}/file_split_test/
# ...
# 2022-07-04 08:44:02   20971520 100G.img-05120
```

3. Transfer file by DTH
Source: SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp
Source region: eu-west-1
Destination: COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
Destination region: cn-north-1
```bash
export REGION=cn-north-1
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
aws s3 ls --region ${REGION} s3://${COMBINE_TARGET_BUCKET_NAME}/from-irland/file_split_test/
2022-07-04 09:04:47   20971520 100G.img-05120
```

4. Combine
```bash
# Check the partition info
export FILE_NAME=from-irland/file_split_test/100G.img
export REGION=cn-north-1
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
export DESTINATION_BUCKET=ray-cross-region-sync-bjs

./s3_linux partinfo --region ${REGION} --bucketName ${COMBINE_TARGET_BUCKET_NAME} --fileName from-irland/file_split_test/100G.img-00001
# I0704 09:13:22.995475    3993 partInfoOperator.go:77] "partInfo" fileSizeInByte=20971520 fileSizeInGB=0.01953125
# I0704 09:13:22.995544    3993 partInfoOperator.go:79] "partInfo" ETag="0cdaffc8e69cab00470bf84bc31f305b-4"
# I0704 09:13:22.995583    3993 partInfoOperator.go:84] "partInfo" TotalPartsCount=4
# I0704 09:13:22.995619    3993 partInfoOperator.go:112] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 09:13:23.013561    3993 partInfoOperator.go:128] "partInfo" partNumber=1 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 09:13:23.231712    3993 partInfoOperator.go:128] "partInfo" partNumber=2 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 09:13:23.231735    3993 partInfoOperator.go:134] "partInfo partSize not changed"

export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=20
./s3_linux combine --region=${REGION} --sourceBucketName=${COMBINE_TARGET_BUCKET_NAME} --sourceFileName=${FILE_NAME} --targetBucketName=${DESTINATION_BUCKET} --targetFileName=${FILE_NAME} --threadCount=${THREAD_COUNT} --partSizeInMB ${PART_SIZE_IN_MB} --keepOriginalPartSize=false > combine.log 2>&1 &

tail -f combine.log
# I0704 09:16:15.719999    4003 main.go:48] "starting..."
# E0704 09:17:50.611463    4003 multipart.go:30] "HeadObject" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: J0QYDB1W0TE2QAR3, HostID: Kwh8fEhxOh1WyqGt/fJ3VnHK7nB1oOwCKEUp14zNrOw7IF5xW4V12F2x7WbkumTsvUXXe7zZUzA=, api error NotFound: Not Found" sourceBucket="ray-cross-region-sync-bjs-temp" sourceKey="from-irland/file_split_test/100G.img-05121"
# E0704 09:17:50.611507    4003 combineOperator.go:160] "GetSizeOfOneFileInBucket" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: J0QYDB1W0TE2QAR3, HostID: Kwh8fEhxOh1WyqGt/fJ3VnHK7nB1oOwCKEUp14zNrOw7IF5xW4V12F2x7WbkumTsvUXXe7zZUzA=, api error NotFound: Not Found"
# I0704 09:17:50.611525    4003 combineOperator.go:162] "Assuming no more splitted files"
# I0704 09:17:52.295308    4003 main.go:54] "result: succeeded"
```

5. Check the md5sum and eTag
Keep the md5 (eTag) of combined object and original object as same
- Final combine object
```bash
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SOURCE_FILE_NAME=file_split_test/100G.img
export REGION=eu-west-1
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${SOURCE_FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"9e421a93d2c373f8b457389728917721-5120\""

export FILE_NAME=from-irland/file_split_test/100G.img
export REGION=cn-north-1
export DESTINATION_BUCKET=ray-cross-region-sync-bjs

aws s3api head-object --bucket ${DESTINATION_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"e878a73874d3eaf4a5b58e545703cf27-5120\""

# Due to S3 bucket enabled SSE-KMS, so the ETag will be different, we should download the file and compare the md5 value
```


- Split object
```bash
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1-temp
export SOURCE_FILE_NAME=file_split_test/100G.img-00100
export REGION=eu-west-1
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${SOURCE_FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"0cdaffc8e69cab00470bf84bc31f305b-4\""

export FILE_NAME=from-irland/file_split_test/100G.img-00100
export REGION=cn-north-1
export DESTINATION_BUCKET=ray-cross-region-sync-bjs-temp

aws s3api head-object --bucket ${DESTINATION_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"0cdaffc8e69cab00470bf84bc31f305b-4\""
```


### Testing 40MB files

1. Creat Original Files: 40MB (20MB part_size)
```bash
dd if=/dev/zero of=40M.img bs=1 count=0 seek=40M
aws configure set default.s3.multipart_threshold 20MB
aws configure set default.s3.multipart_chunksize 20MB
aws s3 cp 40M.img s3://ray-cross-region-sync-eu-west-1/file_split_test_40M/ --region eu-west-1
```

2. Split file 40MB (20MB part_size)
```bash
# Check the partition info
export FILE_NAME=file_split_test_40M/40M.img
export REGION=eu-west-1
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp

./s3_linux partinfo -region ${REGION} -bucketName ${SOURCE_BUCKET} -fileName ${FILE_NAME}

# I0704 09:43:05.215514   26708 partInfoOperator.go:77] "partInfo" fileSizeInByte=41943040 fileSizeInGB=0.0390625
# I0704 09:43:05.215540   26708 partInfoOperator.go:79] "partInfo" ETag="f8d058e2f72b1466e4d41fb9497468f6-2"
# I0704 09:43:05.215551   26708 partInfoOperator.go:83] "partInfo" TotalPartsCount=2
# I0704 09:43:05.215566   26708 partInfoOperator.go:108] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 09:43:05.254091   26708 partInfoOperator.go:124] "partInfo" partNumber=1 partSize=20971520 ChangedOrNot="NotChanged"
# I0704 09:43:05.265381   26708 partInfoOperator.go:124] "partInfo" partNumber=2 partSize=20971520 ChangedOrNot="NotChanged"
# I0704 09:43:05.265418   26708 partInfoOperator.go:130] "partInfo partSize not changed"

# Split
export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=5
export PART_COUNT_IN_ONE_SPLITTED_FILE=4
./s3_linux split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} --threadCount ${THREAD_COUNT} --partSizeInMB ${PART_SIZE_IN_MB} --partCountInOneSplittedFile ${PART_COUNT_IN_ONE_SPLITTED_FILE} --keepOriginalPartSize=false > split.log 2>&1 &

tail -f split.log
# I0704 09:43:53.655238   26713 main.go:48] "starting..."
# I0704 09:43:53.727084   26713 splitOperator.go:95] "Run" fileSize=41943040 fileSizeInGB=0.0390625
# I0704 09:43:54.114434   26713 main.go:54] "result: succeeded"

# Check the partition info
./s3_linux partinfo --region ${REGION} --bucketName ${SPLIT_TARGET_BUCKET} --fileName file_split_test_40M/40M.img-00001
# I0704 09:44:24.547163   26727 partInfoOperator.go:77] "partInfo" fileSizeInByte=20971520 fileSizeInGB=0.01953125
# I0704 09:44:24.547187   26727 partInfoOperator.go:79] "partInfo" ETag="0cdaffc8e69cab00470bf84bc31f305b-4"
# I0704 09:44:24.547214   26727 partInfoOperator.go:83] "partInfo" TotalPartsCount=4
# I0704 09:44:24.547227   26727 partInfoOperator.go:108] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 09:44:24.560879   26727 partInfoOperator.go:124] "partInfo" partNumber=1 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 09:44:24.571198   26727 partInfoOperator.go:124] "partInfo" partNumber=2 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 09:44:24.571227   26727 partInfoOperator.go:130] "partInfo partSize not changed"

./s3_linux partinfo --region ${REGION} --bucketName ${SPLIT_TARGET_BUCKET} --fileName file_split_test_40M/40M.img-00002
# I0704 09:45:06.358227   26738 partInfoOperator.go:77] "partInfo" fileSizeInByte=20971520 fileSizeInGB=0.01953125
# I0704 09:45:06.358252   26738 partInfoOperator.go:79] "partInfo" ETag="0cdaffc8e69cab00470bf84bc31f305b-4"
# I0704 09:45:06.358262   26738 partInfoOperator.go:83] "partInfo" TotalPartsCount=4
# I0704 09:45:06.358272   26738 partInfoOperator.go:108] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 09:45:06.374731   26738 partInfoOperator.go:124] "partInfo" partNumber=1 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 09:45:06.418078   26738 partInfoOperator.go:124] "partInfo" partNumber=2 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 09:45:06.418111   26738 partInfoOperator.go:130] "partInfo partSize not changed"

aws s3 ls --region ${REGION} s3://${SPLIT_TARGET_BUCKET}/file_split_test_40M/
# 2022-07-04 09:43:54   20971520 40M.img-00001
# 2022-07-04 09:43:54   20971520 40M.img-00002
```

3. Transfer file by DTH
Source: SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp
Source region: eu-west-1
Destination: COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
Destination region: cn-north-1
```bash
export REGION=cn-north-1
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
aws s3 ls --region ${REGION} s3://${COMBINE_TARGET_BUCKET_NAME}/from-irland/file_split_test_40M/
2022-07-04 09:43:58   20971520 40M.img-00001
2022-07-04 09:43:58   20971520 40M.img-00002
```

4. Combine
```bash
# Check the partition info
export FILE_NAME=from-irland/file_split_test_40M/40M.img
export REGION=cn-north-1
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
export DESTINATION_BUCKET=ray-cross-region-sync-bjs

./s3_linux partinfo --region ${REGION} --bucketName ${COMBINE_TARGET_BUCKET_NAME} --fileName from-irland/file_split_test_40M/40M.img-00001
# I0704 10:00:08.422954    4211 partInfoOperator.go:77] "partInfo" fileSizeInByte=20971520 fileSizeInGB=0.01953125
# I0704 10:00:08.422977    4211 partInfoOperator.go:79] "partInfo" ETag="0cdaffc8e69cab00470bf84bc31f305b-4"
# I0704 10:00:08.422986    4211 partInfoOperator.go:84] "partInfo" TotalPartsCount=4
# I0704 10:00:08.422996    4211 partInfoOperator.go:112] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 10:00:08.440417    4211 partInfoOperator.go:128] "partInfo" partNumber=1 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 10:00:08.452353    4211 partInfoOperator.go:128] "partInfo" partNumber=2 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 10:00:08.452385    4211 partInfoOperator.go:134] "partInfo partSize not changed"

./s3_linux partinfo --region ${REGION} --bucketName ${COMBINE_TARGET_BUCKET_NAME} --fileName from-irland/file_split_test_40M/40M.img-00002
# I0704 10:00:33.205295    4217 partInfoOperator.go:77] "partInfo" fileSizeInByte=20971520 fileSizeInGB=0.01953125
# I0704 10:00:33.205326    4217 partInfoOperator.go:79] "partInfo" ETag="0cdaffc8e69cab00470bf84bc31f305b-4"
# I0704 10:00:33.205336    4217 partInfoOperator.go:84] "partInfo" TotalPartsCount=4
# I0704 10:00:33.205345    4217 partInfoOperator.go:112] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
# I0704 10:00:33.221304    4217 partInfoOperator.go:128] "partInfo" partNumber=1 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 10:00:33.232304    4217 partInfoOperator.go:128] "partInfo" partNumber=2 partSize=5242880 ChangedOrNot="NotChanged"
# I0704 10:00:33.232330    4217 partInfoOperator.go:134] "partInfo partSize not changed"

export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=20
./s3_linux combine --region=${REGION} --sourceBucketName=${COMBINE_TARGET_BUCKET_NAME} --sourceFileName=${FILE_NAME} --targetBucketName=${DESTINATION_BUCKET} --targetFileName=${FILE_NAME} --threadCount=${THREAD_COUNT} --partSizeInMB ${PART_SIZE_IN_MB} --keepOriginalPartSize=false > combine.log 2>&1 &

tail -f combine.log
# I0704 10:00:58.697256    4222 main.go:48] "starting..."
# E0704 10:00:58.861834    4222 multipart.go:30] "HeadObject" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: N1XKD5S2FGVWAW1M, HostID: h3LEstBz6RQAKvG9HNMA/OjVZgXdPrgjqyGqgqCmOA8G8K+/LZByxCyQlUYL3AdzojEFHONpKl8=, api error NotFound: Not Found" sourceBucket="ray-cross-region-sync-bjs-temp" sourceKey="from-irland/file_split_test_40M/40M.img-00003"
# E0704 10:00:58.861868    4222 combineOperator.go:160] "GetSizeOfOneFileInBucket" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: N1XKD5S2FGVWAW1M, HostID: h3LEstBz6RQAKvG9HNMA/OjVZgXdPrgjqyGqgqCmOA8G8K+/LZByxCyQlUYL3AdzojEFHONpKl8=, api error NotFound: Not Found"
# I0704 10:00:58.861878    4222 combineOperator.go:162] "Assuming no more splitted files"
# I0704 10:00:59.364640    4222 main.go:54] "result: succeeded"
```

5. Check the md5sum and eTag
Keep the md5 (eTag) of combined object and original object as same
- Final combine object
```bash
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SOURCE_FILE_NAME=file_split_test_40M/40M.img
export REGION=eu-west-1
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${SOURCE_FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"f8d058e2f72b1466e4d41fb9497468f6-2\""

export FILE_NAME=from-irland/file_split_test_40M/40M.img
export REGION=cn-north-1
export DESTINATION_BUCKET=ray-cross-region-sync-bjs

aws s3api head-object --bucket ${DESTINATION_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION} | jq .ETag
"\"a2f5b6cba4247664514e8138d5f9f6e5-2\""

# Due to S3 bucket enabled SSE-KMS, so the ETag will be different, we should download the file and compare the md5 value
md5 bjs/40M.dmg
MD5 (bjs/40M.dmg) = ec8bb3b24d5b0f1b5bdf8c8f0f541ee6
md5 irland/40M.dmg
MD5 (irland/40M.dmg) = ec8bb3b24d5b0f1b5bdf8c8f0f541ee6
```



### Failed cases:
Original Files are 50GB (16MB part_size) and 100GB (16MB part_size)

1. 实验1 采用PART_SIZE_IN_MB=16 和 最原始大文件采用PART_SIZE_IN_MB一致都是16MB 拆分
```
export FILE_NAME=file_split_test_50/50G.img
export REGION=eu-west-1
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp
export PART_SIZE_IN_MB=16

./s3_amd64 partinfo -region ${REGION} -bucketName ${SOURCE_BUCKET} -fileName ${FILE_NAME}
I0701 14:46:04.163690    7464 main.go:48] “starting...”
I0701 14:46:04.271973    7464 partInfoOperator.go:77] “partInfo” fileSizeInByte=53687091200 fileSizeInGB=50 ETag=“18b01a16ff1490d41ac9cac4a23c3126-3200” TotalPartsCount=3200
I0701 14:46:04.271996    7464 partInfoOperator.go:99] “partInfo” countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
I0701 14:46:04.322833    7464 partInfoOperator.go:115] “partInfo” partNumber=1 partSize=16777216 ChangedOrNot=“NotChanged”
I0701 14:46:04.337144    7464 partInfoOperator.go:115] “partInfo” partNumber=2 partSize=16777216 ChangedOrNot=“NotChanged”
I0701 14:46:04.337174    7464 partInfoOperator.go:121] “partInfo partSize not changed”
I0701 14:46:04.337187    7464 main.go:54] “result: succeeded”

./s3_amd64 split --region ${REGION} --sourceBucketName ${SOURCE_BUCKET} --sourceFileName ${FILE_NAME} --targetBucketName ${SPLIT_TARGET_BUCKET} --targetFileName ${FILE_NAME} --threadCount ${THREAD_COUNT} --concurrentBufferSize ${CONCURRENT_BUFFER_SIZE} --partSizeInMB ${PART_SIZE_IN_MB} --keepOriginalPartSize=false > split.log 2>&1 &
I0701 16:14:08.627105    7885 main.go:48] "starting..."
I0701 16:14:08.689378    7885 splitOperator.go:95] "Run" fileSize=53687091200 fileSizeInGB=50
I0701 16:16:04.651333    7885 main.go:54] "result: succeeded"

检查Etag/md5sum
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION}

合并
export FILE_NAME=from-irland/file_split_test_50/50G.img
export REGION=cn-north-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-bjs
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=16

./s3_amd64 combine --region=${REGION} --sourceBucketName=${SPLIT_TARGET_BUCKET} --sourceFileName=${FILE_NAME} --targetBucketName=${COMBINE_TARGET_BUCKET_NAME} --targetFileName=${FILE_NAME} --threadCount=${THREAD_COUNT} --partSizeInMB=${PART_SIZE_IN_MB} --keepOriginalPartSize=false > combine.log 2>&1 &

./s3_amd64 partinfo -region ${REGION} -bucketName ${COMBINE_TARGET_BUCKET_NAME} -fileName ${FILE_NAME}
I0701 16:00:58.779701    7242 main.go:48] “starting...”
I0701 16:00:59.059776    7242 partInfoOperator.go:77] “partInfo” fileSizeInByte=53687091200 fileSizeInGB=50 ETag=“cf0a116408b1ec5d490111033bf78afd-3200” TotalPartsCount=3200
I0701 16:00:59.059867    7242 partInfoOperator.go:99] “partInfo” countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
I0701 16:00:59.081916    7242 partInfoOperator.go:115] “partInfo” partNumber=1 partSize=16777216 ChangedOrNot=“NotChanged”
I0701 16:00:59.093838    7242 partInfoOperator.go:115] “partInfo” partNumber=2 partSize=16777216 ChangedOrNot=“NotChanged”
I0701 16:00:59.093864    7242 partInfoOperator.go:121] “partInfo partSize not changed”
I0701 16:00:59.093875    7242 main.go:54] “result: succeeded”


检查Etag/md5sum
aws s3api head-object --bucket ${COMBINE_TARGET_BUCKET_NAME} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION}
```

2. 实验2 采用最小默认参数，不输入其他参数

```
拆分
export FILE_NAME=file_split_test/100G.img
export REGION=eu-west-1
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp

./s3_amd64 split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} > split.log 2>&1 &
I0701 15:28:05.810622    7689 main.go:48] "starting..."
I0701 15:28:05.863106    7689 splitOperator.go:95] "Run" fileSize=107374182400 fileSizeInGB=100
I0701 15:28:05.902549    7689 splitOperator.go:103] "Run" original partSizeInByte=16777216
I0701 15:28:05.902576    7689 splitOperator.go:107] "Run" splittedFileSizeInByte=16777216
I0701 15:30:02.727953    7689 main.go:54] "result: succeeded"

./s3_amd64 partinfo -region ${REGION} -bucketName ${SOURCE_BUCKET} -fileName ${FILE_NAME}
I0701 15:26:34.094665    7682 main.go:48] "starting..."
I0701 15:26:34.195995    7682 partInfoOperator.go:77] "partInfo" fileSizeInByte=107374182400 fileSizeInGB=100 ETag="569b353fa61ddaff27e21de393a4843e-6400" TotalPartsCount=6400
I0701 15:26:34.196026    7682 partInfoOperator.go:99] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
I0701 15:26:34.296495    7682 partInfoOperator.go:115] "partInfo" partNumber=1 partSize=16777216 ChangedOrNot="NotChanged"
I0701 15:26:34.307781    7682 partInfoOperator.go:115] "partInfo" partNumber=2 partSize=16777216 ChangedOrNot="NotChanged"
I0701 15:26:34.307808    7682 partInfoOperator.go:121] "partInfo partSize not changed"
I0701 15:26:34.307817    7682 main.go:54] "result: succeeded"

检查Etag/md5sum
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION}

合并
export FILE_NAME=from-irland/file_split_test/100G.img
export REGION=cn-north-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-bjs
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400


Default 16MB the same as original source data
./s3_amd64 combine --region=${REGION} --sourceBucketName=${SPLIT_TARGET_BUCKET} --sourceFileName=${FILE_NAME} --targetBucketName=${COMBINE_TARGET_BUCKET_NAME} --targetFileName=${FILE_NAME} > combine.log 2>&1 &

I0701 16:24:53.075413    7395 main.go:48] "starting..."
I0701 16:24:53.180007    7395 combineOperator.go:80] "Run" original partSizeInByte=5242880
E0701 16:25:56.121334    7395 combineOperator.go:243] "UploadPartCopy" err="operation error S3: UploadPartCopy, https response error StatusCode: 400, RequestID: 9QB9RK2JH339S7ZH, HostID: Il7Q6S4RLrm2F1q0sY3C5/Qu97obkKwxuB3Zr9x/dS4Yc0WGWD5oiAptOocEFb67F5zuPUZLW+4=, api error InvalidArgument: Part number must be an integer between 1 and 10000, inclusive"
E0701 16:25:56.121403    7395 combineWorker.go:47] "copyPart" err="operation error S3: UploadPartCopy, https response error StatusCode: 400, RequestID: 9QB9RK2JH339S7ZH, HostID: Il7Q6S4RLrm2F1q0sY3C5/Qu97obkKwxuB3Zr9x/dS4Yc0WGWD5oiAptOocEFb67F5zuPUZLW+4=, api error InvalidArgument: Part number must be an integer between 1 and 10000, inclusive" sequenceNumber=395 copySource="/ray-cross-region-sync-bjs/from-irland/file_split_test/100G.img-02501" currentPosition=0 partNumber=10001


export PART_SIZE_IN_MB=20

./s3_amd64 combine --region=${REGION} --sourceBucketName=${SPLIT_TARGET_BUCKET} --sourceFileName=${FILE_NAME} --targetBucketName=${COMBINE_TARGET_BUCKET_NAME} --targetFileName=${FILE_NAME} --threadCount=${THREAD_COUNT} --partSizeInMB=${PART_SIZE_IN_MB} --keepOriginalPartSize=false > combine.log 2>&1 &
I0701 16:45:04.455260    7504 main.go:48] "starting..."
E0701 16:47:45.468715    7504 multipart.go:30] "HeadObject" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: JSHXEMJ82HYQ8Q4E, HostID: hM5h1BauMEQimBhombj8F5LHQ0733Zqk8xZmyGKw8XhdM/ur0uz/n7+4WO2XtwDucKrqpJlv5LXt5sVxypmMcw==, api error NotFound: Not Found" sourceBucket="ray-cross-region-sync-bjs" sourceKey="from-irland/file_split_test/100G.img-06401"
E0701 16:47:45.468776    7504 combineOperator.go:160] "GetSizeOfOneFileInBucket" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: JSHXEMJ82HYQ8Q4E, HostID: hM5h1BauMEQimBhombj8F5LHQ0733Zqk8xZmyGKw8XhdM/ur0uz/n7+4WO2XtwDucKrqpJlv5LXt5sVxypmMcw==, api error NotFound: Not Found"
I0701 16:47:45.468793    7504 combineOperator.go:162] "Assuming no more splitted files"
I0701 16:47:46.957507    7504 main.go:54] "result: succeeded"

./s3_amd64 partinfo -region ${REGION} -bucketName ${COMBINE_TARGET_BUCKET_NAME} -fileName ${FILE_NAME}
I0701 16:49:20.732429    7520 main.go:48] "starting..."
I0701 16:49:21.003251    7520 partInfoOperator.go:77] "partInfo" fileSizeInByte=107374182400 fileSizeInGB=100 ETag="ae23ce4c26a205f27f3ce846421b18a6-6400" TotalPartsCount=6400
I0701 16:49:21.003347    7520 partInfoOperator.go:99] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
I0701 16:49:21.032999    7520 partInfoOperator.go:115] "partInfo" partNumber=1 partSize=16777216 ChangedOrNot="NotChanged"
I0701 16:49:21.043314    7520 partInfoOperator.go:115] "partInfo" partNumber=2 partSize=16777216 ChangedOrNot="NotChanged"
I0701 16:49:21.043342    7520 partInfoOperator.go:121] "partInfo partSize not changed"
I0701 16:49:21.043356    7520 main.go:54] "result: succeeded"

检查Etag/md5sum
aws s3api head-object --bucket ${COMBINE_TARGET_BUCKET_NAME} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION}
```

3. 实验3 采用PART_SIZE_IN_MB=8 防止被DTH 修改Part=5MB
```
拆分
export FILE_NAME=file_split_test_50/50G.img
export REGION=eu-west-1
export SOURCE_BUCKET=ray-cross-region-sync-eu-west-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-eu-west-1-temp
export PART_SIZE_IN_MB=8

./s3_amd64 partinfo -region ${REGION} -bucketName ${SOURCE_BUCKET} -fileName ${FILE_NAME}
I0701 16:09:24.033052    7851 main.go:48] "starting..."
I0701 16:09:24.132721    7851 partInfoOperator.go:77] "partInfo" fileSizeInByte=53687091200 fileSizeInGB=50 ETag="18b01a16ff1490d41ac9cac4a23c3126-3200" TotalPartsCount=3200
I0701 16:09:24.132745    7851 partInfoOperator.go:99] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
I0701 16:09:24.196528    7851 partInfoOperator.go:115] "partInfo" partNumber=1 partSize=16777216 ChangedOrNot="NotChanged"
I0701 16:09:24.211710    7851 partInfoOperator.go:115] "partInfo" partNumber=2 partSize=16777216 ChangedOrNot="NotChanged"
I0701 16:09:24.211729    7851 partInfoOperator.go:121] "partInfo partSize not changed"
I0701 16:09:24.211738    7851 main.go:54] "result: succeeded"

./s3_amd64 split -region ${REGION} -sourceBucketName ${SOURCE_BUCKET} -sourceFileName ${FILE_NAME} -targetBucketName ${SPLIT_TARGET_BUCKET} -targetFileName ${FILE_NAME} -threadCount ${THREAD_COUNT} -concurrentBufferSize ${CONCURRENT_BUFFER_SIZE} -partSizeInMB ${PART_SIZE_IN_MB} --keepOriginalPartSize=false > split.log 2>&1 &
I0701 16:14:08.627105    7885 main.go:48] "starting..."
I0701 16:14:08.689378    7885 splitOperator.go:95] "Run" fileSize=53687091200 fileSizeInGB=50
I0701 16:16:04.651333    7885 main.go:54] "result: succeeded"

检查Etag/md5sum
aws s3api head-object --bucket ${SOURCE_BUCKET} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION}

合并
export FILE_NAME=from-irland/file_split_test_50/50G.img
export REGION=cn-north-1
export SPLIT_TARGET_BUCKET=ray-cross-region-sync-bjs
export COMBINE_TARGET_BUCKET_NAME=ray-cross-region-sync-bjs-temp
export THREAD_COUNT=200
export CONCURRENT_BUFFER_SIZE=400
export PART_SIZE_IN_MB=8

./s3_amd64 combine --region=${REGION} --sourceBucketName=${SPLIT_TARGET_BUCKET} --sourceFileName=${FILE_NAME} --targetBucketName=${COMBINE_TARGET_BUCKET_NAME} --targetFileName=${FILE_NAME} --threadCount=${THREAD_COUNT} --partSizeInMB=${PART_SIZE_IN_MB} --keepOriginalPartSize=false > combine.log 2>&1 &
I0702 03:59:08.948823   17672 main.go:48] "starting..."
E0702 04:02:09.360989   17672 multipart.go:30] "HeadObject" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: 2NJP6A7RDGN992CK, HostID: dkLKFmeKqO8GFRVQoSa3ePlOtypkEgSiSHYdjYZ5+Kh+OFz9Kr3i9j2DRgvvScdVuPYVQ9qUKW0=, api error NotFound: Not Found" sourceBucket="ray-cross-region-sync-bjs" sourceKey="from-irland/file_split_test_50/50G.img-06401"
E0702 04:02:09.361036   17672 combineOperator.go:160] "GetSizeOfOneFileInBucket" err="operation error S3: HeadObject, https response error StatusCode: 404, RequestID: 2NJP6A7RDGN992CK, HostID: dkLKFmeKqO8GFRVQoSa3ePlOtypkEgSiSHYdjYZ5+Kh+OFz9Kr3i9j2DRgvvScdVuPYVQ9qUKW0=, api error NotFound: Not Found"
I0702 04:02:09.361045   17672 combineOperator.go:162] "Assuming no more splitted files"
I0702 04:02:10.802829   17672 main.go:54] "result: succeeded"

./s3_amd64 partinfo -region ${REGION} -bucketName ${COMBINE_TARGET_BUCKET_NAME} -fileName ${FILE_NAME}
I0702 04:02:36.003288   17730 main.go:48] "starting..."
I0702 04:02:36.294320   17730 partInfoOperator.go:77] "partInfo" fileSizeInByte=53687091200 fileSizeInGB=50 ETag="bcefb53ef7f62d8d6abea7277342a741-6400" TotalPartsCount=6400
I0702 04:02:36.294434   17730 partInfoOperator.go:99] "partInfo" countOfPartsToGetPartInfo=2 lastPartNumberToGetPartInfo=2
I0702 04:02:36.318626   17730 partInfoOperator.go:115] "partInfo" partNumber=1 partSize=8388608 ChangedOrNot="NotChanged"
I0702 04:02:36.329696   17730 partInfoOperator.go:115] "partInfo" partNumber=2 partSize=8388608 ChangedOrNot="NotChanged"
I0702 04:02:36.329721   17730 partInfoOperator.go:121] "partInfo partSize not changed"
I0702 04:02:36.329732   17730 main.go:54] "result: succeeded"


检查Etag/md5sum
aws s3api head-object --bucket ${COMBINE_TARGET_BUCKET_NAME} --key ${FILE_NAME} --checksum-mode ENABLED --region=${REGION}
```