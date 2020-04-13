# 想定时调用一个需要传入参数的lambda

# 通过 Events::Rule 来编写
```yaml
LambdaScheduleEvent:
    Type: AWS::Events::Rule
    Properties:
        Description: ’schedule event for lambda’
        ScheduleExpression: 'cron(0/1 * * * ? *)'
        State: ENABLED
        Targets:
          - Arn: !GetAtt HelloworldLambdaFunction.Arn
            Id: ScheduleEvent1Target
            Input : String
            InputPath : String
```