import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

import { LambdaCloudWatchPolicy } from './policies'

/**
 * Arguments to LambdaFunction
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

  /**
   * IAM role to attach to the Lambda Function.
   * If omitted, a new role will be created with a default  `sts:AssumeRole` for `lambda.amazonaws.com` service.
   */
  roleName?: string
}

/**
 * creates a lambda with cloudwatch log group policy
 */
export class LambdaFunction extends pulumi.ComponentResource {
  readonly role: aws.iam.Role
  readonly lambda: aws.lambda.Function
  readonly roleAttachments: pulumi.Output<aws.iam.RolePolicyAttachment>[]

  /**
   * Creates a new Lambda function with a default cloudwatch policy.
   *
   * @param name The _unique_ name of the resource.
   * @param args The arguments to configure the lambda.
   * @param opts A bag of options that control this resource's behavior.
   */
  constructor(name: string, args: LambdaFunctionArgs, opts?: pulumi.CustomResourceOptions) {
    super('aws:components:LambdaFunction', `${name}-lambda`, args, opts)

    // Default resource options for this component's child resources.
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this }

    const roleName = args.roleName || `${name}-role`
    let roleARN: pulumi.Input<string> | null = null

    // new aws.cloudwatch.LogGroup()

    if (args.roleName) {
      const providedRole = pulumi.output(aws.iam.getRole({ name: args.roleName }, { async: true }))
      roleARN = providedRole.arn
    } else {
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
      roleARN = this.role.arn
    }

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
        role: roleARN
      },
      defaultResourceOptions
    )

    // to manage the CloudWatch Log Group for the Lambda Function.
    const cloudWatchPolicy = new LambdaCloudWatchPolicy(name, { lambdaName: name }, defaultResourceOptions)

    // Attach any additional policies
    const { policyArns = [] } = args
    this.roleAttachments = [...policyArns, cloudWatchPolicy.policy.arn].map(arn => {
      // extract the policy-name from the arn to use it as attachment name
      // arn:aws:iam::<account-id>:policy/<policy-name>
      return pulumi.output(arn).apply(policyArn => {
        const policyAttachmentName = `${policyArn.slice(policyArn.lastIndexOf('/'))}-role-attachment`
        return new aws.iam.RolePolicyAttachment(
          policyAttachmentName,
          {
            policyArn: arn,
            role: roleName
          },
          defaultResourceOptions
        )
      })
    })

    this.registerOutputs(this.lambda)
    this.registerOutputs(this.role)
    this.registerOutputs(this.roleAttachments)
  }
}
