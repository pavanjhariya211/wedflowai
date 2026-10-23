import { Alert } from '../../src/lib/confirmation';
import { useCallback, useRef, useState } from 'react';
import { Share, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { Body, Button, Card, Field, Heading, Notice, Screen } from '../../src/components/ui';
import { Choice } from '../../src/wedding/Choice';
import { useWedding } from '../../src/wedding/WeddingProvider';
import { weddingError } from '../../src/wedding/validation';
import type { Member, Role } from '../../src/wedding/models';
export default function Family() {
  const { session } = useAuth();
  const { wedding, spaces, members, invitations, service, loading, error, reload } = useWedding();
  const [workspace, setWorkspace] = useState(''), [email, setEmail] = useState(''), [role, setRole] = useState<Role>('member');
  const [code, setCode] = useState(''), [failure, setFailure] = useState(''), [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => { setCode(''); setNow(Date.now()); void reload(); }, [reload]));
  const selected = spaces.find((s) => s.id === workspace);
  const allowed = spaces.filter((s) => s.can_manage || s.bootstrap);
  async function action(operation: () => Promise<unknown>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setFailure('');
    try { await operation(); await reload(); }
    catch (e) { setFailure(weddingError(e)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function invite() {
    if (!service || !selected) { setFailure('Select a workspace.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) { setFailure('Enter the invited person’s email.'); return; }
    await action(async () => { const token = await service.invite(selected.id, email, selected.bootstrap ? 'admin' : role); setCode(token); });
  }
  function change(m: Member, nextRole: Role | null) {
    Alert.alert(nextRole ? `Change role to ${nextRole}?` : 'Remove access?', nextRole ? 'This changes what this person can do in this workspace.' : 'This removes workspace access. If they have no other membership here, they also lose wedding access.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => { if (service) void action(() => service.changeMember(m.workspace_id, m.user_id, nextRole)); } },
    ]);
  }
  return <Screen><Heading title="Plan with your people." subtitle="Invitations require explicit acceptance with the invited email." />
    {failure ? <Notice error>{failure}</Notice> : null}
    {loading ? <Notice>Loading family workspaces…</Notice> : error ? <Notice error>{error}</Notice> : !wedding ? <Notice>Create or join a wedding in Home first.</Notice> : <>
      <Body>Workspace names identify sharing destinations. Private family contents are available only to that family’s members.</Body>
      {spaces.map((s) => <Card key={s.id}><Body>{s.name}{s.bootstrap ? ' · Invite first admin' : ''}</Body>
        {members.filter((m) => m.workspace_id === s.id).map((m) => <Card key={m.user_id}><Body>{m.profiles.display_name} · {m.role}{m.user_id === session?.user.id ? ' (you)' : ''}</Body>
          {s.can_manage ? <>
            <Choice label={`Role for ${m.profiles.display_name}`} value={m.role} disabled={busy} options={[{ value: 'admin', label: 'Admin' }, { value: 'member', label: 'Member' }, { value: 'viewer', label: 'View only' }]} onChange={(r) => change(m, r)} />
            <Button secondary title={`Remove ${m.profiles.display_name}`} disabled={busy} onPress={() => change(m, null)} />
          </> : m.user_id === session?.user.id ? <Button secondary title={`Leave ${s.name}`} disabled={busy} onPress={() => change(m, null)} /> : null}
        </Card>)}
        {!members.some((m) => m.workspace_id === s.id) ? <Body>Members are private or have not joined yet.</Body> : null}
      </Card>)}
      {allowed.length ? <Card><Choice label="Invite to workspace" value={workspace} options={allowed.map((s) => ({ value: s.id, label: s.name }))} onChange={(id) => { setWorkspace(id); setCode(''); }} disabled={busy} />
        <Field label="Invited email" value={email} onChangeText={(value) => { setEmail(value); setCode(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} />
        {selected?.bootstrap ? <Notice>The first invitation appoints this family’s admin. It does not grant you access to their private ceremonies.</Notice> : <Choice label="Invitation role" value={role} options={[{ value: 'member', label: 'Member' }, { value: 'viewer', label: 'View only' }, { value: 'admin', label: 'Workspace admin' }]} onChange={(value) => { setRole(value); setCode(''); }} disabled={busy} />}
        <Button title="Create invitation code" busy={busy} onPress={() => { void invite(); }} />
      </Card> : null}
      {code ? <Card><Body>Invitation created for {email.trim()}. It expires in 7 days. Share it with that person; they can accept it in Home → Join with invitation code. No email has been sent.</Body>
        <Text selectable accessibilityLabel="New invitation code">{code}</Text>
        <Button title="Share invitation code" onPress={() => { void Share.share({ message: `Join our wedding in Wedflow using your invited email. In Home, choose Join with invitation code and enter: ${code}` }).catch(() => setFailure('Sharing was unavailable. Select and copy the code instead.')); }} />
        <Button secondary title="Hide code" onPress={() => setCode('')} />
      </Card> : null}
      {invitations.filter((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at).valueOf() > now).map((i) => <Card key={i.id}><Body>Pending: {i.email} · {i.role}</Body>
        <Button secondary title={`Revoke invitation for ${i.email}`} disabled={busy} onPress={() => { if (service) { setCode(''); void action(() => service.revokeInvite(i.id)); } }} /></Card>)}
    </>}
    <Button secondary title="Refresh family access" disabled={loading || busy} onPress={() => { setCode(''); setNow(Date.now()); void reload(); }} />
  </Screen>;
}
