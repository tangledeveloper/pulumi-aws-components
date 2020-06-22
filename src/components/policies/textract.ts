import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export interface StartTextractPolicyArgs {
  actions?: string[]
}

export class TextractPolicy extends pulumi.ComponentResource {
  readonly policy: aws.iam.Policy

  constructor(name: string, args: StartTextractPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
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
              Action: [
                ...(args.actions || []),
                'textract:StartDocumentTextDetection',
                'textract:StartDocumentAnalysis',
                'textract:GetDocumentTextDetection',
                'textract:GetDocumentAnalysis'
              ],
              Resource: '*'
            }
          ]
        }
      },
      defaultResourceOptions
    )

    this.registerOutputs({ policy: { name: this.policy.name, arn: this.policy.arn } })
  }
}
