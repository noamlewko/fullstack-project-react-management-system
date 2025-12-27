// models/QuestionnaireTemplate.js
const mongoose = require("mongoose");

/**
 * QuestionnaireTemplate model
 *
 * Reusable questionnaire built by the designer.
 * Stored as:
 * - title/description/roomType
 * - questions[] -> options[] (each option may have an imageUrl)
 */

/** One option inside a question */
const QuestionOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
  },
  { _id: true }
);

/** One question inside a template */
const QuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    multiple: { type: Boolean, default: true },
    options: { type: [QuestionOptionSchema], default: [] },
  },
  { _id: true }
);

/** The template itself */
const QuestionnaireTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    roomType: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    questions: { type: [QuestionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionnaireTemplate", QuestionnaireTemplateSchema);
