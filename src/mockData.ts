import { NodeConfig, RoutingRule, SystemConfig, LogLine } from './types';

export const INITIAL_NODES: NodeConfig[] = [
  {
    id: 'node-1',
    tag: 'SS-Tokyo-01',
    protocol: 'shadowsocks',
    address: 'tokyo-ss.leafproxy.net',
    port: 8388,
    ssMethod: 'chacha20-ietf-poly1305',
    ssPassword: 'tokyo-secure-pwd',
    ssPrefix: 'leaf-payload-01',
    wsEnabled: false,
    tlsEnabled: false,
    healthCheckEnabled: true,
    checkInterval: 30,
    failTimeout: 5,
  },
  {
    id: 'node-2',
    tag: 'Trojan-SG-HighSpeed',
    protocol: 'trojan',
    address: 'sg-trojan.leafproxy.net',
    port: 443,
    password: 'sg-trojan-password-99',
    wsEnabled: true,
    wsPath: '/stream',
    wsHeaders: [
      { id: 'h1', key: 'Host', value: 'sg-trojan.leafproxy.net' },
      { id: 'h2', key: 'User-Agent', value: 'Mozilla/5.0' }
    ],
    tlsEnabled: true,
    tlsServerName: 'sg-trojan.leafproxy.net',
    tlsAlpn: ['h2', 'http/1.1'],
    tlsInsecure: false,
  },
  {
    id: 'node-3',
    tag: 'VMess-US-East',
    protocol: 'vmess',
    address: 'us-vmess.leafproxy.net',
    port: 10086,
    uuid: '7a8c8899-786d-4951-bc29-79f9f8e434f0',
    security: 'aes-128-gcm',
    wsEnabled: false,
    tlsEnabled: false,
  },
  {
    id: 'node-4',
    tag: 'VLess-EU-Frankfurt',
    protocol: 'vless',
    address: 'eu-vless.leafproxy.net',
    port: 443,
    uuid: 'c6a6f6df-be23-4dfa-b1cf-7df39ee6a22f',
    security: 'none',
    wsEnabled: true,
    wsPath: '/vless-ws',
    tlsEnabled: true,
    tlsInsecure: true,
  },
  {
    id: 'node-5',
    tag: 'Direct-Outbound',
    protocol: 'direct',
    address: '0.0.0.0',
    port: 0,
  },
  {
    id: 'node-6',
    tag: 'Reject-Outbound',
    protocol: 'reject',
    address: '0.0.0.0',
    port: 0,
  },
  {
    id: 'node-7',
    tag: 'Multiplexer-AMux',
    protocol: 'socks',
    address: '127.0.0.1',
    port: 1081,
    amuxEnabled: true,
    amuxConcurrency: 1024,
    amuxMaxConnections: 1,
    amuxIdleTimeout: 60,
    transport: {
      protocol: 'amux',
      settings: {
        concurrency: 1024,
        max_connections: 1,
        idle_timeout: 60
      }
    }
  }
];

export const INITIAL_RULES: RoutingRule[] = [
  {
    id: 'rule-1',
    type: 'DOMAIN-SUFFIX',
    value: 'google.com',
    target: 'SS-Tokyo-01',
  },
  {
    id: 'rule-2',
    type: 'DOMAIN',
    value: 'adserver.com',
    target: 'Reject-Outbound',
  },
  {
    id: 'rule-3',
    type: 'GEOSITE',
    value: 'cn',
    target: 'Direct-Outbound',
  },
  {
    id: 'rule-4',
    type: 'GEOIP',
    value: 'cn',
    target: 'Direct-Outbound',
  },
  {
    id: 'rule-5',
    type: 'IP-CIDR',
    value: '192.168.0.0/16',
    target: 'Direct-Outbound',
  }
];

export const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  log: {
    level: 'INFO',
    output: 'CONSOLE',
    format: 'FULL',
  },
  dns: {
    servers: ['1.1.1.1', '8.8.8.8', '223.5.5.5'],
    hosts: [
      { id: 'dh1', hostname: 'router.local', ip: '192.168.1.1' },
      { id: 'dh2', hostname: 'nas.local', ip: '192.168.1.100' },
    ],
  },
  tun: {
    auto: true,
    address: '10.255.0.1',
    gateway: '10.255.0.1',
    netmask: '255.255.255.0',
    mtu: 1080, // Default MTU set to 1080
  },
  routing: {
    domain_resolve: true,
    rules: INITIAL_RULES,
  },
};

export const MOCK_MESSAGES = [
  "Initializing Leaf core v0.14.2...",
  "Loading config from local storage...",
  "TUN interface 'tun0' opened (fd: 15)",
  "TUN interface configured: address=10.255.0.1 gateway=10.255.0.1 netmask=255.255.255.0 MTU=1080",
  "TUN network optimization activated successfully.",
  "DNS server configured: 1.1.1.1 (UDP/53)",
  "DNS server configured: 8.8.8.8 (UDP/53)",
  "DNS host mapping initialized: nas.local -> 192.168.1.100",
  "Outbound handler direct registered",
  "Outbound handler reject registered",
  "Outbound handler shadowsocks registered with method chacha20-ietf-poly1305",
  "Outbound handler trojan registered with TLS SNI sg-trojan.leafproxy.net",
  "AMux multiplexer running with concurrency=1024 max_accepts=2048",
  "Routing rule added: DOMAIN-SUFFIX: google.com -> SS-Tokyo-01",
  "Routing rule added: DOMAIN: adserver.com -> Reject-Outbound",
  "Routing rule added: GEOSITE: cn -> Direct-Outbound",
  "Routing rule added: GEOIP: cn -> Direct-Outbound",
  "Routing resolver started successfully.",
  "Proxy server listening on socks://127.0.0.1:1080",
  "Proxy server listening on http://127.0.0.1:1081",
];

export const MOCK_TRAFFIC_LINES = [
  "TCP connection from 10.255.0.2:51244 to 172.217.161.46:443 routed via SS-Tokyo-01",
  "UDP session from 10.255.0.5:60122 to 8.8.8.8:53 resolved successfully",
  "TCP connection to adserver.com:80 blocked by Reject rule",
  "HTTP GET request: static.doubleclick.net/ad.js rejected (rule match: DOMAIN adserver.com)",
  "TCP connection to baidu.com:443 routed via Direct-Outbound",
  "GEOIP match: IP 220.181.38.148 in CN, routing via Direct-Outbound",
  "TCP connection to github.com:443 routed via SS-Tokyo-01",
  "AMux opened stream multiplexed on connection to tokyo-ss.leafproxy.net:8388",
  "AMux concurrent stream status: 14 active, 3 idle, 1024 max",
  "TLS verification complete for sg-trojan.leafproxy.net, ALPN=h2",
  "Latency test: SS-Tokyo-01 ping is 72ms",
  "Latency test: Trojan-SG-HighSpeed ping is 144ms",
  "Latency test: VMess-US-East ping is 224ms",
  "Latency test: VLess-EU-Frankfurt ping is 312ms",
  "DNS lookup: mail.google.com -> 142.251.42.101 (Proxy resolved)",
  "TCP connection from 10.255.0.3:49215 to 142.251.42.101:443 routed via SS-Tokyo-01",
];
