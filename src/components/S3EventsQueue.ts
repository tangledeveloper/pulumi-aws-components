import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export type S3Event =
  | 's3:ObjectCreated:*'
  | 's3:ObjectCreated:Put'
  | 's3:ObjectCreated:Post'
  | 's3:ObjectCreated:Copy'
  | 's3:ObjectCreated:CompleteMultipartUpload'
  | 's3:ObjectRemoved:*'
  | 's3:ObjectRemoved:Delete'
  | 's3:ObjectRemoved:DeleteMarkerCreated'
  | 's3:ObjectRestore:Post'
  | 's3:ObjectRestore:Completed'
  | 's3:ReducedRedundancyLostObject'
  | 's3:Replication:OperationFailedReplication'
  | 's3:Replication:OperationMissedThreshold'
  | 's3:Replication:OperationReplicatedAfterThreshold'
  | 's3:Replication:OperationNotTracked'

export interface S3EventFilterPolicy {
  events: S3Event[]
  filterSuffix?: string
  filterPrefix?: string
}

export interface S3EventsQueueArgs {
  bucket: aws.s3.Bucket

  visibilityTimeoutSeconds?: number

  /**
   * Designating a FIFO queue. If not set, it defaults to `false` making a standard queue.
   */
  fifoQueue?: boolean

  eventNotifications: S3EventFilterPolicy[]
}

export class S3EventsQueue extends pulumi.ComponentResource {
  readonly queue: aws.sqs.Queue
  readonly visibilityTimeoutSeconds: number
  readonly queuePolicy: aws.sqs.QueuePolicy

  constructor(name: string, args: S3EventsQueueArgs, opts?: pulumi.CustomResourceOptions) {
    super('aws:components:S3EventsQueue', name, args, opts)

    // Default resource options for this component's child resources.
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }

    const { bucket, fifoQueue = false, visibilityTimeoutSeconds = 30, eventNotifications } = args

    // Queue
    const queueName = name
    this.queue = new aws.sqs.Queue(
      queueName,
      {
        name: queueName,
        visibilityTimeoutSeconds,
        fifoQueue
      },
      defaultResourceOptions
    )

    for (const { events, filterPrefix, filterSuffix } of eventNotifications) {
      const bucketNotificationName = `${name}-s3-queue-notification`
      new aws.s3.BucketNotification(
        bucketNotificationName,
        {
          bucket: args.bucket.bucket,
          queues: [
            {
              events,
              queueArn: this.queue.arn,
              filterPrefix,
              filterSuffix
            }
          ]
        },
        defaultResourceOptions
      )
    }

    const queueUrl = this.queue.id
    const queuePermissionName = `${queueName}-s3-permission`
    this.queuePolicy = new aws.sqs.QueuePolicy(
      queuePermissionName,
      {
        queueUrl,
        policy: pulumi.all([bucket.arn, this.queue.arn]).apply(([bucketArn, queueArn]) =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: 's3.amazonaws.com',
                Action: 'SQS:SendMessage',
                Resource: [queueArn],
                Condition: {
                  ArnEquals: {
                    'aws:SourceArn': bucketArn
                  }
                }
              }
            ]
          })
        )
      },
      defaultResourceOptions
    )
  }
}
