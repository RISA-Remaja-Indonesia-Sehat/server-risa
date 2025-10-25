const { mongoose } = require('../../config/db');
const { Schema, models, model } = mongoose;

const CycleSchema = new Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          const start = this.start_date;
          return !v || !start || v >= start;
        },
        message: 'End date must be after or equal to start date',
      },
    },
    period_length: {
      type: Number,
      min: 1,
      max: 30,
      default: null,
    },
    cycle_length: {
      type: Number,
      min: 15,
      max: 60,
      default: null,
    },
    predicted_start_date: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
    collection: 'cycles',
    timestamps: true,
  }
);

CycleSchema.index({ user_id: 1, start_date: -1 });
CycleSchema.index({ user_id: 1, end_date: -1 });

module.exports = models.Cycle || model('Cycle', CycleSchema);
