export type LogLevel = 'INFO' | 'TRACE' | 'DEBUG' | 'WARN' | 'ERROR' | 'NONE';
export type LogFormat = 'FULL' | 'COMPACT';
export type LogOutput = 'CONSOLE' | 'FILE';

export interface LogSettings {
  level: LogLevel;
  output: LogOutput;
  format: LogFormat;
}

export interface DnsHostMapping {
  id: string;
  hostname: string;
  ip: string;
}

export interface DnsSettings {
  servers: string[];
  hosts: DnsHostMapping[];
}

export interface TunSettings {
  auto: boolean;
  address: string;
  gateway: string;
  netmask: string;
  mtu: number;
}

export type ProtocolType =
  | 'direct'
  | 'reject'
  | 'drop'
  | 'socks'
  | 'shadowsocks'
  | 'trojan'
  | 'vmess'
  | 'vless'
  | 'amux';

export interface HeaderRow {
  id: string;
  key: string;
  value: string;
}

export interface NodeConfig {
  id: string;
  tag: string;
  protocol: ProtocolType;
  address: string;
  port: number;
  
  // Shadowsocks specific
  ssMethod?: string;
  ssPassword?: string;
  ssPrefix?: string;

  // Trojan, Vless, Vmess specific
  password?: string;
  uuid?: string;
  security?: string; // auto, aes-128-gcm, chacha20-poly1305, none

  // AMux specific
  amuxEnabled?: boolean;
  amuxMaxConnections?: number;
  amuxIdleTimeout?: number;
  transport?: {
    protocol: 'amux';
    settings: {
      concurrency: number;
      max_connections: number;
      idle_timeout: number;
    };
  };
  amuxActors?: string[]; // outbound tags
  amuxMaxAccepts?: number;
  amuxConcurrency?: number;
  amuxMaxRecvBytes?: number;
  amuxMaxLifetime?: number;

  // Transports
  wsEnabled?: boolean;
  wsPath?: string;
  wsHeaders?: HeaderRow[];

  tlsEnabled?: boolean;
  tlsServerName?: string;
  tlsAlpn?: string[]; // e.g. h2, http/1.1
  tlsInsecure?: boolean;

  // Failover / Health check
  healthCheckEnabled?: boolean;
  checkInterval?: number;
  failTimeout?: number;
}

export type RuleType = 'DOMAIN' | 'DOMAIN-SUFFIX' | 'IP-CIDR' | 'GEOIP' | 'GEOSITE' | 'PORT' | 'PROCESS-NAME';

export interface RoutingRule {
  id: string;
  type: RuleType;
  value: string;
  target: string; // Direct, Reject, Proxy tag
}

export interface RoutingSettings {
  domain_resolve: boolean;
  rules: RoutingRule[];
}

export interface SystemConfig {
  log: LogSettings;
  dns: DnsSettings;
  tun: TunSettings;
  routing: RoutingSettings;
}

export interface LogLine {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}
