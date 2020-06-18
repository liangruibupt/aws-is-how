
# AWS Lambda Custom Runtime for PHP

Guide [AWS Lambda Custom Runtime for PHP](https://aws.amazon.com/cn/blogs/apn/aws-lambda-custom-runtime-for-php-a-practical-example/)


## Setting up PHP 7.3.0 on the EC2 instance
1. Launch a EC2 instance supported by AWS Lambda runtimes: amzn-ami-hvm-2018.03.0.20181129-x86_64-gp2
https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

2. Build Php runtime

```bash
# Update packages and install needed compilation dependencies
sudo yum update -y
sudo yum -y install autoconf bison gcc gcc-c++ libcurl-devel libxml2-devel 

# Compile OpenSSL v1.0.1 from source, as Amazon Linux uses a newer version than the Lambda Execution Environment, which
# would otherwise produce an incompatible binary.
wget http://www.openssl.org/source/openssl-1.0.1k.tar.gz 
tar -zxf openssl-1.0.1k.tar.gz
cd openssl-1.0.1k
./config && make && sudo make install
cd ~

# Download the PHP 7.3.0 source
mkdir ~/php-7-bin
wget https://github.com/php/php-src/archive/php-7.3.0.tar.gz 
tar -zxf php-7.3.0.tar.gz
cd php-src-php-7.3.0

# Compile PHP 7.3.0 with OpenSSL 1.0.1 support, and install to /home/ec2-user/php-7-bin
./buildconf --force
./configure --prefix=/home/ec2-user/php-7-bin/ --with-openssl=/usr/local/ssl --with-curl --with-zlib
make install

# Verify all went well
/home/ec2-user/php-7-bin/bin/php -v
# PHP 7.3.0 (cli) (built: Jun 15 2020 14:26:43) ( NTS )
# Copyright (c) 1997-2018 The PHP Group
# Zend Engine v3.3.0-dev, Copyright (c) 1998-2018 Zend Technologies
```

## Preparing to Write Some Code
```bash
mkdir -p ~/php-example/{bin,src}/
cd ~/php-example
touch ./src/{hello,goodbye}.php
touch ./bootstrap && chmod +x ./bootstrap
cp ~/php-7-bin/bin/php ./bin

tree /home/ec2-user/php-example/
# /home/ec2-user/php-example/
# ├── bin
# │   └── php
# ├── bootstrap
# └── src
#     ├── goodbye.php
#     └── hello.php

# 2 directories, 4 files
```

## Building the Custom Runtime

Since the Lambda environment’s responsibility will be limited to simply starting and shutting down our custom runtime API, it’s up to us to define what is actually going to happen in the Lambda environment once that runtime API starts up. The bootstrap script will be what handles these Init and Invoke phases.

1. Use the Composer package manager to install the popular Guzzle PHP HTTP client
```bash
# First, install Composer:
curl -sS https://getcomposer.org/installer | ./bin/php
# All settings correct for using Composer
# Downloading...

# Composer (version 1.10.7) successfully installed to: /home/ec2-user/php-example/composer.phar
# Use it: php composer.phar

# Next, install Guzzle:
./bin/php composer.phar require guzzlehttp/guzzle
# Using version ^6.5 for guzzlehttp/guzzle
# ./composer.json has been created
# Loading composer repositories with package information
# Updating dependencies (including require-dev)
# Package operations: 8 installs, 0 updates, 0 removals
#   - Installing ralouphie/getallheaders (3.0.3): Downloading (100%)
#   - Installing psr/http-message (1.0.1): Downloading (100%)
#   - Installing guzzlehttp/psr7 (1.6.1): Downloading (100%)
#   - Installing guzzlehttp/promises (v1.3.1): Downloading (100%)
#   - Installing symfony/polyfill-php72 (v1.17.0): Downloading (100%)
#   - Installing symfony/polyfill-mbstring (v1.17.0): Downloading (100%)
#   - Installing symfony/polyfill-intl-idn (v1.17.0): Downloading (100%)
#   - Installing guzzlehttp/guzzle (6.5.4): Downloading (100%)
# guzzlehttp/psr7 suggests installing zendframework/zend-httphandlerrunner (Emit PSR-7 responses)
# symfony/polyfill-mbstring suggests installing ext-mbstring (For best performance)
# symfony/polyfill-intl-idn suggests installing ext-intl (For best performance)
# guzzlehttp/guzzle suggests installing psr/log (Required for using the Log middleware)
# Writing lock file
# Generating autoload files
# 3 packages you are using are looking for funding.
# Use the `composer fund` command to find out more!
```

2. Build the bootstrap

Lambda will place the files from our various layers under /opt, so our /home/ec2-user/php-example/bin/php file will ultimately end up being /opt/bin/php

`bootstrap` script

```php
#!/opt/bin/php
<?php

// This invokes Composer's autoloader so that we'll be able to use Guzzle and any other 3rd party libraries we need.
require __DIR__ . '/vendor/autoload.php';

// Making a GET request to the runtime API to obtain the next Lambda invocation that needs to be serviced.
function getNextRequest()
{
    $client = new \GuzzleHttp\Client();
    $response = $client->get('http://' . $_ENV['AWS_LAMBDA_RUNTIME_API'] . '/2018-06-01/runtime/invocation/next');

    return [
      'invocationId' => $response->getHeader('Lambda-Runtime-Aws-Request-Id')[0],
      'payload' => json_decode((string) $response->getBody(), true)
    ];
}

// Grab the request payload to supply request parameters to our functions. We’ll retrieve those and return a simple associative array to make these values available to the caller.
function sendResponse($invocationId, $response)
{
    $client = new \GuzzleHttp\Client();
    $client->post(
    'http://' . $_ENV['AWS_LAMBDA_RUNTIME_API'] . '/2018-06-01/runtime/invocation/' . $invocationId . '/response',
       ['body' => $response]
    );
}

// This is the request processing loop. Barring unrecoverable failure, this loop runs until the environment shuts down.
do {
    // Ask the runtime API for a request to handle.
    $request = getNextRequest();

    // Obtain the function name from the _HANDLER environment variable and ensure the function's code is available.
    $handlerFunction = array_slice(explode('.', $_ENV['_HANDLER']), -1)[0];
    require_once $_ENV['LAMBDA_TASK_ROOT'] . '/src/' . $handlerFunction . '.php';

    // Execute the desired function and obtain the response.
    $response = $handlerFunction($request['payload']);

    // Submit the response back to the runtime API.
    sendResponse($request['invocationId'], $response);
} while (true);

?>
```

## Coding the Example php Functions

src/hello.php:

```php
<?php

function hello($data)
{
    return "Hello, {$data['name']}!";
}
?>
```

src/goodbye.php:

```php
<?php

function goodbye($data)
{
    return "Goodbye, {$data['name']}!";
}
?>
```

## Deployment lambda PHP layer and sample php functions

1. Build package
```bash
zip -r runtime.zip bin bootstrap
zip -r vendor.zip vendor/
zip hello.zip src/hello.php
zip goodbye.zip src/goodbye.php

```

2. Create IAM Role

/tmp/trust-policy.json:

```json
{
  "Version": "2012-10-17",
  "Statement": [
   {
    "Effect": "Allow",
    "Principal": {
      "Service": "lambda.amazonaws.com"
   },
   "Action": "sts:AssumeRole"
  }
 ]
}

```

```bash
aws iam create-role \
    --role-name LambdaPhpExampleRole \
    --path "/service-role/" \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --region us-west-2

LambdaPhpExampleRole=
```

3. Build the layer
```bash
aws lambda publish-layer-version \
    --layer-name php-example-runtime \
    --zip-file fileb://runtime.zip \
    --region us-west-2

php_example_runtime_arn=

aws lambda publish-layer-version \
    --layer-name php-example-vendor \
    --zip-file fileb://vendor.zip \
    --region us-west-2

php_example_vendor_arn=
```

4. Deploy sample function
```bash
aws lambda create-function \
    --function-name php-example-hello \
    --handler hello \
    --zip-file fileb://./hello.zip \
    --runtime provided \
    --role $LambdaPhpExampleRole \
    --layers $php_example_runtime_arn $php_example_vendor_arn \
    --region us-west-2
    

aws lambda create-function \
    --function-name php-example-goodbye \
    --handler goodbye \
    --zip-file fileb://./goodbye.zip \
    --runtime provided \
    --role $LambdaPhpExampleRole \
    --layers $php_example_runtime_arn $php_example_vendor_arn \
    --region us-west-2
    
```

5. Testing
```bash
aws lambda invoke \
    --function-name php-example-hello \
    --region us-west-2 \
    --log-type Tail \
    --query 'LogResult' \
    --output text \
    --payload '{"name": "World"}' hello-output.txt | base64 --decode
# START RequestId: b08f1b53-44b2-4533-ab2e-ba7436839ede Version: $LATEST
# END RequestId: b08f1b53-44b2-4533-ab2e-ba7436839ede
# REPORT RequestId: b08f1b53-44b2-4533-ab2e-ba7436839ede	Duration: 23.18 ms	Billed Duration: 200 ms	Memory Size: 128 MB	Max Memory Used: 50 MB	Init Duration: 121.29 ms

aws lambda invoke \
    --function-name php-example-goodbye \
    --region us-west-2 \
    --log-type Tail \
    --query 'LogResult' \
    --output text \
    --payload '{"name": "World"}' goodbye-output.txt | base64 --decode
# START RequestId: 3e0f87ee-9615-42f0-90af-bc246068529e Version: $LATEST
# END RequestId: 3e0f87ee-9615-42f0-90af-bc246068529e
# REPORT RequestId: 3e0f87ee-9615-42f0-90af-bc246068529e	Duration: 32.42 ms	Billed Duration: 200 ms	Memory Size: 128 MB	Max Memory Used: 50 MB	Init Duration: 108.25 ms

cat hello-output.txt
#Hello, World!

cat goodbye-output.txt
#Goodbye, World!

aws lambda invoke \
    --function-name php-example-hello \
    --region us-west-2 \
    --log-type Tail \
    --query 'LogResult' \
    --output text \
    --payload '{"name": "SecondCall"}' hello-output.txt | base64 --decode
# START RequestId: bb2be18f-abf2-4eb9-9347-2c02061cd8b1 Version: $LATEST
# END RequestId: bb2be18f-abf2-4eb9-9347-2c02061cd8b1
# REPORT RequestId: bb2be18f-abf2-4eb9-9347-2c02061cd8b1	Duration: 1.47 ms	Billed Duration: 100 ms	Memory Size: 128 MB	Max Memory Used: 50 MB

aws lambda invoke \
    --function-name php-example-goodbye \
    --region us-west-2 \
    --log-type Tail \
    --query 'LogResult' \
    --output text \
    --payload '{"name": "SecondCall"}' goodbye-output.txt | base64 --decode
# START RequestId: 0356a11a-27c9-495b-b867-4f57c4d045cb Version: $LATEST
# END RequestId: 0356a11a-27c9-495b-b867-4f57c4d045cb
# REPORT RequestId: 0356a11a-27c9-495b-b867-4f57c4d045cb	Duration: 1.61 ms	Billed Duration: 100 ms	Memory Size: 128 MB	Max Memory Used: 50 MB
```

## Cleanup
```bash
aws lambda delete-function --function-name php-example-goodbye
aws lambda delete-function --function-name php-example-hello
aws lambda delete-layer-version --layer-name php-example-runtime --version-number 1
aws lambda delete-layer-version --layer-name php-example-vendor --version-number 1

Terminate the EC2 instance
```

## Reference
[Scripting Languages for AWS Lambda: Running PHP](https://aws.amazon.com/cn/blogs/compute/scripting-languages-for-aws-lambda-running-php-ruby-and-go/)

[AWS Lambda With PHP Using Bref And Serverless Framework](https://www.nexmo.com/blog/2020/03/16/aws-lambda-with-php-using-bref-and-serverless-framework-dr)