import { supabase } from './supabase';
import { User } from '../types';

export const authService = {
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUser(): Promise<User | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return {
            id: profile.id,
            name: profile.full_name || session.user.email || 'Unknown User',
            role: profile.role || 'Reporter',
            avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'U')}&background=random`
        };
    },

    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }
};
