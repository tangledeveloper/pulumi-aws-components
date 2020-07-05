Following are the resource it creates for this example

```
Previewing update (dev):
     Type                                         Name                                                                        Plan
 +   pulumi:pulumi:Stack                          text-extract-dev                                                            create
 +   ├─ aws:components:S3ReadWritePolicy          text-extract-dev-s3-policy                                                  create
 +   │  └─ aws:iam:Policy                         text-extract-dev-s3-policy                                                  create
 +   ├─ aws:components:AsyncTextExtract           text-extract-dev                                                            create
 +   │  ├─ aws:sqs:QueueEventSubscription         text-extract-dev-queue-event-subscription                                   create
 +   │  │  ├─ aws:lambda:EventSourceMapping       text-extract-dev-queue-event-subscription                                   create
 +   │  │  └─ aws:lambda:Permission               text-extract-dev-queue-event-subscription                                   create
 +   │  ├─ aws:sqs:QueueEventSubscription         text-extract-dev-job-status-notification-subscription                       create
 +   │  │  ├─ aws:lambda:EventSourceMapping       text-extract-dev-job-status-notification-subscription                       create
 +   │  │  └─ aws:lambda:Permission               text-extract-dev-job-status-notification-subscription                       create
 +   │  ├─ aws:components:SQSProcessPolicy        text-extract-dev-s3-notification-queue-process-policy                       create
 +   │  │  └─ aws:iam:Policy                      text-extract-dev-s3-notification-queue-process-policy                       create
 +   │  ├─ aws:components:S3NotificationQueue     text-extract-dev-s3-notification-queue                                      create
 +   │  │  ├─ aws:sqs:Queue                       text-extract-dev-s3-notification-queue                                      create
 +   │  │  ├─ aws:s3:BucketNotification           text-extract-dev-s3-notification-queue-s3ObjectCreated-png                  create
 +   │  │  ├─ aws:s3:BucketNotification           text-extract-dev-s3-notification-queue-s3ObjectCreated-jpeg                 create
 +   │  │  ├─ aws:s3:BucketNotification           text-extract-dev-s3-notification-queue-s3ObjectCreated-jpg                  create
 +   │  │  ├─ aws:sqs:QueuePolicy                 text-extract-dev-s3-notification-queue-s3-permission                        create
 +   │  │  └─ aws:s3:BucketNotification           text-extract-dev-s3-notification-queue-s3ObjectCreated-pdf                  create
 +   │  ├─ aws:components:SQSProcessPolicy        text-extract-dev-job-status-queue-process-policy                            create
 +   │  │  └─ aws:iam:Policy                      text-extract-dev-job-status-queue-process-policy                            create
 +   │  ├─ aws:components:LambdaCloudWatchPolicy  text-extract-dev-job-result-processing-lambda-cloudwatch-policy             create
 +   │  │  ├─ aws:cloudwatch:LogGroup             text-extract-dev-job-result-processing-lambda-cloudwatch-policy-log-group   create
 +   │  │  └─ aws:iam:Policy                      text-extract-dev-job-result-processing-lambda-cloudwatch-policy             create
 +   │  ├─ aws:components:LambdaCloudWatchPolicy  text-extract-dev-cloudwatch-policy                                          create
 +   │  │  ├─ aws:cloudwatch:LogGroup             text-extract-dev-cloudwatch-policy-log-group                                create
 +   │  │  └─ aws:iam:Policy                      text-extract-dev-cloudwatch-policy                                          create
 +   │  ├─ aws:components:TextractPolicy          text-extract-dev-textract-policy                                            create
 +   │  │  └─ aws:iam:Policy                      text-extract-dev-textract-policy                                            create
 +   │  ├─ aws:iam:Role                           text-extract-dev-ServiceRole                                                create
 +   │  ├─ aws:s3:Bucket                          text-extract-dev-bucket                                                     create
 +   │  ├─ aws:lambda:Function                    text-extract-dev-job-result-processing-lambda                               create
 +   │  ├─ aws:lambda:Function                    text-extract-dev-s3-notification-lambda                                     create
 +   │  ├─ aws:iam:RolePolicyAttachment           text-extract-dev-job-result-processing-lambda-cloudwatch-policy-attachment  create
 +   │  ├─ aws:iam:RolePolicyAttachment           text-extract-dev-cloudwatch-policy-attachment                               create
 +   │  ├─ aws:iam:RolePolicyAttachment           text-extract-dev-textract-policy-attachment                                 create
 +   │  ├─ aws:iam:RolePolicyAttachment           text-extract-dev-job-status-queue-process-policy-attach                     create
 +   │  ├─ aws:iam:RolePolicyAttachment           text-extract-dev-job-status-publish-policy-attachment                       create
 +   │  ├─ aws:iam:RolePolicyAttachment           text-extract-dev-s3-policy-attachment                                       create
 +   │  └─ aws:iam:RolePolicyAttachment           text-extract-dev-s3-notification-queue-process-policy-attach                create
 +   ├─ aws:components:SNSPublishPolicy           text-extract-dev-job-status-publish-policy                                  create
 +   │  └─ aws:iam:Policy                         text-extract-dev-job-status-publish-policy                                  create
 +   ├─ aws:components:SNSEventsQueue             text-extract-dev-job-status-queue                                           create
 +   │  ├─ aws:sqs:Queue                          text-extract-dev-job-status-queue                                           create
 +   │  ├─ aws:sqs:QueuePolicy                    text-extract-dev-job-status-queue-topic-permission                          create
 +   │  └─ aws:sns:TopicSubscription              text-extract-dev-job-status-queue-topic-subscription                        create
 +   └─ aws:sns:Topic                             text-extract-dev-job-status                                                 create

Resources:
    + 47 to create

```
