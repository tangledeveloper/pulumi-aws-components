import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

import { LambdaCloudWatchPolicy } from './policies'

/**
 * Arguments to LambdaFunction
 *
 * ```typescript
 * import { LambdaFunction } from 'pulumi-aws-components'
 *
 * const lambda = new LambdaFunction('', {
 *  policyArns: [],
 *  environment: {
 *    'keyA': 'valueA',
 *    ...
 *  },
 *  # ... other aws.lambda.FunctionArgs
 * })
 *
 * ```
 */
export interface LambdaFunctionArgs extends Omit<aws.lambda.FunctionArgs, 'name' | 'role' | 'environment'> {
  /**
   * Additional policy arns to attach to role
   */
  policyArns?: pulumi.Input<aws.ARN>[]

  /**
   * The Lambda environment's configuration settings.
   */
  environment?: {
    [key: string]: pulumi.Input<string>
  }
}

/**
 * creates a lambda with cloudwatch log group policy
 */
export class LambdaFunction extends pulumi.ComponentResource {
  readonly role: aws.iam.Role
  readonly lambda: aws.lambda.Function
  readonly roleAttachments: aws.iam.RolePolicyAttachment[]

  /**
   * Creates a new Lambda function with a default cloudwatch policy.
   *
   * @param name The _unique_ name of the resource.
   * @param args The arguments to configure the lambda.
   * @param opts A bag of options that control this resource's behavior.
   */
  constructor(name: string, args: LambdaFunctionArgs, opts?: pulumi.CustomResourceOptions) {
    super('aws:components:LambdaFunction', name, args, opts)

    // Default resource options for this component's child resources.
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }

    const roleName = `${name}-role`
    this.role = new aws.iam.Role(
      roleName,
      {
        name: roleName,
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: ['lambda.amazonaws.com']
        })
      },
      defaultResourceOptions
    )

    this.lambda = new aws.lambda.Function(
      name,
      {
        memorySize: 128,
        ...args,
        environment: {
          variables: {
            ...(args.environment || {})
          }
        },
        name,
        role: this.role.arn
      },
      defaultResourceOptions
    )

    // to manage the CloudWatch Log Group for the Lambda Function.
    const cloudWatchPolicy = new LambdaCloudWatchPolicy(`${name}-policy`, { lambdaName: name }, defaultResourceOptions)

    // Attach any additional policies
    const { policyArns = [] } = args
    this.roleAttachments = [...policyArns, cloudWatchPolicy.policy.arn].map((arn, index) => {
      // TODO: to extract the policy-name from the arn (arn:aws:iam::<account-id>:policy/<policy-name>)
      // to use it as attachment name instead of using index
      const policyAttachmentName = `${roleName}-policy-attachment-${index}`
      return new aws.iam.RolePolicyAttachment(
        policyAttachmentName,
        {
          policyArn: arn,
          role: roleName
        },
        defaultResourceOptions
      )
    })

    this.registerOutputs(this.lambda)
    this.registerOutputs(this.role)
    this.registerOutputs(this.roleAttachments)
  }
}
