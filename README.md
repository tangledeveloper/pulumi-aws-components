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
- [S3 - SQS subscription queue](src/components/S3NotificationQueue.ts)
- [AWS Textract for Async Operations](src/components/AsyncTextract.ts)
- [SNS - SQS subscription Queue](src/components/SNSEventsQueue.ts)
- [SQS Processing Lambda](src/components/QueueLambda.ts)
