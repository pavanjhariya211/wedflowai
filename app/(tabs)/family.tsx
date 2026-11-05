import { Alert } from '../../src/lib/confirmation';
import { useCallback, useRef, useState } from 'react';
import { Linking, Platform, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { Body, Button, Card, Heading, Notice, Screen } from '../../src/components/ui';
import { Choice } from '../../src/wedding/Choice';
import { useWedding } from '../../src/wedding/WeddingProvider';
import { weddingError } from '../../src/wedding/validation';
import { invitationLink, whatsappInvitationUrl } from '../../src/wedding/invitation-link';
import type { Member, Role } from '../../src/wedding/models';
export default function Family() {
  const { session } = useAuth();
  const { wedding, spaces, members, invitations, service, loading, error, reload } = useWedding();
  const [workspace, setWorkspace] = useState(''), [role, setRole] = useState<Role>('member');
  const [showCode,setShowCode] = useState(false);
  const [code, setCode] = useState(''), [failure, setFailure] = useState(''), [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => { setCode(''); setNow(Date.now()); void reload(); }, [reload]));
  const allowed = spaces.filter((s) => s.can_manage || s.bootstrap);
  const selected = allowed.find((s) => s.id === workspace) ?? (allowed.length === 1 ? allowed[0] : undefined);
  const roleName = (value: Role) => value === 'member' ? 'Can edit' : value === 'viewer' ? 'View only' : 'Admin';
  async function action(operation: () => Promise<unknown>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setFailure('');
    try { await operation(); await reload(); }
    catch (e) { setFailure(weddingError(e)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function invite() {
    if (!service || !selected) { setFailure('Select a workspace.'); return; }
    await action(async () => { const token = await service.inviteWhatsApp(selected.id, selected.bootstrap ? 'admin' : role); setCode(token); });
  }
  function change(m: Member, nextRole: Role | null) {
    Alert.alert(nextRole ? `Change role to ${nextRole}?` : 'Remove access?', nextRole ? 'This changes what this person can do in this workspace.' : 'This removes workspace access. If they have no other membership here, they also lose wedding access.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => { if (service) void action(() => service.changeMember(m.workspace_id, m.user_id, nextRole)); } },
    ]);
  }
  return <Screen><Heading compact title="Plan with your people." subtitle={wedding ? `Invite your people to ${wedding.title}.` : "Plan one wedding together, with separate accounts."} />
    {failure ? <Notice error>{failure}</Notice> : null}
    {loading ? <Notice>Loading family workspaces…</Notice> : error ? <Notice error>{error}</Notice> : !wedding ? <Notice>Create or join a wedding in Home first.</Notice> : <>
      <Body>Workspace names identify sharing destinations. Private family contents are available only to that family’s members.</Body>
      {allowed.length ? <Card><Text accessibilityRole="header">Invite family on WhatsApp</Text><Body>Choose their access and create one private invitation per person. No recipient email is needed.</Body><Choice label="Invite to workspace" value={selected?.id ?? ''} options={allowed.map((s) => ({ value: s.id, label: s.name }))} onChange={(id) => { setWorkspace(id); setCode(''); }} disabled={busy} />
        {selected?.bootstrap ? <Notice>The first invitation appoints this family’s admin. It does not grant you access to their private ceremonies. The first person who accepts this link becomes that family’s admin; share privately.</Notice> : <Choice label="Invitation role" value={role} options={[{ value: 'member', label: 'Can edit' }, { value: 'viewer', label: 'View only' }, { value: 'admin', label: 'Workspace admin' }]} onChange={(value) => { setRole(value); setCode(''); }} disabled={busy} />}
        <Body>Can edit: manage tasks and ceremonies here. View only: follow the plan. Admin: also manage access. Private family information stays private.</Body><Button title="Create WhatsApp invite" busy={busy} onPress={() => { void invite(); }} />
      </Card> : null}
      {code ? <Card><Body>Your WhatsApp invitation is ready. The first signed-in person to accept uses this link. It expires in 7 days. Share privately; create a separate invite for each person.</Body>
        <Text selectable accessibilityLabel="New invitation link">{invitationLink(code)}</Text>
        <Button title="Share on WhatsApp" onPress={() => { void Linking.openURL(whatsappInvitationUrl(code)).catch(() => setFailure('WhatsApp could not be opened. Copy the link and paste it into WhatsApp.')); }} />
        {Platform.OS === 'web' ? <Button secondary title="Copy link for WhatsApp" onPress={() => { if (!navigator.clipboard) {setFailure('Select the link text and copy it manually.');return;} void navigator.clipboard.writeText(invitationLink(code)).catch(() => setFailure('Copying was unavailable. Select the link text and copy it manually.')); }} /> : null}
        <Button secondary title={showCode ? 'Hide invitation code' : 'Show invitation code instead'} onPress={() => setShowCode(!showCode)} />
        {showCode ? <Text selectable accessibilityLabel="New invitation code">{code}</Text> : null}
        <Button secondary title="Hide invitation link" onPress={() => {setCode('');setShowCode(false);}} />
      </Card> : null}
      <Text accessibilityRole="header">Joined members</Text>
      {spaces.map((s) => <Card key={s.id}><Body>{s.name}{s.bootstrap ? ' · Invite first admin' : ''}</Body>
        {members.filter((m) => m.workspace_id === s.id).map((m) => <Card key={m.user_id}><Body>{m.profiles.display_name} · {roleName(m.role)}{m.user_id === session?.user.id ? ' (you)' : ''}</Body>
          {s.can_manage ? <>
            <Choice label={`Role for ${m.profiles.display_name}`} value={m.role} disabled={busy} options={[{ value: 'admin', label: 'Admin' }, { value: 'member', label: 'Can edit' }, { value: 'viewer', label: 'View only' }]} onChange={(r) => change(m, r)} />
            <Button secondary title={`Remove ${m.profiles.display_name}`} disabled={busy} onPress={() => change(m, null)} />
          </> : m.user_id === session?.user.id ? <Button secondary title={`Leave ${s.name}`} disabled={busy} onPress={() => change(m, null)} /> : null}
        </Card>)}
        {!members.some((m) => m.workspace_id === s.id) ? <Body>Members are private or have not joined yet.</Body> : null}
      </Card>)}
      <Text accessibilityRole="header">Pending invitations</Text>
      {!invitations.some(i=>!i.accepted_at && !i.revoked_at && new Date(i.expires_at).valueOf()>now) ? <Body>No pending invitations.</Body> : null}
      {invitations.filter((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at).valueOf() > now).map((i) => <Card key={i.id}><Body>Pending: {i.channel === 'whatsapp' ? `WhatsApp invite ${i.id.slice(0,8)}` : i.email} · {roleName(i.role)}</Body>
        <Button secondary title={`Revoke invitation ${i.channel === 'whatsapp' ? i.id.slice(0,8) : `for ${i.email}`}`} disabled={busy} onPress={() => { if (service) { setCode(''); void action(() => service.revokeInvite(i.id)); } }} /></Card>)}
    </>}
    <Button secondary title="Refresh family access" disabled={loading || busy} onPress={() => { setCode(''); setNow(Date.now()); void reload(); }} />
  </Screen>;
}
