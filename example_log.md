```bash
G:\Programming Projects\TCXAV>python mock_server.py
Server initialized for eventlet.
INFO:engineio.server:Server initialized for eventlet.
Starting server with DEFAULT WebSocket path and SSL...
(20960) wsgi starting up on https://0.0.0.0:443
(20960) accepted ('127.0.0.1', 53409)

--- HTTP Request ---
Host: clientweb2.us-east-1.production.theculling.net
GET /api
Content-Type: text/plain
Host: clientweb2.us-east-1.production.theculling.net
Accept-Encoding: deflate, gzip
Accept: */*
User-Agent: Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.86 Safari/537.36


{}
Hit: Unauthenticated Root (/api)
Generated WSS socket URL: wss://clientweb2.us-east-1.production.theculling.net/socket.io
127.0.0.1 - - [11/Jul/2025 12:47:50] "GET /api HTTP/1.1" 200 446 0.003001

--- HTTP Request ---
Host: clientweb2.us-east-1.production.theculling.net
POST /api/login
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Content-Length: 584
Host: clientweb2.us-east-1.production.theculling.net
Accept-Encoding: deflate, gzip
Accept: */*
Origin: coui://uiresources
User-Agent: Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.86 Safari/537.36


{}
Form Data: {'ticket': '1400000002DD5D228E93C8F9E819E205010010016247716818000000010000000200000057535DEA387FA46320E9CC0335000000B80000003800000004000000E819E20501001001E4AB06002B501D88E0CA2419000000006D2F7068EDDE8B680100B36B01000100DE4A0E000000000086717AC2CD3833053D6DBD59892C1CAB4C4EADE95389F94486BF3A581831688BC31405456A9BA3BF126A9A581E7B0F907B43E31C9A0710CC1CA46FE8BC6D853C1683CB817A9FF60C5610E36E820C134D938596F7544C73EA82C5B33A3D90C70C83F7306F3FB62B01E29AECAFC5960911DF4A496F455265E9462150B88DFEFA61', 'authType': 'steam', 'appid': '437220', 'build': '119207', 'userid': 'steam:76561198058969576', '__Type': 'JSLoginPostData'}
Hit: Login Endpoint (/api/login)
-> Responding to login with full, correct payload: {'redirect': 'https://clientweb2.us-east-1.production.theculling.net/api/authenticated_root', 'token': 'fake-jwt-token-for-testing-purposes', 'userID': 'steam:76561198058969576', 'build': '119207'}
127.0.0.1 - - [11/Jul/2025 12:47:50] "POST /api/login HTTP/1.1" 200 363 0.002999

--- HTTP Request ---
Host: clientweb2.us-east-1.production.theculling.net
GET /api/authenticated_root
Content-Type: text/plain
Host: clientweb2.us-east-1.production.theculling.net
Accept-Encoding: deflate, gzip
Accept: */*
Authorization: Bearer fake-jwt-token-for-testing-purposes
User-Agent: Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.86 Safari/537.36


{}
Hit: Authenticated Root (/api/authenticated_root). Client should now have all data.
Sending back: {'authenticated': True, 'userID': 'steam:76561197960287930', 'build': '20240521', 'avatarUrl': 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/b5/b5bd56c1527ab04f4523a26a38614561b620bd38_full.jpg', 'redeemSystemOnline': True, 'player': {'cullCredits': 25700, 'premiumCurrency': 1250, 'migrated': True}, 'stats': {'level': '999', 'wins': 78, 'kills': 856, 'gamesPlayed': 621}, 'challenges': {'challengeMap': {}}}
```