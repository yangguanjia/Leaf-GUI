import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Leaf,
  Activity,
  Server,
  Settings,
  Terminal,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Play,
  Square,
  RefreshCw,
  SlidersHorizontal,
  X,
  Check,
  AlertCircle,
  Cpu,
  HardDrive,
  Clock,
  Shield,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Globe,
  BookOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import { Language, LANGUAGES, translations } from './i18n';
import {
  NodeConfig,
  RoutingRule,
  SystemConfig,
  LogLine,
  ProtocolType,
  LogLevel,
  LogFormat,
  LogOutput,
  HeaderRow
} from './types';
import {
  INITIAL_NODES,
  INITIAL_SYSTEM_CONFIG,
  MOCK_MESSAGES,
  MOCK_TRAFFIC_LINES
} from './mockData';

// Safe Tauri detector
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;

export default function App() {
  // Internationalization state
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    const saved = localStorage.getItem('leaf_gui_lang');
    if (saved && ['zh-CN', 'zh-TW', 'ja', 'en-US', 'de', 'ru', 'fr'].includes(saved)) {
      return saved as Language;
    }
    const navLang = navigator.language;
    if (navLang.startsWith('zh-CN')) return 'zh-CN';
    if (navLang.startsWith('zh-TW') || navLang.startsWith('zh-HK')) return 'zh-TW';
    if (navLang.startsWith('ja')) return 'ja';
    if (navLang.startsWith('de')) return 'de';
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('fr')) return 'fr';
    return 'en-US';
  });
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const t = (key: keyof typeof translations['en-US'], replacements?: Record<string, string>) => {
    const trans = translations[currentLang] || translations['en-US'];
    let val = trans[key] || translations['en-US'][key] || String(key);
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, v);
      });
    }
    return val;
  };

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'nodes' | 'dns' | 'terminal' | 'guide'>('dashboard');

  // Node States
  const [nodes, setNodes] = useState<NodeConfig[]>(INITIAL_NODES);
  const [activeNodeId, setActiveNodeId] = useState<string>('node-1');
  const [nodeLatencies, setNodeLatencies] = useState<Record<string, { value: number | null; testing: boolean }>>({});

  // Global Connection State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [vpnStats, setVpnStats] = useState({ dlSpeed: 0, ulSpeed: 0, totalDl: 142.4, totalUl: 28.9 });

  // Dynamic metrics computed based on connection and stats
  const activeStreamsCount = isConnected 
    ? Math.floor(12 + (vpnStats.dlSpeed * 0.8) + (Math.sin(Date.now() / 15000) * 3)) 
    : 0;
  const dynamicCbrs = isConnected 
    ? Math.min(99.8, Math.max(10.5, +(vpnStats.dlSpeed * 6.2).toFixed(2)))
    : 0;
  const dynamicAsts = isConnected 
    ? +((activeStreamsCount / 1024) * 100).toFixed(2)
    : 0;

  // System Config
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);

  // Terminal Logs State
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logSearch, setLogSearch] = useState<string>('');
  const [pauseLogScroll, setPauseLogScroll] = useState<boolean>(false);
  const [terminalLogLevelFilter, setTerminalLogLevelFilter] = useState<LogLevel[]>(['INFO', 'TRACE', 'DEBUG', 'WARN', 'ERROR']);

  // Modal / Node Editor Form States
  const [isNodeModalOpen, setIsNodeModalOpen] = useState<boolean>(false);
  const [editingNode, setEditingNode] = useState<NodeConfig | null>(null);

  // Node Editor Temporary State
  const [formTag, setFormTag] = useState('');
  const [formProtocol, setFormProtocol] = useState<ProtocolType>('shadowsocks');
  const [formAddress, setFormAddress] = useState('');
  const [formPort, setFormPort] = useState(1080);
  
  // Protocol specific inputs
  const [formSsMethod, setFormSsMethod] = useState('chacha20-ietf-poly1305');
  const [formSsPassword, setFormSsPassword] = useState('');
  const [formSsPrefix, setFormSsPrefix] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formUuid, setFormUuid] = useState('');
  const [showSsPassword, setShowSsPassword] = useState(false);
  const [showTrojanPassword, setShowTrojanPassword] = useState(false);
  const [showVmessUuid, setShowVmessUuid] = useState(false);
  const [formSecurity, setFormSecurity] = useState('auto');
  const [formAmuxActors, setFormAmuxActors] = useState<string[]>([]);
  const [formAmuxMaxAccepts, setFormAmuxMaxAccepts] = useState(2048);
  const [formAmuxConcurrency, setFormAmuxConcurrency] = useState(1024);
  const [formAmuxMaxRecvBytes, setFormAmuxMaxRecvBytes] = useState(1048576);
  const [formAmuxMaxLifetime, setFormAmuxMaxLifetime] = useState(3600);
  const [formAmuxEnabled, setFormAmuxEnabled] = useState(false);
  const [formAmuxMaxConnections, setFormAmuxMaxConnections] = useState(1);
  const [formAmuxIdleTimeout, setFormAmuxIdleTimeout] = useState(60);

  // Transports
  const [formWsEnabled, setFormWsEnabled] = useState(false);
  const [formWsPath, setFormWsPath] = useState('');
  const [formWsHeaders, setFormWsHeaders] = useState<HeaderRow[]>([]);
  const [formTlsEnabled, setFormTlsEnabled] = useState(false);
  const [formTlsServerName, setFormTlsServerName] = useState('');
  const [formTlsAlpn, setFormTlsAlpn] = useState<string[]>([]);
  const [formTlsInsecure, setFormTlsInsecure] = useState(false);

  const [formHealthCheckEnabled, setFormHealthCheckEnabled] = useState(true);
  const [formCheckInterval, setFormCheckInterval] = useState(30);
  const [formFailTimeout, setFormFailTimeout] = useState(5);

  // New Upstream DNS IP Input
  const [newDnsInput, setNewDnsInput] = useState('');
  const [newHostName, setNewHostName] = useState('');
  const [newHostIp, setNewHostIp] = useState('');

  // Routing Rule Form
  const [newRuleType, setNewRuleType] = useState<'DOMAIN' | 'DOMAIN-SUFFIX' | 'IP-CIDR' | 'GEOIP' | 'GEOSITE'>('DOMAIN-SUFFIX');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleTarget, setNewRuleTarget] = useState('Direct-Outbound');

  // UI Toast system
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Display toast function
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Pre-populate terminal with startup logs
  useEffect(() => {
    const initialLogs: LogLine[] = MOCK_MESSAGES.map((msg, i) => {
      const d = new Date();
      d.setSeconds(d.getSeconds() - (MOCK_MESSAGES.length - i) * 2);
      return {
        id: `start-log-${i}`,
        timestamp: d.toLocaleTimeString(),
        level: i % 4 === 0 ? 'TRACE' : i % 7 === 0 ? 'DEBUG' : 'INFO',
        message: msg,
      };
    });
    setLogs(initialLogs);
  }, []);

  // Log auto-scroll
  useEffect(() => {
    if (!pauseLogScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, pauseLogScroll]);

  // Log Stream Simulator (Mock Fallback mode only)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        // Randomly generate a log or traffic report
        const randomMsg = MOCK_TRAFFIC_LINES[Math.floor(Math.random() * MOCK_TRAFFIC_LINES.length)];
        const levels: LogLevel[] = ['INFO', 'TRACE', 'DEBUG', 'WARN', 'ERROR'];
        const randomLevel = Math.random() > 0.85 
          ? levels[Math.floor(Math.random() * levels.length)] 
          : 'INFO';

        const newLog: LogLine = {
          id: `live-log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: randomLevel,
          message: randomMsg,
        };

        if (isTauri) {
          // In real Tauri, logs are stream via window.__TAURI__.event.listen
          // The event handler will handle this.
        } else {
          setLogs((prev) => {
            const truncated = prev.length > 300 ? prev.slice(prev.length - 300) : prev;
            return [...truncated, newLog];
          });
        }

        // Fluctuate stats
        setVpnStats((prev) => {
          const dlDelta = +(Math.random() * 4.5).toFixed(1);
          const ulDelta = +(Math.random() * 0.8).toFixed(1);
          return {
            dlSpeed: +(Math.random() * 12 + 1).toFixed(1),
            ulSpeed: +(Math.random() * 2 + 0.1).toFixed(1),
            totalDl: +(prev.totalDl + dlDelta / 1024).toFixed(3),
            totalUl: +(prev.totalUl + ulDelta / 1024).toFixed(3),
          };
        });
      }, 1500);
    } else {
      setVpnStats((prev) => ({ ...prev, dlSpeed: 0, ulSpeed: 0 }));
    }

    return () => clearInterval(interval);
  }, [isConnected]);

  // Handle Tauri log-stream subscription on load
  useEffect(() => {
    if (isTauri) {
      const tauri = (window as any).__TAURI__;
      let unsubscribe: () => void;

      tauri.event.listen('log-stream', (event: any) => {
        const newLog: LogLine = {
          id: `tauri-log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: event.payload.level || 'INFO',
          message: event.payload.message || String(event.payload),
        };
        setLogs((prev) => {
          const truncated = prev.length > 300 ? prev.slice(prev.length - 300) : prev;
          return [...truncated, newLog];
        });
      }).then((unsub: any) => {
        unsubscribe = unsub;
      }).catch((err: any) => {
        console.error('Tauri event subscribe error:', err);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Connect / Disconnect handlers
  const handleToggleVpn = async () => {
    const selectedNode = nodes.find(n => n.id === activeNodeId);
    if (!selectedNode) {
      showToast("No proxy node selected!", "error");
      return;
    }

    if (!isConnected) {
      // Start Connection
      showToast(`Connecting to ${selectedNode.tag}...`, 'info');
      
      const newLog: LogLine = {
        id: `action-log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: `TUN connecting to active endpoint ${selectedNode.address}:${selectedNode.port} using protocol ${selectedNode.protocol}...`,
      };
      setLogs((prev) => [...prev, newLog]);

      if (isTauri) {
        try {
          await (window as any).__TAURI__.core.invoke('start_proxy', {
            nodeIp: selectedNode.address,
            port: selectedNode.port,
            settings: selectedNode,
          });
          setIsConnected(true);
          showToast(`VPN Tunnel active via ${selectedNode.tag}`, 'success');
        } catch (err: any) {
          showToast(`Tauri connect failed: ${err}`, 'error');
          setIsConnected(false);
        }
      } else {
        // Mock fallback delay
        setTimeout(() => {
          setIsConnected(true);
          showToast(`VPN Tunnel active via ${selectedNode.tag}`, 'success');
          setLogs((prev) => [
            ...prev,
            {
              id: `action-log-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              level: 'INFO',
              message: `Tunnel initialized. Routing default gateway through ${selectedNode.tag} (${selectedNode.address}:${selectedNode.port}). MTU limit: ${systemConfig.tun.mtu}.`,
            }
          ]);
        }, 1000);
      }
    } else {
      // Stop Connection
      showToast('Shutting down VPN interface...', 'info');
      if (isTauri) {
        try {
          await (window as any).__TAURI__.core.invoke('stop_proxy');
          setIsConnected(false);
          showToast('VPN Tunnel deactivated', 'info');
        } catch (err: any) {
          showToast(`Tauri disconnect failed: ${err}`, 'error');
        }
      } else {
        setIsConnected(false);
        showToast('VPN Tunnel deactivated', 'info');
        setLogs((prev) => [
          ...prev,
          {
            id: `action-log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'WARN',
            message: 'Interface tun0 shut down. Default routing restored.',
          }
        ]);
      }
    }
  };

  // Test Node Latency
  const testLatency = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card selection
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setNodeLatencies(prev => ({
      ...prev,
      [nodeId]: { value: null, testing: true }
    }));

    if (isTauri) {
      try {
        const pingResult = await (window as any).__TAURI__.core.invoke('test_latency', {
          nodeIp: node.address,
          port: node.port
        });
        setNodeLatencies(prev => ({
          ...prev,
          [nodeId]: { value: Number(pingResult), testing: false }
        }));
        showToast(`Latency for ${node.tag}: ${pingResult}ms`, 'success');
      } catch (err: any) {
        setNodeLatencies(prev => ({
          ...prev,
          [nodeId]: { value: null, testing: false }
        }));
        showToast(`Latency test failed for ${node.tag}`, 'error');
      }
    } else {
      // Mock random latency
      setTimeout(() => {
        // Direct nodes have low ping, remote nodes have different ranges, Reject node timeouts
        let ping: number | null = null;
        if (node.protocol === 'direct') {
          ping = Math.floor(Math.random() * 15) + 3;
        } else if (node.protocol === 'reject') {
          ping = null; // timeout
        } else {
          // standard proxy delay
          ping = Math.floor(Math.random() * 380) + 40;
        }

        setNodeLatencies(prev => ({
          ...prev,
          [nodeId]: { value: ping, testing: false }
        }));

        if (ping === null) {
          showToast(`Latency test timed out for ${node.tag}`, 'error');
        } else {
          showToast(`Latency test for ${node.tag}: ${ping}ms`, 'success');
        }
      }, 1000);
    }
  };

  // Test all node latencies sequentially
  const testAllLatencies = async () => {
    showToast("Starting latency sweep...", "info");
    for (const node of nodes) {
      setNodeLatencies(prev => ({
        ...prev,
        [node.id]: { value: null, testing: true }
      }));
      // Wait a bit between mocks to simulate sweep
      await new Promise(resolve => setTimeout(resolve, 300));
      let ping = null;
      if (node.protocol === 'direct') ping = Math.floor(Math.random() * 12) + 2;
      else if (node.protocol === 'reject') ping = null;
      else ping = Math.floor(Math.random() * 320) + 45;

      setNodeLatencies(prev => ({
        ...prev,
        [node.id]: { value: ping, testing: false }
      }));
    }
    showToast("Latency sweep complete", "success");
  };

  // Node selection
  const selectNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setActiveNodeId(nodeId);
    showToast(`Active proxy set to: ${node.tag}`, 'info');
    
    setLogs((prev) => [
      ...prev,
      {
        id: `action-log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: `Routing default outbound core via Node '${node.tag}' [${node.protocol.toUpperCase()}]`,
      }
    ]);
  };

  // Save Config handler (Fires when anything gets saved)
  const handleSaveConfig = async (updatedConfig: SystemConfig) => {
    setSystemConfig(updatedConfig);
    
    if (isTauri) {
      try {
        await (window as any).__TAURI__.core.invoke('save_config', { config: updatedConfig });
        showToast('System configuration committed to Disk', 'success');
      } catch (err: any) {
        showToast(`Tauri save error: ${err}`, 'error');
      }
    } else {
      showToast('System configuration updated locally', 'success');
      setLogs((prev) => [
        ...prev,
        {
          id: `action-log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          message: 'Saved main configuration JSON. Upstream DNS servers and TUN descriptors updated.',
        }
      ]);
    }
  };

  // Open Node Editor Modal (For adding or editing a node)
  const openNodeModal = (node: NodeConfig | null = null) => {
    setShowSsPassword(false);
    setShowTrojanPassword(false);
    setShowVmessUuid(false);
    if (node) {
      // Editing existing
      setEditingNode(node);
      setFormTag(node.tag);
      if (node.protocol === 'amux') {
        setFormProtocol('socks');
        setFormAmuxEnabled(true);
      } else {
        setFormProtocol(node.protocol);
        setFormAmuxEnabled(node.amuxEnabled || false);
      }
      setFormAddress(node.address);
      setFormPort(node.port);
      setFormSsMethod(node.ssMethod || 'chacha20-ietf-poly1305');
      setFormSsPassword(node.ssPassword || '');
      setFormSsPrefix(node.ssPrefix || '');
      setFormPassword(node.password || '');
      setFormUuid(node.uuid || '');
      setFormSecurity(node.security || 'auto');
      setFormAmuxActors(node.amuxActors || []);
      setFormAmuxMaxAccepts(node.amuxMaxAccepts ?? 2048);
      setFormAmuxConcurrency(node.amuxConcurrency ?? 1024);
      setFormAmuxMaxRecvBytes(node.amuxMaxRecvBytes ?? 1048576);
      setFormAmuxMaxLifetime(node.amuxMaxLifetime ?? 3600);
      setFormAmuxMaxConnections(node.amuxMaxConnections ?? 1);
      setFormAmuxIdleTimeout(node.amuxIdleTimeout ?? 60);
      setFormWsEnabled(node.wsEnabled || false);
      setFormWsPath(node.wsPath || '');
      setFormWsHeaders(node.wsHeaders || []);
      setFormTlsEnabled(node.tlsEnabled || false);
      setFormTlsServerName(node.tlsServerName || '');
      setFormTlsAlpn(node.tlsAlpn || []);
      setFormTlsInsecure(node.tlsInsecure || false);
      setFormHealthCheckEnabled(node.healthCheckEnabled ?? true);
      setFormCheckInterval(node.checkInterval ?? 30);
      setFormFailTimeout(node.failTimeout ?? 5);
    } else {
      // Adding new node
      setEditingNode(null);
      setFormTag(`Node-${nodes.length + 1}`);
      setFormProtocol('shadowsocks');
      setFormAddress('');
      setFormPort(443);
      setFormSsMethod('chacha20-ietf-poly1305');
      setFormSsPassword('');
      setFormSsPrefix('');
      setFormPassword('');
      setFormUuid('');
      setFormSecurity('auto');
      setFormAmuxActors([]);
      setFormAmuxMaxAccepts(2048);
      setFormAmuxConcurrency(1024);
      setFormAmuxMaxRecvBytes(1048576);
      setFormAmuxMaxLifetime(3600);
      setFormAmuxEnabled(false);
      setFormAmuxMaxConnections(1);
      setFormAmuxIdleTimeout(60);
      setFormWsEnabled(false);
      setFormWsPath('/stream');
      setFormWsHeaders([]);
      setFormTlsEnabled(false);
      setFormTlsServerName('');
      setFormTlsAlpn(['h2', 'http/1.1']);
      setFormTlsInsecure(false);
      setFormHealthCheckEnabled(true);
      setFormCheckInterval(30);
      setFormFailTimeout(5);
    }
    setIsNodeModalOpen(true);
  };

  // Save Node from form
  const handleSaveNode = () => {
    if (!formTag.trim()) {
      showToast("Node display tag is required", "error");
      return;
    }
    if (formProtocol !== 'direct' && formProtocol !== 'reject' && !formAddress.trim()) {
      showToast("Server address is required", "error");
      return;
    }

    const savedNode: NodeConfig = {
      id: editingNode ? editingNode.id : `node-${Math.random().toString(36).substring(2, 9)}`,
      tag: formTag,
      protocol: formProtocol,
      address: formAddress || '0.0.0.0',
      port: formPort,
      ssMethod: formSsMethod,
      ssPassword: formSsPassword,
      ssPrefix: formSsPrefix,
      password: formPassword,
      uuid: formUuid,
      security: formSecurity,
      amuxEnabled: formAmuxEnabled,
      amuxConcurrency: formAmuxConcurrency,
      amuxMaxConnections: formAmuxMaxConnections,
      amuxIdleTimeout: formAmuxIdleTimeout,
      transport: formAmuxEnabled ? {
        protocol: 'amux',
        settings: {
          concurrency: formAmuxConcurrency,
          max_connections: formAmuxMaxConnections,
          idle_timeout: formAmuxIdleTimeout
        }
      } : undefined,
      amuxActors: formAmuxActors,
      amuxMaxAccepts: formAmuxMaxAccepts,
      amuxMaxRecvBytes: formAmuxMaxRecvBytes,
      amuxMaxLifetime: formAmuxMaxLifetime,
      wsEnabled: formWsEnabled,
      wsPath: formWsPath,
      wsHeaders: formWsHeaders,
      tlsEnabled: formTlsEnabled,
      tlsServerName: formTlsServerName,
      tlsAlpn: formTlsAlpn,
      tlsInsecure: formTlsInsecure,
      healthCheckEnabled: formHealthCheckEnabled,
      checkInterval: formCheckInterval,
      failTimeout: formFailTimeout,
    };

    if (editingNode) {
      // Update
      setNodes((prev) => prev.map((n) => n.id === editingNode.id ? savedNode : n));
      showToast(`Node ${formTag} updated`, 'success');
    } else {
      // Add
      setNodes((prev) => [...prev, savedNode]);
      showToast(`Added new node: ${formTag}`, 'success');
    }

    setIsNodeModalOpen(false);
    setEditingNode(null);

    // Commit changes to Tauri mock save
    setLogs((prev) => [
      ...prev,
      {
        id: `action-log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: `Committed node config change: tag=${formTag}, protocol=${formProtocol.toUpperCase()}`,
      }
    ]);
  };

  // Delete Node
  const handleDeleteNode = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (activeNodeId === nodeId) {
      showToast("Cannot delete the active selected outbound node!", "error");
      return;
    }

    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    showToast(`Deleted node ${node.tag}`, 'info');

    setLogs((prev) => [
      ...prev,
      {
        id: `action-log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'WARN',
        message: `Removed Outbound Node from configuration: tag=${node.tag}`,
      }
    ]);
  };

  // Upstream DNS Actions
  const handleAddDns = () => {
    const trimmed = newDnsInput.trim();
    if (!trimmed) return;
    
    // Simple IP address regex check
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(trimmed)) {
      showToast("Please enter a valid IPv4 address", "error");
      return;
    }

    if (systemConfig.dns.servers.includes(trimmed)) {
      showToast("DNS server already exists in list", "info");
      return;
    }

    const updatedConfig = {
      ...systemConfig,
      dns: {
        ...systemConfig.dns,
        servers: [...systemConfig.dns.servers, trimmed]
      }
    };

    handleSaveConfig(updatedConfig);
    setNewDnsInput('');
  };

  const handleRemoveDns = (dnsIp: string) => {
    if (systemConfig.dns.servers.length <= 1) {
      showToast("Keep at least one upstream DNS server for resolving routes!", "error");
      return;
    }

    const updatedConfig = {
      ...systemConfig,
      dns: {
        ...systemConfig.dns,
        servers: systemConfig.dns.servers.filter(ip => ip !== dnsIp)
      }
    };

    handleSaveConfig(updatedConfig);
  };

  // DNS Host mappings
  const handleAddHostMapping = () => {
    const hostname = newHostName.trim();
    const ip = newHostIp.trim();

    if (!hostname || !ip) {
      showToast("Please supply both hostname and destination IP", "error");
      return;
    }

    const newMapping = {
      id: `dh-${Math.random().toString(36).substring(2, 9)}`,
      hostname,
      ip
    };

    const updatedConfig = {
      ...systemConfig,
      dns: {
        ...systemConfig.dns,
        hosts: [...systemConfig.dns.hosts, newMapping]
      }
    };

    handleSaveConfig(updatedConfig);
    setNewHostName('');
    setNewHostIp('');
  };

  const handleRemoveHostMapping = (id: string) => {
    const updatedConfig = {
      ...systemConfig,
      dns: {
        ...systemConfig.dns,
        hosts: systemConfig.dns.hosts.filter(h => h.id !== id)
      }
    };
    handleSaveConfig(updatedConfig);
  };

  // Routing Rule Actions
  const handleAddRule = () => {
    const val = newRuleValue.trim();
    if (!val) {
      showToast("Rule trigger value is required (e.g. cn, domain.com)", "error");
      return;
    }

    const newRule: RoutingRule = {
      id: `rule-${Math.random().toString(36).substring(2, 9)}`,
      type: newRuleType,
      value: val,
      target: newRuleTarget
    };

    const updatedConfig = {
      ...systemConfig,
      routing: {
        ...systemConfig.routing,
        rules: [...systemConfig.routing.rules, newRule]
      }
    };

    handleSaveConfig(updatedConfig);
    setNewRuleValue('');
    showToast(`Added routing rule for ${val}`, 'success');
  };

  const handleRemoveRule = (ruleId: string) => {
    const updatedConfig = {
      ...systemConfig,
      routing: {
        ...systemConfig.routing,
        rules: systemConfig.routing.rules.filter(r => r.id !== ruleId)
      }
    };
    handleSaveConfig(updatedConfig);
    showToast("Routing rule deleted", "info");
  };

  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    const updatedRules = [...systemConfig.routing.rules];
    if (direction === 'up' && index > 0) {
      const temp = updatedRules[index];
      updatedRules[index] = updatedRules[index - 1];
      updatedRules[index - 1] = temp;
    } else if (direction === 'down' && index < updatedRules.length - 1) {
      const temp = updatedRules[index];
      updatedRules[index] = updatedRules[index + 1];
      updatedRules[index + 1] = temp;
    } else {
      return;
    }

    const updatedConfig = {
      ...systemConfig,
      routing: {
        ...systemConfig.routing,
        rules: updatedRules
      }
    };

    handleSaveConfig(updatedConfig);
  };

  // Custom key-value WS header helper
  const addHeaderRow = () => {
    setFormWsHeaders(prev => [...prev, { id: `h-${Date.now()}`, key: '', value: '' }]);
  };

  const updateHeaderRow = (id: string, key: string, value: string) => {
    setFormWsHeaders(prev => prev.map(h => h.id === id ? { ...h, key, value } : h));
  };

  const removeHeaderRow = (id: string) => {
    setFormWsHeaders(prev => prev.filter(h => h.id !== id));
  };

  // Filter logs locally based on level selection and search
  const filteredLogs = logs.filter(log => {
    const matchesLevel = terminalLogLevelFilter.includes(log.level);
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) || 
                          log.level.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="flex h-screen w-full sky-cloud-bg font-sans text-slate-900 overflow-hidden select-none relative">
      
      {/* Soft sky cloud overlays (subtle grids & glows, no dynamic pulses) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Side Toasts Popup */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border shadow-xl text-xs backdrop-blur-xl ${
                t.type === 'success'
                  ? 'bg-white/80 border-emerald-500/30 text-emerald-800 shadow-[0_8px_30px_rgba(16,185,129,0.08)]'
                  : t.type === 'error'
                  ? 'bg-white/80 border-red-500/30 text-red-800 shadow-[0_8px_30px_rgba(239,68,68,0.08)]'
                  : 'bg-white/80 border-cyan-500/30 text-cyan-800 shadow-[0_8px_30px_rgba(6,182,212,0.08)]'
              }`}
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Column Left: Sidebar */}
      <aside className="relative flex flex-col w-72 h-full bg-white/20 border-r border-black/[0.05] backdrop-blur-xl z-10 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        
        {/* Sidebar Header / Logo */}
        <div className="p-6 border-b border-black/[0.05] bg-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="relative p-2.5 rounded-xl bg-slate-900/5 border border-black/10 text-slate-800 shadow-sm">
              <Leaf size={18} className="stroke-[2.2]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-slate-900 rounded-full" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base tracking-wider text-slate-900">
                LEAF <span className="text-slate-600 font-normal">GUI</span>
              </h1>
              <p className="font-mono text-[8px] text-slate-500 tracking-widest font-bold uppercase">
                CUSTOM CORE v0.14
              </p>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="px-6 py-3.5 border-b border-white/[0.04] bg-white/[0.005] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 tracking-widest font-bold">
              <Globe size={11} className="text-slate-400" />
              <span>LANGUAGE / 语言</span>
            </div>
          </div>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/40 border border-black/[0.06] text-xs font-semibold text-slate-800 hover:text-slate-950 hover:border-black/[0.12] transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{LANGUAGES.find(l => l.code === currentLang)?.flag}</span>
                <span className="font-medium text-slate-700">{LANGUAGES.find(l => l.code === currentLang)?.label}</span>
              </div>
              <ChevronDown size={14} className="text-slate-500 transition-transform duration-300" />
            </button>

            <AnimatePresence>
              {isLangDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsLangDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    className="absolute left-0 right-0 mt-1.5 bg-white/95 border border-black/[0.08] rounded-xl shadow-xl z-30 overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto"
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setCurrentLang(lang.code);
                          localStorage.setItem('leaf_gui_lang', lang.code);
                          setIsLangDropdownOpen(false);
                          showToast(
                            lang.code === 'zh-CN' ? '已切换至简体中文' :
                            lang.code === 'zh-TW' ? '已切換至繁體中文' :
                            lang.code === 'ja' ? '日本語に切り替えました' :
                            lang.code === 'de' ? 'Auf Deutsch umgestellt' :
                            lang.code === 'ru' ? 'Переключено на русский язык' :
                            lang.code === 'fr' ? 'Langue changée en français' :
                            'Language changed to English', 
                            'success'
                          );
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all hover:bg-black/[0.02] text-left cursor-pointer ${
                          currentLang === lang.code ? 'text-slate-950 bg-black/[0.02]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{lang.flag}</span>
                          <span>{lang.label}</span>
                        </div>
                        {currentLang === lang.code && <Check size={12} className="text-slate-950 stroke-[2.5]" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Connection Widget */}
        <div className="p-5 border-b border-black/[0.05] bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] text-slate-500 tracking-widest font-bold uppercase">{t('connection_state')}</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full transition-all duration-300 ${isConnected ? 'bg-slate-900 shadow-[0_0_6px_rgba(0,0,0,0.2)]' : 'bg-slate-400'}`} />
              <span className={`font-mono text-[9px] uppercase tracking-wider font-bold ${isConnected ? 'text-slate-800 font-extrabold' : 'text-slate-400'}`}>
                {isConnected ? t('active') : t('offline')}
              </span>
            </div>
          </div>

          {/* Master Connection Switch - Styled cleanly with thin dark borders & solid fonts */}
          <button
            onClick={handleToggleVpn}
            id="btn_master_vpn_switch"
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border-[1.5px] transition-all cursor-pointer relative overflow-hidden group shadow-sm ${
              isConnected
                ? 'bg-slate-950 border-slate-950 text-white'
                : 'bg-white/70 border-slate-950/45 text-slate-800 hover:bg-white/90 hover:border-slate-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <Wifi className="text-white" size={16} />
              ) : (
                <WifiOff className="text-slate-700" size={16} />
              )}
              <span className="text-xs font-bold tracking-wider font-display uppercase">
                {isConnected ? t('disconnect_tun') : t('activate_tun')}
              </span>
            </div>
            <div className={`w-8 h-4 rounded-full p-0.5 border border-slate-950/25 transition-colors duration-300 shrink-0 ${isConnected ? 'bg-white/30' : 'bg-slate-300'}`}>
              <div className={`w-3 h-3 rounded-full bg-slate-900 shadow transition-transform duration-300 transform ${isConnected ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Outbound Selected Node Status */}
          <div className="mt-3.5 p-3 rounded-xl bg-white/30 border border-black/[0.04] shadow-sm">
            <div className="font-mono text-[8px] text-slate-500 tracking-wider font-bold uppercase mb-1.5">{t('selected_gateway')}</div>
            <div className="flex items-center gap-2">
              <Server size={12} className="text-slate-700 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">
                {nodes.find(n => n.id === activeNodeId)?.tag || 'None'}
              </span>
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-md bg-black/[0.04] border border-black/[0.05] text-slate-600 shrink-0 ml-auto uppercase font-bold tracking-wider">
                {nodes.find(n => n.id === activeNodeId)?.protocol || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            id="tab_dashboard_trigger"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border-l-[3px] cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-black/[0.04] border-l-slate-900 text-slate-900 shadow-sm'
                : 'border-l-transparent text-slate-500 hover:text-slate-800 hover:bg-black/[0.01]'
            }`}
          >
            <Activity size={15} />
            <span className="font-display">{t('dashboard_tab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('nodes')}
            id="tab_node_manager_trigger"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border-l-[3px] cursor-pointer ${
              activeTab === 'nodes'
                ? 'bg-black/[0.04] border-l-slate-900 text-slate-900 shadow-sm'
                : 'border-l-transparent text-slate-500 hover:text-slate-800 hover:bg-black/[0.01]'
            }`}
          >
            <Server size={15} />
            <span className="font-display">{t('nodes_tab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('dns')}
            id="tab_dns_settings_trigger"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border-l-[3px] cursor-pointer ${
              activeTab === 'dns'
                ? 'bg-black/[0.04] border-l-slate-900 text-slate-900 shadow-sm'
                : 'border-l-transparent text-slate-500 hover:text-slate-800 hover:bg-black/[0.01]'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span className="font-display">{t('dns_tab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            id="tab_system_terminal_trigger"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border-l-[3px] cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-black/[0.04] border-l-slate-900 text-slate-900 shadow-sm'
                : 'border-l-transparent text-slate-500 hover:text-slate-800 hover:bg-black/[0.01]'
            }`}
          >
            <Terminal size={15} />
            <span className="font-display">{t('terminal_tab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            id="tab_user_guide_trigger"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border-l-[3px] cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-black/[0.04] border-l-slate-900 text-slate-900 shadow-sm'
                : 'border-l-transparent text-slate-500 hover:text-slate-800 hover:bg-black/[0.01]'
            }`}
          >
            <BookOpen size={15} />
            <span className="font-display">{t('user_guide_tab')}</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-black/[0.05] bg-white/5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 tracking-wider font-semibold">
            <span>{t('platform')}</span>
            <span className="text-slate-800 uppercase font-bold">
              {isTauri ? t('tauri_ipc') : t('mock_mode')}
            </span>
          </div>
          <div className="mt-1 text-[9px] font-mono text-slate-500 truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block" />
            {t('core_instance_active')}
          </div>
        </div>
      </aside>

      {/* Column Right: Active Tab Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative z-10 bg-transparent">
        
        {/* Active Tab Content rendering */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col h-full">
          
          {/* Active Tab: DASHBOARD */}
          {/* Active Tab: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6 flex-1 text-slate-800">
              
              {/* Ticker Banner - Styled exactly like the stock ticker at the top of the image */}
              <div className="w-full overflow-hidden border-b border-black/[0.05] pb-3 mb-2">
                <div className="flex items-center justify-between text-xs md:text-sm tracking-[0.16em] font-mono text-slate-500 font-bold uppercase">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">↓</span>
                    <span>{vpnStats.dlSpeed} MB/s</span>
                    <span className="text-slate-400 ml-1">DL</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">↓</span>
                    <span>{vpnStats.ulSpeed} MB/s</span>
                    <span className="text-slate-400 ml-1">UL</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">↑</span>
                    <span>{isConnected ? `${dynamicCbrs}%` : '0%'}</span>
                    <span className="text-slate-400 ml-1">CBRS</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">↑</span>
                    <span>{isConnected ? `${dynamicAsts}%` : '0%'}</span>
                    <span className="text-slate-400 ml-1">ASTS</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>PING</span>
                    <span className="text-slate-900">
                      {activeNodeId && nodeLatencies[activeNodeId]?.value !== null && nodeLatencies[activeNodeId]?.value !== undefined
                        ? `${nodeLatencies[activeNodeId]!.value}ms`
                        : '12ms'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Left matches the provided visual design, Right holds active node selections */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: Pixel-perfect replica of the requested light sky card */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[360px] bg-white/45 border border-white/60 p-6 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.02)] backdrop-blur-md flex flex-col gap-6 relative overflow-hidden">
                    
                    {/* Sky Cloud soft shine overlays inside the card */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-100/30 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-100/20 rounded-full blur-2xl pointer-events-none" />

                    {/* Heading: Replicates the wide geometric typography */}
                    <div className="flex flex-col">
                      <div className="font-gs-flex-zh text-[28px] text-slate-950 font-black tracking-tight leading-none uppercase">
                        {t('central_gateway_latency')}
                      </div>
                      
                      {/* Big display formatted as a latency value in seconds (e.g. 0.39s) - dynamically based on selected node latency */}
                      <div className="font-gs-flex-numbers text-[72px] text-slate-950 font-bold mt-2.5 tracking-tight leading-none flex items-baseline">
                        {activeNodeId && nodeLatencies[activeNodeId]?.value !== null && nodeLatencies[activeNodeId]?.value !== undefined
                          ? (nodeLatencies[activeNodeId]!.value! / 1000).toFixed(2)
                          : '0.39'}
                        <span className="text-[28px] font-medium text-slate-400 ml-1 font-sans lowercase">s</span>
                      </div>
                    </div>

                    {/* Capsule Action Buttons */}
                    <div className="flex items-center gap-2.5">
                      {/* Connected Switch */}
                      <button
                        onClick={handleToggleVpn}
                        className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border-[1.8px] border-slate-950 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs tracking-wide transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <span className="font-display">
                          {isConnected 
                            ? t('central_disconnect')
                            : t('central_start_proxy')}
                        </span>
                      </button>

                      {/* Fast test latency button */}
                      <button
                        onClick={testAllLatencies}
                        className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border-[1.8px] border-slate-950 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs tracking-wide transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <span className="font-display">
                          {t('central_speedtest')}
                        </span>
                      </button>

                      {/* Info / Config shortcut circular button */}
                      <button
                        onClick={() => setActiveTab('terminal')}
                        className="w-9.5 h-9.5 rounded-full border-[1.8px] border-slate-950 bg-white hover:bg-slate-100 text-slate-950 flex items-center justify-center font-bold text-sm shadow-sm transition-all cursor-pointer active:scale-95"
                        title="View Logs"
                      >
                        ↗
                      </button>
                    </div>

                    {/* List of Details - precisely matching layout in image */}
                    <div className="flex flex-col gap-4 border-t border-black/[0.04] pt-5">
                      
                      {/* Row 1 */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] text-slate-600 font-bold tracking-tight">
                            {t('central_core_latency_target')}
                          </span>
                          <span className="text-[17px] font-bold text-slate-950 font-mono tracking-tight">
                            {activeNodeId && nodeLatencies[activeNodeId]?.value !== null && nodeLatencies[activeNodeId]?.value !== undefined
                              ? `${(nodeLatencies[activeNodeId]!.value! / 1000).toFixed(3)}s`
                              : '0.390s'}
                          </span>
                        </div>
                        <HelpCircle size={14} className="text-slate-400 cursor-pointer hover:text-slate-650" />
                      </div>

                      {/* Row 2 */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] text-slate-600 font-bold tracking-tight">
                            {t('central_download_throughput')}
                          </span>
                          <span className="text-[17px] font-bold text-slate-950 font-mono tracking-tight flex items-center gap-1.5">
                            {vpnStats.dlSpeed} MB/s
                            <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              → {isConnected ? `${dynamicCbrs}%` : '0%'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Row 3 */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] text-slate-600 font-bold tracking-tight">
                            {t('central_multiplex_concurrency')}
                          </span>
                          <span className="text-[17px] font-bold text-slate-950 font-mono tracking-tight">
                            {isConnected 
                              ? t('central_active_streams_text', { count: String(activeStreamsCount) })
                              : t('central_inactive_streams_text')}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Small center double dots indicator */}
                    <div className="flex justify-center gap-1.5 my-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    </div>

                    {/* Bottom Profile / Account bar */}
                    <div className="flex items-center justify-between border-t border-black/[0.04] pt-4.5 mt-1">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full border border-slate-950 flex items-center justify-center font-mono text-xs font-bold text-slate-950 bg-white/60 shadow-sm">
                          LF
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-950 tracking-tight leading-none">v0.14.2</span>
                          <span className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                            {t('central_core_layer')}
                          </span>
                        </div>
                      </div>

                      {/* Left icon links exactly matching visual */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTab('dns')}
                          className="p-1.5 rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-850 transition-all cursor-pointer"
                        >
                          <Globe size={13} />
                        </button>
                        <button
                          onClick={() => setActiveTab('terminal')}
                          className="p-1.5 rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-850 transition-all cursor-pointer"
                        >
                          <Clock size={13} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* RIGHT COLUMN: Interactive Node Manager & Details */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  {/* Dashboard Header Title */}
                  <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
                    <div>
                      <h2 className="font-gs-flex-zh text-xl font-bold tracking-tight text-slate-900 leading-none">
                        {t('dashboard_title')}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1.5 font-medium">{t('dashboard_desc')}</p>
                    </div>
                    <button
                      onClick={testAllLatencies}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border-[1.8px] border-slate-950 hover:bg-slate-100 text-xs font-bold text-slate-950 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <RefreshCw size={12} className="text-slate-950" />
                      {t('test_latency_btn')}
                    </button>
                  </div>

                  {/* Node Selector Section */}
                  <div>
                    <h3 className="font-display font-bold text-[10px] text-slate-500 tracking-widest mb-3.5 uppercase">
                      {t('active_nodes_title')}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {nodes.map((node) => {
                        const isActive = activeNodeId === node.id;
                        const latencyInfo = nodeLatencies[node.id];
                        
                        let pingBadgeColor = 'bg-white/40 border border-black/10 text-slate-600';
                        if (latencyInfo && latencyInfo.value !== null) {
                          if (latencyInfo.value < 100) pingBadgeColor = 'bg-slate-900 text-white font-bold';
                          else if (latencyInfo.value < 300) pingBadgeColor = 'bg-amber-100 border border-amber-300 text-amber-800 font-bold';
                          else pingBadgeColor = 'bg-red-50 border border-red-200 text-red-700 font-bold';
                        } else if (latencyInfo && latencyInfo.value === null && !latencyInfo.testing) {
                          pingBadgeColor = 'bg-slate-100 text-slate-400 border border-black/5';
                        }

                        return (
                          <div
                            key={node.id}
                            onClick={() => selectNode(node.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden group ${
                              isActive
                                ? 'bg-white/80 border-slate-950 shadow-md ring-[1px] ring-slate-950/5'
                                : 'bg-white/30 border-black/[0.05] hover:border-black/15 hover:bg-white/50'
                            }`}
                          >
                            {/* Selected indicator */}
                            {isActive && (
                              <div className="absolute top-4 right-4 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                                <span className="font-mono text-[8px] text-slate-950 font-bold tracking-widest uppercase">{t('active')}</span>
                              </div>
                            )}

                            <div className="font-gs-flex-zh text-sm text-slate-950 flex items-center gap-2">
                              <Server size={13} className={isActive ? "text-slate-950" : "text-slate-500"} />
                              {node.tag}
                            </div>

                            <div className="font-mono text-[11px] text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
                              <span className="truncate max-w-[170px]">{node.address}:{node.port}</span>
                            </div>

                            <div className="mt-4 flex items-center justify-between relative z-10">
                              <span className="font-mono text-[8px] tracking-wider font-bold uppercase px-2 py-0.5 rounded-md bg-black/5 border border-black/[0.02] text-slate-600">
                                {node.protocol}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {/* Latency badge */}
                                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 ${pingBadgeColor}`}>
                                  {latencyInfo?.testing ? (
                                    <RefreshCw size={9} className="animate-spin text-slate-950" />
                                  ) : null}
                                  {latencyInfo?.testing 
                                    ? t('testing_btn') 
                                    : latencyInfo?.value !== undefined 
                                    ? (latencyInfo.value !== null ? `${latencyInfo.value} ms` : 'Timeout') 
                                    : t('never_tested')}
                                </span>

                                {/* Single ping button */}
                                <button
                                  onClick={(e) => testLatency(node.id, e)}
                                  className="p-1.5 rounded-md bg-white border-[1.2px] border-slate-950 hover:bg-slate-50 text-slate-800 hover:text-slate-950 transition-all cursor-pointer shadow-sm"
                                  title="Test Node Latency"
                                >
                                  <Activity size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chongqing Network MTU Notice Banner */}
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-950 text-xs flex items-start gap-3 mt-4 shadow-sm backdrop-blur-sm">
                    <Shield size={15} className="shrink-0 mt-0.5 text-sky-850" />
                    <div className="leading-relaxed font-medium">
                      <span className="font-bold text-sky-900">{t('tun_mtu')}</span>: {t('tun_auto_desc')}
                    </div>
                  </div>

                </div>

              </div>
              
            </div>
          )}

          {/* Active Tab: NODE MANAGER */}
          {activeTab === 'nodes' && (
            <div className="flex flex-col gap-6 flex-1 text-slate-800">
              {/* Heading */}
              <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
                <div>
                  <h2 className="font-gs-flex-zh text-xl font-bold tracking-tight text-slate-900 leading-none">{t('node_manager_title')}</h2>
                  <p className="text-xs text-slate-500 mt-1.5 font-medium">{t('node_manager_desc')}</p>
                </div>
                <button
                  onClick={() => openNodeModal()}
                  id="btn_add_node_modal_trigger"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 hover:bg-black font-bold text-xs text-white transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  {t('add_node_btn')}
                </button>
              </div>

              {/* Node manager grid list */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-5 rounded-2xl bg-white/40 border border-black/[0.05] shadow-sm hover:border-black/15 hover:bg-white/50 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Tiny visual line highlight on active */}
                    {activeNodeId === node.id && (
                      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-950" />
                    )}

                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md bg-black/5 border border-black/[0.02] text-slate-600 inline-block mb-2">
                            {node.protocol}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                            {node.tag}
                            {activeNodeId === node.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 inline-block" />
                            )}
                          </h4>
                        </div>

                        {/* Node settings controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openNodeModal(node)}
                            className="px-2.5 py-1.5 rounded-md bg-white border-[1.2px] border-slate-950 text-slate-950 hover:text-black hover:bg-slate-50 transition-all cursor-pointer text-xs font-bold tracking-wider uppercase"
                          >
                            {t('edit_node')}
                          </button>
                          <button
                            onClick={(e) => handleDeleteNode(node.id, e)}
                            className="p-1.5 rounded-md bg-white border-[1.2px] border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer text-xs"
                            title={t('delete_node')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Config details checklist */}
                      <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 font-mono text-[11px] text-slate-500">
                        <div>
                          <span className="text-slate-400 font-bold mr-1.5">{t('address')}:</span>
                          <span className="text-slate-800 truncate inline-block max-w-[120px] font-semibold">{node.address}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold mr-1.5">{t('port')}:</span>
                          <span className="text-slate-800 font-semibold">{node.port}</span>
                        </div>
                        {node.protocol === 'shadowsocks' && (
                          <>
                            <div className="col-span-2">
                              <span className="text-slate-400 font-bold mr-1.5">{t('encryption_method_label')}:</span>
                              <span className="text-slate-800 font-semibold">{node.ssMethod}</span>
                            </div>
                            {node.ssPrefix && (
                              <div className="col-span-2">
                                <span className="text-slate-400 font-bold mr-1.5">{t('optional_prefix_label')}:</span>
                                <span className="text-slate-800 truncate max-w-[200px] inline-block font-semibold">{node.ssPrefix}</span>
                              </div>
                            )}
                          </>
                        )}
                        {(node.protocol === 'trojan' || node.protocol === 'vless' || node.protocol === 'vmess') && (
                          <>
                            {node.uuid && (
                              <div className="col-span-2">
                                <span className="text-slate-400 font-bold mr-1.5">{t('vmess_uuid_label')}:</span>
                                <span className="text-slate-800 truncate max-w-[180px] inline-block font-semibold">{node.uuid}</span>
                              </div>
                            )}
                            {node.security && (
                              <div>
                                <span className="text-slate-400 font-bold mr-1.5">{t('security_method_label')}:</span>
                                <span className="text-slate-800 font-semibold">{node.security}</span>
                              </div>
                            )}
                          </>
                        )}
                        {node.protocol === 'amux' && (
                          <>
                            <div className="col-span-2">
                              <span className="text-slate-400 font-bold mr-1.5">{t('actors_to_multiplex')}:</span>
                              <span className="text-slate-800 font-semibold">{node.amuxActors?.join(', ') || 'None'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold mr-1.5">{t('concurrency_label')}:</span>
                              <span className="text-slate-800 font-semibold">{node.amuxConcurrency}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold mr-1.5">{t('max_accepts_label')}:</span>
                              <span className="text-slate-800 font-semibold">{node.amuxMaxAccepts}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Transport Badges */}
                    <div className="mt-4 pt-3.5 border-t border-black/[0.04] flex items-center gap-1.5">
                      {node.tlsEnabled && (
                        <span className="font-mono text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-100 shadow-sm">
                          TLS
                        </span>
                      )}
                      {node.wsEnabled && (
                        <span className="font-mono text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-100 shadow-sm">
                          WS
                        </span>
                      )}
                      {node.healthCheckEnabled && (
                        <span className="font-mono text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-black/5 shadow-sm">
                          {t('health_check_label')}: {node.checkInterval}s
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Tab: DNS & ROUTING RULES */}
          {activeTab === 'dns' && (
            <div className="flex flex-col gap-6 flex-1 text-slate-800">
              <div className="border-b border-black/[0.04] pb-4">
                <h2 className="font-gs-flex-zh text-xl font-bold tracking-tight text-slate-900 leading-none">{t('dns_rules_title')}</h2>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">{t('dns_rules_desc')}</p>
              </div>

              {/* Main settings grids split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* TUN settings */}
                <div className="p-5 rounded-2xl bg-white/45 border border-white/60 backdrop-blur-md shadow-sm flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-black/[0.05] pb-2.5 font-display flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-slate-800" />
                    {t('tun_config_title')}
                  </h3>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{t('tun_auto_configure')}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t('tun_auto_desc')}</div>
                    </div>
                    <button
                      onClick={() => handleSaveConfig({
                        ...systemConfig,
                        tun: { ...systemConfig.tun, auto: !systemConfig.tun.auto }
                      })}
                      className={`w-10 h-5 rounded-full p-0.5 border border-slate-950/25 transition-colors duration-300 cursor-pointer ${
                        systemConfig.tun.auto ? 'bg-slate-900' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 transform ${
                        systemConfig.tun.auto ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('tun_address')}</label>
                      <input
                        type="text"
                        value={systemConfig.tun.address}
                        onChange={(e) => handleSaveConfig({
                          ...systemConfig,
                          tun: { ...systemConfig.tun, address: e.target.value }
                        })}
                        className="w-full font-mono text-xs p-2.5 rounded-lg bg-white/60 border border-black/10 focus:border-black/30 outline-none text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('gateway_ip')}</label>
                      <input
                        type="text"
                        value={systemConfig.tun.gateway}
                        onChange={(e) => handleSaveConfig({
                          ...systemConfig,
                          tun: { ...systemConfig.tun, gateway: e.target.value }
                        })}
                        className="w-full font-mono text-xs p-2.5 rounded-lg bg-white/60 border border-black/10 focus:border-black/30 outline-none text-slate-800"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('netmask')}</label>
                      <input
                        type="text"
                        value={systemConfig.tun.netmask}
                        onChange={(e) => handleSaveConfig({
                          ...systemConfig,
                          tun: { ...systemConfig.tun, netmask: e.target.value }
                        })}
                        className="w-full font-mono text-xs p-2.5 rounded-lg bg-white/60 border border-black/10 focus:border-black/30 outline-none text-slate-800"
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">{t('tun_mtu')}</label>
                        <div className="flex items-center gap-2">
                          <input
                            id="mtu-input"
                            type="number"
                            min="576"
                            max="1280"
                            value={systemConfig.tun.mtu}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              handleSaveConfig({
                                ...systemConfig,
                                tun: { ...systemConfig.tun, mtu: isNaN(val) ? 1080 : val }
                              });
                            }}
                            onBlur={(e) => {
                              let val = parseInt(e.target.value);
                              if (isNaN(val) || val < 576) val = 576;
                              if (val > 1280) val = 1280;
                              handleSaveConfig({
                                ...systemConfig,
                                tun: { ...systemConfig.tun, mtu: val }
                              });
                            }}
                            className="w-20 text-right font-mono text-xs p-1 rounded bg-white border border-black/10 focus:border-black/30 outline-none text-slate-800"
                          />
                          <span className="font-mono text-xs text-slate-500">bytes</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="576"
                        max="1280"
                        value={systemConfig.tun.mtu}
                        onChange={(e) => handleSaveConfig({
                          ...systemConfig,
                          tun: { ...systemConfig.tun, mtu: parseInt(e.target.value) || 1080 }
                        })}
                        className="w-full accent-slate-950 bg-slate-200 h-1 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1.5 font-bold">
                        <span>{t('mtu_min')} (576)</span>
                        <span className="text-slate-800">{t('chongqing_opt')}</span>
                        <span>{t('mtu_max')} (1280)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DNS resolvers list */}
                <div className="p-5 rounded-2xl bg-white/45 border border-white/60 backdrop-blur-md shadow-sm flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-black/[0.05] pb-2.5 font-display flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-slate-800" />
                    {t('upstream_dns_title')}
                  </h3>

                  {/* Add DNS input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 1.1.1.1"
                      value={newDnsInput}
                      onChange={(e) => setNewDnsInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDns()}
                      className="flex-1 font-mono text-xs p-2.5 rounded-lg bg-white/60 border border-black/10 focus:border-black/30 outline-none text-slate-800"
                    />
                    <button
                      onClick={handleAddDns}
                      className="px-4 py-2.5 rounded-lg bg-slate-950 hover:bg-black font-bold text-xs text-white cursor-pointer shrink-0 shadow-sm"
                    >
                      {t('add_ip_btn')}
                    </button>
                  </div>

                  {/* Active DNS IPs */}
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {systemConfig.dns.servers.map((ip) => (
                      <div key={ip} className="flex items-center justify-between p-2.5 rounded-lg bg-white/30 border border-black/[0.04] font-mono text-xs shadow-sm">
                        <span className="text-slate-800 font-semibold">{ip}</span>
                        <button
                          onClick={() => handleRemoveDns(ip)}
                          className="text-slate-500 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Custom host mappings key-values */}
                  <div className="mt-2 border-t border-black/[0.05] pt-4">
                    <div className="text-xs font-bold text-slate-900 mb-2.5 font-display tracking-wide">{t('custom_hosts_title')}</div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="nas.local"
                        value={newHostName}
                        onChange={(e) => setNewHostName(e.target.value)}
                        className="font-mono text-xs p-2.5 rounded-lg bg-white/60 border border-black/10 focus:border-black/30 text-slate-800 outline-none placeholder-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="192.168.1.100"
                        value={newHostIp}
                        onChange={(e) => setNewHostIp(e.target.value)}
                        className="font-mono text-xs p-2.5 rounded-lg bg-white/60 border border-black/10 focus:border-black/30 text-slate-800 outline-none placeholder-slate-400"
                      />
                      <button
                        onClick={handleAddHostMapping}
                        className="col-span-2 w-full py-2.5 rounded-lg bg-white border-[1.8px] border-slate-950 hover:bg-slate-100 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
                      >
                        {t('commit_host_btn')}
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {systemConfig.dns.hosts.map((host) => (
                        <div key={host.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/30 border border-black/[0.04] font-mono text-xs shadow-sm">
                          <span className="text-slate-800 font-bold truncate max-w-[120px]">{host.hostname}</span>
                          <span className="text-slate-400 font-bold">→</span>
                          <span className="text-slate-900 font-black">{host.ip}</span>
                          <button
                            onClick={() => handleRemoveHostMapping(host.id)}
                            className="text-slate-500 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic routing rules table container */}
              <div className="p-5 rounded-2xl bg-white/45 border border-white/60 backdrop-blur-md shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                      <SlidersHorizontal size={14} className="text-slate-800" />
                      {t('routing_engine_title')}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{t('routing_rules_subtitle')}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">{t('domain_resolve')}</span>
                    <button
                      onClick={() => handleSaveConfig({
                        ...systemConfig,
                        routing: { ...systemConfig.routing, domain_resolve: !systemConfig.routing.domain_resolve }
                      })}
                      className={`w-8 h-4 rounded-full p-0.5 border border-slate-950/25 transition-colors duration-300 cursor-pointer ${
                        systemConfig.routing.domain_resolve ? 'bg-slate-950' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-300 transform ${
                        systemConfig.routing.domain_resolve ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Add rule quick inline controls */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white/30 p-3 rounded-xl border border-black/[0.04] shadow-sm">
                  <select
                    value={newRuleType}
                    onChange={(e: any) => setNewRuleType(e.target.value)}
                    className="p-2.5 rounded-lg bg-white border border-black/10 text-slate-800 text-xs font-mono outline-none focus:border-black/30"
                  >
                    <option value="DOMAIN">DOMAIN</option>
                    <option value="DOMAIN-SUFFIX">DOMAIN-SUFFIX</option>
                    <option value="IP-CIDR">IP-CIDR</option>
                    <option value="GEOIP">GEOIP</option>
                    <option value="GEOSITE">GEOSITE</option>
                  </select>

                  <input
                    type="text"
                    placeholder="e.g. google.com"
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    className="p-2.5 rounded-lg bg-white border border-black/10 text-slate-800 text-xs font-mono outline-none focus:border-black/30 placeholder-slate-400"
                  />

                  <select
                    value={newRuleTarget}
                    onChange={(e: any) => setNewRuleTarget(e.target.value)}
                    className="p-2.5 rounded-lg bg-white border border-black/10 text-slate-800 text-xs font-mono outline-none focus:border-black/30"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.tag}>{n.tag}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddRule}
                    className="p-2.5 bg-slate-950 hover:bg-black font-bold text-xs text-white rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus size={13} className="stroke-[2.5]" />
                    {t('add_rule_btn')}
                  </button>
                </div>

                {/* Rules List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-black/[0.05] text-slate-500 text-[9px] tracking-wider uppercase font-bold">
                        <th className="py-3 px-4">{t('priority')}</th>
                        <th className="py-3 px-4">{t('type')}</th>
                        <th className="py-3 px-4">{t('matching_value')}</th>
                        <th className="py-3 px-4">{t('target_outbound')}</th>
                        <th className="py-3 px-4 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.02]">
                      {systemConfig.routing.rules.map((rule, idx) => (
                        <tr key={rule.id} className="hover:bg-black/[0.01] text-slate-700 group transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-black/5 border border-black/[0.02] text-slate-600 text-[10px] font-semibold tracking-wide">
                              {rule.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-900 font-semibold">{rule.value}</td>
                          <td className="py-3 px-4">
                            <span className="text-slate-950 font-black">{rule.target}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleMoveRule(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1.5 rounded-md bg-white border border-slate-950/25 text-slate-700 hover:text-slate-950 hover:border-slate-950 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                onClick={() => handleMoveRule(idx, 'down')}
                                disabled={idx === systemConfig.routing.rules.length - 1}
                                className="p-1.5 rounded-md bg-white border border-slate-950/25 text-slate-700 hover:text-slate-950 hover:border-slate-950 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                              >
                                <ArrowDown size={11} />
                              </button>
                              <button
                                onClick={() => handleRemoveRule(rule.id)}
                                className="p-1.5 rounded-md bg-white border border-red-500/30 text-red-600 hover:text-red-700 hover:border-red-600 transition-all cursor-pointer"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: SYSTEM TERMINAL LOG CONSOLE */}
          {activeTab === 'terminal' && (
            <div className="flex flex-col gap-5 flex-1 h-full min-h-[500px] text-slate-800">
              {/* Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.04] pb-4">
                <div>
                  <h2 className="font-gs-flex-zh text-xl font-bold tracking-tight text-slate-900 leading-none">{t('system_logs_title')}</h2>
                  <p className="text-xs text-slate-500 mt-1.5 font-medium">{t('system_logs_desc')}</p>
                </div>

                {/* Filter and toggle controls panel */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Log Level Filters */}
                  <div className="flex items-center rounded-full bg-white/40 border border-black/[0.05] p-0.5 font-mono text-[9px] font-bold text-slate-500 shadow-sm">
                    {(['INFO', 'TRACE', 'DEBUG', 'WARN', 'ERROR'] as LogLevel[]).map((level) => {
                      const isActive = terminalLogLevelFilter.includes(level);
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            if (isActive) {
                              setTerminalLogLevelFilter(prev => prev.filter(l => l !== level));
                            } else {
                              setTerminalLogLevelFilter(prev => [...prev, level]);
                            }
                          }}
                          className={`px-2 py-1.5 rounded-full uppercase transition-all duration-200 cursor-pointer ${
                            isActive
                              ? level === 'ERROR'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : level === 'WARN'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'hover:text-slate-800 hover:bg-black/5'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pause Scroll check */}
                  <button
                    onClick={() => setPauseLogScroll(!pauseLogScroll)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono tracking-wide transition-all duration-200 cursor-pointer ${
                      pauseLogScroll
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-white border-black/10 text-slate-700 hover:text-slate-950 hover:border-black/25 shadow-sm'
                    }`}
                  >
                    {pauseLogScroll ? t('resume_scroll') : t('pause_scroll')}
                  </button>

                  {/* Clear logs button */}
                  <button
                    onClick={() => {
                      setLogs([]);
                      showToast(t('toast_terminal_cleared'), "info");
                    }}
                    className="p-1.5 rounded-lg bg-white border border-black/10 hover:border-black/25 text-slate-600 hover:text-slate-950 transition-all duration-200 cursor-pointer shadow-sm"
                    title={t('clear_terminal_tooltip')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Console logs view box */}
              <div className="flex flex-col flex-1 bg-slate-950 rounded-2xl border border-black/20 overflow-hidden shadow-lg">
                {/* Search header panel */}
                <div className="p-3 border-b border-white/[0.05] flex items-center justify-between gap-3 bg-slate-900/50">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {t('streaming_prefix')} {filteredLogs.length} {t('matching_events_suffix')}
                  </div>

                  {/* Filter / Search input */}
                  <div className="relative w-full max-w-xs">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder={t('search_placeholder')}
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="w-full font-mono text-[11px] p-2 pl-8.5 rounded-lg bg-slate-900 border border-white/[0.04] text-slate-300 outline-none focus:border-white/20 placeholder-slate-600 focus:bg-slate-900"
                    />
                    {logSearch && (
                      <button onClick={() => setLogSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main scrollable logs area */}
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed max-h-[500px]">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 py-16">
                      <Terminal size={24} className="stroke-[1.5]" />
                      <span className="text-[11px]">{t('no_logs')}</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap flex flex-col gap-1 select-text">
                      {filteredLogs.map((log) => {
                        let levelColor = 'text-slate-500';
                        if (log.level === 'TRACE') levelColor = 'text-cyan-400/90';
                        else if (log.level === 'DEBUG') levelColor = 'text-blue-400/90';
                        else if (log.level === 'WARN') levelColor = 'text-amber-400/90 font-bold';
                        else if (log.level === 'ERROR') levelColor = 'text-red-400/90 font-bold';
                        else if (log.level === 'INFO') levelColor = 'text-emerald-400/90 font-semibold';

                        return (
                          <div key={log.id} className="hover:bg-white/[0.02] p-0.5 rounded transition-all text-[11px] flex items-start">
                            <span className="text-slate-600 mr-2.5 select-none shrink-0">[{log.timestamp}]</span>
                            <span className={`${levelColor} mr-2.5 shrink-0 select-none inline-block w-14 font-bold`}>
                              [{log.level}]
                            </span>
                            <span className="text-slate-300 font-medium">{log.message}</span>
                          </div>
                        );
                      })}
                      <div ref={logsEndRef} />
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: USER GUIDE */}
          {activeTab === 'guide' && (
            <div className="flex flex-col gap-6 flex-1 h-full min-h-[500px] text-slate-800">
              {/* Heading */}
              <div className="border-b border-black/[0.04] pb-4">
                <h2 className="font-gs-flex-zh text-xl font-bold tracking-tight text-slate-900 leading-none">{t('user_guide_title')}</h2>
                <p className="text-sm text-slate-600 mt-2 font-medium">{t('user_guide_desc')}</p>
              </div>

              {/* Guide content layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section 1: SOCKS5 over AMux */}
                <div className="bg-white/45 border border-white/60 rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden backdrop-blur-md group hover:border-black/15 transition-all duration-300 text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/5 border border-slate-950/10 text-slate-800">
                      <Cpu size={18} />
                    </div>
                    <h3 className="font-gs-flex-zh font-bold text-[15px] text-slate-900 tracking-wide">{t('guide_sec1_title')}</h3>
                  </div>
                  <div className="text-slate-700 text-sm leading-relaxed space-y-3 whitespace-pre-line font-sans pt-1 font-medium">
                    {t('guide_sec1_text')}
                  </div>
                </div>

                {/* Section 2: DNS & Rules */}
                <div className="bg-white/45 border border-white/60 rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden backdrop-blur-md group hover:border-black/15 transition-all duration-300 text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/5 border border-slate-950/10 text-slate-800">
                      <SlidersHorizontal size={18} />
                    </div>
                    <h3 className="font-gs-flex-zh font-bold text-[15px] text-slate-900 tracking-wide">{t('guide_sec2_title')}</h3>
                  </div>
                  <div className="text-slate-700 text-sm leading-relaxed space-y-3 whitespace-pre-line font-sans pt-1 font-medium">
                    {t('guide_sec2_text')}
                  </div>
                </div>

                {/* Section 3: MTU */}
                <div className="bg-white/45 border border-white/60 rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden backdrop-blur-md group hover:border-black/15 transition-all duration-300 text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/5 border border-slate-950/10 text-slate-800">
                      <HardDrive size={18} />
                    </div>
                    <h3 className="font-gs-flex-zh font-bold text-[15px] text-slate-900 tracking-wide">{t('guide_sec3_title')}</h3>
                  </div>
                  <div className="text-slate-700 text-sm leading-relaxed space-y-3 whitespace-pre-line font-sans pt-1 font-medium">
                    {t('guide_sec3_text')}
                  </div>
                </div>

                {/* Section 4: Telemetry Metrics & Idle Timeout */}
                <div className="bg-white/45 border border-white/60 rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden backdrop-blur-md group hover:border-black/15 transition-all duration-300 text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/5 border border-slate-950/10 text-slate-800">
                      <Activity size={18} />
                    </div>
                    <h3 className="font-gs-flex-zh font-bold text-[15px] text-slate-900 tracking-wide">{t('guide_sec4_title')}</h3>
                  </div>
                  <div className="text-slate-700 text-sm leading-relaxed space-y-3 whitespace-pre-line font-sans pt-1 font-medium">
                    {t('guide_sec4_text')}
                  </div>
                </div>

                {/* Section 5: Encryption & Security */}
                <div className="bg-white/45 border border-white/60 rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden backdrop-blur-md group hover:border-black/15 transition-all duration-300 text-slate-800 col-span-1 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/5 border border-slate-950/10 text-slate-800">
                      <Shield size={18} />
                    </div>
                    <h3 className="font-gs-flex-zh font-bold text-[15px] text-slate-900 tracking-wide">{t('guide_sec5_title')}</h3>
                  </div>
                  <div className="text-slate-700 text-sm leading-relaxed space-y-3 whitespace-pre-line font-sans pt-1 font-medium">
                    {t('guide_sec5_text')}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* OVERLAY MODAL: NODE CONFIG EDITOR */}
      <AnimatePresence>
        {isNodeModalOpen && (
          <div className="fixed inset-0 bg-black/15 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 border border-black/15 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col backdrop-blur-xl"
            >
              
              {/* Modal Header */}
              <div className="p-6 border-b border-black/[0.05] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-gs-flex-zh">
                    {editingNode ? `${t('edit_outbound_title')}: ${editingNode.tag}` : t('add_outbound_title')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold tracking-wide">{t('node_subtitle')}</p>
                </div>
                <button
                  onClick={() => setIsNodeModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body / Scroll form container */}
              <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5 text-slate-850">
                
                {/* Core parameters: Tag, Protocol, Address, Port */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('display_tag_label')}</label>
                    <input
                      type="text"
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                      placeholder="e.g. Shadowsocks-Tokyo"
                      className="w-full font-mono text-xs p-2.5 rounded-lg bg-white border border-black/10 focus:border-black/35 outline-none text-slate-800 placeholder-slate-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('protocol_type_label')}</label>
                    <select
                      value={formProtocol}
                      onChange={(e: any) => setFormProtocol(e.target.value)}
                      className="w-full font-mono text-xs p-2.5 rounded-lg bg-white border border-black/10 focus:border-black/35 outline-none text-slate-800 transition-all"
                    >
                      <option value="direct">direct (Direct Outbound)</option>
                      <option value="reject">reject (Ad block Outbound)</option>
                      <option value="socks">socks (Socks5)</option>
                      <option value="shadowsocks">shadowsocks (Shadowsocks)</option>
                      <option value="trojan">trojan (Trojan)</option>
                      <option value="vmess">vmess (VMess)</option>
                      <option value="vless">vless (VLESS)</option>
                    </select>
                  </div>

                  {formProtocol !== 'direct' && formProtocol !== 'reject' && (
                    <>
                      <div>
                        <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('server_address_label')}</label>
                        <input
                          type="text"
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          placeholder="e.g. domain.com or IP"
                          className="w-full font-mono text-xs p-2.5 rounded-lg bg-white border border-black/10 focus:border-black/35 outline-none text-slate-800 placeholder-slate-400 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('port_label')}</label>
                        <input
                          type="number"
                          value={formPort}
                          onChange={(e) => setFormPort(parseInt(e.target.value) || 0)}
                          placeholder="8388"
                          className="w-full font-mono text-xs p-2.5 rounded-lg bg-white border border-black/10 focus:border-black/35 outline-none text-slate-800 placeholder-slate-400 transition-all"
                        />
                      </div>
                    </>
                  )}
                </div>

                {formProtocol !== 'direct' && formProtocol !== 'reject' && (
                  <div className="p-4 bg-white/30 rounded-2xl border border-black/[0.04] flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">Enable AMux Multiplexing / 开启 AMux 多路复用</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">Multiplex multiple logical streams over physical connections</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormAmuxEnabled(!formAmuxEnabled)}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shrink-0 ${
                          formAmuxEnabled ? 'bg-slate-950' : 'bg-slate-200'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200 transform ${
                          formAmuxEnabled ? 'translate-x-3.5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {formAmuxEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-black/[0.05] overflow-hidden"
                      >
                        <div>
                          <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Logical Streams Concurrency / 并发度
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="2048"
                            value={formAmuxConcurrency}
                            onChange={(e) => setFormAmuxConcurrency(Math.min(2048, Math.max(1, parseInt(e.target.value) || 1024)))}
                            className="w-full font-mono text-xs p-2 rounded-lg bg-white border border-black/10 focus:border-black/35 outline-none text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Max Physical Connections / 最大物理连接数
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formAmuxMaxConnections}
                            onChange={(e) => setFormAmuxMaxConnections(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full font-mono text-xs p-2 rounded-lg bg-white border border-black/10 focus:border-black/35 outline-none text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Idle Timeout (seconds) / 空闲超时时间
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formAmuxIdleTimeout}
                            onChange={(e) => setFormAmuxIdleTimeout(Math.max(1, parseInt(e.target.value) || 60))}
                            className="w-full font-mono text-xs p-2 rounded-lg bg-white border border-black/10 focus:border-black/35 outline-none text-slate-800"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Shadowsocks Dynamic Fields */}
                {formProtocol === 'shadowsocks' && (
                  <div className="p-4 bg-white/30 rounded-2xl border border-black/[0.04] flex flex-col gap-3 shadow-sm">
                    <div className="text-xs font-bold text-slate-850 font-display">{t('ss_config_title')}</div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('encryption_method_label')}</label>
                        <select
                          value={formSsMethod}
                          onChange={(e) => setFormSsMethod(e.target.value)}
                          className="w-full font-mono text-xs p-2 rounded-lg bg-white border border-black/10 focus:border-black/35 text-slate-800 outline-none"
                        >
                          <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305 (Recommended)</option>
                          <option value="aes-256-gcm">aes-256-gcm</option>
                          <option value="aes-128-gcm">aes-128-gcm</option>
                          <option value="chacha20-poly1305">chacha20-poly1305</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('secret_key_label')}</label>
                        <div className="relative">
                          <input
                            type={showSsPassword ? "text" : "password"}
                            value={formSsPassword}
                            onChange={(e) => setFormSsPassword(e.target.value)}
                            placeholder="Secret password"
                            className="w-full font-mono text-xs p-2 pr-10 rounded-lg bg-white border border-black/10 text-slate-800 focus:border-black/35 outline-none placeholder-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSsPassword(!showSsPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            {showSsPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('optional_prefix_label')}</label>
                        <input
                          type="text"
                          value={formSsPrefix}
                          onChange={(e) => setFormSsPrefix(e.target.value)}
                          placeholder="e.g. HTTP head byte prefix"
                          className="w-full font-mono text-xs p-2 rounded-lg bg-white border border-black/10 text-slate-800 focus:border-black/35 outline-none placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Trojan, Vless, Vmess Dynamic Fields */}
                {(formProtocol === 'trojan' || formProtocol === 'vless' || formProtocol === 'vmess') && (
                  <div className="p-4 bg-white/30 rounded-2xl border border-black/[0.04] flex flex-col gap-3 shadow-sm">
                    <div className="text-xs font-bold text-slate-850 font-display">
                      {formProtocol.toUpperCase()} Configuration parameters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {formProtocol === 'trojan' && (
                        <div className="col-span-2">
                          <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('trojan_password_label')}</label>
                          <div className="relative">
                            <input
                              type={showTrojanPassword ? "text" : "password"}
                              value={formPassword}
                              onChange={(e) => setFormPassword(e.target.value)}
                              placeholder="Secret key"
                              className="w-full font-mono text-xs p-2.5 pr-10 rounded-lg bg-white border border-black/10 text-slate-800 focus:border-black/35 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowTrojanPassword(!showTrojanPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              {showTrojanPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      )}

                      {(formProtocol === 'vless' || formProtocol === 'vmess') && (
                        <>
                          <div className="col-span-2">
                            <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('vmess_uuid_label')}</label>
                            <div className="relative">
                              <input
                                type={showVmessUuid ? "text" : "password"}
                                value={formUuid}
                                onChange={(e) => setFormUuid(e.target.value)}
                                placeholder="e.g. 7a8c8899-786d-4951-bc29-79f9f8e434f0"
                                className="w-full font-mono text-xs p-2.5 pr-10 rounded-lg bg-white border border-black/10 text-slate-800 focus:border-black/35 outline-none placeholder-slate-400"
                              />
                              <button
                                type="button"
                                onClick={() => setShowVmessUuid(!showVmessUuid)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                              >
                                {showVmessUuid ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('security_method_label')}</label>
                            <select
                              value={formSecurity}
                              onChange={(e) => setFormSecurity(e.target.value)}
                              className="w-full font-mono text-xs p-2.5 rounded-lg bg-white border border-black/10 text-slate-800"
                            >
                              <option value="auto">auto</option>
                              <option value="aes-128-gcm">aes-128-gcm</option>
                              <option value="chacha20-poly1305">chacha20-poly1305</option>
                              <option value="none">none (Plain VMess)</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Transports (WS and TLS) collapsible sections */}
                {formProtocol !== 'direct' && formProtocol !== 'reject' && formProtocol !== 'socks' && (
                  <div className="flex flex-col gap-3 border-t border-black/[0.05] pt-4">
                    <div className="text-xs font-bold text-slate-500 font-display tracking-wider uppercase mb-1">{t('outbound_transport_title')}</div>

                    {/* TLS Toggle */}
                    <div className="p-4 bg-white/30 rounded-2xl border border-black/[0.04] flex flex-col gap-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{t('tls_protection')}</div>
                          <div className="text-[9px] font-mono text-slate-500">{t('tls_desc')}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormTlsEnabled(!formTlsEnabled)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                            formTlsEnabled ? 'bg-slate-950' : 'bg-slate-200'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 transform ${
                            formTlsEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {formTlsEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-black/[0.05]">
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">{t('sni_override')}</label>
                            <input
                              type="text"
                              value={formTlsServerName}
                              onChange={(e) => setFormTlsServerName(e.target.value)}
                              placeholder="SNI server domain"
                              className="w-full font-mono text-xs p-2.5 rounded-lg bg-white border border-black/10 text-slate-800 outline-none placeholder-slate-400"
                            />
                          </div>

                          <div className="flex items-center gap-3 h-full mt-4">
                            <label className="text-[10px] font-mono font-semibold text-slate-500">{t('allow_insecure_certs')}</label>
                            <button
                              type="button"
                              onClick={() => setFormTlsInsecure(!formTlsInsecure)}
                              className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                                formTlsInsecure ? 'bg-slate-950' : 'bg-slate-200'
                              }`}
                            >
                              <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 transform ${
                                formTlsInsecure ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* WebSocket Transport Toggle */}
                    <div className="p-4 bg-white/30 rounded-2xl border border-black/[0.04] flex flex-col gap-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{t('ws_transport')}</div>
                          <div className="text-[9px] font-mono text-slate-500">{t('ws_desc')}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormWsEnabled(!formWsEnabled)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                            formWsEnabled ? 'bg-slate-950' : 'bg-slate-200'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 transform ${
                            formWsEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {formWsEnabled && (
                        <div className="flex flex-col gap-3 pt-3 border-t border-black/[0.05]">
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">{t('ws_path')}</label>
                            <input
                              type="text"
                              value={formWsPath}
                              onChange={(e) => setFormWsPath(e.target.value)}
                              placeholder="/stream"
                              className="w-full font-mono text-xs p-2.5 rounded-lg bg-white border border-black/10 text-slate-800 outline-none placeholder-slate-400"
                            />
                          </div>

                          {/* HTTP custom headers list mapping */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">{t('custom_header_table')}</label>
                              <button
                                type="button"
                                onClick={addHeaderRow}
                                className="text-[10px] font-mono font-bold text-slate-800 hover:text-black flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={10} className="stroke-[2.5]" /> {t('add_header_row')}
                              </button>
                            </div>

                            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                              {formWsHeaders.map((header) => (
                                <div key={header.id} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    placeholder="Host"
                                    value={header.key}
                                    onChange={(e) => updateHeaderRow(header.id, e.target.value, header.value)}
                                    className="flex-1 font-mono text-[10px] p-2 rounded-lg bg-white border border-black/10 text-slate-800"
                                  />
                                  <input
                                    type="text"
                                    placeholder="sub.domain.com"
                                    value={header.value}
                                    onChange={(e) => updateHeaderRow(header.id, header.key, e.target.value)}
                                    className="flex-1 font-mono text-[10px] p-2 rounded-lg bg-white border border-black/10 text-slate-800"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeHeaderRow(header.id)}
                                    className="text-red-600 hover:text-red-700 p-2 rounded bg-white hover:bg-red-50 border border-red-150 cursor-pointer duration-200"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-black/[0.05] flex items-center justify-end gap-3 bg-white/40">
                <button
                  type="button"
                  onClick={() => setIsNodeModalOpen(false)}
                  className="px-4.5 py-2.5 rounded-full border-[1.8px] border-slate-950 bg-white hover:bg-slate-100 text-xs font-bold text-slate-950 transition-all cursor-pointer shadow-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveNode}
                  id="btn_save_node_confirm"
                  className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-black font-bold text-xs text-white transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {t('confirm_save')}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
