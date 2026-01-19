import { AuthenticationToken } from './types';
import axios from 'axios';

// Function to handle sign-in and obtain authentication token
async function signIn(username: string, password: string): Promise<AuthenticationToken> {
  try {
    const response = await axios.post('/api/signIn', { username, password });
    return response.data.token;
  } catch (error) {
    throw new Error('Error signing in');
  }
}

// Function to refresh authentication token if it's expired
async function refreshToken(token: AuthenticationToken): Promise<AuthenticationToken> {
  try {
    const response = await axios.post('/api/refreshToken', { token });
    return response.data.token;
  } catch (error) {
    throw new Error('Error refreshing token');
  }
}

export { signIn, refreshToken };