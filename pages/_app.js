import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // Import the new client utility
// Assuming you have a global CSS file
// Try importing from the app directory structure
import '../app/globals.css'; // Adjust the path if necessary

function MyApp({ Component, pageProps }) {
    // No longer need SessionContextProvider or manual session state management here.
    // Middleware and server-side checks handle session refresh and initial state.
    // Client components can create their own client instance using createClient().

    // Optionally, you can still create a client instance here if needed globally,
    // but it's often cleaner for components/hooks to create their own.
    // const [supabaseClient] = useState(() => createClient());

    return <Component {...pageProps} />;
}

export default MyApp; 