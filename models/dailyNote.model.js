const { mongoose } = require('../config/db');

const { Schema, models, model } = mongoose;

const DailyNoteSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    cycle_id: { type: String, default: null, index: true },
    date: { type: Date, required: true, index: true },
    menstrual_blood: { type: Number },
    mood: {
      type: String,
      enum: ['senang', 'sedih', 'kesal', 'cemas', 'normal'],
      required: true,
    },
    symptoms: { type: String },
    story: { type: String },
    created_at: { type: Date, default: () => new Date() },
  },
  {
    versionKey: false,
    collection: 'daily_notes',
  }
);

DailyNoteSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = models.DailyNote || model('DailyNote', DailyNoteSchema);
