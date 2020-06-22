import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import * as AWS from 'aws-sdk'

import { EventsQueue } from './EventsQueue'
import { LambdaCloudWatchPolicy, S3ReadWritePolicy, SNSPublishPolicy, TextractPolicy } from './policies'

interface TextExtractorArgs {
  /**
   * Bucket to use for the events.
   * If omitted, a new s3 bucket will be created.
   */
  bucket?: aws.s3.Bucket
}

/**
 * Configures Amazon Textract for Asynchronous Operations
 */
export class AsyncTextract extends pulumi.ComponentResource {
  readonly bucket: aws.s3.Bucket
  readonly snsTopic: aws.sns.Topic
  readonly role: aws.iam.Role
  readonly snsPolicy: SNSPublishPolicy
  readonly s3ReadWritePolicy: S3ReadWritePolicy
  readonly textractPolicy: TextractPolicy
  readonly bucketEventSubscription: aws.s3.BucketEventSubscription
  readonly queue: EventsQueue
  readonly callbackFunction: aws.lambda.CallbackFunction<aws.s3.BucketEvent, void>

  /**
   * Creates an Amazon Textract pipeline from a bucket event.
   * Default operation is `StartDocumentTextDetection`
   * (https://docs.aws.amazon.com/textract/latest/dg/API_StartDocumentTextDetection.html)
   *
   * @param name The _unique_ name of the resource.
   * @param args The arguments to configure the TextExtractor.
   * @param opts A bag of options that control this resource's behavior.
   */
  constructor(name: string, args: TextExtractorArgs, opts?: pulumi.CustomResourceOptions) {
    super('aws:components:AsyncTextExtract', name, args, opts)

    // Default resource options for this component's child resources.
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }

    const bucketName = `${name.toLowerCase()}-bucket`
    const {
      bucket = new aws.s3.Bucket(
        bucketName,
        {
          bucket: bucketName,
          serverSideEncryptionConfiguration: {
            rule: {
              applyServerSideEncryptionByDefault: {
                sseAlgorithm: 'AES256'
              }
            }
          }
        },
        defaultResourceOptions
      )
    } = args

    this.bucket = bucket

    const topicName = `${name}-sns-topic`
    this.snsTopic = new aws.sns.Topic(
      topicName,
      {
        name: topicName
      },
      defaultResourceOptions
    )

    // 'AmazonTextractServiceRole' will be used to create inline policy for iam:PassRole.
    // refer to https://docs.aws.amazon.com/textract/latest/dg/api-async-roles.html#api-async-roles-all-topics (step 8)
    const roleName = `AmazonTextractServiceRole${name}`
    this.role = new aws.iam.Role(
      roleName,
      {
        name: roleName,
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: ['textract.amazonaws.com', 'lambda.amazonaws.com']
        })
      },
      defaultResourceOptions
    )

    this.snsPolicy = new SNSPublishPolicy(`${topicName}-policy`, { topicArn: this.snsTopic.arn })
    new aws.iam.RolePolicyAttachment(
      `${topicName}-policy-attachment`,
      {
        policyArn: this.snsPolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    this.s3ReadWritePolicy = new S3ReadWritePolicy(`${name}-s3-policy`, { bucketArn: this.bucket.arn })
    new aws.iam.RolePolicyAttachment(
      `${name}-s3-policy-attachment`,
      {
        policyArn: this.s3ReadWritePolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    this.textractPolicy = new TextractPolicy(`${name}-textract-policy`, {}, defaultResourceOptions)
    new aws.iam.RolePolicyAttachment(
      `${name}-textract-policy-attachment`,
      {
        policyArn: this.textractPolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    const eventHandler: aws.s3.BucketEventHandler = (ev, _, callback) => {
      const records = ev.Records || []
      const RoleArn = process.env['ROLE_ARN']
      const SNSTopicArn = process.env['SNS_TOPIC_ARN']
      if (!RoleArn || !SNSTopicArn) {
        throw new Error('Required ENV are not present')
      }
      const extract = new AWS.Textract({ logger: console })
      const [record] = records
      const Bucket = record.s3.bucket.name
      const key = record.s3.object.key

      try {
        extract
          .startDocumentTextDetection(
            {
              JobTag: record.s3.object.key,
              DocumentLocation: {
                S3Object: {
                  Bucket,
                  Name: key
                }
              },
              NotificationChannel: {
                RoleArn,
                SNSTopicArn
              }
            },
            (err, data) => {
              if (err) {
                callback(err, undefined)
                return
              }
              console.log(data.JobId)
              callback(undefined, undefined)
            }
          )
          .send()
      } catch (err) {
        callback(err, undefined)
      }
    }

    const lambdaName = `${name}-lambda-callback`
    this.callbackFunction = new aws.lambda.CallbackFunction(
      lambdaName,
      {
        name: lambdaName,
        callback: eventHandler,
        role: this.role,
        runtime: aws.lambda.NodeJS12dXRuntime,
        environment: {
          variables: {
            ROLE_ARN: this.role.arn,
            SNS_TOPIC_ARN: this.snsTopic.arn
          }
        }
      },
      defaultResourceOptions
    )

    const cloudwatchPolicy = new LambdaCloudWatchPolicy(
      `${name}-cloudwatch-policy`,
      { lambdaName },
      defaultResourceOptions
    )
    new aws.iam.RolePolicyAttachment(
      `${name}-cloudwatch-policy-attachment`,
      {
        policyArn: cloudwatchPolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    this.bucketEventSubscription = bucket.onObjectCreated(
      `${name}-AsyncTextExtractor-onUpload`,
      this.callbackFunction,
      {
        event: '*',
        filterSuffix: '.pdf'
      },
      defaultResourceOptions
    )

    this.queue = new EventsQueue(`${name}-events-queue`, { topic: this.snsTopic }, defaultResourceOptions)

    this.registerOutputs({
      role: { name: this.role.name, arn: this.role.arn },
      snsTopic: { name: this.snsTopic.name, arn: this.snsTopic.arn },
      queue: { name: this.queue.queue.name, url: this.queue.queue.id },
      callbackFunction: { name: this.callbackFunction.name, arn: this.callbackFunction.arn }
    })
  }
}
