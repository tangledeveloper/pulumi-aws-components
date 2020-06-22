import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export interface StartTextractPolicyArgs {
  resourceARN: pulumi.Input<aws.ARN>
}

export class TextractPolicy extends pulumi.ComponentResource {
  readonly policy: aws.iam.Policy

  constructor(name: string, args: StartTextractPolicyArgs, opts: pulumi.ComponentResourceOptions) {
    super('aws:components:TextractPolicy', name, args, opts)

    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }

    this.policy = new aws.iam.Policy(
      name,
      {
        description: `IAM policy for invoking textract service`,
        policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['textract:*'],
              Resource: args.resourceARN
            }
          ]
        }
      },
      defaultResourceOptions
    )

    this.registerOutputs({ policy: this.policy })
  }
}
