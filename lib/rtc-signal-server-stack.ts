import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";

export class RTCSignalServer extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda Function for WebSocket connection
    const connectHandler = new lambda.Function(this, "ConnectHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "connect.handler",
    });

    // Lambda Function for WebSocket disconnection
    const disconnectHandler = new lambda.Function(this, "DisconnectHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "disconnect.handler",
    });

    // Lambda Function for WebSocket message handling
    const messageHandler = new lambda.Function(this, "MessageHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "message.handler",
    });

    // Create WebSocket API
    const webSocketApi = new apigatewayv2.WebSocketApi(this, "WebSocketApi", {
      connectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          "ConnectIntegration",
          connectHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          disconnectHandler
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          "DefaultIntegration",
          messageHandler
        ),
      },
    });

    // Deploy WebSocket API
    const webSocketStage = new apigatewayv2.WebSocketStage(
      this,
      "WebSocketStage",
      {
        webSocketApi,
        stageName: "dev",
        autoDeploy: true,
      }
    );

    if (process.env.DOMAIN_NAME) {
      const FQDN = process.env.SUBDOMAIN_NAME
        ? `${process.env.SUBDOMAIN_NAME}.${process.env.DOMAIN_NAME}`
        : process.env.DOMAIN_NAME;

      // Optional: Create a custom domain and certificate
      const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: process.env.DOMAIN_NAME,
      });
      const certificate = new certificatemanager.Certificate(
        this,
        "Certificate",
        {
          domainName: FQDN,
          validation:
            certificatemanager.CertificateValidation.fromDns(hostedZone),
        }
      );

      const apiDomain = new apigatewayv2.DomainName(this, "DomainName", {
        domainName: FQDN,
        certificate: certificate,
      });

      new apigatewayv2.ApiMapping(this, "ApiMapping", {
        api: webSocketApi,
        domainName: apiDomain,
        stage: webSocketStage,
      });

      // Optional: Route53 record for custom domain
      new route53.ARecord(this, "CustomDomainAliasRecord", {
        zone: hostedZone,
        recordName: process.env.SUBDOMAIN_NAME,
        target: route53.RecordTarget.fromAlias(
          new route53_targets.ApiGatewayv2DomainProperties(
            apiDomain.regionalDomainName,
            apiDomain.regionalHostedZoneId
          )
        ),
      });

      // Set environment variables for the message handler Lambda function
      const domain = apiDomain ? FQDN : webSocketApi.apiEndpoint;
      messageHandler.addEnvironment("DOMAIN_NAME", domain);
      messageHandler.addEnvironment("STAGE", "");

      new cdk.CfnOutput(this, "Domain", {
        value: domain,
      });
    } else {
      messageHandler.addEnvironment(
        "DOMAIN_NAME",
        webSocketApi.apiEndpoint.replace("wss://", "")
      );
      messageHandler.addEnvironment("STAGE", webSocketStage.stageName);
    }

    const policy = new iam.PolicyStatement({
      actions: ["execute-api:ManageConnections", "execute-api:Invoke"],
      resources: [webSocketApi.arnForExecuteApi()],
    });

    connectHandler.addToRolePolicy(policy);
    disconnectHandler.addToRolePolicy(policy);
    messageHandler.addToRolePolicy(policy);

    new cdk.CfnOutput(this, "WebSocketApiUrl", {
      value: webSocketStage.url,
    });
  }
}
