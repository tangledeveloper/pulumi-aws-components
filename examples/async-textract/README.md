Following are the resource it creates for this example

```
Updating (dev):
     Type                                         Name                                                                          Status
 +   pulumi:pulumi:Stack                          text-extract-dev                                                              created
 +   └─ aws:components:AsyncTextExtract           text-extract-dev                                                              created
 +      ├─ aws:components:LambdaCloudWatchPolicy  text-extract-dev-s3-notification-lambda-cloudwatch-policy                     created
 +      │  ├─ aws:cloudwatch:LogGroup             text-extract-dev-s3-notification-lambda-cloudwatch-policy-log-group           created
 +      │  └─ aws:iam:Policy                      text-extract-dev-s3-notification-lambda-cloudwatch-policy                     created
 +      ├─ aws:components:SNSPublishPolicy        text-extract-dev-job-status-publish-policy                                    created
 +      │  └─ aws:iam:Policy                      text-extract-dev-job-status-publish-policy                                    created
 +      ├─ aws:components:SNSEventsQueue          text-extract-dev-job-status-job-status-notification-queue                     created
 +      │  ├─ aws:sqs:Queue                       text-extract-dev-job-status-job-status-notification-queue                     created
 +      │  ├─ aws:sns:TopicSubscription           text-extract-dev-job-status-job-status-notification-queue-topic-subscription  created
 +      │  └─ aws:sqs:QueuePolicy                 text-extract-dev-job-status-job-status-notification-queue-topic-permission    created
 +      ├─ aws:components:S3NotificationQueue     text-extract-dev-s3-notification-queue                                        created
 +      │  ├─ aws:sqs:Queue                       text-extract-dev-s3-notification-queue                                        created
 +      │  ├─ aws:sqs:QueuePolicy                 text-extract-dev-s3-notification-queue-s3-permission                          created
 +      │  └─ aws:s3:BucketNotification           text-extract-dev-s3-notification-queue-s3ObjectCreated                        created
 +      ├─ aws:components:SQSProcessPolicy        text-extract-dev-job-status-queue-process-policy                              created
 +      │  └─ aws:iam:Policy                      text-extract-dev-job-status-queue-process-policy                              created
 +      ├─ aws:components:LambdaCloudWatchPolicy  text-extract-dev-job-result-processing-lambda-cloudwatch-policy               created
 +      │  ├─ aws:cloudwatch:LogGroup             text-extract-dev-job-result-processing-lambda-cloudwatch-policy-log-group     created
 +      │  └─ aws:iam:Policy                      text-extract-dev-job-result-processing-lambda-cloudwatch-policy               created
 +      ├─ aws:sqs:QueueEventSubscription         text-extract-dev-job-status-notification-subscription                         created
 +      │  ├─ aws:lambda:Permission               text-extract-dev-job-status-notification-subscription                         created
 +      │  └─ aws:lambda:EventSourceMapping       text-extract-dev-job-status-notification-subscription                         created
 +      ├─ aws:components:SQSProcessPolicy        text-extract-dev-s3-notification-queue-process-policy                         created
 +      │  └─ aws:iam:Policy                      text-extract-dev-s3-notification-queue-process-policy                         created
 +      ├─ aws:components:S3ReadWritePolicy       text-extract-dev-s3-policy                                                    created
 +      │  └─ aws:iam:Policy                      text-extract-dev-s3-policy                                                    created
 +      ├─ aws:sqs:QueueEventSubscription         text-extract-dev-queue-event-subscription                                     created
 +      │  ├─ aws:lambda:EventSourceMapping       text-extract-dev-queue-event-subscription                                     created
 +      │  └─ aws:lambda:Permission               text-extract-dev-queue-event-subscription                                     created
 +      ├─ aws:components:TextractPolicy          text-extract-dev-textract-policy                                              created
 +      │  └─ aws:iam:Policy                      text-extract-dev-textract-policy                                              created
 +      ├─ aws:sns:Topic                          text-extract-dev-job-status                                                   created
 +      ├─ aws:iam:Role                           text-extract-dev-ServiceRole                                                  created
 +      ├─ aws:s3:Bucket                          text-extract-dev-bucket                                                       created
 +      ├─ aws:lambda:Function                    text-extract-dev-s3-notification-lambda                                       created
 +      ├─ aws:iam:RolePolicyAttachment           text-extract-dev-s3-notification-lambda-cloudwatch-policy-attachment          created
 +      ├─ aws:lambda:Function                    text-extract-dev-job-result-processing-lambda                                 created
 +      ├─ aws:iam:RolePolicyAttachment           text-extract-dev-job-result-processing-lambda-cloudwatch-policy-attachment    created
 +      ├─ aws:iam:RolePolicyAttachment           text-extract-dev-textract-policy-attachment                                   created
 +      ├─ aws:iam:RolePolicyAttachment           text-extract-dev-job-status-publish-policy-attachment                         created
 +      ├─ aws:iam:RolePolicyAttachment           text-extract-dev-s3-notification-queue-process-policy-attach                  created
 +      ├─ aws:iam:RolePolicyAttachment           text-extract-dev-job-status-queue-process-policy-attach                       created
 +      └─ aws:iam:RolePolicyAttachment           text-extract-dev-s3-policy-attachment                                         created

Outputs:
    output: {
        bucket                             : "text-extract-dev-bucket"
        jobResultProcessingLambda          : "text-extract-dev-job-result-processing-lambda"
        jobStatusNotificationQueue         : "https://sqs.eu-central-1.amazonaws.com/XXXXXXXXXXXX/text-extract-dev-job-status-job-status-notification-queue"
        s3NotificationQueue                : "https://sqs.eu-central-1.amazonaws.com/XXXXXXXXXXXX/text-extract-dev-s3-notification-queue"
        s3NotificationQueueProcessingLambda: "text-extract-dev-s3-notification-lambda"
    }

Resources:
    + 44 created

Duration: 36s
```
