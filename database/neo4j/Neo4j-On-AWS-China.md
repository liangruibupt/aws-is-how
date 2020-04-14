## Start from docker
[docker-run-neo4j](https://neo4j.com/developer/docker-run-neo4j/)

```bash
docker run \
    --name testneo4j \
    -p7474:7474 -p7687:7687 \
    -d \
    -v $HOME/neo4j/data:/data \
    -v $HOME/neo4j/logs:/logs \
    -v $HOME/neo4j/import:/var/lib/neo4j/import \
    -v $HOME/neo4j/plugins:/plugins \
    --env NEO4J_AUTH=neo4j/test \
    neo4j:4.0.3

docker-compose up
docker-compose down

```

## Install Community Standalone directly

## Install global AMI on China region
1. The original root volume for Marketplace AMI are 100GiB
2. Create new 200GiB EBS volume in the same AZ and attached to instance
3. Login to instance and process dd to store the root volume to /mnt/root.img
```bash
sudo fdisk -l

Disk /dev/nvme0n1: 100 GiB, 107374182400 bytes, 209715200 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0xdef2e9be

Device         Boot Start       End   Sectors  Size Id Type
/dev/nvme0n1p1 *     2048 209715166 209713119  100G 83 Linux


Disk /dev/nvme1n1: 200 GiB, 214748364800 bytes, 419430400 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes

df -Th

sudo mkfs.ext4 /dev/nvme1n1
sudo mount /dev/nvme1n1 /mnt
df -Th

sudo dd if=/dev/nvme0n1 of=/mnt/root.img bs=1M
102400+0 records in
102400+0 records out
107374182400 bytes (107 GB, 100 GiB) copied, 936.357 s, 115 MB/s

```

4. Copy the root.img to China region
```bash
#us-east-1 upload

aws configure set s3.max_concurrent_requests 100 --profile cn
aws configure set s3.max_queue_size 10000 --profile cn
aws configure set s3.multipart_threshold 10MB --profile cn
aws configure set s3.multipart_chunksize 5MB --profile cn

aws s3 cp /mnt/root.img s3://ray-tools-sharing/ami/neo-root.img --profile cn --region cn-northwest-1
```

5. download from China region and dd to EBS volume
```bash
# cn-north-1 Ubuntu instance download
pip3 install --upgrade --user awscli
export PATH=$HOME/.local/bin:$PATH

aws configure set default.s3.max_concurrent_requests 100
aws configure set default.s3.max_queue_size 10000
aws configure set default.s3.multipart_threshold 10MB
aws configure set default.s3.multipart_chunksize 5MB

aws s3 cp s3://ray-tools-sharing/ami/neo-root.img /tmp/root.img --region cn-northwest-1

sudo fdisk -l
# use ‘dd’ to write the root.img to the EBS volume
sudo dd if=/tmp/root.img of=/dev/xvdf bs=1M oflag=direct
sudo fdisk -l
cat /proc/partitions
sudo partprobe
sudo fdisk -l

mkdir -p /tmp/neo4j
sudo mount /dev/xvdf1 /tmp/neo4j
sudo rm /tmp/centos/root/.ssh/authorized_keys
sudo umount /tmp/centos
```

6. Create the instance
- detach the EBS volumn and create a EBS snaptshot
- create image neo4j-4.0.2 from EBS snaptshot
- Launch an instance use neo4j-4.0.2 AMI, ssh to the instance and make sure everything starts correctly 
```bash
sudo fdisk -l
```