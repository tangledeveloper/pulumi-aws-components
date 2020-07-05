import * as pulumi from '@pulumi/pulumi'

import { AsyncTextract } from '../../src'

const asyncExtract = new AsyncTextract(`${pulumi.getProject()}-${pulumi.getStack()}`, {
  fileFormats: ['jpeg', 'pdf', 'png'],
  operation: 'StartDocumentTextDetection'
})

export const output = {
  bucket: asyncExtract.bucket.bucket,
  s3NotificationQueue: asyncExtract.s3NotificationQueue.queue.id,
  s3NotificationQueueProcessingLambda: asyncExtract.s3NotificationQueueProcessingLambda.name,
  jobStatusNotificationQueue: asyncExtract.jobStatusNotificationQueue.queue.id,
  jobResultProcessingLambda: asyncExtract.jobResultProcessingLambda.name
}
