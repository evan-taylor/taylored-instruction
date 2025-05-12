import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // New client utility
import { User, Session } from '@supabase/supabase-js'; // Import User and Session type
// import type { Database } from '@/types/supabase'; // Keep commented out

// Define the shape of your profile data
interface Profile {
    id: string;
    is_instructor: boolean;
    updated_at: string | null;
}

interface UseProfileReturn {
    session: Session | null;
    profile: Profile | null;
    isInstructor: boolean;
    loading: boolean;
    error: string | null;
    userId: string | undefined;
    email: string | null;
}

// Hook now accepts userId or fetches user internally
export function useProfile(initialUserId?: string): UseProfileReturn {
    const [supabaseClient] = useState(() => createClient());
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // Stays true initially
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | undefined>(initialUserId);

    useEffect(() => {
        let isMounted = true;
        async function fetchSessionAndSetState() {
            const { data: { session: currentSession }, error: sessionError } = await supabaseClient.auth.getSession();
            if (!isMounted) return;

            if (sessionError) {
                console.error("useProfile (Client): Error fetching session:", sessionError);
                setError("Could not fetch session: " + sessionError.message);
                setSession(null);
                setUser(null);
                setCurrentUserId(undefined);
                setEmail(null);
                if (isMounted) setLoading(false); // Stop loading if session fails
            } else if (currentSession) {
                setSession(currentSession);
                setUser(currentSession.user);
                setCurrentUserId(currentSession.user.id);
                setEmail(currentSession.user.email ?? null);
                console.log("useProfile (Client): Fetched session for user:", currentSession.user.id);
                // Loading remains true, waits for profile fetch
            } else { // No session
                setSession(null);
                setUser(null);
                setCurrentUserId(undefined);
                setEmail(null);
                console.log("useProfile (Client): No session found.");
                if (isMounted) setLoading(false); // Stop loading if no session
            }
        }

        if (!initialUserId) {
            fetchSessionAndSetState();
        } else {
            // initialUserId is provided, currentUserId is already set.
            // Loading remains true until profile is fetched in the next effect.
            // Note: session/user/email object will not be populated if only initialUserId is used.
        }
        return () => { isMounted = false; };
    }, [initialUserId, supabaseClient]);

    useEffect(() => {
        let isMounted = true;
        async function loadProfile() {
            if (!currentUserId) {
                // This condition should ideally not be met if the first useEffect determined there's no session and set loading to false.
                // If initialUserId was provided but is invalid, or if session flow is complex, this ensures profile isn't fetched.
                // However, setLoading(false) here can be problematic if session is still being fetched by the first effect.
                // The primary setLoading(false) for "no user" cases should be handled by the first effect.
                if (isMounted) {
                    setProfile(null);
                    // DO NOT set loading false here; let the first effect or loadProfile's finally block handle it.
                    console.log("useProfile (Client): No currentUserId for loadProfile. Profile set to null.");
                }
                return;
            }
            
            // Ensure loading is true before starting the fetch if it wasn't already.
            // This is a safeguard, as the first effect should keep it true if a session was found.
            if (isMounted && !loading) setLoading(true); 

            console.log("useProfile (Client): Attempting to load profile for currentUserId:", currentUserId);

            try {
                const { data, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('id, is_instructor, updated_at')
                    .eq('id', currentUserId)
                    .single();
                if (!isMounted) return;
                console.log("useProfile (Client): Profile fetch response for", currentUserId, { data, profileError });

                if (profileError) {
                    if (profileError.code === 'PGRST116') { 
                        console.log('useProfile (Client): Creating new profile for user:', currentUserId);
                        const now = new Date().toISOString();
                        const newProfile = { id: currentUserId, is_instructor: false, updated_at: now };
                        const { data: insertedProfile, error: insertError } = await supabaseClient
                            .from('profiles').insert(newProfile).select().single();
                        if (!isMounted) return;
                        if (insertError) {
                            if (isMounted) setError(insertError.message || "Failed to create profile.");
                            throw insertError;
                        }
                        if (isMounted) setProfile(insertedProfile as Profile);
                    } else {
                        if (isMounted) setError(profileError.message || "Failed to load profile.");
                        throw profileError;
                    }
                } else {
                    if (isMounted) setProfile(data as Profile);
                }
            } catch (err: any) {
                // Errors from profileError or insertError are caught here again if re-thrown
                // Ensure setError is only called if not already set, or update if more specific.
                if (isMounted && !error) {
                     setError(err.message || "An unexpected error occurred during profile loading.");
                }
                console.error("useProfile (Client): Catch block error for profile load:", currentUserId, err);
            } finally {
                if (isMounted) setLoading(false); // Final loading state change for profile fetch path
            }
        }

        if (currentUserId) {
            // Only attempt to load profile if we have a user ID.
            loadProfile();
        } 
        // REMOVED: else if (!initialUserId) { ... setLoading(false) ... }
        // This was causing setLoading(false) prematurely before currentUserId was set by the first effect.
        // The first useEffect is responsible for setLoading(false) if no session/initialUserId leads to no currentUserId.

        // If initialUserId was provided but currentUserId is null (e.g., bad ID), 
        // the !currentUserId check at the start of loadProfile() prevents fetch, 
        // and loading state would be determined by the first effect or eventually by loadProfile's finally if it ever ran.
        // This path needs to be robust: if initialUserId is given, first effect doesn't run getSession().
        // So if initialUserId is bad, currentUserId remains null. loadProfile is called, hits the !currentUserId guard.
        // In this specific case (bad initialUserId), loading needs to be set to false.
        else if (initialUserId && !currentUserId) { // specifically for bad initialUserId
             if (isMounted) {
                setProfile(null);
                setLoading(false); 
                console.log("useProfile (Client): initialUserId provided but no currentUserId, setting loading false.");
             }
        }

        return () => { isMounted = false; };
    }, [currentUserId, initialUserId, supabaseClient]); // REMOVED loading from dependency array

    const isInstructor = profile?.is_instructor ?? false;

    return {
        session,
        profile,
        isInstructor,
        loading,
        error,
        userId: currentUserId,
        email,
    };
} 