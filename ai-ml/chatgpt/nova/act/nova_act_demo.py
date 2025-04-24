from nova_act import NovaAct

with NovaAct(starting_page="https://www.amazon.com") as nova:
    print("Hey there, I will help on browser search")
    result = nova.act("search for a coffee maker")
    print(result.parsed_response)
    print("search for a coffee maker done!")
    result = nova.act("select the first result")
    print(result.parsed_response)
    print("select the first result done!")
    result = nova.act("scroll down or up until you see 'add to cart' and then click 'add to cart'")
    print(result.parsed_response)
    print("complete add to cart")