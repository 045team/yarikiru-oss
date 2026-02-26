export const auth = () => ({ userId: 'local-oss-user' });
export const currentUser = async () => ({ id: 'local-oss-user', emailAddresses: [{ emailAddress: 'local@example.com' }] });
export const useAuth = () => ({ isLoaded: true, isSignedIn: true, userId: 'local-oss-user' });
export const useUser = () => ({ isLoaded: true, isSignedIn: true, user: { id: 'local-oss-user', primaryEmailAddress: { emailAddress: 'local@example.com' } } });
export const ClerkProvider = ({ children }: any) => children;
export const SignIn = (props: any) => null;
export const SignUp = (props: any) => null;
export const SignOutButton = ({ children }: any) => children || null;

export const useSignIn = () => ({ isLoaded: true, signIn: { create: async () => ({}) } });
export const createRouteMatcher = (routes: string[]) => (req: any) => false;
export const clerkMiddleware = (handler?: any) => (req?: any, ev?: any) => { return handler ? handler(auth, req) : undefined; };
