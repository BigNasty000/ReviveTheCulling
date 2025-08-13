Current Base: 00007FF745910000

Important functions:
00007FF745AECE90
00007FF74619E3EF - Calls recvform
00007FF74619E441 - Calls decryption after recvfrom
00007FF74619E552 - Calls encryption before sendto
00007FF74619E579 - Calls sendto
00007FF7468E6670
00007FF746993FC0 - Bunch parser
00007FF746D4A6C0 - Packet handler
00007FF746D4A70C - Where 3FC0 is called
00007FF746DE9D10 - Function that determines "Connection Loss" -> most likely calls our packet handlers
00007FF746F42C02 - Check just before the "listen" in the url is
00007FF746F42CE0 - Client Travel Function, loads the map
00007FF747BF5700 - Assuming engine tick function calls everything
00007FFA51161760 - sendto
00007FFA51163DA0 - recvfrom