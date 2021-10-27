# Step Functions SDK Integration - Example

### Steps to run
Prerequsite
1. [Install CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
2. [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
##### Step 1
Run the command to deploy this stack to your default AWS account/region
```sh
cdk deploy
```
##### Step 2
Copy the bucket names & Step function's ARN from cloudformation output. 
##### Step 3
Upload the sample data file to source bucket. Replace the <source_bucketname> with the actual naem copied from step 2
```sh
 aws s3 cp data/sample.json s3://<source_bucketname>/inbox/sample.json
```
##### Step 4
Execute the step function using below command
```sh
 aws stepfunctions start-execution --state-machine-arn <SFN_ARN> --input '{"sourceBucket":"<source_bucketname>","destBucket":"<destination_bucketname>","key":"sample.json"}'
```
Replace the <placeholders> with cloudformation output copied from step 2

#### Useful CDK commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 