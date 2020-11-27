# Use ALB and NLB to route the traffic to instance hosted in Peering VPC

## Prepare
1. Setup the VPC peering between `VPC-80-Port` and `VPC-9080-Port`
2. Setup the Security group allow 80 and 9080 port
3. Create EC2 with c4.large in `VPC-80-Port` and EC2 with t2.medium in `VPC-9080-Port`
![EC2](media/EC2-Peering-ALB1.png)

## ALB
1. Create ALB in `VPC-9080-Port`

2. Target group for ALB which point to IP address in peered VPC `VPC-80-Port` and Port is 80
![EC2-Peering-ALB-TG-80](media/EC2-Peering-ALB-TG1.png)

3. Target group for ALB which point to IP address in local VPC `VPC-9080-Port` and Port is 9080
![EC2-Peering-ALB-TG-9080](media/EC2-Peering-ALB-TG2.png)

4. ALB Listener
![EC2-Peering-ALB-Listener](media/EC2-Peering-ALB-Listener.png)

5. Verify access ALB 80 and 9080 can get success response

## NLB
1. Create NLB in `VPC-9080-Port`

2. Target group for NLB which point to IP address in peered VPC `VPC-80-Port` and Port is 80
![EC2-Peering-NLB-TG-80](media/EC2-Peering-ALB-TG-80.png)

3. Target group for NLB which point to IP address in local VPC `VPC-9080-Port` and Port is 9080
![EC2-Peering-NLB-TG-9080](media/EC2-Peering-ALB-TG-9080.png)

4. NLB Listener
![EC2-Peering-NLB-Listener](media/EC2-Peering-NLB1.png)

5. Verify access NLB 80 and 9080 can get success response
