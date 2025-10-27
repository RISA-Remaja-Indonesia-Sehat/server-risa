const { mongoose } = require('../config/db');
const { Schema, models, model } = mongoose;

const InsightSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    averageCycleLength: {
      type: Number,
      default: null,
      min: 15,
      max: 60,
    },
    averagePeriodLength: {
      type: Number,
      default: null,
      min: 1,
      max: 15,
    },

    moodDistributionLast30d: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },

    cycleHistory: [
      {
        id: { type: Schema.Types.ObjectId, ref: 'Cycle' },
        start: { type: Date, required: true },
        end: { type: Date },
        periodLength: { type: Number },
        cycleLength: { type: Number },
      },
    ],

    lastComputedAt: { type: Date, default: Date.now },
    totalCycles: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'insights',
  }
);

InsightSchema.pre('save', function (next) {
  if (this.cycleHistory && this.cycleHistory.length > 12) {
    this.cycleHistory = this.cycleHistory.slice(0, 12);
  }
  this.lastComputedAt = new Date();
  next();
});

module.exports = models.Insight || model('Insight', InsightSchema);
