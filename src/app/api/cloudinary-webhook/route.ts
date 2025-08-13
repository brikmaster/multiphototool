import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { env, CLOUDINARY_WEBHOOK_SECRET } from '../../../lib/env';

// Webhook event types from Cloudinary
interface CloudinaryWebhookEvent {
  notification_type: string;
  timestamp: number;
  request_id: string;
  asset_id?: string;
  public_id?: string;
  version?: number;
  version_id?: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  created_at?: string;
  bytes?: number;
  url?: string;
  secure_url?: string;
  etag?: string;
  placeholder?: boolean;
  moderation?: {
    status: string;
    response: any;
  };
  eager?: Array<{
    transformation: string;
    width: number;
    height: number;
    url: string;
    secure_url: string;
    status: string;
  }>;
  tags?: string[];
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.warn('Cloudinary webhook secret not configured - skipping signature verification');
    return true; // Allow if no secret configured (development)
  }

  try {
    const expectedSignature = crypto
      .createHash('sha256')
      .update(payload + secret)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

// Handle different webhook events
async function handleWebhookEvent(event: CloudinaryWebhookEvent): Promise<void> {
  console.log(`Processing Cloudinary webhook event: ${event.notification_type}`, {
    public_id: event.public_id,
    asset_id: event.asset_id,
    timestamp: event.timestamp,
  });

  switch (event.notification_type) {
    case 'upload':
      await handleUploadEvent(event);
      break;
    
    case 'delete':
      await handleDeleteEvent(event);
      break;
    
    case 'eager':
      await handleEagerTransformationEvent(event);
      break;
    
    case 'moderation':
      await handleModerationEvent(event);
      break;
    
    default:
      console.log(`Unhandled webhook event type: ${event.notification_type}`);
  }
}

// Handle upload completion events
async function handleUploadEvent(event: CloudinaryWebhookEvent): Promise<void> {
  try {
    console.log('Upload completed:', {
      public_id: event.public_id,
      secure_url: event.secure_url,
      format: event.format,
      bytes: event.bytes,
      tags: event.tags,
    });

    // Here you could:
    // 1. Update database with upload completion status
    // 2. Send notifications to users
    // 3. Trigger additional processing
    // 4. Update analytics/metrics
    
    // Example: Extract user info from tags
    const userTag = event.tags?.find(tag => tag.startsWith('user:'));
    const gameTag = event.tags?.find(tag => tag.startsWith('game:'));
    
    if (userTag && gameTag) {
      const userId = userTag.replace('user:', '');
      const gameNumber = gameTag.replace('game:', '');
      
      console.log(`Upload completed for user ${userId}, game ${gameNumber}`);
      
      // You could emit a real-time event here
      // await emitUploadComplete(userId, gameNumber, event);
    }

  } catch (error) {
    console.error('Error handling upload event:', error);
    throw error;
  }
}

// Handle delete events
async function handleDeleteEvent(event: CloudinaryWebhookEvent): Promise<void> {
  try {
    console.log('Asset deleted:', {
      public_id: event.public_id,
      asset_id: event.asset_id,
    });

    // Here you could:
    // 1. Clean up database records
    // 2. Update user quotas
    // 3. Log deletion for audit purposes

  } catch (error) {
    console.error('Error handling delete event:', error);
    throw error;
  }
}

// Handle eager transformation completion
async function handleEagerTransformationEvent(event: CloudinaryWebhookEvent): Promise<void> {
  try {
    console.log('Eager transformations completed:', {
      public_id: event.public_id,
      eager_count: event.eager?.length || 0,
    });

    // Log successful transformations
    event.eager?.forEach((eager, index) => {
      console.log(`Transformation ${index + 1}:`, {
        transformation: eager.transformation,
        status: eager.status,
        url: eager.secure_url,
      });
    });

    // Here you could:
    // 1. Update UI with thumbnail availability
    // 2. Cache transformation URLs
    // 3. Notify user that processing is complete

  } catch (error) {
    console.error('Error handling eager transformation event:', error);
    throw error;
  }
}

// Handle moderation events (if using Cloudinary's AI moderation)
async function handleModerationEvent(event: CloudinaryWebhookEvent): Promise<void> {
  try {
    console.log('Moderation completed:', {
      public_id: event.public_id,
      status: event.moderation?.status,
    });

    if (event.moderation?.status === 'rejected') {
      console.warn('Content moderation rejected:', {
        public_id: event.public_id,
        response: event.moderation.response,
      });

      // Here you could:
      // 1. Automatically delete rejected content
      // 2. Notify administrators
      // 3. Flag user account for review
    }

  } catch (error) {
    console.error('Error handling moderation event:', error);
    throw error;
  }
}

// Webhook endpoint
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    
    // Get signature from headers
    const signature = request.headers.get('x-cld-signature') || 
                     request.headers.get('x-cloudinary-signature') || '';

    // Verify webhook signature
    if (CLOUDINARY_WEBHOOK_SECRET && !verifyWebhookSignature(body, signature, CLOUDINARY_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook event
    let event: CloudinaryWebhookEvent;
    try {
      event = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!event.notification_type || !event.timestamp) {
      console.error('Missing required webhook fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process the webhook event
    await handleWebhookEvent(event);

    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      event_type: event.notification_type,
      timestamp: event.timestamp,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return error but don't expose internal details
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cloudinary-webhook',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
}
