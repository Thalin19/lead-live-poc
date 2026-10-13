import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLeads } from './src/useLeads';
import type { Lead } from './src/leads';
import { styles as s } from './src/styles';

const initialUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const initialToken = process.env.EXPO_PUBLIC_API_TOKEN || '';

export default function App() {
  const [connection, setConnection] = useState({ url: initialUrl, token: initialToken });
  const [settings, setSettings] = useState(!initialToken);
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [draftToken, setDraftToken] = useState(initialToken);
  const [validation, setValidation] = useState('');
  const { leads, status, mode, stats, error } = useLeads(connection.url, connection.token);
  const live = status === 'live';
  const connect = () => {
    try {
      const parsed = new URL(draftUrl.trim());
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error();
      if (!draftToken.trim()) { setValidation('Enter the app access token from your local setup.'); return; }
      setConnection({ url: `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`, token: draftToken.trim() });
      setValidation(''); setSettings(false);
    } catch { setValidation('Enter a valid server address beginning with https:// or http://.'); }
  };
  return <SafeAreaView style={s.safe}>
    <StatusBar style="dark" />
    <View style={s.shell}>
      <View style={s.topbar}>
        <View style={s.brand}><View style={s.logo}><Text style={s.logoText}>L</Text></View><Text style={s.brandText}>lead live<Text style={s.brandDot}>.</Text></Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Connection settings" onPress={() => setSettings(true)} style={s.settingsButton}><Text style={s.settingsText}>Connection</Text></Pressable>
      </View>
      <FlatList data={leads} keyExtractor={lead => lead.id} contentContainerStyle={s.list}
        ListHeaderComponent={<>
          <View style={s.headingRow}><Text style={s.eyebrow}>YOUR LIVE INBOX</Text><View style={[s.statusPill, !live && s.offlinePill]}><View style={[s.dot, !live && s.offlineDot]} /><Text style={[s.statusText, !live && s.offlineText]}>{live ? 'Live' : status === 'connecting' ? 'Connecting' : status === 'auth-error' ? 'Access denied' : 'Offline'}</Text></View></View>
          <Text style={s.title}>A new connection.{'\n'}The moment it happens.</Text>
          <Text style={s.subtitle}>New leads arrive here automatically. Keep this screen open and watch your inbox grow.</Text>
          <View style={s.metricCard}><View><Text style={s.metricLabel}>LEADS RECEIVED</Text><Text style={s.metricValue}>{stats.leads}</Text></View><View style={s.metricAside}><Text style={s.metricSymbol}>↗</Text><Text style={s.metricCaption}>{live ? 'Listening for new leads' : 'Waiting for connection'}</Text></View></View>
          {mode === 'demo' && <View style={s.demoBanner}><Text style={s.demoTitle}>Local demo mode</Text><Text style={s.demoText}>These are sample leads. Connect Meta before recording your assignment demonstration.</Text></View>}
          {!!error && <View style={s.errorBanner}><Text style={s.errorText}>{error}</Text></View>}
          {stats.failed > 0 && <View style={s.errorBanner}><Text style={s.errorText}>{stats.failed} lead retrieval{stats.failed === 1 ? '' : 's'} need attention. Check the server and retry failed jobs.</Text></View>}
          {stats.pending > 0 && <Text style={s.pending}>{stats.pending} lead{stats.pending === 1 ? '' : 's'} processing…</Text>}
          <View style={s.sectionRow}><Text style={s.sectionTitle}>Latest leads</Text><Text style={s.sectionAside}>Newest first</Text></View>
        </>}
        renderItem={({ item }) => <LeadCard lead={item} />}
        ListEmptyComponent={<View style={s.empty}><View style={s.emptyIcon}><Text style={s.emptyIconText}>↙</Text></View><Text style={s.emptyTitle}>{live ? 'Ready for the first hello' : 'Your inbox is waiting'}</Text><Text style={s.emptyText}>{live ? 'Submit a lead and it will appear here.\nThere’s nothing to refresh.' : 'Connect to your server to start receiving leads.'}</Text>{status === 'connecting' && <ActivityIndicator color="#6355d8" style={{ marginTop: 20 }} />}</View>}
        ListFooterComponent={<Text style={s.footer}>{leads.length === 200 ? 'Showing the latest 200 leads · ' : ''}AUTOMATICALLY UPDATED · LEAD LIVE</Text>}
      />
    </View>
    <Modal visible={settings} transparent animationType="fade" onRequestClose={() => setSettings(false)}>
      <View style={s.backdrop}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalScroll}><View style={s.modalCard}>
        <Text style={s.eyebrow}>CONNECT YOUR INBOX</Text><Text style={s.modalTitle}>Connection settings</Text>
        <Text style={s.modalText}>Use the server address and app access token created during setup. On a phone, use your computer’s network address or the public HTTPS address.</Text>
        <Text style={s.inputLabel}>Server address</Text><TextInput accessibilityLabel="Server address" value={draftUrl} onChangeText={setDraftUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={s.input} placeholder="https://your-server.example" />
        <Text style={s.inputLabel}>App access token</Text><TextInput accessibilityLabel="App access token" value={draftToken} onChangeText={setDraftToken} autoCapitalize="none" autoCorrect={false} secureTextEntry style={s.input} placeholder="Your app access token" />
        <Text style={s.smallText}>Use the app token only. Meta credentials stay on the server.</Text>
        {!!validation && <Text accessibilityRole="alert" style={s.validation}>{validation}</Text>}
        <Pressable accessibilityRole="button" onPress={connect} style={s.primaryButton}><Text style={s.primaryText}>Connect inbox →</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setSettings(false)} style={s.cancelButton}><Text style={s.cancelText}>Close</Text></Pressable>
      </View></ScrollView></View>
    </Modal>
  </SafeAreaView>;
}

function LeadCard({ lead }: { lead: Lead }) {
  const initials = lead.name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  const when = new Date(lead.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = new Date(lead.receivedAt).toLocaleDateString([], { day: 'numeric', month: 'short' });
  return <View style={s.leadCard}>
    <View style={s.leadRow}><View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View><View style={s.leadIdentity}><Text style={s.leadName}>{lead.name}</Text><Text style={s.leadEmail}>{lead.email || 'No email provided'}</Text></View><Text style={s.arrivalMark}>↗</Text></View>
    {!!lead.phone && <Text style={s.phone}>{lead.phone}</Text>}
    <View style={s.cardBottom}><View style={s.sourceBadge}><Text style={s.sourceText}>{lead.source === 'meta' ? 'META LEAD AD' : 'DEMO LEAD'}</Text></View><Text style={s.time}>{date} · {when}</Text></View>
  </View>;
}
