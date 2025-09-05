import { storage } from "../storage";
import { type User, type InsertUser } from "@shared/schema";

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class AuthService {
  async handleGoogleLogin(profile: GoogleProfile): Promise<User> {
    try {
      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(profile.id);
      
      if (user) {
        // Update user info if needed
        const updates: Partial<User> = {};
        if (user.name !== profile.name) updates.name = profile.name;
        if (user.avatar !== profile.picture) updates.avatar = profile.picture;
        
        if (Object.keys(updates).length > 0) {
          user = await storage.updateUser(user.id, updates) || user;
        }
        
        return user;
      }

      // Check if user exists by email
      user = await storage.getUserByEmail(profile.email);
      
      if (user) {
        // Link Google account to existing user
        return await storage.updateUser(user.id, {
          googleId: profile.id,
          avatar: profile.picture
        }) || user;
      }

      // Create new user
      const insertUser: InsertUser = {
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        role: this.determineUserRole(profile.email),
        googleId: profile.id
      };

      return await storage.createUser(insertUser);
    } catch (error) {
      console.error('Error handling Google login:', error);
      throw new Error('Authentication failed');
    }
  }

  private determineUserRole(email: string): string {
    // Define admin emails or domains
    const adminEmails = [
      'admin@newsai.com',
      'editor@newsai.com'
    ];
    
    const adminDomains = [
      'newsai.com'
    ];

    if (adminEmails.includes(email)) {
      return 'admin';
    }

    const domain = email.split('@')[1];
    if (adminDomains.includes(domain)) {
      return 'editor';
    }

    return 'user';
  }

  async validateUserAccess(userId: string, requiredRole: string = 'user'): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return false;

      const roleHierarchy = {
        'user': 0,
        'editor': 1,
        'admin': 2
      };

      const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

      return userLevel >= requiredLevel;
    } catch (error) {
      console.error('Error validating user access:', error);
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<User | null> {
    try {
      return await storage.getUser(userId) || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  generateSessionToken(): string {
    // In production, use a more secure token generation
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async validateSession(token: string): Promise<User | null> {
    // In production, implement proper session validation with expiration
    // This is a simplified version for the memory storage implementation
    
    try {
      // Extract user info from token (in real implementation, store sessions)
      const users = await storage.getSources(); // Get all users for simplification
      
      // For this demo, return the first admin user if token exists
      // In production, properly validate and lookup session
      if (token && token.startsWith('session_')) {
        const allUsers = await this.getAllUsers();
        return allUsers.find(user => user.role === 'admin') || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  private async getAllUsers(): Promise<User[]> {
    // Helper method to get all users (for demo purposes)
    // In production, this would be a proper database query
    const users: User[] = [];
    
    // Create a default admin user if none exists
    const adminUser: InsertUser = {
      email: 'admin@newsai.com',
      name: 'Admin User',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
    };

    try {
      const existingAdmin = await storage.getUserByEmail('admin@newsai.com');
      if (!existingAdmin) {
        const newAdmin = await storage.createUser(adminUser);
        users.push(newAdmin);
      } else {
        users.push(existingAdmin);
      }
    } catch (error) {
      console.error('Error creating default admin:', error);
    }

    return users;
  }
}
