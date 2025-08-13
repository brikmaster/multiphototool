import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { rateLimit } from '../../../lib/rate-limit';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

interface BatchUpdateRequest {
  publicId: string;
  tags?: string[];
  description?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface BatchOperationRequest {
  operations: BatchUpdateRequest[];
  options?: {
    dryRun?: boolean;
    batchSize?: number;
    delayBetweenBatches?: number;
  };
}

interface BatchOperationResult {
  publicId: string;
  success: boolean;
  error?: string;
  details?: any;
}

interface BatchResponse {
  success: boolean;
  message: string;
  results: {
    successful: BatchOperationResult[];
    failed: BatchOperationResult[];
    total: number;
    summary: {
      totalProcessed: number;
      totalSuccessful: number;
      totalFailed: number;
      successRate: number;
    };
  };
  metadata?: {
    processingTime: number;
    averageTimePerOperation: number;
    batchCount: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    try {
      await limiter.check(request, 10, 'BATCH_RATE_LIMIT'); // 10 batch operations per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body: BatchOperationRequest = await request.json();

    // Validate request
    if (!body.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
      return NextResponse.json(
        { error: 'operations array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (body.operations.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 operations allowed per batch request' },
        { status: 400 }
      );
    }

    // Validate each operation
    for (const operation of body.operations) {
      if (!operation.publicId) {
        return NextResponse.json(
          { error: 'publicId is required for each operation' },
          { status: 400 }
        );
      }
    }

    const {
      operations,
      options = {}
    } = body;

    const {
      dryRun = false,
      batchSize = 10,
      delayBetweenBatches = 100
    } = options;

    const results: BatchOperationResult[] = [];
    const batchCount = Math.ceil(operations.length / batchSize);

    // Process operations in batches
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`Processing batch ${batchNumber}/${batchCount} with ${batch.length} operations`);

      // Process batch operations concurrently
      const batchPromises = batch.map(async (operation) => {
        const result: BatchOperationResult = {
          publicId: operation.publicId,
          success: false,
        };

        try {
          if (dryRun) {
            // Simulate operation for dry run
            result.success = true;
            result.details = {
              operation: 'dry_run',
              message: 'Operation would be performed in production',
              changes: {
                tags: operation.tags,
                description: operation.description,
                context: operation.context,
                metadata: operation.metadata,
              }
            };
          } else {
            // Perform actual Cloudinary update
            const updateResult = await updateCloudinaryResource(operation);
            result.success = true;
            result.details = updateResult;
          }
        } catch (error) {
          result.success = false;
          result.error = error instanceof Error ? error.message : String(error);
          console.error(`Failed to update ${operation.publicId}:`, error);
        }

        return result;
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      for (const batchResult of batchResults) {
        if (batchResult.status === 'fulfilled') {
          results.push(batchResult.value);
        } else {
          // This shouldn't happen, but handle it gracefully
          results.push({
            publicId: 'unknown',
            success: false,
            error: 'Batch processing failed',
          });
        }
      }

      // Add delay between batches (except for the last batch)
      if (i + batchSize < operations.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalProcessed = results.length;
    const totalSuccessful = successful.length;
    const totalFailed = failed.length;
    const successRate = totalProcessed > 0 ? (totalSuccessful / totalProcessed) * 100 : 0;

    const processingTime = Date.now() - startTime;
    const averageTimePerOperation = totalProcessed > 0 ? processingTime / totalProcessed : 0;

    const response: BatchResponse = {
      success: totalFailed === 0,
      message: totalFailed === 0 
        ? `Successfully processed all ${totalProcessed} operations`
        : `Processed ${totalProcessed} operations with ${totalFailed} failures`,
      results: {
        successful,
        failed,
        total: totalProcessed,
        summary: {
          totalProcessed,
          totalSuccessful,
          totalFailed,
          successRate: Math.round(successRate * 100) / 100,
        },
      },
      metadata: {
        processingTime,
        averageTimePerOperation: Math.round(averageTimePerOperation * 100) / 100,
        batchCount,
      },
    };

    // Log summary
    console.log(`Batch operation completed:`, {
      totalProcessed,
      totalSuccessful,
      totalFailed,
      successRate: `${successRate.toFixed(2)}%`,
      processingTime: `${processingTime}ms`,
      batchCount,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch operations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Helper function to update a single Cloudinary resource
async function updateCloudinaryResource(operation: BatchUpdateRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const updateParams: any = {};

    // Add tags if provided
    if (operation.tags && operation.tags.length > 0) {
      updateParams.tags = operation.tags;
    }

    // Add context if provided
    if (operation.description || operation.context) {
      updateParams.context = {
        ...operation.context,
        ...(operation.description && { custom: { description: operation.description } })
      };
    }

    // Add metadata if provided
    if (operation.metadata) {
      updateParams.metadata = operation.metadata;
    }

    // Use Cloudinary Admin API to update the resource
    cloudinary.api.update(operation.publicId, updateParams, (error, result) => {
      if (error) {
        reject(new Error(`Cloudinary update failed: ${error.message}`));
      } else if (result) {
        resolve({
          operation: 'update',
          message: 'Resource updated successfully',
          changes: updateParams,
          cloudinaryResult: result,
        });
      } else {
        reject(new Error('No result returned from Cloudinary'));
      }
    });
  });
}

// Also support GET for batch status checking (useful for monitoring)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    try {
      await limiter.check(request, 30, 'BATCH_STATUS_LIMIT');
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    if (operation === 'status') {
      return NextResponse.json({
        success: true,
        message: 'Batch API is operational',
        timestamp: new Date().toISOString(),
        endpoints: {
          batchUpdate: 'POST /api/cloudinary-batch',
          status: 'GET /api/cloudinary-batch?operation=status',
        },
        limits: {
          maxOperationsPerRequest: 100,
          defaultBatchSize: 10,
          defaultDelayBetweenBatches: 100,
          rateLimit: '10 requests per minute',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Cloudinary Batch API',
      usage: 'Send POST request with operations array to perform batch updates',
      example: {
        operations: [
          {
            publicId: 'photo_id_1',
            tags: ['sports', 'action'],
            description: 'Updated description'
          }
        ],
        options: {
          dryRun: false,
          batchSize: 10,
          delayBetweenBatches: 100
        }
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check batch API status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


