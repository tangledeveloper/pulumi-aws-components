import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export function attachPoliciesToRole(role: aws.iam.Role, policies: aws.iam.Policy[], opts?: pulumi.ResourceOptions) {
  if (!policies.length) {
    return []
  }

  const rolePolicyAttachments: pulumi.Input<aws.iam.RolePolicyAttachment>[] = []
  for (const policy of policies) {
    rolePolicyAttachments.push(
      pulumi.output(policy.name).apply(
        policyName =>
          new aws.iam.RolePolicyAttachment(
            `${policyName}-role-attachment`,
            {
              policyArn: policy.arn,
              role
            },
            opts
          )
      )
    )
  }

  return rolePolicyAttachments
}

export function alphaNumericFilter(input: string) {
  return input.replace(/[^A-Za-z0-9]/g, '')
}
