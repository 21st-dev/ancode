import axios from 'axios';
import { Sandbox } from './types';

// Function to fork a sandbox
async function forkSandbox(sandboxId: string, userId: string): Promise<Sandbox> {
  try {
    const response = await axios.post(`/api/sandboxes/${sandboxId}/fork`, { userId });
    return response.data.sandbox;
  } catch (error) {
    if (error.response.status === 401) {
      throw new Error('Unauthorized to fork sandbox');
    } else {
      throw new Error('Error forking sandbox');
    }
  }
}

export { forkSandbox };