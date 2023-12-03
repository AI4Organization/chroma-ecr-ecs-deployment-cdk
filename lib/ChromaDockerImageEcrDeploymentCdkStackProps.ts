import * as cdk from 'aws-cdk-lib';

export interface ChromaDockerImageEcrDeploymentCdkStackProps extends cdk.StackProps {
    readonly repositoryName: string;
    readonly appName: string;
    imageVersion: string;
    environment: string;
}
