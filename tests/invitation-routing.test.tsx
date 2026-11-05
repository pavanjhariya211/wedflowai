import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Index from '../app/index';
import { pendingInvitation } from '../src/wedding/invitation-link';
let mockState: {session:{user:{id:string}} | null; recovery:boolean};
jest.mock('../src/wedding/invitation-link',()=>({pendingInvitation:jest.fn()}));
jest.mock('../src/auth/AuthProvider',()=>({useAuth:()=>mockState}));
jest.mock('../src/config/environment',()=>({environment:{ready:true}}));
jest.mock('react-native-safe-area-context',()=>jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router',()=>({
 useLocalSearchParams:()=>({wedding:'existing-wedding'}),
 Redirect:({href}:{href:string | {pathname:string;params:object}})=>{
  const React=jest.requireActual<typeof import('react')>('react');
  const {Text}=jest.requireActual<typeof import('react-native')>('react-native');
  return React.createElement(Text,null,typeof href==='string'?href:JSON.stringify(href));
 },
}));
beforeEach(()=>{jest.resetAllMocks();mockState={session:{user:{id:'person'}},recovery:false};});
test('authentication resumes a pending invitation instead of opening wedding setup',async()=>{
 jest.mocked(pendingInvitation).mockResolvedValue('a'.repeat(64));await render(<Index/>);
 expect(await screen.findByText('/join')).toBeTruthy();
});
test('recovery takes priority over invitation routing',async()=>{
 mockState.recovery=true;await render(<Index/>);
 expect(screen.getByText('/auth/update-password')).toBeTruthy();expect(pendingInvitation).not.toHaveBeenCalled();
});
test('ordinary navigation preserves the selected accepted wedding',async()=>{
 jest.mocked(pendingInvitation).mockResolvedValue(null);await render(<Index/>);
 expect(await screen.findByText(JSON.stringify({pathname:'/(tabs)',params:{wedding:'existing-wedding'}}))).toBeTruthy();
});
test('anonymous users sign in before invitation storage is read',async()=>{
 mockState.session=null;await render(<Index/>);
 expect(screen.getByText('/auth/sign-in')).toBeTruthy();expect(pendingInvitation).not.toHaveBeenCalled();
});
test('storage failure offers an explicit continuation without breaking authentication',async()=>{
 jest.mocked(pendingInvitation).mockRejectedValue(new Error('storage denied'));await render(<Index/>);
 await fireEvent.press(await screen.findByRole('button',{name:'Continue to my weddings'}));
 await waitFor(()=>expect(screen.getByText(JSON.stringify({pathname:'/(tabs)',params:{wedding:'existing-wedding'}}))).toBeTruthy());
});
