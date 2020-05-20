package main

import (
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/aws/awserr"
        "github.com/aws/aws-sdk-go/service/route53"
)

func main() {

    sess, err := session.NewSession(&aws.Config{
        Region: aws.String("cn-northwest-1"),
        Endpoint: aws.String("https://route53.amazonaws.com.cn")},
    )

    svc := route53.New(sess)
    input := &route53.GetHostedZoneInput{
        Id: aws.String("Z08580531MSSNAPKT4258"),
    }
    
    result, err := svc.GetHostedZone(input)
    if err != nil {
        if aerr, ok := err.(awserr.Error); ok {
            switch aerr.Code() {
            case route53.ErrCodeNoSuchHostedZone:
                fmt.Println(route53.ErrCodeNoSuchHostedZone, aerr.Error())
            case route53.ErrCodeInvalidInput:
                fmt.Println(route53.ErrCodeInvalidInput, aerr.Error())
            default:
                fmt.Println(aerr.Error())
            }
        } else {
            // Print the error, cast err to awserr.Error to get the Code and
            // Message from an error.
            fmt.Println(err.Error())
        }
        return
    }
    
    fmt.Println(result)
}
