import { CloudWatchLogsEvent, CloudWatchLogsDecodedData } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { gunzipSync } from 'zlib';
import { sendErrorAlert } from '../libs/webhook-helpers';

const snsClient = new SNSClient({});

/**
 * Lambda function that forwards CloudWatch Logs to SNS and Google Chat
 * This function receives compressed CloudWatch log events and forwards error/warning logs to both SNS and Google Chat
 */
export const handler = async (event: CloudWatchLogsEvent) => {
  try {
    // Decode and decompress the CloudWatch Logs data
    const compressed = Buffer.from(event.awslogs.data, 'base64');
    const decompressed = gunzipSync(compressed);
    const logData: CloudWatchLogsDecodedData = JSON.parse(decompressed.toString());

    console.info('Processing CloudWatch logs:', {
      logGroup: logData.logGroup,
      logStream: logData.logStream,
      messageType: logData.messageType,
      logEvents: logData.logEvents.length
    });

    // No additional filtering needed - CloudWatch filter already sent us relevant logs
    const errorEvents = logData.logEvents;

    if (errorEvents.length === 0) {
      console.info('No error/warning events found, skipping SNS notification');
      return;
    }

    // Format the message for SNS
    const functionName = logData.logGroup.replace('/aws/lambda/', '');
    const subject = `🚨 Lambda Error Alert: ${functionName}`;

    const messageBody = {
      logGroup: logData.logGroup,
      logStream: logData.logStream,
      functionName: functionName,
      errorCount: errorEvents.length,
      timestamp: new Date().toISOString(),
      errors: errorEvents.map(event => ({
        timestamp: new Date(event.timestamp).toISOString(),
        message: event.message.trim()
      })).slice(0, 5) // Limit to first 5 errors to avoid message size limits
    };

    // Send to SNS
    const snsTopicArn = process.env.SNS_TOPIC_ARN;
    if (!snsTopicArn) {
      throw new Error('SNS_TOPIC_ARN environment variable is not set');
    }

    const publishCommand = new PublishCommand({
      TopicArn: snsTopicArn,
      Subject: subject,
      Message: JSON.stringify(messageBody, null, 2)
    });

    await snsClient.send(publishCommand);

    console.info('Successfully forwarded error logs to SNS:', {
      functionName,
      errorCount: errorEvents.length,
      snsTopicArn
    });

    // Also send to Google Chat
    await sendErrorAlert(subject, messageBody);

  } catch (error) {
    console.error('Error processing CloudWatch logs:', error);
    throw error;
  }
};
