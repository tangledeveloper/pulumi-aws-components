import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

interface S3ReadPolicyArgs {
  name: string
  bucketArn: pulumi.Output<aws.ARN>
}

export class S3ReadPolicy extends pulumi.ComponentResource {
  readonly policy: aws.iam.Policy

  constructor(args: S3ReadPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('aws:components:S3ReadPolicy', args.name, args, opts)
    const { name, bucketArn } = args
    const defaultParentOptions: pulumi.ResourceOptions = { parent: this }
    const policy = new aws.iam.Policy(
      name,
      {
        name,
        policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: ['s3:GetObject'],
              Effect: 'Allow',
              Resource: pulumi.interpolate`${bucketArn}/*`
            }
          ]
        }
      },
      defaultParentOptions
    )
    this.policy = policy
  }
}
