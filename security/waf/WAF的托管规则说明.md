# WAF的托管规则说明

## Question: 文档或者WAF的LOG中是否有对应的风险漏洞说明，如：NoUserAgent_HEADER 规则对应的风险漏洞是什么？
WAF 的托管规则组中存在检测出恶意 payload 的规则，比如：
例 Known bad inputs 规则组下的部分规则：
    JavaDeserializationRCE_HEADER
    检查 HTTP 请求标头的键和值，寻找表明 Java 反序列化远程命令执行 (RCE) 尝试的模式，例如 Spring Core 和 Cloud Function RCE 漏洞（CVE-2022-22963、CVE-2022-22965）。示例模式包括 (java.lang.Runtime).getRuntime().exec(“whoami”)。
    Log4JRCE_HEADER
    检查请求标头的密钥和值是否存在 Log4j 漏洞（CVE-2021-44228、CVE-2021-45046、CVE-2021-45105），并防止尝试远程执行代码 (RCE)。示例模式包括 ${jndi:ldap://example.com/}。
  Known bad inputs managed rule group：https://docs.amazonaws.cn/en_us/waf/latest/developerguide/aws-managed-rule-groups-baseline.html#aws-managed-rule-groups-baseline-known-bad-inputs
例 SQL database 规则组下的部分规则：
    SQLi_QUERYARGUMENTS
    使用内置Amazon WAFSQL 注入攻击规则语句的（敏感度级别设置为Low）检查所有查询参数的值，寻找与恶意 SQL 代码匹配的模式。
  SQL database managed rule group：https://docs.amazonaws.cn/en_us/waf/latest/developerguide/aws-managed-rule-groups-use-case.html

## Question: 客户提到的NoUserAgent_HEADER规则与任何已知的漏洞风险都无强相关性，怎么处理？
文档中关于此规则的描述仅是（查缺少 HTTPUser-Agent 标头的请求）。
同时需要提醒的是，WAF 托管规则组只是检测并拦截具有恶意 payload 的请求，并根据检查恶意 payload 来匹配已知的漏洞风险种类（如 java 反序列化）并不能直接确定环境存在的具体漏洞，WAF文档对这些规则描述中提到的cve id也只是在举例的这个种类漏洞的示例的几个 cve id（并不一定与环境中存在的 cve 漏洞一致）。

有关 Amazon 托管规则组的规则更详细的信息，请参考以下文档：
[Amazon 托管规则规则组列表](https://docs.amazonaws.cn/waf/latest/developerguide/aws-managed-rule-groups-list.html)
