'use server';

import { cookies } from 'next/headers';

export async function addToken(token: string) {
  try {
    console.log('[Token] Adding API token to existing session...');
    
    // Verify the token works by making a test call
    const params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'core_webservice_get_site_info',
      moodlewsrestformat: 'json',
    });

    const response = await fetch('https://mylms.vossie.net/webservice/rest/server.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.exception) {
      return { success: false, error: 'Invalid token' };
    }

    // Token is valid, store it
    const cookieStore = await cookies();
    cookieStore.set('moodle_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    console.log('[Token] API token added successfully');
    return { success: true, username: data.username, fullname: data.fullname };
  } catch (error) {
    console.error('[Token] Failed to add token:', error);
    return { success: false, error: 'Failed to verify token' };
  }
}
