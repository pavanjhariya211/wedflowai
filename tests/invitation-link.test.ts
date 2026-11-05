import { clearInvitation, invitationLink, pendingInvitation, rememberInvitation, tokenFromInvitationUrl } from '../src/wedding/invitation-link';
import { authStorage } from '../src/lib/auth-storage';
jest.mock('../src/lib/auth-storage',()=>({authStorage:{getItem:jest.fn(),setItem:jest.fn(),removeItem:jest.fn()}}));
const token='a'.repeat(64);
beforeEach(()=>jest.resetAllMocks());
test('share links keep the token in the fragment, never in server query parameters',()=>{
 const link=invitationLink(token);expect(new URL(link).search).toBe('');expect(tokenFromInvitationUrl(link)).toBe(token);
 expect(()=>invitationLink('invalid')).toThrow();
});
test('malformed or query-only tokens cannot become invitations',()=>{
 expect(tokenFromInvitationUrl('https://wedflowai.netlify.app/join#invite=bad')).toBeNull();
 expect(tokenFromInvitationUrl(`https://wedflowai.netlify.app/join?invite=${token}`)).toBeNull();
});
test('invitation survives authentication through bounded platform storage',async()=>{
 await rememberInvitation(token);
 const record=jest.mocked(authStorage.setItem).mock.calls[0]![1];
 jest.mocked(authStorage.getItem).mockResolvedValue(record);
 expect(await pendingInvitation()).toBe(token);
 await clearInvitation();expect(authStorage.removeItem).toHaveBeenCalledWith('wedflow.pending-invitation');
});
test.each(['{bad',JSON.stringify({token,expires:0}),JSON.stringify({token:'bad',expires:Date.now()+10000}),JSON.stringify({token,expires:Date.now()+999999999})])('invalid or expired stored invitations are removed',async record=>{
 jest.mocked(authStorage.getItem).mockResolvedValue(record);
 expect(await pendingInvitation()).toBeNull();expect(authStorage.removeItem).toHaveBeenCalled();
});
test('failed persistence remains an error rather than silently losing the invitation',async()=>{
 jest.mocked(authStorage.setItem).mockRejectedValue(new Error('storage denied'));
 await expect(rememberInvitation(token)).rejects.toThrow('storage denied');
});
