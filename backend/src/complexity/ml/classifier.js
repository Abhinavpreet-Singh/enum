/**
 * @fileoverview ML-based complexity classifier using k-Nearest Neighbors (kNN).
 *
 * DESIGN DECISIONS:
 * - kNN was chosen as the initial classifier because:
 *   1. No training phase needed — works immediately with few samples
 *   2. Naturally improves as more historical data is collected
 *   3. Simple to implement, debug, and explain
 *   4. No external ML framework dependency (runs in pure JS)
 * - Can be replaced with a trained model (TensorFlow.js, ONNX) once
 *   sufficient labeled data (~10K+ samples) is collected.
 * - Uses cosine similarity for distance metric (handles feature scaling better
 *   than Euclidean distance for our mixed binary/continuous features).
 * - Falls back to static analysis if classifier has low confidence.
 *
 * FUTURE EXTENSION:
 * - Train a random forest or small neural network on the collected feature vectors
 * - Use the `training-data.js` model to store and retrieve labeled samples
 * - Export features to CSV for offline model training in Python/scikit-learn
 */

import { extractFeatureVector, labelToComplexity, FEATURE_NAMES } from './feature-extractor.js';
import { ComplexityClass, COMPLEXITY_ORDER } from '../types.js';

// ============================================================
// In-Memory Training Data Store
// ============================================================

/**
 * In-memory store of training samples.
 * In production, this would be backed by MongoDB/Redis.
 * @type {Array<{features: number[], label: number}>}
 */
let trainingData = [];

/** Minimum samples needed before the classifier activates */
const MIN_SAMPLES = 10;

/** Number of neighbors for kNN */
const K = 5;

// ============================================================
// kNN Classifier
// ============================================================

/**
 * Classify a feature vector using k-Nearest Neighbors.
 *
 * @param {number[]} featureVector - Feature vector to classify
 * @returns {{prediction: string, confidence: number, neighbors: number} | null}
 *   Returns null if insufficient training data.
 */
export function classifyComplexity(featureVector) {
  if (trainingData.length < MIN_SAMPLES) {
    return null; // Not enough data to make a prediction
  }

  // Calculate distance to all training samples
  const distances = trainingData.map((sample, idx) => ({
    idx,
    label: sample.label,
    distance: cosineDistance(featureVector, sample.features),
  }));

  // Sort by distance (ascending — closer is better)
  distances.sort((a, b) => a.distance - b.distance);

  // Take top K neighbors
  const neighbors = distances.slice(0, K);

  // Vote: count occurrences of each label
  const votes = {};
  for (const neighbor of neighbors) {
    votes[neighbor.label] = (votes[neighbor.label] || 0) + 1;
  }

  // Find the majority label
  let bestLabel = -1;
  let bestCount = 0;
  for (const [label, count] of Object.entries(votes)) {
    if (count > bestCount) {
      bestCount = count;
      bestLabel = parseInt(label);
    }
  }

  const confidence = bestCount / K;
  const prediction = labelToComplexity(bestLabel);

  return {
    prediction,
    confidence: Math.round(confidence * 100) / 100,
    neighbors: trainingData.length,
  };
}

/**
 * Add a labeled training sample to the classifier's memory.
 *
 * @param {number[]} features - Feature vector
 * @param {number} label - Complexity class label (index)
 */
export function addTrainingSample(features, label) {
  if (!Array.isArray(features) || features.length !== FEATURE_NAMES.length) {
    console.warn('[ML Classifier] Invalid feature vector length');
    return;
  }

  trainingData.push({ features, label });

  // Cap the in-memory store to prevent unbounded growth
  if (trainingData.length > 50000) {
    // Keep the most recent 40K samples (recency bias helps with code style evolution)
    trainingData = trainingData.slice(-40000);
  }
}

/**
 * Bulk-load training data (e.g., from MongoDB on startup).
 *
 * @param {Array<{features: number[], label: number}>} samples
 */
export function loadTrainingData(samples) {
  trainingData = samples.filter(
    (s) => Array.isArray(s.features) && s.features.length === FEATURE_NAMES.length && typeof s.label === 'number'
  );
  console.log(`[ML Classifier] Loaded ${trainingData.length} training samples`);
}

/**
 * Get the current number of training samples.
 * @returns {number}
 */
export function getTrainingDataSize() {
  return trainingData.length;
}

/**
 * Export training data as CSV for offline analysis.
 * @returns {string} CSV string
 */
export function exportTrainingDataCSV() {
  const header = [...FEATURE_NAMES, 'label', 'label_string'].join(',');
  const rows = trainingData.map((sample) => {
    const labelStr = labelToComplexity(sample.label);
    return [...sample.features.map((f) => f.toFixed(4)), sample.label, `"${labelStr}"`].join(',');
  });
  return [header, ...rows].join('\n');
}

// ============================================================
// Distance Metrics
// ============================================================

/**
 * Cosine distance between two vectors: 1 - cosine_similarity.
 * Range: [0, 2] where 0 = identical, 2 = opposite.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function cosineDistance(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 1; // Maximum distance for zero vectors

  return 1 - (dotProduct / (normA * normB));
}

/**
 * Euclidean distance between two vectors (alternative metric).
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// ============================================================
// Model Evaluation
// ============================================================

/**
 * Simple cross-validation to evaluate classifier accuracy.
 * Useful for determining if we have enough training data.
 *
 * @param {number} [folds=5] - Number of cross-validation folds
 * @returns {{accuracy: number, perClassAccuracy: Object, totalSamples: number} | null}
 */
export function evaluateModel(folds = 5) {
  if (trainingData.length < MIN_SAMPLES * folds) {
    return null;
  }

  // Shuffle data
  const shuffled = [...trainingData].sort(() => Math.random() - 0.5);
  const foldSize = Math.floor(shuffled.length / folds);

  let correct = 0;
  let total = 0;
  const perClassCorrect = {};
  const perClassTotal = {};

  for (let fold = 0; fold < folds; fold++) {
    const testStart = fold * foldSize;
    const testEnd = testStart + foldSize;

    const testSet = shuffled.slice(testStart, testEnd);
    const trainSet = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];

    // Temporarily replace training data
    const savedData = trainingData;
    trainingData = trainSet;

    for (const sample of testSet) {
      const result = classifyComplexity(sample.features);
      if (result) {
        const predicted = COMPLEXITY_ORDER.indexOf(result.prediction);
        const actual = sample.label;

        perClassTotal[actual] = (perClassTotal[actual] || 0) + 1;

        if (predicted === actual) {
          correct++;
          perClassCorrect[actual] = (perClassCorrect[actual] || 0) + 1;
        }
        total++;
      }
    }

    trainingData = savedData;
  }

  const perClassAccuracy = {};
  for (const label of Object.keys(perClassTotal)) {
    const className = labelToComplexity(parseInt(label));
    perClassAccuracy[className] = Math.round(
      ((perClassCorrect[label] || 0) / perClassTotal[label]) * 100
    ) / 100;
  }

  return {
    accuracy: total > 0 ? Math.round((correct / total) * 100) / 100 : 0,
    perClassAccuracy,
    totalSamples: trainingData.length,
  };
}
