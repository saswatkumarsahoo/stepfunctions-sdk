#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { HelloworldStack } from '../lib/helloworld-stack';

const app = new cdk.App();
new HelloworldStack(app, 'HelloworldStack');
