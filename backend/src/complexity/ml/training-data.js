/**
 * @fileoverview Mongoose model for storing ML training data.
 *
 * Stores complexity analysis feature vectors with verified labels
 * for training the ML classifier. Data is collected from:
 * 1. Confirmed analysis results (high confidence static + runtime agreement)
 * 2. Manual corrections by admins
 * 3. Known solutions with verified complexity
 *
 * Schema is designed for efficient:
 * - Bulk retrieval for model training
 * - Per-language and per-complexity queries
 * - Time-range filtering for data freshness
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const complexityTrainingDataSchema = new Schema(
  {
    // Feature vector (20 dimensions, matching FEATURE_NAMES order)
    features: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) => v.length === 20,
        message: 'Feature vector must have exactly 20 dimensions',
      },
    },

    // Verified complexity class label (0-7 index into COMPLEXITY_ORDER)
    label: {
      type: Number,
      required: true,
      min: 0,
      max: 7,
    },

    // Human-readable label string (e.g., "O(n²)")
    labelString: {
      type: String,
      required: true,
    },

    // Programming language
    language: {
      type: String,
      required: true,
      enum: ['javascript', 'python', 'java', 'cpp', 'c'],
      index: true,
    },

    // How the label was verified
    verificationMethod: {
      type: String,
      enum: ['auto-agreement', 'manual-admin', 'known-solution', 'user-feedback'],
      default: 'auto-agreement',
    },

    // Confidence of the labeling (1.0 = manually verified, lower = auto-labeled)
    labelConfidence: {
      type: Number,
      default: 0.8,
      min: 0,
      max: 1,
    },

    // Source code hash (for deduplication)
    codeHash: {
      type: String,
      index: true,
    },

    // Optional reference to the question
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      default: null,
    },

    // Optional reference to the user who submitted
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Additional metadata for analysis
    metadata: {
      staticConfidence: Number,
      runtimeRSquared: Number,
      agreementStatus: String,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: 'complexity_training_data',
  }
);

// ============================================================
// Indexes
// ============================================================

// Compound index for efficient training data retrieval
complexityTrainingDataSchema.index({ language: 1, label: 1, createdAt: -1 });

// Index for deduplication
complexityTrainingDataSchema.index({ codeHash: 1, language: 1 }, { unique: true, sparse: true });

// TTL index — auto-delete old training data after 1 year (keeps dataset fresh)
complexityTrainingDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ============================================================
// Static Methods
// ============================================================

/**
 * Retrieve training data for model training, optionally filtered.
 *
 * @param {Object} [filter]
 * @param {string} [filter.language] - Filter by language
 * @param {number} [filter.minConfidence=0.7] - Minimum label confidence
 * @param {number} [filter.limit=50000] - Maximum samples to return
 * @returns {Promise<Array<{features: number[], label: number}>>}
 */
complexityTrainingDataSchema.statics.getTrainingBatch = async function (filter = {}) {
  const query = {};

  if (filter.language) query.language = filter.language;
  query.labelConfidence = { $gte: filter.minConfidence || 0.7 };

  const samples = await this.find(query)
    .select('features label -_id')
    .sort({ createdAt: -1 })
    .limit(filter.limit || 50000)
    .lean();

  return samples;
};

/**
 * Store a training sample, ignoring duplicates.
 *
 * @param {Object} data
 * @returns {Promise<Object | null>} Created document or null if duplicate
 */
complexityTrainingDataSchema.statics.addSample = async function (data) {
  try {
    return await this.create(data);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate — update the label if the new one has higher confidence
      if (data.labelConfidence && data.codeHash) {
        await this.updateOne(
          { codeHash: data.codeHash, language: data.language, labelConfidence: { $lt: data.labelConfidence } },
          { $set: { label: data.label, labelString: data.labelString, labelConfidence: data.labelConfidence } }
        );
      }
      return null;
    }
    throw err;
  }
};

/**
 * Get per-label distribution statistics.
 *
 * @returns {Promise<Array<{_id: number, count: number, labelString: string}>>}
 */
complexityTrainingDataSchema.statics.getLabelDistribution = async function () {
  return this.aggregate([
    { $group: { _id: '$label', count: { $sum: 1 }, labelString: { $first: '$labelString' } } },
    { $sort: { _id: 1 } },
  ]);
};

// ============================================================
// Model Export
// ============================================================

export const ComplexityTrainingData = model('ComplexityTrainingData', complexityTrainingDataSchema);
