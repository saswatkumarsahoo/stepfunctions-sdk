#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { StateMachineStack } from '../lib/statemachineStack';

const app = new cdk.App();
new StateMachineStack(app, 'StateMachineStack');
