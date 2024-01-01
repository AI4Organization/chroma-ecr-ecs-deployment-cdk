export interface IEnvTypes {
    readonly ECR_REPOSITORY_NAME: string;
    readonly APP_NAME: string;
    readonly IMAGE_VERSION?: string;
    readonly PLATFORMS: string;
    readonly EFS_ROOT_FILE_PATH?: string;
    readonly APP_ROOT_FILE_PATH: string;
}
