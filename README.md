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
- [AWS Textract](src/components/AsyncTextExtract.ts)

  Following are the resource it creates

  ```
      Previewing update (testing):
      Type                                  Name                                                                  Plan
  +   pulumi:pulumi:Stack                   pdf-text-extractor-testing                                                create
  +   ├─ aws:components:AsyncTextExtract    pdf-text-extractor                                  create
  +   │  ├─ aws:components:EventsQueue      pdf-text-extractor-events-queue                     create
  +   │  │  ├─ aws:sqs:Queue                pdf-text-extractor-events-queue                     create
  +   │  │  ├─ aws:sns:TopicSubscription    pdf-text-extractor-events-queue-topic-subscription  create
  +   │  │  └─ aws:sqs:QueuePolicy          pdf-text-extractor-events-queue-topic-permission    create
  +   │  ├─ aws:s3:BucketEventSubscription  pdf-text-extractor-AsyncTextExtractor-onUpload      create
  +   │  │  └─ aws:lambda:Permission        pdf-text-extractor-AsyncTextExtractor-onUpload      create
  +   │  ├─ aws:sns:Topic                   pdf-text-extractor-sns-topic                        create
  +   │  ├─ aws:s3:Bucket                   pdf-text-extractor-bucket                           create
  +   │  │  └─ aws:s3:BucketNotification    pdf-text-extractor-AsyncTextExtractor-onUpload      create
  +   │  ├─ aws:iam:Role                    AmazonTextract-pdf-text-extractor-role               create
  +   │  ├─ aws:iam:RolePolicy              AmazonTextract-pdf-text-extractor-role-policy        create
  +   │  ├─ aws:iam:RolePolicyAttachment    pdf-text-extractor-sns-topic-policy-attachment      create
  +   │  └─ aws:lambda:Function             pdf-text-extractor-lambda-callback                  create
  +   └─ aws:components:SNSPublishPolicy    pdf-text-extractor-sns-topic-policy                 create
  +      └─ aws:iam:Policy                  pdf-text-extractor-sns-topic-policy                 create

  Resources:
      + 17 to create
  ```

- [EventsQueue](src/components/EventsQueue.ts)
- [QueueLambda](src/components/QueueLambda.ts)

_TODO_: _Add more detailed docs_
