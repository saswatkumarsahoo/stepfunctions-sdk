import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'


export class StateMachineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceBucket = new s3.Bucket(this, "sourceBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const destinationBucket = new s3.Bucket(this, "destinationBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const dynamodbTable = new ddb.Table(this, "dynamodbTable", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "StepfnExample",
      partitionKey: { name: "id", type: ddb.AttributeType.STRING },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST
    });

    const validateFile = new sfn.Pass(this, "ValidateFile", {
      comment: "always pass the validation"

    });
    const copyFile = new tasks.CallAwsService(this, 'CopyFile', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: sfn.JsonPath.stringAt('$.destBucket'),
        "Key.$": "States.Format('process/{}',$.key)",
        "CopySource.$": "States.Format('{}/inbox/{}',$.sourceBucket,$.key)"
      },
      iamResources: [sourceBucket.arnForObjects('*')],
      resultPath: "$.copyResult"

    });

    const readFileContent = new tasks.CallAwsService(this, 'ReadFileContent', {
      service: 's3',
      action: 'getObject',
      parameters: {
        Bucket: sfn.JsonPath.stringAt('$.destBucket'),
        "Key.$": "States.Format('process/{}',$.key)",
      },
      iamResources: [destinationBucket.arnForObjects('*')],
      resultSelector: {
        "filecontent.$": "States.StringToJson($.Body)"
      },
      resultPath: "$.getObject"

    });
    const insertRecord = new tasks.DynamoPutItem(this, "InsertRecord", {
      item: {
        "id": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.id')),
        "name": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.name')),
      },
      table: dynamodbTable,
      resultSelector: {
        statusCode: sfn.JsonPath.stringAt("$.SdkHttpMetadata.HttpStatusCode"),
      }
    });

    const putItem = new sfn.Map(this, "putItem", {
      maxConcurrency: 10,
      itemsPath: sfn.JsonPath.stringAt('$.getObject.filecontent'),
      resultPath: sfn.JsonPath.stringAt('$.putItemResponse'),

    });

    putItem.iterator(insertRecord);

    const archiveFile = new tasks.CallAwsService(this, 'ArchiveFile', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: sfn.JsonPath.stringAt('$.destBucket'),
        "Key.$": "States.Format('archive/{}',$.key)",
        "CopySource.$": "States.Format('{}/process/{}',$.destBucket,$.key)"
      },
      iamResources: [sourceBucket.arnForObjects('*')],
      resultPath: sfn.JsonPath.stringAt("$.archiveResult"),

    });



    const prepareFileDeletion = new sfn.Pass(this, "PrepareFileDeletion", {
      comment: "this is a pass state just for building the input payload for next step",
      parameters: {
        "filesToDelete": [
          {
            Bucket: sfn.JsonPath.stringAt('$.sourceBucket'),
            "Key.$": "States.Format('inbox/{}',$.key)",
          },
          {
            Bucket: sfn.JsonPath.stringAt('$.destBucket'),
            "Key.$": "States.Format('process/{}',$.key)",
          },
        ]
      }

    });

    const deleteFile = new tasks.CallAwsService(this, 'DeleteFile', {
      service: 's3',
      action: 'deleteObject',
      parameters: {
        Bucket: sfn.JsonPath.stringAt('$.Bucket'),
        Key: sfn.JsonPath.stringAt('$.Key'),
      },
      iamResources: [sourceBucket.arnForObjects('*')],
      resultPath: sfn.DISCARD
    });

    const deleteFiles = new sfn.Map(this, 'DeleteFiles', {
      itemsPath: sfn.JsonPath.stringAt('$.filesToDelete'),
      resultPath: sfn.DISCARD
    });
    deleteFiles.iterator(deleteFile)

    const stateMachine = new sfn.StateMachine(this, 'sdkExample', {
      definition: validateFile.next(copyFile).next(readFileContent).next(putItem).next(archiveFile).next(prepareFileDeletion).next(deleteFiles),
      stateMachineName: "SfnSDKExample",
      timeout: cdk.Duration.minutes(10)
    });
    sourceBucket.grantReadWrite(stateMachine);
    destinationBucket.grantReadWrite(stateMachine);

    new cdk.CfnOutput(this, "srcBucket", {
      value: sourceBucket.bucketName,
      description: "bucket name of source s3 bucket"
    });
    new cdk.CfnOutput(this, "destBucket", {
      value: destinationBucket.bucketName,
      description: "bucket name of destination s3 bucket"
    });

    new cdk.CfnOutput(this, "sfnARN", {
      value: stateMachine.stateMachineArn,
      description: "ARN of state machine"
    })
  }
}

