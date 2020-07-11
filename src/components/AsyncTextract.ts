import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import * as AWS from 'aws-sdk'
import {
  LambdaCloudWatchPolicy,
  S3ReadWritePolicy,
  SNSPublishPolicy,
  SQSProcessPolicy,
  TextractPolicy
} from './policies'
import { S3NotificationQueue } from './S3NotificationQueue'
import { SNSEventsQueue } from './SNSEventsQueue'
import { PromiseResult } from 'aws-sdk/lib/request'
import { extname } from 'path'

export interface TextExtractorArgs {
  /**
   * Bucket to use for the events.
   *
   * If omitted, a new s3 bucket will be created.
   */
  bucket?: aws.s3.Bucket

  /**
   * File formats that need to be handled.
   *
   * By default all supported file formats will be used.
   */
  fileFormats?: ('jpeg' | 'png' | 'pdf')[]

  /**
   * Available Operations:
   *  - `StartDocumentTextDetection` (https://docs.aws.amazon.com/textract/latest/dg/API_StartDocumentTextDetection.html)
   *  - `StartDocumentAnalysis` (https://docs.aws.amazon.com/textract/latest/dg/API_StartDocumentAnalysis.html)
   *
   * Default operation is `StartDocumentTextDetection`
   */
  operation?: 'StartDocumentAnalysis' | 'StartDocumentTextDetection'

  /**
   * A list of the types of analysis to perform.
   * Only used if `operation` is `StartDocumentAnalysis`. If omitted, defaults to ["TABLES", "FORMS"].
   * https://docs.aws.amazon.com/textract/latest/dg/API_StartDocumentAnalysis.html#API_StartDocumentAnalysis_RequestSyntax
   */
  featureTypes?: AWS.Textract.FeatureTypes
}

/**
 * Configures Amazon Textract pipeline for Asynchronous Operations.
 *
 * In the simplest form;
 * ```typescript
 * import { AsyncTextract } from 'pulumi-aws-components'
 *
 * // To extract text from  PDF, JPEG, PNG
 * const textExtract = new AsyncTextract('text-extractor', {})
 *
 * // To extract text from PDF only
 * const pdfTextExtractor = new new AsyncTextract('text-extractor-pdf', {
 *  fileFormats: ['pdf']
 * })
 * ```
 */
export class AsyncTextract extends pulumi.ComponentResource {
  /**
   * Service role used for entire pipeline
   */
  readonly role: aws.iam.Role

  /**
   * Source bucket for the pipeline to trigger events against
   */
  readonly bucket: aws.s3.Bucket

  /**
   * Queue that subscribes to bucket events
   */
  readonly s3NotificationQueue: S3NotificationQueue

  /**
   * Lambda that processes messages from bucket events queue (i.e. `s3NotificationQueue`)
   */
  readonly s3NotificationQueueProcessingLambda: aws.lambda.CallbackFunction<aws.sqs.QueueEvent, void>

  /**
   * SNS topic that will be used by Textract to send job status notifications
   */
  readonly jobStatusNotificationTopic: aws.sns.Topic

  /**
   * Queue that subscribes to SNS `jobStatusNotificationTopic`
   */
  readonly jobStatusNotificationQueue: SNSEventsQueue

  /**
   * Lambda that processes messages from job status queue (i.e. `jobStatusNotificationQueue`)
   */
  readonly jobResultProcessingLambda: aws.lambda.CallbackFunction<aws.sqs.QueueEvent, void>

  readonly bucketReadWritePolicy: S3ReadWritePolicy
  readonly s3NotificationQueueProcessPolicy: SQSProcessPolicy
  readonly jobStatusNotificationQueueProcessPolicy: SQSProcessPolicy
  readonly jobStatusPublishPolicy: SNSPublishPolicy
  readonly textractPolicy: TextractPolicy

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

    // Role
    const roleName = `${name}-ServiceRole`
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

    // S3 Bucket and it's policies
    const bucketName = `${name.toLowerCase()}-bucket`
    const {
      operation = 'StartDocumentTextDetection',
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

    // SNS Topic for the job status / result notification
    const jobStatusNotificationTopicName = `${name}-job-status`
    this.jobStatusNotificationTopic = new aws.sns.Topic(
      jobStatusNotificationTopicName,
      {
        name: jobStatusNotificationTopicName
      },
      defaultResourceOptions
    )

    // S3 Notification Queue
    const fileFormats: string[] = args.fileFormats || ['pdf', 'jpeg', 'png']
    if (fileFormats.includes('jpeg')) {
      fileFormats.push('jpg')
    }

    this.s3NotificationQueue = new S3NotificationQueue(
      `${name}-s3-notification-queue`,
      {
        bucket: this.bucket,
        events: ['s3:ObjectCreated:*'],
        notificationFilterRules: fileFormats.map(format => ({
          filterSuffix: `.${format}`
        }))
      },
      defaultResourceOptions
    )

    // Lambda handler to process S3 Notifications
    const isTextDetection = operation === 'StartDocumentTextDetection'
    const lambdaName = `${name}-s3-notification-lambda`
    this.s3NotificationQueueProcessingLambda = new aws.lambda.CallbackFunction(
      lambdaName,
      {
        name: lambdaName,
        callback: startTextExtractionHandler,
        role: this.role,
        runtime: aws.lambda.NodeJS12dXRuntime,
        timeout: 30,
        environment: {
          variables: {
            ROLE_ARN: this.role.arn,
            S3_NOTIFICATION_QUEUE_URL: this.s3NotificationQueue.queue.id,
            SNS_TOPIC_JOB_STATUS_ARN: this.jobStatusNotificationTopic.arn,
            TEXTRACT_API: operation,
            ...(!isTextDetection && args.featureTypes && args.featureTypes.length
              ? { ANALYSIS_FEATURE_TYPES: args.featureTypes.join(',') }
              : {})
          }
        }
      },
      defaultResourceOptions
    )

    // Job Status queue subscribed to SNS topic `jobStatusNotificationTopic`
    const visibilityTimeoutSeconds = 60
    this.jobStatusNotificationQueue = new SNSEventsQueue(
      `${jobStatusNotificationTopicName}-job-status-notification-queue`,
      {
        topic: this.jobStatusNotificationTopic,
        visibilityTimeoutSeconds
      },
      defaultResourceOptions
    )

    // Lambda handler to process results
    const jobResultProcessingLambdaName = `${name}-job-result-processing-lambda`
    this.jobResultProcessingLambda = new aws.lambda.CallbackFunction(
      jobResultProcessingLambdaName,
      {
        name: jobResultProcessingLambdaName,
        callback: textractJobResultProcessor,
        role: this.role,
        runtime: aws.lambda.NodeJS12dXRuntime,
        timeout: visibilityTimeoutSeconds,
        environment: {
          variables: {
            JOB_STATUS_QUEUE_URL: this.jobStatusNotificationQueue.queue.id
          }
        }
      },
      defaultResourceOptions
    )

    // Permissions for assumed role
    this.bucketReadWritePolicy = new S3ReadWritePolicy(
      `${name}-s3-policy`,
      { bucketArn: this.bucket.arn },
      defaultResourceOptions
    )
    new aws.iam.RolePolicyAttachment(
      `${name}-s3-policy-attachment`,
      {
        policyArn: this.bucketReadWritePolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    this.jobStatusPublishPolicy = new SNSPublishPolicy(
      `${jobStatusNotificationTopicName}-publish-policy`,
      {
        topicArn: this.jobStatusNotificationTopic.arn
      },
      defaultResourceOptions
    )
    new aws.iam.RolePolicyAttachment(
      `${jobStatusNotificationTopicName}-publish-policy-attachment`,
      {
        policyArn: this.jobStatusPublishPolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    this.s3NotificationQueueProcessPolicy = new SQSProcessPolicy(
      `${name}-s3-notification-queue-process-policy`,
      { queueArn: this.s3NotificationQueue.queue.arn },
      defaultResourceOptions
    )
    new aws.iam.RolePolicyAttachment(
      `${name}-s3-notification-queue-process-policy-attach`,
      {
        policyArn: this.s3NotificationQueueProcessPolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    const cloudwatchPolicy = new LambdaCloudWatchPolicy(
      `${lambdaName}-cloudwatch-policy`,
      { lambdaName },
      defaultResourceOptions
    )
    new aws.iam.RolePolicyAttachment(
      `${lambdaName}-cloudwatch-policy-attachment`,
      {
        policyArn: cloudwatchPolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    this.jobStatusNotificationQueueProcessPolicy = new SQSProcessPolicy(
      `${name}-job-status-queue-process-policy`,
      { queueArn: this.jobStatusNotificationQueue.queue.arn },
      defaultResourceOptions
    )
    new aws.iam.RolePolicyAttachment(
      `${name}-job-status-queue-process-policy-attach`,
      {
        policyArn: this.jobStatusNotificationQueueProcessPolicy.policy.arn,
        role: this.role
      },
      defaultResourceOptions
    )

    const jobResultProcessingLambdaCloudwatchPolicy = new LambdaCloudWatchPolicy(
      `${jobResultProcessingLambdaName}-cloudwatch-policy`,
      { lambdaName: jobResultProcessingLambdaName },
      defaultResourceOptions
    )
    new aws.iam.RolePolicyAttachment(
      `${jobResultProcessingLambdaName}-cloudwatch-policy-attachment`,
      {
        policyArn: jobResultProcessingLambdaCloudwatchPolicy.policy.arn,
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

    // S3 notification queue event subscription
    this.s3NotificationQueue.queue.onEvent(
      `${name}-queue-event-subscription`,
      this.s3NotificationQueueProcessingLambda,
      {},
      defaultResourceOptions
    )

    this.jobStatusNotificationQueue.queue.onEvent(
      `${name}-job-status-notification-subscription`,
      this.jobResultProcessingLambda,
      {},
      defaultResourceOptions
    )

    this.registerOutputs({
      bucket,
      role: this.role,
      s3NotificationQueue: this.s3NotificationQueue,
      s3NotificationQueueProcessingLambda: this.s3NotificationQueueProcessingLambda,
      jobStatusNotificationQueue: this.jobStatusNotificationQueue,
      jobResultProcessingLambda: this.jobResultProcessingLambda
    })
  }
}

interface TextractNotificationMessage {
  Event?: 's3:TestEvent'
  Status: 'SUCCEEDED' | 'FAILED' | 'ERROR'
  JobTag: string
  JobId: string
  API: 'StartDocumentTextDetection' | 'StartDocumentAnalysis'
  Timestamp: number
  StatusMessage?: string
  DocumentLocation: {
    S3ObjectName: string
    S3Bucket: string
  }
}
async function getResults(JobId: string, api: TextractNotificationMessage['API']) {
  const textract = new AWS.Textract()

  let NextToken: string | undefined
  const blockList: AWS.Textract.Block[] = []
  do {
    const response =
      api === 'StartDocumentTextDetection'
        ? await textract.getDocumentTextDetection({ JobId, NextToken }).promise()
        : await textract.getDocumentAnalysis({ JobId, NextToken }).promise()

    NextToken = response.NextToken
    if (response.Blocks) {
      blockList.push(...response.Blocks)
    }
  } while (NextToken)

  return blockList
}

function extractText(blocks: AWS.Textract.Block[]) {
  const pdfText: string[] = []
  for (const block of blocks) {
    if (block.BlockType === 'LINE') {
      if (block.Text) {
        pdfText.push(block.Text)
      }
    }
  }

  return pdfText
}

function getText(result: AWS.Textract.Block, blocksMap: { [x: string]: AWS.Textract.Block }) {
  const text: string[] = []
  if (result.Relationships) {
    for (const relationship of result.Relationships) {
      if (relationship.Type === 'CHILD') {
        for (const childId in relationship.Ids) {
          const word = blocksMap[childId]
          if (word.BlockType === 'WORD') {
            text.push(word.Text || '')
          } else if (word.BlockType === 'SELECTION_ELEMENT' && word.SelectionStatus === 'SELECTED') {
            text.push('X')
          }
        }
      }
    }
  }

  return text.join(' ')
}

function getRowsColumnsMap(tableResult: AWS.Textract.Block, blocksMap: { [x: string]: AWS.Textract.Block }) {
  const rows: { [row: number]: { [column: number]: string } } = {}
  if (tableResult.Relationships) {
    for (const relationship of tableResult.Relationships) {
      if (relationship.Type === 'CHILD' && relationship.Ids) {
        for (const childId of relationship.Ids) {
          const cell = blocksMap[childId]
          if (cell.BlockType === 'CELL') {
            const rowIndex = cell.RowIndex
            const columnIndex = cell.ColumnIndex
            if (rowIndex && columnIndex) {
              if (rows[rowIndex]) {
                rows[rowIndex] = {}
              }
              rows[rowIndex][columnIndex] = getText(cell, blocksMap)
            }
          }
        }
      }
    }
  }

  return rows
}

function extractFormData(blocks: AWS.Textract.Block[]) {
  const keyBlocks: { [x: string]: AWS.Textract.Block } = {}
  const valueBlocks: { [x: string]: AWS.Textract.Block } = {}
  const blockMap: { [x: string]: AWS.Textract.Block } = {}

  const formKeyValue: { [x: string]: string | null } = {}

  for (const block of blocks) {
    if (block.Id) {
      blockMap[block.Id] = block

      if (block.BlockType === 'KEY_VALUE_SET') {
        if (block['EntityTypes']?.includes('KEY')) {
          keyBlocks[block.Id] = block
        } else {
          valueBlocks[block.Id] = block
        }
      }
    }
  }

  for (const blockId of Object.keys(keyBlocks)) {
    const keyBlock = keyBlocks[blockId]
    let valueBlock: AWS.Textract.Block | null = null

    if (keyBlock.Relationships) {
      for (const relationship of keyBlock.Relationships) {
        if (relationship.Type === 'VALUE' && relationship.Ids) {
          for (const id of relationship.Ids) {
            valueBlock = valueBlocks[id]
          }
        }
      }
    }

    const key = getText(keyBlock, blockMap)
    const value = valueBlock ? getText(valueBlock, blockMap) : null
    formKeyValue[key] = value
  }

  return formKeyValue
}

function extractTables(blocks: AWS.Textract.Block[]) {
  const blocksMap: { [x: string]: AWS.Textract.Block } = {}
  const tableBlocks: AWS.Textract.Block[] = []
  for (const block of blocks) {
    if (block.Id) {
      blocksMap[block.Id] = block
      if (block.BlockType === 'TABLE') {
        tableBlocks.push(block)
      }
    }
  }

  const csv: string[] = []
  let tableId = 1
  for (const table of tableBlocks) {
    const rows = getRowsColumnsMap(table, blocksMap)
    const tableName = `Table_${tableId}`

    csv.push(`Table: ${tableName}\n\n`)
    for (const row of Object.keys(rows)) {
      for (const column of Object.keys(rows[+row])) {
        csv.push(rows[+row][+column])
        csv.push(',')
      }
      csv.push('\n')
    }
    csv.push('\n\n')
    tableId += 1
  }

  if (!csv.length) {
    return null
  }

  csv.push('\n\n\n')
  return csv.join('')
}

const startTextExtractionHandler: aws.lambda.Callback<aws.sqs.QueueEvent, void> = async (ev, _, callback) => {
  const records = ev.Records || []
  const queueUrl = process.env['S3_NOTIFICATION_QUEUE_URL']
  const RoleArn = process.env['ROLE_ARN']
  const SNSTopicArn = process.env['SNS_TOPIC_JOB_STATUS_ARN']
  const textractAPI = process.env['TEXTRACT_API'] || 'StartDocumentTextDetection'

  if (!RoleArn || !queueUrl || !SNSTopicArn) {
    throw new Error('Required ENV are not present')
  }

  const extract = new AWS.Textract({ logger: console })
  const sqs = new AWS.SQS()

  for (const record of records) {
    const message: aws.s3.BucketEvent = JSON.parse(record.body)
    for (const bucketRecord of message.Records || []) {
      const Bucket = bucketRecord.s3.bucket.name
      const key = bucketRecord.s3.object.key
      const JobTag = key

      if (textractAPI === 'StartDocumentTextDetection') {
        await extract
          .startDocumentTextDetection({
            JobTag,
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
          })
          .promise()
      } else {
        await extract
          .startDocumentAnalysis({
            FeatureTypes: process.env['ANALYSIS_FEATURE_TYPES']
              ? process.env['ANALYSIS_FEATURE_TYPES'].split(',')
              : ['TABLES', 'FORMS'],
            JobTag,
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
          })
          .promise()
      }
    }

    await sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: record.receiptHandle
      })
      .promise()
  }
  callback(undefined, undefined)
}

const textractJobResultProcessor: aws.lambda.Callback<aws.sqs.QueueEvent, void> = async (event, _, callback) => {
  const s3 = new AWS.S3()
  const sqs = new AWS.SQS()

  const queueURL = process.env['JOB_STATUS_QUEUE_URL']
  if (!queueURL) {
    throw new Error('Required ENV are not present')
  }
  console.log(event)

  for (const Record of event['Records']) {
    const ReceiptHandle = Record['receiptHandle']

    const notificationMessage: TextractNotificationMessage = JSON.parse(Record.body)
    if (
      !(notificationMessage.Event && notificationMessage.Event === 's3:TestEvent') &&
      notificationMessage.Status === 'SUCCEEDED'
    ) {
      const Bucket = notificationMessage.DocumentLocation.S3Bucket
      const documentName = notificationMessage.DocumentLocation.S3ObjectName

      const results = await getResults(notificationMessage.JobId, notificationMessage.API)
      const extractedText = extractText(results)
      const formData = extractFormData(results)
      const tablesData = extractTables(results)

      const promises: Promise<PromiseResult<AWS.S3.PutObjectOutput, AWS.AWSError>>[] = []

      if (extractedText.length) {
        promises.push(
          s3
            .putObject({
              Bucket,
              Key: `${documentName.slice(0, documentName.indexOf(extname(notificationMessage.JobId)))}-${
                notificationMessage.API
              }.txt`,
              Body: extractedText.join('\n'),
              ContentType: 'text/plain'
            })
            .promise()
        )
      }

      if (formData && Object.keys(formData).length) {
        promises.push(
          s3
            .putObject({
              Bucket,
              Key: `${documentName.slice(0, documentName.indexOf(extname(notificationMessage.JobId)))}-${
                notificationMessage.API
              }.json`,
              Body: JSON.stringify(formData),
              ContentType: 'application/json'
            })
            .promise()
        )
      }
      if (tablesData) {
        promises.push(
          s3
            .putObject({
              Bucket,
              Key: `${documentName.slice(0, documentName.indexOf(extname(notificationMessage.JobId)))}-${
                notificationMessage.API
              }.csv`,
              Body: tablesData,
              ContentType: 'application/csv'
            })
            .promise()
        )
      }
      await Promise.all(promises)
    }

    await sqs
      .deleteMessage({
        QueueUrl: queueURL,
        ReceiptHandle
      })
      .promise()

    callback(undefined, undefined)
  }
}
