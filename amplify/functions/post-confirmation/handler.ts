import { nanoid } from 'nanoid'
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand
} from '@aws-sdk/client-cognito-identity-provider'
import type { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda'
import { saveUserProfile, getUserProfileByEmail } from '../../dynamodb/operations'
import type { UserProfile } from '../libs/user/types'

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
})

export const handler: PostConfirmationTriggerHandler = async (event: PostConfirmationTriggerEvent) => {
  console.info('Post-confirmation trigger:', JSON.stringify(event, null, 2))

  try {
    // Extract user attributes from the event
    const userAttributes = event.request.userAttributes
    const email = userAttributes.email
    const givenName = userAttributes.given_name || ''
    const familyName = userAttributes.family_name || ''
    const preferredUsername = userAttributes.preferred_username || event.userName

    // Check if a user profile already exists with this email
    console.info(`Checking for existing user profile with email: ${email}`)
    const existingProfile = await getUserProfileByEmail(email)

    if (existingProfile) {
      console.warn(`⚠️ User profile already exists for email: ${email}`, {
        existingUserId: existingProfile.attributes.userId,
        existingUsername: existingProfile.attributes.username,
        cognitoUsername: event.userName
      })

      // Update Cognito with the existing custom:user_id instead of creating a new profile
      const existingCustomUserId = existingProfile.attributes.userId
      console.info(`Using existing custom userId: ${existingCustomUserId} for Cognito user: ${event.userName}`)

      const cognitoCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        UserAttributes: [{
          Name: 'custom:user_id',
          Value: existingCustomUserId
        }]
      })

      await cognitoClient.send(cognitoCommand)
      console.info(`Successfully linked existing profile ${existingCustomUserId} to Cognito user: ${event.userName}`)

      return event
    }

    // Generate custom userId for new user
    const customUserId = nanoid(21)
    console.info(`Generating new custom userId: ${customUserId} for user: ${event.userName}`)

    // Set custom userId attribute in Cognito
    const cognitoCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      UserAttributes: [{
        Name: 'custom:user_id',
        Value: customUserId
      }]
    })

    await cognitoClient.send(cognitoCommand)
    console.info(`Successfully set custom userId: ${customUserId}`)

    const userProfile: UserProfile = {
      athleteProfile: {
        confidence: 0,
        lastUpdated: new Date(),
        sources: [],
        summary: '',
        version: 1
      },
      avatar: {
        s3Key: '',
        url: ''
      },
      demographics: {},
      displayName: `${givenName} ${familyName}`.trim() || preferredUsername,
      email: email,
      firstName: givenName,
      fitness: {},
      lastName: familyName,
      metadata: {
        isActive: true
      },
      nickname: givenName || preferredUsername,
      preferences: {
        timezone: 'America/Los_Angeles' // Default to Pacific Time for new users
      },
      subscription: {},
      userId: customUserId,
      username: preferredUsername
    }

    await saveUserProfile(userProfile)
    console.info(`Successfully created user profile for: ${customUserId}`)

    return event

  } catch (error) {
    console.error('Failed in post-confirmation:', error)
    // Don't throw error to prevent blocking user registration
    // Just log it and continue
    console.error('Continuing with registration despite error')
    return event
  }
}
