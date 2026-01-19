import { Permissions } from './types';

// Function to check if a user has permission to fork a sandbox
async function hasForkPermission(userId: string, sandboxId: string): Promise<boolean> {
  try {
    const response = await axios.get(`/api/users/${userId}/permissions`, {
      params: { sandboxId },
    });
    return response.data.hasPermission;
  } catch (error) {
    throw new Error('Error checking permissions');
  }
}

export { hasForkPermission };