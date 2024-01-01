import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { ApplicationLoadBalancedCodeDeployedFargateService } from '@cdklabs/cdk-ecs-codedeploy';
import { ChromaDockerImageEcsDeploymentCdkStackProps } from './ChromaDockerImageEcsDeploymentCdkStackProps';
import { createVPC } from './chroma-vpc-deployment';

/**
 * This stack deploys a Docker image from Amazon ECR to Amazon ECS using AWS Fargate.
 * It sets up a VPC, EFS, and security groups, and defines an ECS cluster with a Fargate service.
 * The service is load balanced using an Application Load Balancer and includes auto-scaling configuration.
 *
 * @property {ChromaDockerImageEcsDeploymentCdkStackProps} props - The properties for the stack including ECR repository details, ECS configuration, and network settings.
 */
export class ChromaEcrImageEcsDeploymentCdkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ChromaDockerImageEcsDeploymentCdkStackProps) {
        super(scope, id, props);

        const chromaVpc = createVPC(this, props);

        const ecrRepositoryName = props.repositoryName;
        console.log(`ecrRepositoryName: ${ecrRepositoryName}`);

        const imageVersion = props.imageVersion;
        console.log(`imageVersion: ${imageVersion}`);

        const ecrRepository = ecr.Repository.fromRepositoryName(this, `${props.environment}-${props.platformString}-${props.deployRegion}-ERCRepository`, ecrRepositoryName);
        const ecsContainerImage = ecs.ContainerImage.fromEcrRepository(ecrRepository, imageVersion);

        // define a cluster with spot instances, linux type
        const ecsCluster = new ecs.Cluster(this, `${props.environment}-${props.platformString}-${props.deployRegion}-Cluster`, {
            clusterName: `${props.environment}-${props.platformString}-${props.deployRegion}-Cluster`,
            vpc: chromaVpc,
            containerInsights: true,
        });

        // define a security group for EFS
        const chromaEfsSG = new ec2.SecurityGroup(this, `${props.environment}-${props.platformString}-${props.deployRegion}-chromaEfsSG`, {
            securityGroupName: `${props.environment}-${props.platformString}-${props.deployRegion}-chromaEfsSG`,
            vpc: chromaVpc,
            allowAllOutbound: true,
            allowAllIpv6Outbound: true,
        });

        chromaEfsSG.addIngressRule(
            // ec2.Peer.ipv4(chromaVpc.vpcCidrBlock)
            chromaEfsSG,
            ec2.Port.tcp(2049),
            'Allow NFS traffic from the ECS tasks.'
        );

        const chromaDbSG = new ec2.SecurityGroup(this, `${props.environment}-${props.platformString}-${props.deployRegion}-chromaDbSG`, {
            securityGroupName: `${props.environment}-${props.platformString}-${props.deployRegion}-chromaDbSG`,
            vpc: chromaVpc,
            allowAllOutbound: true,
            allowAllIpv6Outbound: true,
        });

        const vectorDatabasePort = props.vectorDatabasePort;
        console.log(`vectorDatabasePort: ${vectorDatabasePort}`);

        chromaDbSG.addIngressRule(
            // ec2.Peer.ipv4(chromaVpc.vpcCidrBlock),
            chromaEfsSG,
            ec2.Port.tcp(vectorDatabasePort),
            'Allow Chroma traffic from the VPC.'
        );

        // create an EFS File System
        const efsFileSystem = new efs.FileSystem(this, `${props.environment}-${props.platformString}-${props.deployRegion}-ChromaServiceEfsFileSystem`, {
            fileSystemName: `${props.environment}-${props.platformString}-${props.deployRegion}-ChromaServiceEfsFileSystem`,
            vpc: chromaVpc,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            securityGroup: chromaEfsSG, // Ensure this security group allows NFS traffic from the ECS tasks
            encrypted: true, // Enable encryption at rest
            performanceMode: efs.PerformanceMode.MAX_IO, // For AI application, HCP application, Analytics application, and media processing workflows
            allowAnonymousAccess: false, // Disable anonymous access
            throughputMode: efs.ThroughputMode.BURSTING,
            lifecyclePolicy: efs.LifecyclePolicy.AFTER_30_DAYS, // After 2 weeks, if a file is not accessed for given days, it will move to EFS Infrequent Access.
        });

        // add EFS access policy
        efsFileSystem.addToResourcePolicy(
            new iam.PolicyStatement({
                actions: ['elasticfilesystem:ClientMount'],
                principals: [new iam.AnyPrincipal()],
                conditions: {
                    Bool: {
                        'elasticfilesystem:AccessedViaMountTarget': 'true'
                    }
                },
            }),
        );

        // create Fargate Task Definition with EFS volume
        const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, `${props.environment}-${props.platformString}-${props.deployRegion}-TaskDef`, {
            memoryLimitMiB: 2048,
            cpu: 1024,
            ephemeralStorageGiB: 40,
            runtimePlatform: {
                cpuArchitecture: props.platformString === `arm` ? ecs.CpuArchitecture.ARM64 : ecs.CpuArchitecture.X86_64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
            },
            executionRole: new iam.Role(this, `${props.environment}-${props.platformString}-${props.deployRegion}-TaskExecutionRole`, {
                assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
                ],
                roleName: `${props.environment}-${props.platformString}-${props.deployRegion}-TaskExecutionRole`,
                inlinePolicies: {
                    efsAccess: new cdk.aws_iam.PolicyDocument({
                        statements: [
                            new iam.PolicyStatement({
                                effect: iam.Effect.ALLOW,
                                actions: [
                                    'elasticfilesystem:ClientMount',
                                    'elasticfilesystem:ClientWrite',
                                    'elasticfilesystem:DescribeMountTargets',
                                    'elasticfilesystem:ClientRootAccess',
                                    'elasterfilesystem:ClientRead',
                                    'elasticfilesystem:DescribeFileSystems',
                                ],
                                resources: [efsFileSystem.fileSystemArn],
                            })
                        ],
                    }),
                }
            }),
            taskRole: new iam.Role(this, `${props.environment}-${props.platformString}-${props.deployRegion}-TaskRole`, {
                // define a role for the task to access EFS with mount, read, write permissions
                assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
                ],
                roleName: `${props.environment}-${props.platformString}-${props.deployRegion}-TaskRole`,
                inlinePolicies: {
                    efsAccess: new iam.PolicyDocument({
                        statements: [
                            new iam.PolicyStatement({
                                effect: iam.Effect.ALLOW,
                                actions: [
                                    'elasticfilesystem:ClientMount',
                                    'elasticfilesystem:ClientWrite',
                                    'elasticfilesystem:DescribeMountTargets',
                                    'elasticfilesystem:ClientRootAccess',
                                    'elasticfilesystem:ClientRead',
                                    'elasticfilesystem:DescribeFileSystems',
                                ],
                                resources: [efsFileSystem.fileSystemArn],
                            }),
                        ],
                    }),
                },
            }),
        });

        // define a container with the image
        const chromaContainer = fargateTaskDefinition.addContainer(`${props.environment}-${props.platformString}-${props.deployRegion}-ChromaContainer`, {
            image: ecsContainerImage,
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: `${props.environment}-${props.platformString}-${props.deployRegion}-ChromaService` }),
            containerName: `${props.environment}-${props.platformString}-${props.deployRegion}-ChromaContainer`,
        });

        // add port mapping
        chromaContainer.addPortMappings({
            containerPort: vectorDatabasePort, // The port on the container to which the listener forwards traffic
            protocol: ecs.Protocol.TCP
        });

        const efsVolumeName = props.appRootFilePath;

        // add EFS volume to the task definition
        fargateTaskDefinition.addVolume({
            name: efsVolumeName, // This name is referenced in the sourceVolume parameter of container definition mountPoints.
            efsVolumeConfiguration: {
                fileSystemId: efsFileSystem.fileSystemId,
            },
        });

        // mount EFS to the container
        chromaContainer.addMountPoints({
            sourceVolume: efsVolumeName, // The name of the volume to mount. Must be a volume name referenced in the name parameter of task definition volume.
            containerPath: `/${efsVolumeName}`, // The path on the container to mount the host volume at.
            readOnly: false, // Allow the container to write to the EFS volume.
        });

        const albFargateService = new ApplicationLoadBalancedCodeDeployedFargateService(this, `${props.environment}-${props.platformString}-${props.deployRegion}-FargateService`, {
            cluster: ecsCluster,
            taskDefinition: fargateTaskDefinition,
            desiredCount: 1,
            publicLoadBalancer: true,
            platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
            securityGroups: [chromaEfsSG, chromaDbSG], // might be needed to define port for Chroma vector sg
            listenerPort: 80, // The port on which the listener listens for incoming traffic
        });

        // set deregistration delay to 30 seconds
        albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

        // allow access to EFS from Fargate ECS
        efsFileSystem.grantRootAccess(albFargateService.taskDefinition.taskRole.grantPrincipal);
        efsFileSystem.connections.allowDefaultPortFrom(albFargateService.service.connections);

        // setup AutoScaling policy
        const scaling = albFargateService.service.autoScaleTaskCount({ maxCapacity: 2, minCapacity: 1 });
        scaling.scaleOnCpuUtilization(`${props.appName}-${props.environment}-${props.platformString}-CpuScaling`, {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60)
        });

        // print out fargateService dns name
        new cdk.CfnOutput(this, `${props.environment}-${props.platformString}-${props.deployRegion}-FargateServiceDns`, {
            value: albFargateService.loadBalancer.loadBalancerDnsName,
            exportName: `${props.environment}-${props.platformString}-${props.deployRegion}-FargateServiceDns`,
        });

        // print out fargateService service url
        new cdk.CfnOutput(this, `${props.environment}-${props.platformString}-${props.deployRegion}-FargateServiceUrl`, {
            value: `http://${albFargateService.loadBalancer.loadBalancerDnsName}`,
            exportName: `${props.environment}-${props.platformString}-${props.deployRegion}-FargateServiceUrl`,
        });
    }
}
