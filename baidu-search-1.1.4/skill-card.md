## Description: <br>
Search the web using Baidu AI Search Engine (BDSE). Use for live information, documentation, or research topics. <br>

This skill is ready for commercial/non-commercial use. <br>

## Publisher: <br>
[ide-rea](https://clawhub.ai/user/ide-rea) <br>

### License/Terms of Use: <br>
MIT-0 <br>


## Use Case: <br>
Developers, researchers, and external agent users use this skill to fetch current Baidu web search references for live information, documentation lookup, and research tasks. <br>

### Deployment Geography for Use: <br>
Global <br>

## Known Risks and Mitigations: <br>
Risk: Search queries are sent to Baidu or to the configured sandbox proxy. <br>
Mitigation: Use the skill only for queries that are acceptable to share with that service path. <br>
Risk: The skill requires a sensitive Baidu API key. <br>
Mitigation: Use a dedicated revocable key, keep the OpenClaw configuration private, and rotate the key if exposure is suspected. <br>
Risk: API usage may consume quota or incur billing. <br>
Mitigation: Monitor Baidu Cloud quota, account balance, and billing for the key used by this skill. <br>


## Reference(s): <br>
- [Baidu API Key Setup Guide](references/apikey-fetch.md) <br>
- [Baidu AI Search API key console](https://console.bce.baidu.com/ai-search/qianfan/ais/console/apiKey) <br>
- [Baidu AI Search web search endpoint](https://qianfan.baidubce.com/v2/ai_search/web_search) <br>
- [ClawHub skill page](https://clawhub.ai/ide-rea/baidu-search) <br>


## Skill Output: <br>
**Output Type(s):** [text, json, shell commands, configuration, guidance] <br>
**Output Format:** [JSON search results printed to stdout, with Markdown setup guidance in the bundled reference file.] <br>
**Output Parameters:** [1D] <br>
**Other Properties Related to Output:** [Accepts a JSON request with query, optional count from 1 to 50, and optional freshness filters; removes snippets from returned reference items.] <br>

## Skill Version(s): <br>
1.1.4 (source: server release evidence) <br>

## Ethical Considerations: <br>
Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment. <br>
