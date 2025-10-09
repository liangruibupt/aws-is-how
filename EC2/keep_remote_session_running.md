# Use the Tmux to keep remote session running

It is used to avoid terminate session due to network issue or timeout of ssh 

1. Install tmux https://github.com/tmux/tmux/wiki

2. run command
```bash
# start
tmux new -s deploy

# in the tmux run your command
yarn deploy:cdk --parameters vpcId="vpc-0262a68554d2a833e" --parameters publicSubnets="subnet-0e0278621db083fe2,subnet-0f84fde5f96e1b072" --parameters privateSubnets="subnet-06c6919eecbea4a9a,subnet-06818ae982928027a"

# restore
tmux attach -t deploy

```