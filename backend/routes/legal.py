"""Publicly hosted legal pages (privacy policy) served as clean HTML.
No authentication — required for App Store / Play Store listing URLs."""
from html import escape

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from legal_content import PRIVACY_POLICY, PRIVACY_VERSION

router = APIRouter()

_PAGE_CSS = """
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.65;
  color: #2b2540;
  background: #faf8ff;
}
.wrap { max-width: 760px; margin: 0 auto; padding: 40px 22px 80px; }
.brand { font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: #7c5cff; font-weight: 700; }
h1 { font-size: 30px; margin: 6px 0 4px; line-height: 1.2; }
.meta { color: #6b6480; font-size: 14px; margin-bottom: 28px; }
.section { margin-bottom: 22px; padding-bottom: 22px; border-bottom: 1px solid rgba(124,92,255,0.14); }
.section:last-child { border-bottom: none; }
.section h2 { font-size: 18px; margin: 0 0 8px; color: #4b3f7a; }
.section p { margin: 0; white-space: pre-wrap; color: #37324d; }
footer { margin-top: 36px; color: #6b6480; font-size: 13px; text-align: center; }
@media (prefers-color-scheme: dark) {
  body { color: #e7e3f5; background: #14101f; }
  h1 { color: #f2eeff; }
  .section h2 { color: #b7a4ff; }
  .section p { color: #d5cfe8; }
  .section { border-color: rgba(183,164,255,0.16); }
}
"""


def _render(title: str, version: str, sections) -> str:
    body_html = "\n".join(
        f'<div class="section"><h2>{escape(s["h"])}</h2><p>{escape(s["b"])}</p></div>'
        for s in sections[1:]  # first item is the page header/intro
    )
    intro = sections[0]
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="index,follow" />
<title>{escape(title)} · TherapiShots</title>
<style>{_PAGE_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">TherapiShots</div>
    <h1>{escape(intro["h"])}</h1>
    <div class="meta">Version {escape(version)}</div>
    <div class="section"><p>{escape(intro["b"])}</p></div>
    {body_html}
    <footer>© TherapiShots Private Limited · privacy@therapishots.com</footer>
  </div>
</body>
</html>"""


@router.get("/legal/privacy", response_class=HTMLResponse)
async def privacy_policy_page():
    return HTMLResponse(_render("Privacy Policy", PRIVACY_VERSION, PRIVACY_POLICY))
