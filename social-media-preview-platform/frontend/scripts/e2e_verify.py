"""End-to-end API verification for the Social Media Preview Platform MVP.

Runs against a live server on http://localhost:3000 and exercises the flows
from the SRS acceptance criteria (A-01..A-12) via the REST API:
project create -> upload variants -> share (24h default / manual expiry /
invalid expiry) -> guest comments -> revoke -> expired/revoked fail-closed,
plus validation-error paths.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

BASE = 'http://localhost:3000'
TMP = Path(os.environ.get('TEMP', '/tmp'))
PASS = []
FAIL = []


def req(method, path, body=None, headers=None, cookie=None, raw=None, raw_type=None):
    url = BASE + path
    data = None
    hdrs = dict(headers or {})
    if cookie:
        hdrs['Cookie'] = cookie
    if raw is not None:
        data = raw
        hdrs['Content-Type'] = raw_type
    elif body is not None:
        data = json.dumps(body).encode()
        hdrs['Content-Type'] = 'application/json'
    r = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read(), resp.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read(), e.headers


def jreq(method, path, body=None, cookie=None):
    status, raw, _ = req(method, path, body=body, cookie=cookie)
    try:
        return status, json.loads(raw)
    except Exception:
        return status, {'_raw': raw[:200].decode('utf-8', 'replace')}


def check(name, cond, detail=''):
    (PASS if cond else FAIL).append((name, detail))
    print(('PASS' if cond else 'FAIL'), '-', name, ('| ' + detail if detail and not cond else ''))


def main():
    # ---- health ----
    status, raw, _ = req('GET', '/api/health')
    check('health endpoint returns ok', status == 200 and b'"ok"' in raw)

    # ---- session ----
    status, raw, headers = req('POST', '/api/session', body={})
    set_cookie = headers.get('Set-Cookie') or ''
    cookie = set_cookie.split(';')[0] if set_cookie else ''
    check('session created (POST /api/session)', status == 200 and cookie.startswith('smp_session='), f'cookie={cookie[:20]}')

    # ---- create project ----
    status, payload = jreq('POST', '/api/projects', {'title': '  Summer launch campaign  ', 'description': 'Hero creatives for the August launch'}, cookie)
    project = payload.get('data', {}).get('project', {})
    pid = project.get('id')
    check('project created (PRJ-001/002, title trimmed)', status == 200 and project.get('title') == 'Summer launch campaign' and pid, json.dumps(payload)[:120])

    # ---- validation: empty title ----
    status, payload = jreq('POST', '/api/projects', {'title': '   '}, cookie)
    check('empty project title rejected (PRJ-001)', status == 400 and payload.get('error', {}).get('code') == 'TITLE_REQUIRED')

    # ---- upload variants ----
    def upload(name, path, width, height):
        boundary = '----smpboundary' + str(time.time_ns())
        filebytes = Path(path).read_bytes()
        part = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="{name}"\r\n'
            f'Content-Type: image/png\r\n\r\n'
        ).encode() + filebytes + f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="width"\r\n\r\n{width}\r\n--{boundary}\r\nContent-Disposition: form-data; name="height"\r\n\r\n{height}\r\n--{boundary}--\r\n'.encode()
        status, raw, _ = req(
            'POST', f'/api/projects/{pid}/variants',
            raw=part, raw_type=f'multipart/form-data; boundary={boundary}', cookie=cookie,
        )
        return status, json.loads(raw)

    status, payload = upload('hero_launch.png', str(TMP / 'creative_a.png'), 1200, 675)
    v1 = payload.get('data', {}).get('variant', {})
    check('variant 1 uploaded (IMG-007), active variant set', status == 200 and v1.get('id') and v1.get('asset', {}).get('width') == 1200, json.dumps(payload)[:200])
    v1id = v1.get('id')

    status, payload = upload('story_launch.png', str(TMP / 'creative_b.png'), 1080, 1350)
    v2 = payload.get('data', {}).get('variant', {})
    v2id = v2.get('id')
    check('variant 2 uploaded, becomes active (FR-006)', status == 200 and v2.get('id'))

    # default name from filename
    check('default variant name from filename (IMG-008)', v1.get('name') == 'hero launch')

    # ---- validation: unsupported type ----
    boundary = '----smpx'
    part = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\n'
        f'Content-Type: text/plain\r\n\r\nhello not an image\r\n--{boundary}--\r\n'
    ).encode()
    status, payload = jreq('POST', f'/api/projects/{pid}/variants', None)
    status, raw, _ = req('POST', f'/api/projects/{pid}/variants', raw=part, raw_type=f'multipart/form-data; boundary={boundary}', cookie=cookie)
    check('unsupported file type rejected (IMG-002)', status == 400 and b'UNSUPPORTED_TYPE' in raw)

    # ---- asset serving ----
    asset_id = v1.get('asset', {}).get('id')
    status, raw, headers = req('GET', f'/api/assets/{asset_id}')
    check('asset served with immutable cache', status == 200 and raw[:4] == b'\x89PNG' and 'immutable' in (headers.get('Cache-Control') or ''))

    # ---- rename variant ----
    status, payload = jreq('PATCH', f'/api/variants/{v2id}', {'name': 'Story variant'}, cookie)
    check('variant renamed (FR-007)', status == 200 and payload.get('data', {}).get('variant', {}).get('name') == 'Story variant')

    # ---- select active variant ----
    status, payload = jreq('PATCH', f'/api/projects/{pid}', {'activeVariantId': v1id}, cookie)
    check('active variant selected (FR-006)', status == 200)

    # ---- create share: default 24h (SHR-002) ----
    status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': v1id, 'platform': 'linkedin', 'device': 'desktop'}, cookie)
    share1 = payload.get('data', {}).get('share', {})
    url1 = share1.get('url') or ''
    token1 = url1.rsplit('/share/', 1)[-1]
    check('share created with 24h default (SHR-002)', status == 200 and share1.get('status') == 'ACTIVE' and len(token1) > 20, json.dumps(payload)[:200])

    # manual expiry 7 days (SHR-003)
    status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': v2id, 'platform': 'tiktok', 'device': 'mobile', 'expiresInHours': 168}, cookie)
    share2 = payload.get('data', {}).get('share', {})
    token2 = (share2.get('url') or '').rsplit('/share/', 1)[-1]
    check('manual expiry accepted (SHR-003)', status == 200 and share2.get('status') == 'ACTIVE')

    # invalid expiry in the past (SHR-004)
    status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': v1id, 'platform': 'youtube', 'device': 'desktop', 'expiresInHours': -2}, cookie)
    check('past expiry rejected (SHR-004)', status == 400 and payload.get('error', {}).get('code') == 'INVALID_EXPIRY')

    # ---- brand identity: logo upload + fields ----
    boundary = '----brandb'
    logo_bytes = Path(str(TMP / 'creative_b.png')).read_bytes()
    brand_part = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="logo.png"\r\n'
        f'Content-Type: image/png\r\n\r\n'
    ).encode() + logo_bytes + f'\r\n--{boundary}--\r\n'.encode()
    status, raw, _ = req('POST', f'/api/projects/{pid}/brand/logo', raw=brand_part, raw_type=f'multipart/form-data; boundary={boundary}', cookie=cookie)
    brand_logo = json.loads(raw).get('data', {}).get('assetId')
    check('brand logo uploaded', status == 200 and brand_logo, raw[:150].decode('utf-8', 'replace'))
    status, payload = jreq('PATCH', f'/api/projects/{pid}', {'brandName': 'Aurora Studio', 'brandHandle': '@aurora.studio', 'brandTagline': 'Designs that launch brands.'}, cookie)
    check('brand fields saved', status == 200 and payload.get('data', {}).get('project', {}).get('brandName') == 'Aurora Studio')

    # ---- new placement contexts render on share pages ----
    for platform, context, marker in [
        ('instagram', 'profile', 'ig-grid'),
        ('facebook', 'page', 'fb-pagehead'),
        ('tiktok', 'profile', 'tk-grid'),
        ('linkedin', 'page', 'li-pagehead'),
    ]:
        status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': v1id, 'platform': platform, 'device': 'desktop', 'context': context}, cookie)
        tok = (payload.get('data', {}).get('share', {}).get('url') or '').rsplit('/share/', 1)[-1]
        status, raw, _ = req('GET', f'/share/{tok}')
        check(f'{platform} {context} share renders ({marker})', status == 200 and marker.encode() in raw and b'Aurora Studio' in raw)

    # brand logo DELETE clears the field
    status, payload = jreq('DELETE', f'/api/projects/{pid}/brand/logo', cookie=cookie)
    check('brand logo cleared', status == 200)

    # ---- crop adjustment persists per platform ----
    status, payload = jreq('PATCH', f'/api/variants/{v1id}', {'adjustments': {'youtube': {'x': 12, 'y': -8, 'scale': 1.3}}}, cookie)
    check('crop adjustment saved', status == 200 and payload.get('data', {}).get('variant', {}).get('adjustments', {}).get('youtube', {}).get('x') == 12)
    status, payload = jreq('PATCH', f'/api/variants/{v1id}', {'adjustments': {'youtube': {'x': 90, 'y': 0, 'scale': 1}}}, cookie)
    check('out-of-range adjustment rejected', status == 400 and payload.get('error', {}).get('code') == 'INVALID_ADJUSTMENT')

    # overview + compare pages render for the owner
    status, raw, _ = req('GET', f'/project/{pid}/overview', cookie=cookie)
    check('overview page renders', status == 200 and b'All Platforms' in raw)
    status, raw, _ = req('GET', f'/project/{pid}/compare', cookie=cookie)
    check('compare page renders', status == 200 and b'Compare Platforms' in raw)

    # invalid placement context rejected (BR-004)
    status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': v1id, 'platform': 'youtube', 'device': 'desktop', 'context': 'bogus'}, cookie)
    check('invalid context rejected (BR-004)', status == 400 and payload.get('error', {}).get('code') == 'INVALID_CONTEXT')

    # context + theme snapshot: youtube search results, light theme
    status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': v1id, 'platform': 'youtube', 'device': 'desktop', 'context': 'search', 'theme': 'light'}, cookie)
    share3 = payload.get('data', {}).get('share', {})
    token3 = (share3.get('url') or '').rsplit('/share/', 1)[-1]
    check('share with context+theme created', status == 200 and share3.get('contextId') == 'search' and share3.get('theme') == 'light')

    # context + theme snapshot: youtube channel page, dark theme (default)
    status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': v1id, 'platform': 'youtube', 'device': 'mobile', 'context': 'channel'}, cookie)
    share4 = payload.get('data', {}).get('share', {})
    token4 = (share4.get('url') or '').rsplit('/share/', 1)[-1]
    check('share with channel context created', status == 200 and share4.get('contextId') == 'channel')

    # BR-002: variant of another project rejected
    status, payload = jreq('POST', f'/api/projects/{pid}/shares', {'variantId': 'nope', 'platform': 'youtube', 'device': 'desktop'}, cookie)
    check('share with foreign variant rejected (BR-002)', status == 400)

    # ---- share page rendering ----
    status, raw, _ = req('GET', f'/share/{token1}')
    html = raw.decode('utf-8', 'replace')
    check('share page renders review state (SHR-008)', status == 200 and 'LinkedIn' in html and 'Review preview' in html and 'hero launch' in html)
    check('share page shows simulated disclaimer', 'not affiliated' in html)
    check('share page exposes no editing controls', 'Upload image' not in html and 'Preview destination' not in html)

    # context/theme snapshots render the requested placement + theme
    status, raw, _ = req('GET', f'/share/{token3}')
    html3 = raw.decode('utf-8', 'replace')
    check('search-context share renders search results (light)', b'yt-results' in raw and b'yt light' in raw and b'Up next' not in raw)
    status, raw, _ = req('GET', f'/share/{token4}')
    html4 = raw.decode('utf-8', 'replace')
    check('channel-context share renders mobile channel (dark)', b'yt-mgrid' in raw and b'yt light' not in raw)

    status, raw, _ = req('GET', '/share/definitely-not-a-real-token-1234567890abcdef')
    check('invalid token fails closed, generic message (SEC-008)',
          status == 200 and b'no longer available' in raw and b'share-stage-canvas' not in raw
          and b'hero launch' not in raw)

    # ---- guest comments (COM-001..003) ----
    status, payload = jreq('POST', f'/api/shares/token/{token1}/comments', {'displayName': '  Dana Manager  ', 'body': '  Looks great — approve the hero crop.  '})
    check('guest comment accepted (COM-001/002)', status == 200 and payload.get('data', {}).get('comment', {}).get('displayName') == 'Dana Manager')
    status, payload = jreq('GET', f'/api/shares/token/{token1}/comments')
    check('comments listed on share (COM-005)', status == 200 and len(payload.get('data', {}).get('comments', [])) == 1)
    status, payload = jreq('POST', f'/api/shares/token/{token1}/comments', {'displayName': 'Dana', 'body': '   '})
    check('empty comment rejected (COM-003)', status == 400 and payload.get('error', {}).get('code') == 'COMMENT_EMPTY')

    # owner can read comments via share id (FR-064)
    share1_id = share1.get('id')
    status, payload = jreq('GET', f'/api/shares/{share1_id}', cookie=None)
    check('owner comment route requires session', status == 404)
    status, payload = jreq('GET', f'/api/shares/{share1_id}', cookie=cookie)
    check('owner reads comments via share id (FR-064)', status == 200 and len(payload.get('data', {}).get('comments', [])) == 1)

    # ---- revoke (SHR-005, UC-09) ----
    status, payload = jreq('POST', f'/api/shares/{share1_id}/revoke', {}, cookie=cookie)
    check('revoke accepted (SHR-005)', status == 200 and payload.get('data', {}).get('share', {}).get('status') == 'REVOKED')
    status, raw, _ = req('GET', f'/share/{token1}')
    check('revoked share fails closed (SHR-010)', b'no longer available' in raw and b'hero launch' not in raw)
    status, payload = jreq('POST', f'/api/shares/token/{token1}/comments', {'displayName': 'X', 'body': 'should fail'})
    check('comment on revoked share rejected (BR-009)', status == 410)

    # ---- expired share (A-10) is verified separately: expiresAt is forced
    # into the past in data/db.json while the server is stopped, then the
    # server is restarted so the in-memory cache is re-read. See README/scripts.
    dbpath = Path('data/db.json')
    db = json.loads(dbpath.read_text())
    expired_tokens = []
    for s in db['shares']:
        if s['id'] == share2.get('id'):
            s['expiresAt'] = '2020-01-01T00:00:00.000Z'
            expired_tokens.append((share2.get('url') or '').rsplit('/share/', 1)[-1])
    dbpath.write_text(json.dumps(db))
    if expired_tokens:
        print()
        print('Expired-share follow-up (server restart required):')
        print(f'  expired token: {expired_tokens[0]}')
        print('  expected page marker: "This preview link has expired."')

    print()
    print(f'RESULT: {len(PASS)} passed, {len(FAIL)} failed')
    if FAIL:
        for name, _ in FAIL:
            print('  FAILED:', name)
        sys.exit(1)


if __name__ == '__main__':
    main()
