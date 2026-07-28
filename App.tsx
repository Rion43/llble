import React, { useState, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { BleScanner, BleDevice } from './src/BleScanner';

interface LogEntry { ts: string; text: string; color?: string }

export default function App() {
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [connected, setConnected] = useState<Device | null>(null);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const scannerRef = useRef<BleScanner | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const addLog = useCallback((text: string, color?: string) => {
    const ts = new Date().toISOString().slice(11, 23);
    setLogs(prev => [...prev, { ts, text, color }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setDevices([]);
    setLogs([]);
    setConnected(null);
    setConnectedId(null);

    const scanner = new BleScanner();
    scannerRef.current = scanner;
    addLog('Scanning 10s...');
    try {
      const found = await scanner.scan(10000);
      setDevices(found);
      addLog(`Found ${found.length} device(s)`);
    } catch (e: any) {
      addLog(`Scan error: ${e?.message || e}`, '#ff4444');
    }
    setScanning(false);
  };

  const handleConnect = async (id: string, name: string | null) => {
    if (!scannerRef.current) return;
    addLog(`Connecting to ${name || id}...`);
    try {
      const d = await scannerRef.current.connect(id);
      setConnected(d);
      setConnectedId(id);

      const svcs = await d.services();
      addLog(`Connected! ${svcs.length} service(s)`);
      for (const s of svcs.slice(0, 5)) {
        addLog(`  Service: ${s.uuid}`);
      }
      if (svcs.length > 5) addLog(`  ... +${svcs.length - 5} more`);
    } catch (e: any) {
      addLog(`Connect error: ${e?.message || e}`, '#ff4444');
    }
  };

  const handleDisconnect = async () => {
    if (connected) {
      await connected.cancelConnection().catch(() => {});
      setConnected(null);
      setConnectedId(null);
      addLog('Disconnected');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>llosa</Text>
      <Text style={s.sub}>BLE Scanner</Text>

      <TouchableOpacity
        style={[s.btn, scanning ? s.btnDisabled : null]}
        disabled={scanning}
        onPress={handleScan}
      >
        <Text style={s.btnText}>{scanning ? 'Scanning...' : 'Scan'}</Text>
      </TouchableOpacity>

      {devices.length > 0 && (
        <ScrollView style={s.devList}>
          {devices.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[s.devItem, connectedId === d.id ? s.devActive : null]}
              onPress={() => handleConnect(d.id, d.name)}
              disabled={!!connected}
            >
              <Text style={s.devName}>{d.name || '(unnamed)'}</Text>
              <Text style={s.devId}>{d.id.slice(0, 24)}...</Text>
              <Text style={s.devRssi}>RSSI: {d.rssi ?? '?'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {connected && (
        <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={handleDisconnect}>
          <Text style={s.btnText}>Disconnect</Text>
        </TouchableOpacity>
      )}

      <View style={s.logBox}>
        <Text style={s.logTitle}>Log</Text>
        <ScrollView ref={scrollRef} style={s.logScroll}>
          {logs.map((e, i) => (
            <Text key={i} style={[s.logLine, e.color ? { color: e.color } : null]}>
              <Text style={s.logTs}>{e.ts}</Text> {e.text}
            </Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', padding: 12 },
  title: { color: '#58a6ff', fontSize: 24, fontWeight: '800' },
  sub: { color: '#8b949e', fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: '#238636', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnDisabled: { opacity: 0.4 },
  btnDanger: { backgroundColor: '#da3633' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  devList: { maxHeight: 200, marginBottom: 10 },
  devItem: { backgroundColor: '#161b22', padding: 12, borderRadius: 6, marginBottom: 4, borderWidth: 1, borderColor: '#30363d' },
  devActive: { borderColor: '#58a6ff' },
  devName: { color: '#c9d1d9', fontSize: 14, fontWeight: '600' },
  devId: { color: '#484f58', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  devRssi: { color: '#8b949e', fontSize: 12 },
  logBox: { flex: 1, backgroundColor: '#161b22', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#30363d' },
  logTitle: { color: '#8b949e', fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  logScroll: { flex: 1 },
  logLine: { color: '#c9d1d9', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
  logTs: { color: '#484f58' },
});
