# Chroma Docker Image ECR Deployment CDK

This repository contains the AWS CDK code for deploying a Docker image to an Amazon Elastic Container Registry (ECR).

## Environment Variables

The repository expects the following environment variables to be set:

- `CDK_DEPLOY_REGIONS`: Comma-separated list of AWS regions to deploy the ECR repositories.
- `ENVIRONMENTS`: Comma-separated list of environment names to use for the ECR repositories.
- `ECR_REPOSITORY_NAME`: The name of the ECR repository where the Docker image will be stored.
- `APP_NAME`: The name of the application associated with the Docker image.
- `IMAGE_VERSION`: The version tag of the Docker image to deploy.

## Structure

- `bin/chroma-docker-image-ecr-deployment-cdk.ts`: The CDK application entry point, which sets up the deployment across multiple regions and environments.
- `lib/chroma-docker-image-ecr-deployment-cdk-stack.ts`: The CDK stack that defines the ECR repository and the deployment process.
- `lib/ChromaDockerImageEcrDeploymentCdkStackProps.ts`: TypeScript interface for the stack properties.
- `test/chroma-docker-image-ecr-deployment-cdk.test.ts`: Placeholder for tests.

## Dependencies

The project specifies the following dependencies:

- `aws-cdk-lib`: The core CDK library for defining cloud resources.
- `cdk-ecr-deployment`: A CDK construct library for deploying Docker images to ECR.
- `constructs`: A library for defining constructs for the CDK.
- `dotenv`: A library for loading environment variables from a `.env` file.
- `source-map-support`: A library for providing source map support for stack traces in Node.js.

## Dev Dependencies

The project uses the following development dependencies:

- `@types/jest`: TypeScript definitions for Jest.
- `@types/node`: TypeScript definitions for Node.js.
- `jest`: A JavaScript testing framework.
- `ts-jest`: A Jest transformer for TypeScript.
- `ts-node`: A TypeScript execution environment and REPL for Node.js.
- `typescript`: The TypeScript compiler.

## Scripts

- `build`: Compiles TypeScript code to JavaScript.
- `watch`: Watches for changes and recompiles TypeScript code.
- `test`: Runs Jest tests.
- `cdk`: Runs AWS CDK commands.

## Usage

To use this repository, clone it, configure the environment variables, and run the CDK deployment commands. Make sure you have AWS credentials and the AWS CDK installed and configured in your development environment.

```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run build

# Deploy to AWS
npx cdk deploy
```

## License

The repository content is provided as-is with no explicit license specified.
