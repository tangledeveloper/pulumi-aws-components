import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export interface ESReadWritePolicyArgs {
  esArn: pulumi.Input<aws.ARN>
}

export class ESReadWritePolicy extends pulumi.ComponentResource {
  readonly policy: aws.iam.Policy

  constructor(name: string, args: ESReadWritePolicyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('caya:ESReadWritePolicy', name, args, opts)
    const { esArn } = args
    const defaultParentOptions: pulumi.ResourceOptions = { parent: this }

    this.policy = new aws.iam.Policy(
      name,
      {
        name,
        policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: ['es:ESHttpHead', 'es:ESHttpGet', 'es:ESHttpPost', 'es:ESHttpPut', 'es:ESHttpDelete'],
              Effect: 'Allow',
              Resource: pulumi.output(esArn).apply(arn => `${arn}*`)
            }
          ]
        }
      },
      defaultParentOptions
    )
  }
}
