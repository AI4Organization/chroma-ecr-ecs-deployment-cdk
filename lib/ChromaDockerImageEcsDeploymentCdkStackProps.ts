/**
 * Properties for defining a `ChromaEcrImageEcsDeploymentCdkStack`.
 */
import { ChromaDockerImageEcrDeploymentCdkStackProps } from './ChromaDockerImageEcrDeploymentCdkStackProps';

/**
 * Properties for defining a `ChromaDockerImageEcsDeploymentCdkStack`.
 *
 * @property platformString - The CPU architecture platform string (e.g., 'arm' or 'x86_64').
 * @property appRootFilePath - The root file path for the application within the EFS volume.
 * @property vectorDatabasePort - The port number on which the vector database service will listen.
 * @property deployRegion - The AWS region where the stack will be deployed (optional).
 */
export interface ChromaDockerImageEcsDeploymentCdkStackProps extends ChromaDockerImageEcrDeploymentCdkStackProps {
    readonly platformString: string;
    readonly appRootFilePath: string;
    readonly vectorDatabasePort: number;
    readonly deployRegion: string | undefined;
}
