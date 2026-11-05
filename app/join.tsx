import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { Body, Button, Card, Heading, Loading, Notice, Screen } from '../src/components/ui';
import { WeddingProvider } from '../src/wedding/WeddingProvider';
import { JoinForm } from '../src/wedding/JoinForm';
import { clearInvitation, pendingInvitation, rememberInvitation, tokenFromInvitationUrl } from '../src/wedding/invitation-link';

export default function JoinInvitation() {
 const url = Linking.useURL();
 const { session, recovery, service } = useAuth();
 const [loadedUrl,setLoadedUrl] = useState<string | null | undefined>(undefined);
 const [token,setToken] = useState<string | null>(null), [ready,setReady] = useState(false), [failure,setFailure] = useState('');
 useEffect(() => {
  let active=true;
  void (async()=>{
   const fromLink=url ? tokenFromInvitationUrl(url) : null;
   if(url && new URL(url).hash && !fromLink) throw new Error('invalid');
   if(fromLink) await rememberInvitation(fromLink);
   const pending=fromLink ?? await pendingInvitation();
   if(active){setToken(pending);setFailure('');setLoadedUrl(url);setReady(true);}
  })().catch(()=>{if(active){setFailure('This invitation could not be opened. Ask the organiser for a fresh link, or allow browser storage and reopen the link.');setLoadedUrl(url);setReady(true);}});
  return ()=>{active=false;};
 },[url]);
 async function finish(id?: string) {
  try { await clearInvitation(); router.replace(id ? {pathname:'/',params:{wedding:id}} : '/'); }
  catch { setFailure('Your invitation could not be cleared from this device. Allow browser storage, then retry.'); }
 }
 if(!ready || loadedUrl!==url) return <Loading message="Opening your invitation…"/>;
 return <Screen><Heading title="Join the wedding, together." subtitle="One wedding. Your own account. A shared plan."/>
  {failure ? <Notice error>{failure}</Notice> : null}
  {!token || failure ? <><Body>Invitation links must be opened in full. No wedding access has been granted.</Body><Button secondary title="Continue to Wedflow" onPress={()=>{void finish();}}/></>
   : recovery ? <><Notice>Finish resetting your password first. Your invitation will be available afterwards.</Notice><Button title="Finish password reset" onPress={()=>router.replace('/auth/update-password')}/></>
   : !session ? <Card><Body>You have a wedding invitation. Sign in or create an account with the email address the organiser invited. Then review and accept here.</Body><Button title="Sign in to accept" onPress={()=>router.push('/auth/sign-in')}/><Button secondary title="Create an account to join" onPress={()=>router.push('/auth/register')}/><Button secondary title="Decline invitation on this device" onPress={()=>{void finish();}}/></Card>
   : <><Notice>Signed in as {session.user.email}. Only the invited email can accept this link. Invitations expire after 7 days; the organiser controls your access.</Notice>
    <WeddingProvider key={session.user.id}><JoinForm initialToken={token} onDone={(id)=>{void finish(id);}}/></WeddingProvider>
    <Button secondary title="Use a different account" onPress={()=>{void service?.signOut().then(()=>router.replace('/auth/sign-in')).catch(()=>setFailure('Could not sign out. Please retry.'));}}/>
   </>}
 </Screen>;
}
