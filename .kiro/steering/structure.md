# Project Structure

## Organization Pattern
The repository follows a **service-based folder structure** where each top-level directory represents a major AWS service category or functional area.

## Top-Level Directories

### Core AWS Services
- **`EC2/`** - Compute instances, networking, and infrastructure
- **`lambda/`** - Serverless functions and related tools
- **`storage/`** - S3, EBS, EFS, and storage solutions
- **`database/`** - RDS, DynamoDB, DocumentDB, and data storage
- **`network/`** - VPC, load balancers, and networking components
- **`security/`** - IAM, KMS, encryption, and security services
- **`container/`** - ECS, EKS, Docker, and containerization

### Specialized Domains
- **`ai-ml/`** - Machine learning, SageMaker, and AI services
- **`analytics/`** - Data processing, ETL, and analytics tools
- **`iot/`** - IoT Core, device management, and edge computing
- **`devops/`** - CI/CD, monitoring, and development tools
- **`integration/`** - SQS, SNS, EventBridge, and messaging

### Cross-Cutting Concerns
- **`vpc/`** - Virtual private cloud configurations
- **`R53/`** - Route 53 DNS and domain management
- **`cost/`** - Cost optimization and billing analysis
- **`migration/`** - Data and application migration tools
- **`dr_ha/`** - Disaster recovery and high availability

## File Naming Conventions
- **Documentation**: `README.md`, `Service-Feature-Description.md`
- **Scripts**: `service_operation.py`, `deploy-infrastructure.sh`
- **Templates**: `service-template.yaml`, `stack-template.json`
- **Notebooks**: `service-analysis.ipynb`, `ml-experiment.ipynb`

## Standard Subdirectory Structure
Most service directories contain:
- **`README.md`** - Service overview and getting started guide
- **`scripts/`** - Automation scripts and utilities
- **`media/`** - Screenshots, diagrams, and visual assets
- **`workshop/`** - Step-by-step tutorial materials
- **Individual `.md` files** - Specific feature documentation

## Documentation Standards
- Each major feature has its own markdown file with descriptive names
- Code examples are embedded directly in documentation
- Screenshots and diagrams are stored in `media/` subdirectories
- Workshop materials include both documentation and executable code

## Regional Considerations
- Files may include region-specific configurations (Global vs China)
- Profile-based examples for multi-region deployments
- Service availability differences documented per region