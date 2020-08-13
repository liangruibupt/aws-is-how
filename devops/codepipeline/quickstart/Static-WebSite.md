# WebHosting - Amazon S3 as a deployment provider

## Deploy static website files to Amazon S3.
1. Create a CodeCommit Repository: `SampleWebsite`

2. Check in the sample website resources
```bash
ssh://git-codecommit.ap-southeast-1.amazonaws.com/v1/repos/SampleWebsite
cd SampleWebsite
wget https://docs.aws.amazon.com/codepipeline/latest/userguide/samples/sample-website.zip
unzip sample-website.zip -d SampleWebsite
mv sample-website/* SampleWebsite/
rm -r sample-website
Modify the index.html
zip -r SampleAp
```

3. Follow up the guide [S3 WebsiteHosting](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html) to configure S3 bucket for website hosting

Here I use the `ray-webhosting-demo` as bucket with Endpoint : http://ray-webhosting-demo.s3-website-ap-southeast-1.amazonaws.com

```bash
git add -A
git commit -m "Added static website files"
git push
```

4. Create a CodePipeline with name `MyS3DeployPipeline`
- Add source stage, in Source provider, choose AWS CodeCommit.
- CodeCommit Repository: `SampleWebsite`, branch: master
- Add deploy stage, in Deploy provider, choose Amazon S3 bucket `ray-webhosting-demo`
- Select Extract file before deploy.

5. Verify your pipeline ran successfully
- Verify the artifacts have been upload
```bash
aws s3 ls s3://ray-webhosting-demo --region ap-southeast-1 --profile global
2020-08-13 06:43:27       3963 error.html
2020-08-13 06:43:27      25628 graphic.jpg
2020-08-13 06:43:27        313 index.html
2020-08-13 06:43:27        264 main.css
```
- Access the S3 webhosting Endpoint, in here, http://ray-webhosting-demo.s3-website-ap-southeast-1.amazonaws.com

6. Make a change to any source file and verify deployment

## Deploy built archive files to Amazon S3

1. create the buildspec.yml
```yaml
version: 0.2

phases:
  install:
    commands:
      - npm install -g typescript
  build:
    commands:
      - tsc index.ts
artifacts:
  files:
    - index.js
  secondary-artifacts:
    artifact1:
      files:
        - index.js
      name: secondary_artifact_ts_files
```

Reference [build-spec-ref](https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html)

2. create the index.ts
```ts
interface Greeting {
    message: string;
}

class HelloGreeting implements Greeting {
    message = "Hello!";
}

function greet(greeting: Greeting) {
    console.log(greeting.message);
}

let greeting = new HelloGreeting();

greet(greeting);
```

3. Update the `MyS3DeployPipeline` pipeline to add build stage
- Build provider, choose AWS CodeBuild.
- Create build project. 
  - Project name: S3WebHosting
  - Environment: Managed image, Operating system: Ubuntu.
  - Runtime, choose Standard. For Runtime version, choose aws/codebuild/standard:4.0.
  - Image version, choose Always use the latest image for this runtime version.
  - Service role, choose your CodeBuild service role `MyCodeBuildRole` with AWSCodeBuildAdminAccess, AmazonS3ReadOnlyAccess, and IAMFullAccess
  - For Build specifications, choose Use a buildspec file.
  - CloudWatch Group: /aws/codebuild/codebuilddemo
- Add the secondary-artifacts in  build project
    - Artifact identifier: artifact1
    - Type: S3
    - Bucket Name: ray-webhosting-demo
    - Name: S3WebHosting
    - Others Setting: default value

Choose Continue to CodePipeline. A message is displayed if the project was created successfully.

4. Check in the buildspec.yml and index.ts to trigger the code pipeline
```bash
git add .
git commit -m "add index.ts and buildspec.yml"
```

5. Verify your pipeline ran successfully
- Verify the artifacts have been upload
```bash
aws s3 ls s3://ray-webhosting-demo --recursive --region ap-southeast-1 --profile global
2020-08-13 09:50:12        268 S3WebHosting/index.js
2020-08-13 09:50:17        269 buildspec.yml
2020-08-13 09:50:17       3963 error.html
2020-08-13 09:50:17      25628 graphic.jpg
2020-08-13 09:50:17        732 index.html
2020-08-13 09:50:17        242 index.ts
2020-08-13 09:50:17        264 main.css
```
- Access the S3 webhosting Endpoint, in here, http://ray-webhosting-demo.s3-website-ap-southeast-1.amazonaws.com