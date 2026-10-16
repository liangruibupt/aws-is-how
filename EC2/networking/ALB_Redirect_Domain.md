# How can I redirect one domain to another domain using an Application Load Balancer? 

Follow the guide [How can I redirect one domain to another domain using an Application Load Balancer?](https://aws.amazon.com/premiumsupport/knowledge-center/elb-redirect-to-another-domain-with-alb/)

Highlight steps:

`Listeners - Add rule - Add condition`
1. Choose Redirect to.
2. Specify the protocol and port, as required by your use case.
3. Change Original host, path, query to Custom host, path, query.
4. For Host, enter example2.com.
5. For Path and Query, keep the default values (unless your use case requires you to change them).
6. Set the Response to HTTP 301 "Permanently moved" or HTTP 302 "Found".
   
```
Redirect to https://example2.com:443/#{path}?#{query}
Status code: HTTP_301
```

**Note**

`The only difference between 307 and 302 is that 307 guarantees that the method and the body will not be changed when the redirected request is made. With 302, some old clients were incorrectly changing the method to GET: the behavior with non-GET methods and 302 is then unpredictable on the Web, whereas the behavior with 307 is predictable. For GET requests, their behavior is identical. More details, please check [307 Temporary Redirect - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/307)`

`Use the 301 code only as a response for GET or HEAD methods and use the 308 Permanent Redirect for POST methods instead, as the method change is explicitly prohibited with this status. More details, please check [301 status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301)`

## if 307 is required, how to resolve it?
- Global regions: Lambda@edge
- China regions: DO NOT configure redirection on ALB, handle the redirect and 307 status code on Lambda or Nngix as target group of ALB
```
Client -> ALB -> Lambda -> Orginal Server
Client -> ALB -> Nginx -> Orginal Server
```