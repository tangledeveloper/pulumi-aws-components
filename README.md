### Pulumi AWS Components

Collection of custom pulumi resources based on best practices.

[![npm version](https://badge.fury.io/js/pulumi-aws-components.svg)](https://www.npmjs.com/pulumi-aws-components)

#### How to use

```
npm i --save-dev pulumi-aws-components
```

#### Available Components

- [Reusable resource based IAM policies](src/components/policies)
  These policies can be easily attached to IAM role.

- [LambdaFunction](src/components/LambdaFunction.ts)
- [AWS Textract for Async Operations](src/components/AsyncTextract.ts)

  Following are the resource it creates with name `text-extractor`

  ```
    Previewing update :
      Type                                         Name                                                          Plan
  +   pulumi:pulumi:Stack                          text-extractor-pdf                                            create
  +   ├─ aws:components:AsyncTextExtract           text-extractor-pdf                                            create
  +   │  ├─ aws:s3:BucketEventSubscription         text-extractor-pdf-AsyncTextExtractor-onUpload                create
  +   |  │  └─ aws:lambda:Permission               text-extractor-pdf-AsyncTextExtractor-onUpload                create
  +   │  ├─ aws:components:EventsQueue             text-extractor-pdf-events-queue                               create
  +   │  │  ├─ aws:sqs:Queue                       text-extractor-pdf-events-queue                               create
  +   │  │  ├─ aws:sns:TopicSubscription           text-extractor-pdf-events-queue-topic-subscription            create
  +   │  │  └─ aws:sqs:QueuePolicy                 text-extractor-pdf-events-queue-topic-permission              create
  +   │  ├─ aws:components:LambdaCloudWatchPolicy  text-extractor-pdf-cloudwatch-policy                          create
  +   │  │  ├─ aws:cloudwatch:LogGroup             text-extractor-pdf-cloudwatch-policy-log-group                create
  +   │  │  └─ aws:iam:Policy                      text-extractor-pdf-cloudwatch-policy                          create
  +   │  ├─ aws:sns:Topic                          text-extractor-pdf-sns-topic                                  create
  +   │  ├─ aws:iam:Role                           AmazonTextractServiceRoletext-extractor-pdf                   create
  +   │  ├─ aws:s3:Bucket                          text-extractor-pdf-bucket                                     create
  +   |  |  └─ aws:s3:BucketNotification           text-extractor-pdf-AsyncTextExtractor-onUpload                create
  +   │  ├─ aws:lambda:Function                    text-extractor-pdf-lambda-callback                            create
  +   │  ├─ aws:iam:RolePolicyAttachment           text-extractor-pdf-cloudwatch-policy-attachment               create
  +   │  ├─ aws:iam:RolePolicyAttachment           text-extractor-pdf-sns-topic-policy-attachment                create
  +   |  └─ aws:iam:RolePolicyAttachment           text-extractor-pdf-textract-policy-attachment                 create
  +   │  └─ aws:iam:RolePolicyAttachment           text-extractor-pdf-s3-policy-attachment                       create
  +   |─ aws:components:TextractPolicy             text-extractor-pdf-textract-policy                            create
  +   │  └─ aws:iam:Policy                         text-extractor-pdf-textract-policy                            create
  +   |─ aws:components:SNSPublishPolicy           text-extractor-pdf-sns-topic-policy                           create
  +   │  └─ aws:iam:Policy                         text-extractor-pdf-sns-topic-policy                           create
  +   ├─ aws:components:S3ReadWritePolicy          text-extractor-pdf-s3-policy                                  create
  +   └─ └─ aws:iam:Policy                         text-extractor-pdf-s3-policy                                  create

  Resources:
      + 26 to create
  ```

- [SNSEventsQueue](src/components/SNSEventsQueue.ts)
- [QueueLambda](src/components/QueueLambda.ts)
