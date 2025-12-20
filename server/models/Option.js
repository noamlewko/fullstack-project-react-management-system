// models/Option.js
const mongoose = require("mongoose");

/**
 * Single option inside a topic.
 * Example: { name: "Modern", imageUrl: "http://..." }
 */
const OptionItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { _id: true }
);

/**
 * A single design topic with its options.
 * Example:
 * {
 *   topicName: "Living room style",
 *   options: [ { name, imageUrl }, ... ]
 * }
 */
const DesignPreferenceSchema = new mongoose.Schema(
  {
    topicName: { type: String, default: "" },
    options: {
      type: [OptionItemSchema],
      default: [],
    },
  },
  { _id: true }
);

/**
 * Options document per designer.
 * One document per designer that stores all their topics + options.
 */
const OptionSchema = new mongoose.Schema(
  {
    // Designer that owns these options
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Arbitrary list of design topics and options
    designPreferences: {
      type: [DesignPreferenceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Option", OptionSchema);
