# How to achieve active-active/active-passive Direct Connect connection 

You can use multiple Direct Connect connection to increase bandwidth and high availability. How to achieve active-active/active-passive Direct Connect connection 
 - Private virtual interfaces created on the Direct Connect connections attached to the same virtual private gateways (VGW) in the same Region.
- Private virtual Interfaces created on the Direct Connect connections attached to the same Direct Connect Gateway (DXGW) and associated with multiple VGWs in any Regions.
- Transit virtual Interfaces created on the Direct Connect connections attached to the same DXGW and associated with multiple transit gateways in any Regions.

Check the guide to configure the 
- [How do I influence my Direct Connect connection network traffic path to on-premises over multiple circuits?](https://aws.amazon.com/premiumsupport/knowledge-center/on-premises-direct-connect-traffic/)

- [Set up an Active/Active or Active/Passive Direct Connect connection to AWS from a public virtual interface](https://aws.amazon.com/premiumsupport/knowledge-center/dx-create-dx-connection-from-public-vif/)

Then BGP is follow up the 5-tuple for traffic distribution: (1) Source IP (2) Source Port (3) destination IP (4) destination Port (5) the layer 4 protocol