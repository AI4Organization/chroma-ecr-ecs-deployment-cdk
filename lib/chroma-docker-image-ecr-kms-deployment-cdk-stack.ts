import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecrDeploy from 'cdk-ecr-deployment';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { ChromaDockerImageEcrDeploymentCdkStackProps } from './ChromaDockerImageEcrDeploymentCdkStackProps';

export class ChromaDockerImageEcrDeploymentCdkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ChromaDockerImageEcrDeploymentCdkStackProps) {
        super(scope, id, props);

        const kmsKey = new kms.Key(this, `${props.appName}-${props.environment}-ECRRepositoryKmsKey`, {
            enableKeyRotation: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            enabled: true,
        });

        const ecrRepository = new ecr.Repository(this, `${props.appName}-${props.environment}-DockerImageEcrRepository`, {
            repositoryName: props.repositoryName,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: kmsKey,
        });

        ecrRepository.addLifecycleRule({ maxImageAge: cdk.Duration.days(7), rulePriority: 1, tagStatus: ecr.TagStatus.UNTAGGED }); // delete images older than 7 days
        ecrRepository.addLifecycleRule({ maxImageCount: 4, rulePriority: 2, tagStatus: ecr.TagStatus.ANY }); // keep last 4 images

        // Copy from docker registry to ECR.
        new ecrDeploy.ECRDeployment(this, `${props.appName}-${props.environment}-DockerImageEcrDeployment`, {
            src: new ecrDeploy.DockerImageName('chromadb/chroma:latest'),
            dest: new ecrDeploy.DockerImageName(`${ecrRepository.repositoryUri}:${props.imageVersion}`),
        });
    }
}