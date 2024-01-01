import * as cdk from 'aws-cdk-lib';

/**
 * Properties for defining a `ChromaDockerImageEcrDeploymentCdkStack`.
 *
 * @property repositoryName - The name of the ECR repository.
 * @property appName - The name of the application.
 * @property imageVersion - The version of the Docker image.
 * @property environment - The deployment environment (e.g., 'prod', 'dev').
 */
export interface ChromaDockerImageEcrDeploymentCdkStackProps extends cdk.StackProps {
    readonly repositoryName: string;
    readonly appName: string;
    readonly imageVersion: string;
    readonly environment: string;
}
