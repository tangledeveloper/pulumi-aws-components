import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'

export interface SQSProcessPolicyArgs {
  queueArn: pulumi.Input<aws.ARN>
}

export class SQSProcessPolicy extends pulumi.ComponentResource {
  readonly policy: aws.iam.Policy
  constructor(name: string, args: SQSProcessPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('aws:components:SQSProcessPolicy', name, args, opts)
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }

    this.policy = new aws.iam.Policy(
      name,
      {
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
              Resource: args.queueArn
            }
          ]
        }
      },
      defaultResourceOptions
    )

    this.registerOutputs({
      policy: this.policy
    })
  }
}
