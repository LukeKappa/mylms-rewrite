import { MoodleToken } from './types';

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net';
const SERVICE = 'moodle_mobile_app';

export async function getMoodleToken(username: string, password: string): Promise<MoodleToken | { error: string }> {
  const params = new URLSearchParams({
    username,
    password,
    service: SERVICE,
  });

  try {
    const tokenUrl = `${MOODLE_URL}/login/token.php?${params.toString()}`;
    console.log('Attempting to fetch token from:', tokenUrl);
    
    const response = await fetch(tokenUrl);
    const data = await response.json();

    console.log('Token response:', data);

    if (data.error) {
      // If it failed and looks like an email, try with just the username part
      if (data.errorcode === 'invalidlogin' && username.includes('@')) {
        const simpleUsername = username.split('@')[0];
        console.log('Login failed with email, retrying with username:', simpleUsername);
        
        const retryParams = new URLSearchParams({
          username: simpleUsername,
          password,
          service: SERVICE,
        });
        
        const retryResponse = await fetch(`${MOODLE_URL}/login/token.php?${retryParams.toString()}`);
        const retryData = await retryResponse.json();
        
        console.log('Retry response:', retryData);
        
        if (!retryData.error) {
          return retryData as MoodleToken;
        }
      }
      
      return { error: data.error };
    }

    return data as MoodleToken;
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Failed to connect to LMS' };
  }
}
