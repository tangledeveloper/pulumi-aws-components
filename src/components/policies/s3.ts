import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

interface S3PolicyArgs {
  name: string
  bucketArn: pulumi.Output<aws.ARN>
}

type S3ReadPolicyArgs = S3PolicyArgs
type S3ReadWritePolicyArgs = S3PolicyArgs

export class S3ReadPolicy extends pulumi.ComponentResource {
  readonly policy: aws.iam.Policy

  constructor(args: S3ReadPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('aws:components:S3ReadPolicy', args.name, args, opts)
    const { name, bucketArn } = args
    const defaultParentOptions: pulumi.ResourceOptions = { parent: this }
    this.policy = new aws.iam.Policy(
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

    this.registerOutputs({ policy: this.policy })
  }
}

export class S3ReadWritePolicy extends pulumi.ComponentResource {
  readonly policy: aws.iam.Policy
  constructor(args: S3ReadWritePolicyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('aws:components:S3ReadWritePolicy', args.name, args, opts)
    const defaultParentOptions: pulumi.ResourceOptions = { parent: this }
    this.policy = new aws.iam.Policy(
      args.name,
      {
        policy: pulumi.output(args.bucketArn).apply(arn =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
                Effect: 'Allow',
                Resource: `${arn}/*`
              },
              {
                Action: ['s3:ListBucket'],
                Effect: 'Allow',
                Resource: arn
              }
            ]
          })
        )
      },
      defaultParentOptions
    )
    this.registerOutputs({ policy: this.policy })
  }
}
