# AWS IoT Greengrass V2 Workshop

This workshop based on [Global region AWS IoT Greengrass V2 Workshop](https://greengrassv2.workshop.aws/en/) and can be running on AWS China Ningxia and Beijing region. 

AWS IoT Greengrass is an Internet of Things (IoT) open source edge runtime and cloud service that helps you build, deploy, and manage device software.

You can program your devices to act locally on the data they generate, execute predictions based on machine learning models, filter and aggregate device data, and only transmit necessary information to the cloud.

The following diagram shows how an AWS IoT Greengrass device interacts with the AWS IoT Greengrass cloud service and other AWS services in the AWS Cloud. 

![how-it-works](images/how-it-works.png)
- Greengrass Core device

    A device that runs the AWS IoT Greengrass Core software. A Greengrass Core device is an AWS IoT thing. You can add multiple Core devices to AWS IoT thing groups to create groups of Greengrass Core devices

- Greengrass component

    A Greengrass component is a software module that is deployed to and runs on a Greengrass Core device. All software that is developed and deployed with AWS IoT Greengrass is modeled as a component. AWS IoT Greengrass provides pre-built public components that provide features and functionality that you can use in your applications. You can also develop your own custom components.
    - Recipe: A JSON or YAML file that describes the software module by defining component details, configuration and parameters.
    - Artifact: The source code, binaries, or scripts that define the software that will run on your device: Lambda function, a Docker container or a custom runtime.
    - Dependency: The relationship between components that enables you to enforce automatic updates or restarts of dependent components.

- Deployment

The process to send components and apply the desired component configuration to a destination target device: a single Greengrass core device or a group of Greengrass core devices.

## Notice
1. This workshop running on AWS Beijing region: `cn-north-1`
2. This workshop will use the Cloud9 to simulate the Edge Device. To simulate the remote edge device, I use the Tokyo region: `ap-northeast-1` to launch the Cloud9. You can also launch the Cloud9 instance from AWS China Marketplace. Note if you the China Marketplace Cloud9, it is not Ubuntu OS. You may need change the commands used for following labs to Amazon Linux
- Environment type Create a new EC2 instance for environment (direct access)
- Instance type m5.large (8 GiB RAM + 2 vCPU)
- Platform Ubuntu Server 18.04 LTS

![architecture_diagram](images/architecture_diagram.png)
3. I used the `ap-northeast-1` Cloud9 as edge device and IoT greengrass will be located in AWS Beijing region: `cn-north-1`. So I need use the AWS Beijing region: `cn-north-1` credential. 
```bash
> aws configure
AWS Access Key ID [None]: xxxxxxxxxxxxxx
AWS Secret Access Key [None]: xxxxxxxxxxxxxxxxxxxxxxxxxx
Default region name [None]: cn-north-1
Default output format [None]: json

export AWS_DEFAULT_REGION=cn-north-1
export AWS_ACCESS_KEY_ID="The AccessKeyId value of the result above"
export AWS_SECRET_ACCESS_KEY="The SecretAccessKey value of the result above"
```

4. Please update the IAM Policy and ARN using AWS China format: `arn:aws-cn`
The Minimal IAM policy for installer to provision AWS IoT Greengrass Core software resources : https://docs.aws.amazon.com/greengrass/v2/developerguide/provision-minimal-iam-policy.html