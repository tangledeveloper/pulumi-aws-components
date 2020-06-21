import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export interface EventsQueueArgs {
  topic: aws.sns.Topic

  /**
   * string version of filter policy
   */
  filterPolicy?: string

  visibilityTimeoutSeconds?: number
}

export class EventsQueue extends pulumi.ComponentResource {
  readonly queue: aws.sqs.Queue
  readonly visibilityTimeoutSeconds: number
  readonly topicSubscription: aws.sns.TopicSubscription
  readonly queuePolicy: aws.sqs.QueuePolicy

  constructor(name: string, args: EventsQueueArgs, opts?: pulumi.ComponentResourceOptions) {
    super('aws:components:EventsQueue', name, args, opts)
    const defaultParentOptions: pulumi.ResourceOptions = { parent: this }
    const { filterPolicy, topic, visibilityTimeoutSeconds = 30 } = args

    // Queue
    const queueName = name
    this.queue = new aws.sqs.Queue(
      queueName,
      {
        name: queueName,
        visibilityTimeoutSeconds
      },
      defaultParentOptions
    )

    // SNS - SQS Subscriptions
    const queueUrl = this.queue.id
    const topicSubscriptionName = `${queueName}-topic-subscription`
    this.topicSubscription = new aws.sns.TopicSubscription(
      topicSubscriptionName,
      {
        endpoint: this.queue.arn,
        protocol: 'sqs',
        topic,
        rawMessageDelivery: true,
        ...(filterPolicy ? { filterPolicy } : {})
      },
      defaultParentOptions
    )

    const queuePermissionName = `${queueName}-topic-permission`
    this.queuePolicy = new aws.sqs.QueuePolicy(
      queuePermissionName,
      {
        queueUrl,
        policy: pulumi.all([topic.arn, this.queue.arn]).apply(([topicArn, queueArn]) =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: 'SQS:SendMessage',
                Resource: [queueArn],
                Condition: {
                  ArnEquals: {
                    'aws:SourceArn': topicArn
                  }
                }
              }
            ]
          })
        )
      },
      defaultParentOptions
    )

    this.registerOutputs({ queue: { name: this.queue.name, url: queueUrl } })
  }
}
