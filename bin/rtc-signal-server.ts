#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { RTCSignalServer } from "../lib/rtc-signal-server-stack";
import * as dotenv from "dotenv";

dotenv.config();
const app = new cdk.App();
new RTCSignalServer(app, "RTCSignalServer", {
  env: { account: process.env.AWS_ACCOUNT, region: process.env.AWS_REGION },
});
