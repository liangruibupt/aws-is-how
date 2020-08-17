# Lambda and Step Funtions invoke actions in CodePipeline

## Lambda invoke actions

### Step 1: Create a Lambda function

1. Create `myCodePipelineInvokeFunction` Lambda function

Note: the Lambda execution role need permission of `codepipeline:PutJobSuccessResult`

```javascript
var AWS = require('aws-sdk');

exports.handler = function(event, context) {
    var codepipeline = new AWS.CodePipeline();
    
    // Retrieve the Job ID from the Lambda action
    var jobId = event["CodePipeline.job"].id;
    
    // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline,
    // in this case it is the Commit ID of the latest change of the pipeline.
    var commitId = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters; 
    
    // The region from where the lambda function is being executed.
    var lambdaRegion = process.env.AWS_REGION;
    
    // Notify AWS CodePipeline of a successful job
    var putJobSuccess = function(message) {
        var successInput = {
            jobId: jobId,
            outputVariables: {
                testRunId: Math.floor(Math.random() * 1000).toString(),
                dateTime: Date(Date.now()).toString(),
                region: lambdaRegion
            }
        };
        codepipeline.putJobSuccessResult(successInput, function(err, data) {
            if(err) {
                context.fail(err);      
            } else {
                context.succeed(message);      
            }
        });
    };
    
    // Notify AWS CodePipeline of a failed job
    var putJobFailure = function(message) {
        var failureInput = {
            jobId: jobId,
            failureDetails: {
                message: JSON.stringify(message),
                type: 'JobFailed',
                externalExecutionId: context.invokeid
            }
        };
        codepipeline.putJobFailureResult(failureInput, function(err, data) {
            context.fail(message);      
        });
    };
    
    var sendResult = function() {
        try {
            console.log("Testing commit - " + commitId);
            
            // Your tests here
            
            // Succeed the job
            putJobSuccess("Tests passed.");
        } catch (ex) {
            // If any of the assertions failed then fail the job
            putJobFailure(ex);    
        }
    };
    
    sendResult();
};
```

### Step 2: Add a Lambda invoke action and manual approval action to your pipeline

Reuse the `two-stage-pipeline` pipeline define in [two-stage-pipeline quickstart](README.md)

1. Add a stage after the Deploy Stage before Production Deploy Stage in the `two-stage-pipeline` pipeline. Enter a name for the stage: `Lambda-Testing`
  - Add an action, Action name： Test_Commit.
  - Action provider: AWS Lambda.
  - Input artifacts: SourceArtifact.
  - Function name: `myCodePipelineInvokeFunction`
  - User parameters: `#{SourceVariables.CommitId}`
  - Variable namespace: TestVariables
  - Output artifacts: leave blank

2. Add the manual approval action to your pipeline.

Before deploy to production, we need manual approval step. After Lambda-Testing, add Stage Approval

  - Action name: Change_Approval.
  - Action provider: Manual approval.
  - In URL for review, construct the URL by adding the variable syntax for the region variable and the CommitId variable. Make sure that you use the namespaces assigned to the actions that provide the output variables.
  - URL for review: `https://#{TestVariables.region}.console.aws.amazon.com/codesuite/codecommit/repositories/MyDemoRepo/commit/#{SourceVariables.CommitId}`
  - Comments: `Make sure to review the code before approving this action. Test Run ID: #{TestVariables.testRunId}`
  - Variable namespace: leave blank

### Step 3: Verify your pipeline ran successfully
1. Verify your pipeline ran successfully
2. When the pipeline reaches the manual approval stage, choose Review. The resolved variables appear as the URL for the commit ID. Your approver can choose the URL to view the commit.
3. After approve, the pipeline can be continue executed

##  Step Funtions invoke actions

### Step 1: Create a Step Funtions

Create a state machine using the `HelloWorld` sample template

### Step 2: Add a Step Functions invoke action to your pipeline

Add a stage after the `Lambda-Testing` Stage before `Approval` Stage in the `two-stage-pipeline` pipeline. Enter a name for the stage: `StepFunction-Testing`
  - Add an action, Action name： StepFunction-Invoke.
  - Action provider: AWS Step Functions.
  - Input artifacts: SourceArtifact.
  - Function name: `stateMachine:HelloWorld`
  - Execution name prefix: `codepipline_`
  - Input type: Literal.
  - Input: `{"IsHelloWorldExample": true}`

### Step 3: Verify your pipeline ran successfully
1. Verify your pipeline ran successfully
2. When the pipeline complete the Step Functions stage, in the AWS Step Functions console, view your state machine of  state machine name HelloWorld and the state machine execution ID with the prefix `codepipline_`.
