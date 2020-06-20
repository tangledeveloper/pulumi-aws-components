import * as aws from '@pulumi/aws'
import { LambdaFunction } from '../src/LambdaFunction'

new LambdaFunction('', {
  handler: '',
  runtime: aws.lambda.NodeJS12dXRuntime
})

// const helloFunction = new aws.lambda.Function('helloFunction', { role: lambdaRole }, (event, context, callback) => {
//   callback(null, 'Hello')
// })
