import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { LambdaFunction, LambdaFunctionArgs } from './LambdaFunction'

export interface QueueLambdaArgs extends Omit<LambdaFunctionArgs, 'role'> {
  queue: aws.sqs.Queue
  queueBatchSize?: number
}

export class QueueLambda extends pulumi.ComponentResource {
  readonly queue: aws.sqs.Queue
  readonly lambda: LambdaFunction

  constructor(name: string, args: QueueLambdaArgs, opts?: pulumi.ComponentResourceOptions) {
    super('aws:components:QueueLambda', name, args, opts)
    const defaultParentOptions: pulumi.ResourceOptions = { parent: this }
    const { queue, queueBatchSize = 10, environment, ...lambdaArgs } = args

    this.lambda = new LambdaFunction(
      name,
      {
        ...lambdaArgs,
        environment
      },
      defaultParentOptions
    )

    const sqsPolicyName = `${name}-policy-sqs`
    const sqsPolicy = new aws.iam.RolePolicy(
      sqsPolicyName,
      {
        name: sqsPolicyName,
        policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'sqs:GetQueueUrl',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:ChangeMessageVisibility'
              ],
              Resource: [queue.arn]
            }
          ]
        },
        role: this.lambda.role
      },
      { parent: this.lambda }
    )

    queue.onEvent(
      `${name}-queue-event-subscription`,
      this.lambda.lambda,
      {
        batchSize: queueBatchSize
      },
      defaultParentOptions
    )

    this.queue = queue

    this.registerOutputs({
      lambda: { name: this.lambda.lambda.name, arn: this.lambda.lambda.arn },
      queuePolicy: { name: sqsPolicy.name }
    })
  }
}
