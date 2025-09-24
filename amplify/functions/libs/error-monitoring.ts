import { Topic } from "aws-cdk-lib/aws-sns";
import {
  SubscriptionFilter,
  FilterPattern,
  LogGroup,
  RetentionDays,
} from "aws-cdk-lib/aws-logs";
import { LambdaDestination } from "aws-cdk-lib/aws-logs-destinations";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface ErrorMonitoringProps {
  /**
   * The SNS topic to send error alerts to
   */
  errorTopic: Topic;

  /**
   * The Lambda function that forwards logs to SNS
   */
  forwarderFunction: IFunction;
}

export class ErrorMonitoring extends Construct {
  public readonly errorTopic: Topic;
  private readonly forwarderFunction: IFunction;

  constructor(scope: Construct, id: string, props: ErrorMonitoringProps) {
    super(scope, id);

    // Use the provided SNS topic and forwarder function
    this.errorTopic = props.errorTopic;
    this.forwarderFunction = props.forwarderFunction;

    console.info(
      `✅ Using error monitoring topic: ${this.errorTopic.topicName}`
    );
    console.info(
      `✅ Using log forwarder function: ${this.forwarderFunction.functionName}`
    );
  }

  /**
   * Monitor a Lambda function for errors
   */
  public monitorFunction(
    lambdaFunction: IFunction,
    functionName?: string
  ): this {
    const displayName = functionName || lambdaFunction.functionName;

    // Create the log group explicitly so it exists during CloudFormation deployment
    // Lambda functions create log groups automatically, but we need them to exist for subscription filters
    const logGroupName = `/aws/lambda/${lambdaFunction.functionName}`;
    const logGroup = new LogGroup(this, `LogGroup-${lambdaFunction.node.id}`, {
      logGroupName: logGroupName,
      retention: RetentionDays.ONE_MONTH, // Keep logs for 30 days
    });

    // Create subscription filter using higher-level constructs
    // LambdaDestination automatically handles permissions
    new SubscriptionFilter(this, `ErrorFilter-${lambdaFunction.node.id}`, {
      logGroup: logGroup,
      destination: new LambdaDestination(this.forwarderFunction),
      // Use a filter pattern that works with plain text logs (not JSON)
      filterPattern: FilterPattern.anyTerm(
        "ERROR",
        "WARN",
        "WARNING",
        "Error",
        "Warn",
        "Warning",
        "FATAL",
        "Exception",
        "⚠️",
        "❌",
        "🚨",
        "error",
        "warn",
        "warning",
        "fatal",
        "exception",
        "CRITICAL",
        "Critical",
        "critical"
      ),
      filterName: `error-filter-${displayName}`,
    });

    console.info(`✅ Added error monitoring for function: ${displayName}`);
    return this;
  }

  /**
   * Monitor multiple functions at once
   * Accepts either lambda functions directly or backend function objects
   */
  public monitorFunctions(functions: any[]): this {
    functions.forEach((func) => {
      // Handle backend function objects (with .resources.lambda)
      if (func.resources?.lambda) {
        const lambdaFunction = func.resources.lambda;

        // Skip monitoring the forwarder function itself to avoid circular reference
        if (lambdaFunction.functionArn === this.forwarderFunction.functionArn) {
          console.info(
            `⏭️ Skipping self-monitoring for forwarder function: ${lambdaFunction.functionName}`
          );
          return;
        }

        this.monitorFunction(lambdaFunction, lambdaFunction.functionName);
      }
      // Handle direct lambda function objects
      else if (func.lambda) {
        // Skip monitoring the forwarder function itself to avoid circular reference
        if (func.lambda.functionArn === this.forwarderFunction.functionArn) {
          console.info(
            `⏭️ Skipping self-monitoring for forwarder function: ${func.name}`
          );
          return;
        }

        this.monitorFunction(func.lambda, func.name);
      }
    });
    return this;
  }

  /**
   * Get the topic ARN for external integrations
   */
  public getTopicArn(): string {
    return this.errorTopic.topicArn;
  }
}
