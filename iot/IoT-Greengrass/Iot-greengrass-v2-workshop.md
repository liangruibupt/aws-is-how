# AWS IoT Greengrass V2 Workshop

This workshop based on [Global region AWS IoT Greengrass V2 Workshop](https://greengrassv2.workshop.aws/en/) and can be running on AWS China Beijing region. 

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

The Minimal IAM policy for installer to provision AWS IoT Greengrass Core software resources : https://docs.aws.amazon.com/greengrass/v2/developerguide/provision-minimal-iam-policy.html 

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

## Run the workshop

Follow up the guide [AWS IoT Greengrass V2 Workshop](https://greengrassv2.workshop.aws/en/)

***Note, IoT greengrass cloud service and IoT core are running on AWS Beijing region: `cn-north-1` and Greengrass core device is running on Cloud9 environment on Tokyo region: `ap-northeast-1`***

### Lab 1: Greengrass setup
```bash
Admin:~/environment $ mkdir ggworkshop
Admin:~/environment $ cd ggworkshop/

Admin:~/environment/ggworkshop $ curl -s https://d2s8p88vqu9w66.cloudfront.net/releases/greengrass-nucleus-latest.zip > greengrass-nucleus-latest.zip && unzip greengrass-nucleus-latest.zip -d GreengrassCore
Archive:  greengrass-nucleus-latest.zip
  inflating: GreengrassCore/LICENSE  
  inflating: GreengrassCore/NOTICE   
  inflating: GreengrassCore/README.md  
  inflating: GreengrassCore/THIRD-PARTY-LICENSES  
  inflating: GreengrassCore/bin/greengrass.service.template  
  inflating: GreengrassCore/bin/loader  
  inflating: GreengrassCore/bin/loader.cmd  
  inflating: GreengrassCore/conf/recipe.yaml  
  inflating: GreengrassCore/lib/Greengrass.jar  
Admin:~/environment/ggworkshop $ ls
GreengrassCore  greengrass-nucleus-latest.zip

Admin:~/environment/ggworkshop $ sudo -E java -Droot="/greengrass/v2" -Dlog.store=FILE -jar ./GreengrassCore/lib/Greengrass.jar --aws-region cn-north-1 --thing-name GreengrassQuickStartCore-20210624 --thing-group-name GreengrassQuickStartGroup --component-default-user ggc_user:ggc_group --provision true --setup-system-service true --deploy-dev-tools true
Creating user ggc_user 
ggc_user created 
Creating group ggc_group 
ggc_group created 
Added ggc_user to ggc_group 
Provisioning AWS IoT resources for the device with IoT Thing Name: [GreengrassQuickStartCore-20210624]...
Creating new IoT policy "GreengrassV2IoTThingPolicy"
Creating keys and certificate...
Attaching policy to certificate...
Creating IoT Thing "GreengrassQuickStartCore-20210624"...
Attaching certificate to IoT thing...
Successfully provisioned AWS IoT resources for the device with IoT Thing Name: [GreengrassQuickStartCore-20210624]!
Adding IoT Thing [GreengrassQuickStartCore-20210624] into Thing Group: [GreengrassQuickStartGroup]...
Successfully added Thing into Thing Group: [GreengrassQuickStartGroup]
Setting up resources for aws.greengrass.TokenExchangeService ... 
TES role alias "GreengrassV2TokenExchangeRoleAlias" does not exist, creating new alias...
TES role "GreengrassV2TokenExchangeRole" does not exist, creating role...
IoT role policy "GreengrassTESCertificatePolicyGreengrassV2TokenExchangeRoleAlias" for TES Role alias not exist, creating policy...
Attaching TES role policy to IoT thing...
No managed IAM policy found, looking for user defined policy...
No IAM policy found, will attempt creating one...
IAM role policy for TES "GreengrassV2TokenExchangeRoleAccess" created. This policy DOES NOT have S3 access, please modify it with your private components' artifact buckets/objects as needed when you create and deploy private components 
Attaching IAM role policy for TES to IAM role for TES...
Configuring Nucleus with provisioned resource details...
Downloading Root CA from "https://www.amazontrust.com/repository/AmazonRootCA1.pem"
Created device configuration
Successfully configured Nucleus with provisioned resource details!
Creating a deployment for Greengrass first party components to the thing group
Configured Nucleus to deploy aws.greengrass.Cli component
Successfully set up Nucleus as a system service
```

```bash
Admin:~/environment/ggworkshop $ /greengrass/v2/bin/greengrass-cli -V
Greengrass CLI Version: 2.2.0

Admin:~/environment/ggworkshop $ sudo systemctl status greengrass.service
● greengrass.service - Greengrass Core
   Loaded: loaded (/etc/systemd/system/greengrass.service; enabled; vendor preset: enabled)
   Active: active (running) since Thu 2021-06-24 11:05:00 UTC; 1min 38s ago
 Main PID: 4690 (sh)
    Tasks: 33 (limit: 4915)
   CGroup: /system.slice/greengrass.service
           ├─4690 /bin/sh /greengrass/v2/alts/current/distro/bin/loader
           └─4704 java -Dlog.store=FILE -Dlog.store=FILE -Droot=/greengrass/v2 -jar /greengrass/v2/alts/current/distro/lib/Greengrass.jar --setup-system-service false

Jun 24 11:05:00 ip-172-16-95-40 systemd[1]: Started Greengrass Core.
Jun 24 11:05:00 ip-172-16-95-40 sh[4690]: Greengrass root: /greengrass/v2
Jun 24 11:05:00 ip-172-16-95-40 sh[4690]: JVM options: -Dlog.store=FILE -Droot=/greengrass/v2
Jun 24 11:05:00 ip-172-16-95-40 sh[4690]: Nucleus options: --setup-system-service false
Jun 24 11:05:03 ip-172-16-95-40 sh[4690]: Launching Nucleus...
Jun 24 11:05:03 ip-172-16-95-40 sh[4690]: AWS libcrypto resolve: searching process and loaded modules
Jun 24 11:05:03 ip-172-16-95-40 sh[4690]: AWS libcrypto resolve: found static aws-lc HMAC symbols
Jun 24 11:05:03 ip-172-16-95-40 sh[4690]: AWS libcrypto resolve: found static aws-lc libcrypto 1.1.1 EVP_MD symbols
Jun 24 11:05:04 ip-172-16-95-40 sh[4690]: Launched Nucleus successfully.

Admin:~/environment/ggworkshop $ sudo systemctl enable greengrass.service
```

***Note: Please update the IAM Policy and ARN using AWS China format: `arn:aws-cn`***

## Lab 2 Create First component
```bash
Admin:~/environment $ mkdir -p ~/environment/ggworkshop/GreengrassCore/artifacts/com.example.HelloWorld/1.0.0 && touch ~/environment/ggworkshop/GreengrassCore/artifacts/com.example.HelloWorld/1.0.0/hello_world.py

Admin:~/environment $ mkdir -p ggworkshop/GreengrassCore/recipes && touch ggworkshop/GreengrassCore/recipes/com.example.HelloWorld-1.0.0.json

Admin:~/environment $ sudo /greengrass/v2/bin/greengrass-cli deployment create \
>   --recipeDir ~/environment/ggworkshop/GreengrassCore/recipes \
>   --artifactDir ~/environment/ggworkshop/GreengrassCore/artifacts \
>   --merge "com.example.HelloWorld=1.0.0"
AWS libcrypto resolve: searching process and loaded modules
AWS libcrypto resolve: found static aws-lc HMAC symbols
AWS libcrypto resolve: found static aws-lc libcrypto 1.1.1 EVP_MD symbols
Jun 24, 2021 3:01:20 PM software.amazon.awssdk.eventstreamrpc.EventStreamRPCConnection$1 onConnectionSetup
INFO: Socket connection /greengrass/v2/ipc.socket:8033 to server result [AWS_ERROR_SUCCESS]
Jun 24, 2021 3:01:21 PM software.amazon.awssdk.eventstreamrpc.EventStreamRPCConnection$1 onProtocolMessage
INFO: Connection established with event stream RPC server
Local deployment submitted! Deployment Id: a7552352-9d15-479d-bb81-14eed8abd163
```