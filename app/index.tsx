import { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { environment } from '../src/config/environment';
import { Button, Loading, Notice, Screen } from '../src/components/ui';
import { pendingInvitation } from '../src/wedding/invitation-link';
export default function Index() {
 const { session, recovery } = useAuth();
 const { wedding } = useLocalSearchParams<{wedding?:string}>();
 const identity=session?.user.id ?? '';
 const [restored,setRestored] = useState<{user:string;pending:boolean;failed:boolean} | null>(null);
 useEffect(()=>{let active=true;
  if(identity && !recovery) void pendingInvitation().then(token=>{if(active)setRestored({user:identity,pending:!!token,failed:false});}).catch(()=>{if(active)setRestored({user:identity,pending:false,failed:true});});
  return ()=>{active=false;};
 },[identity,recovery]);
 if (!environment.ready) return <Redirect href="/setup" />;
 if (!session) return <Redirect href="/auth/sign-in" />;
 if (recovery) return <Redirect href="/auth/update-password" />;
 if(restored?.user!==identity) return <Loading/>;
 if(restored.failed) return <Screen><Notice error>We could not restore your invitation on this device. You can reopen its link or continue to your weddings.</Notice><Button title="Continue to my weddings" onPress={()=>{setRestored({user:identity,pending:false,failed:false});}}/></Screen>;
 if(restored.pending) return <Redirect href="/join"/>;
 return <Redirect href={{pathname:'/(tabs)',params:wedding ? {wedding} : {}}}/>;
}
