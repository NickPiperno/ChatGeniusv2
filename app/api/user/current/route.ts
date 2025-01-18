import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'

const dynamodb = new DynamoDBService()
const GROUPS_TABLE = process.env.DYNAMODB_GROUP_CHATS_TABLE || 'dev_GroupChats'

export const dynamic = 'force-dynamic'

interface DbUser {
  id: string;
  clerkId: string;
  displayName: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  preferences: Record<string, any>;
}

export async function GET(req: Request) {
  logger.info('[CURRENT_USER_GET] Endpoint called');
  
  try {
    const { userId } = auth();
    if (!userId) {
      logger.warn('[CURRENT_USER_GET] No userId from auth');
      return new NextResponse("Unauthorized", { status: 401 });
    }
    logger.info('[CURRENT_USER_GET] Authenticated user', { userId });

    const user = await currentUser();
    if (!user) {
      logger.warn('[CURRENT_USER_GET] No user data from Clerk', { userId });
      return new NextResponse("User not found", { status: 404 });
    }

    // Get additional user data from our database
    let dbUser = await dynamodb.getUserById(userId) as DbUser | null;
    
    // If user doesn't exist in DynamoDB, create them
    if (!dbUser) {
      logger.info('[CURRENT_USER_GET] Creating new user in DynamoDB...', { userId });
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const newUser: DbUser = {
        id: userId,
        clerkId: userId,
        displayName: user.username || fullName || userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        imageUrl: user.imageUrl,
        createdAt: Date.now(),
        preferences: {}
      };

      try {
        dbUser = await dynamodb.createUser(newUser) as DbUser;
        logger.info('[CURRENT_USER_GET] Successfully created user in DynamoDB', { 
          userId,
          displayName: newUser.displayName
        });
      } catch (error) {
        logger.error('[CURRENT_USER_GET] Error creating user in DynamoDB:', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // If we can't create the user, return an error instead of proceeding
        return new NextResponse("Error creating user profile", { status: 500 });
      }
    }

    // Ensure user is a member of all groups before returning response
    try {
      const result = await dynamodb.send(new ScanCommand({
        TableName: GROUPS_TABLE
      }));
      const groups = result.Items || [];
      let groupUpdates = [];

      // Add user to any groups they're not already a member of
      for (const group of groups) {
        const members = group.members || [];
        if (!members.includes(userId)) {
          groupUpdates.push(
            dynamodb.updateGroup(group.id, {
              members: [...members, userId]
            })
          );
        }
      }

      // Wait for all group updates to complete
      if (groupUpdates.length > 0) {
        logger.info('[CURRENT_USER_GET] Adding user to groups', { 
          userId, 
          groupCount: groupUpdates.length 
        });
        await Promise.all(groupUpdates);
      }

      return NextResponse.json({
        id: userId,
        displayName: dbUser.displayName,
        email: user.emailAddresses[0]?.emailAddress,
        imageUrl: user.imageUrl,
        preferences: dbUser.preferences
      });
    } catch (error) {
      logger.error('[CURRENT_USER_GET] Error ensuring group membership:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // If we can't add to groups, return an error
      return new NextResponse("Error setting up user access", { status: 500 });
    }
  } catch (error) {
    logger.error('[CURRENT_USER_GET]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 