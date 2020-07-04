import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { LambdaFunctionArgs, LambdaFunction } from './LambdaFunction'
import { SQSProcessPolicy } from './policies'

export interface QueueLambdaArgs extends Omit<LambdaFunctionArgs, 'role'> {
  queue: aws.sqs.Queue
  queueBatchSize?: number
}

export class QueueLambda extends pulumi.ComponentResource {
  readonly queue: aws.sqs.Queue
  readonly lambda: LambdaFunction
  readonly queuePolicy: SQSProcessPolicy

  constructor(name: string, args: QueueLambdaArgs, opts?: pulumi.ComponentResourceOptions) {
    super('aws:components:QueueLambda', name, args, opts)
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }
    const { queue, queueBatchSize = 10, environment, ...lambdaArgs } = args

    const sqsPolicyName = `${name}-policy-sqs`
    this.queuePolicy = new SQSProcessPolicy(sqsPolicyName, { queueArn: queue.arn }, defaultResourceOptions)

    this.lambda = new LambdaFunction(
      name,
      {
        ...lambdaArgs,
        policies: [...(lambdaArgs.policies || []), this.queuePolicy.policy],
        environment
      },
      defaultResourceOptions
    )

    queue.onEvent(
      `${name}-queue-event-subscription`,
      this.lambda.lambda,
      {
        batchSize: queueBatchSize
      },
      defaultResourceOptions
    )

    this.queue = queue

    this.registerOutputs({
      lambda: { name: this.lambda.lambda.name, arn: this.lambda.lambda.arn }
    })
  }
}
