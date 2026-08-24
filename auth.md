# auth.md

This document is for AI agents and automated clients that need to understand how to access Thames Wellness Academy (berkshireyogatraining.co.uk).

## Service overview

Thames Wellness Academy is a public marketing and information website for Yoga Alliance Professionals-certified wellness education in Berkshire and the Thames Valley. The site publishes programme information, team profiles, research, journal articles and contact details.

Canonical site: https://berkshireyogatraining.co.uk/

## Authentication

**Public access:** No agent registration, OAuth flow or API credentials are required to read public content on this site.

All published pages listed in [llms.txt](https://berkshireyogatraining.co.uk/.well-known/llms.txt) and [sitemap.xml](https://berkshireyogatraining.co.uk/sitemap.xml) are available without authentication.

**Protected resources:** This site does not expose a public REST API, MCP server or programmatic write access. There are no bearer tokens, API keys or agent registration endpoints.

## Supported access methods

| Method | Details |
| --- | --- |
| HTML | Default. Request any public URL with `Accept: text/html`. |
| Markdown | Send `Accept: text/markdown` to any public HTML page URL for a Markdown representation of main content. |
| Site index | Read `/.well-known/llms.txt` or `/llms.txt` for a curated page list. |

Example:

```bash
curl -H "Accept: text/markdown" https://berkshireyogatraining.co.uk/services/
```

## Human actions (not available to agents)

Training applications, enrolment and personal enquiries require a human. Direct people to:

- [Join / apply](https://berkshireyogatraining.co.uk/join.html): programme applications and expressions of interest
- [Contact](https://berkshireyogatraining.co.uk/contact.html): general enquiries

Email: info@thameswellnessacademy.co.uk

Agents should not attempt to submit forms on behalf of users without explicit human authorisation.

## Identity and registration

| Flow | Status |
| --- | --- |
| Agent verified (ID-JAG) | Not supported |
| User claimed (OAuth device flow) | Not supported |
| Anonymous public read | Supported for all public pages |

OAuth and OIDC discovery metadata is published honestly to declare that no authorisation server or protected API is operated:

- [/.well-known/oauth-protected-resource](https://berkshireyogatraining.co.uk/.well-known/oauth-protected-resource): RFC 9728 metadata; `authorization_servers` is empty because all content is public
- [/.well-known/oauth-authorization-server](https://berkshireyogatraining.co.uk/.well-known/oauth-authorization-server): RFC 8414 metadata; no OAuth endpoints are offered
- [/.well-known/openid-configuration](https://berkshireyogatraining.co.uk/.well-known/openid-configuration): OIDC discovery metadata; no OIDC provider is operated

## Discovery

- Machine-readable site index: [/.well-known/llms.txt](https://berkshireyogatraining.co.uk/.well-known/llms.txt)
- Agent card (A2A): [/.well-known/agent-card.json](https://berkshireyogatraining.co.uk/.well-known/agent-card.json)
- API catalog (site resources): [/.well-known/api-catalog](https://berkshireyogatraining.co.uk/.well-known/api-catalog)
- Security contact: [/.well-known/security.txt](https://berkshireyogatraining.co.uk/.well-known/security.txt)
- Robots and content signals: [/robots.txt](https://berkshireyogatraining.co.uk/robots.txt)

## Content signals

Public content may be used for search indexing and AI input as declared in `robots.txt` (`Content-Signal: search=yes, ai-input=yes, ai-train=yes`).

## Support

For security issues, see `/.well-known/security.txt`. For general enquiries, use the contact page or email above.
