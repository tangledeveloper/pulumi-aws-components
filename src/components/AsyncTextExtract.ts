import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { Textract } from 'aws-sdk'

import { EventsQueue } from './EventsQueue'
import { SNSPublishPolicy } from './policies'

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
export class AsyncTextExtract extends pulumi.ComponentResource {
  readonly bucket: aws.s3.Bucket
  readonly snsTopic: aws.sns.Topic
  readonly role: aws.iam.Role
  readonly snsRolePolicy: aws.iam.RolePolicy
  readonly bucketEventSubscription: aws.s3.BucketEventSubscription
  readonly queue: EventsQueue
  readonly callbackFunction: aws.lambda.CallbackFunction<aws.s3.BucketEvent, void>

  /**
   * Creates an Amazon Textract pipeline from a bucket event.
   * Default operation is `GetDocumentTextDetection`
   * (https://docs.aws.amazon.com/textract/latest/dg/API_GetDocumentTextDetection.html)
   *
   * @param name The _unique_ name of the resource.
   * @param args The arguments to configure the TextExtractor.
   * @param opts A bag of options that control this resource's behavior.
   */
  constructor(name: string, args: TextExtractorArgs, opts?: pulumi.CustomResourceOptions) {
    super('aws:components:AsyncTextExtract', name, args, opts)

    // Default resource options for this component's child resources.
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }

    const identity = pulumi.output(aws.getCallerIdentity({ async: true }))

    const bucketName = `${name}-bucket`
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

    // 'AmazonTextract' will be used to create inline policy for iam:PassRole.
    // refer to https://docs.aws.amazon.com/textract/latest/dg/api-async-roles.html#api-async-roles-all-topics (step 8)
    const roleName = `AmazonTextract${name}-role`
    this.role = new aws.iam.Role(
      roleName,
      {
        name: roleName,
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: ['ec2.amazonaws.com', 'textract.amazonaws.com', 'lambda.amazon.aws']
        })
      },
      defaultResourceOptions
    )

    const topicName = `${name}-sns-topic`
    const rolePolicyName = `${roleName}-policy`
    this.snsRolePolicy = new aws.iam.RolePolicy(
      rolePolicyName,
      {
        role: this.role,
        name: rolePolicyName,
        policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['sns:Publish'],
              Resource: `arn:aws:sns:*:*:${topicName}`
            }
          ]
        }
      },
      defaultResourceOptions
    )

    this.snsTopic = new aws.sns.Topic(
      topicName,
      {
        name: topicName
      },
      defaultResourceOptions
    )

    const snsPolicy = new SNSPublishPolicy(`${topicName}-policy`, { topicArn: this.snsTopic.arn })
    new aws.iam.RolePolicyAttachment(
      `${topicName}-policy-attachment`,
      {
        policyArn: snsPolicy.policy.arn,
        role: roleName
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
      const extract = new Textract({})
      try {
        for (const record of records) {
          extract
            .startDocumentTextDetection({
              JobTag: record.s3.object.key,
              DocumentLocation: {
                S3Object: {
                  Bucket: record.s3.bucket.name,
                  Name: record.s3.object.key
                }
              },
              NotificationChannel: {
                RoleArn,
                SNSTopicArn
              }
            })
            .send()
        }

        callback(undefined, undefined)
      } catch (error) {
        callback(error, undefined)
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
            ROLE_ARN: pulumi.interpolate`arn:aws:iam::${identity.accountId}:role/${roleName}`,
            SNS_TOPIC_ARN: pulumi.interpolate`arn:aws:sns:${aws.config.region}:${identity.accountId}:${topicName}`
          }
        }
      },
      defaultResourceOptions
    )

    this.bucketEventSubscription = bucket.onObjectCreated(
      `${name}-AsyncTextExtractor-onUpload`,
      this.callbackFunction,
      {
        filterSuffix: '*.pdf'
      },
      defaultResourceOptions
    )

    this.queue = new EventsQueue(`${name}-events-queue`, { topic: this.snsTopic }, defaultResourceOptions)

    this.registerOutputs({
      role: this.role,
      snsTopic: this.snsTopic,
      queue: this.queue,
      callbackFunction: this.callbackFunction,
      bucketEventSubscription: this.bucketEventSubscription
    })
  }
}