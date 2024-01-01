import { ChromaDockerImageEcrDeploymentCdkStackProps } from './ChromaDockerImageEcrDeploymentCdkStackProps';

export interface ChromaDockerImageEcsDeploymentCdkStackProps extends ChromaDockerImageEcrDeploymentCdkStackProps {
    readonly platformString: string;
    readonly appRootFilePath: string;
    readonly vectorDatabasePort: number;
    readonly deployRegion: string | undefined;
}
