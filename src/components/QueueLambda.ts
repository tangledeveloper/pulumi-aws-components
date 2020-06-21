import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { LambdaFunctionArgs } from './LambdaFunction'

export interface QueueLambdaArgs extends Omit<LambdaFunctionArgs, 'role' | 'runtime'> {
  name: string
  queue: aws.sqs.Queue
  queueBatchSize?: number
}

export class QueueLambda extends pulumi.ComponentResource {}
